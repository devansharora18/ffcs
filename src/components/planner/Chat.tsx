'use client';

import { useEffect, useRef, useState } from 'react';

import { agentConfigured, streamChat, type ChatMessage } from '@/lib/client/api';
import { fileToDataUrl } from '@/lib/client/image';
import type { SolveResult, TimetableState } from '@/lib/ffcs/types';

import Onboarding from './Onboarding';

const STORAGE_KEY = 'ffcs.chat.v1';

const SUGGESTIONS = [
  'Who teaches A1?',
  'Build a timetable with no 8am classes',
  'Add BCSE202L with Iyappan',
];

type Props = {
  state: TimetableState;
  onAgentState: (state: TimetableState, result: SolveResult) => void;
  onClose?: () => void;
  schools: string[];
  hasCourses: boolean;
  planName: string;
};

export default function Chat({ state, onAgentState, onClose, schools, hasCourses, planName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'checking' | 'ready' | 'offline'>('checking');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string[]>([]);
  const [lastRequest, setLastRequest] = useState<ChatMessage[] | null>(null);
  const [ready, setReady] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch {
      // ignore
    }
    setReady(true);

    void agentConfigured()
      .then((configured) => setStatus(configured ? 'ready' : 'offline'))
      .catch(() => setStatus('offline'));
  }, []);

  useEffect(() => {
    if (!ready) return;
    // Never persist data URLs: a screenshot would blow the 5 MB quota.
    const plain = messages.slice(-40).map(({ images: _images, ...rest }) => rest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plain));
  }, [messages, ready]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, busy]);

  // Keep the composer ready: on first paint (desktop) and again after every
  // turn, without popping the mobile keyboard when the panel is closed.
  useEffect(() => {
    if (busy || status === 'offline') return;

    const element = inputRef.current;
    if (!element || element.disabled || element.offsetParent === null) return;

    element.focus();
  }, [busy, status]);

  async function addFiles(files: File[]) {
    const images = files
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, 2 - pending.length);
    if (images.length === 0) return;

    try {
      const urls = await Promise.all(images.map((file) => fileToDataUrl(file)));
      setPending((current) => [...current, ...urls].slice(0, 2));
    } catch {
      setError('Could not read that image.');
    }
  }

  async function run(history: ChatMessage[]) {
    setError(null);
    setBusy(true);
    setLastRequest(history);

    let received = false;
    let completed = false;

    try {
      for await (const event of streamChat(
        { messages: history, state },
        new AbortController().signal,
      )) {
        if (event.type === 'text') {
          received = true;
          setMessages((current) => {
            const next = [...current];
            const last = next[next.length - 1];
            if (last?.role === 'assistant') {
              next[next.length - 1] = { ...last, content: last.content + event.delta };
            }
            return next;
          });
        } else if (event.type === 'done') {
          completed = true;
          onAgentState(event.state, event.result);
        } else if (event.type === 'error') {
          setError(event.message);
        } else if (event.type === 'unavailable') {
          setStatus('offline');
        }
      }
    } catch {
      setError('The agent connection dropped.');
    } finally {
      setMessages((current) => {
        const next = [...current];
        while (
          next.length > 0 &&
          next[next.length - 1].role === 'assistant' &&
          next[next.length - 1].content.trim().length === 0
        ) {
          next.pop();
        }
        if (!received && completed) {
          next.push({ role: 'assistant', content: 'Done — the timetable is updated.' });
        }
        return next;
      });
      setBusy(false);
    }
  }

  async function send(text: string) {
    const trimmed = text.trim();
    const images = pending;
    if ((trimmed.length === 0 && images.length === 0) || busy || status === 'offline') return;

    setInput('');
    setPending([]);

    const history: ChatMessage[] = [
      ...messages,
      { role: 'user', content: trimmed, images: images.length > 0 ? images : undefined },
    ];
    setMessages([...history, { role: 'assistant', content: '' }]);
    await run(history);
  }

  function retry() {
    if (!lastRequest || busy) return;
    setMessages([...lastRequest, { role: 'assistant', content: '' }]);
    void run(lastRequest);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[15px] font-bold tracking-tight">
            Agent
            <span className="max-w-[120px] truncate rounded-full bg-panel-2 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-muted">
              {planName}
            </span>
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                status === 'ready' ? 'bg-lime' : status === 'offline' ? 'bg-red' : 'bg-muted'
              }`}
              aria-hidden
            />
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-muted">
            Ask who teaches a slot, or describe the timetable you want.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-muted hover:border-red hover:text-red lg:hidden"
          >
            close
          </button>
        )}
      </header>

      {status === 'offline' && (
        <p className="border-b border-red/40 bg-red/10 px-4 py-2 text-[11px] text-red">
          Agent offline — add <code className="font-mono">OPENCODE_API_KEY</code> to .env and restart.
        </p>
      )}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {messages.length === 0 && !hasCourses && (
          <Onboarding
            schools={schools}
            onChoose={(school) => {
              if (status === 'offline') {
                setMessages([
                  {
                    role: 'assistant',
                    content: `${school}. Which courses do you want? Type a code or a title.`,
                  },
                ]);
                return;
              }
              void send(school);
            }}
          />
        )}

        {messages.length === 0 && hasCourses && (
          <div className="space-y-1.5 px-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Try</p>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void send(suggestion)}
                className="block rounded-full border border-line px-3 py-1.5 text-left text-xs text-ink transition-colors hover:border-lime hover:text-lime"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {messages.map((message, index) =>
          message.role === 'user' ? (
            <article key={`u-${index}`} aria-label="You" className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-lime px-3 py-2 text-[13px] leading-snug text-on-bright">
                {message.images?.map((src, imageIndex) => (
                  <img
                    key={imageIndex}
                    src={src}
                    alt="Attached screenshot"
                    className="mb-1.5 max-h-48 w-full rounded-lg object-contain"
                  />
                ))}
                {message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
              </div>
            </article>
          ) : (
            <article key={`a-${index}`} aria-label="Agent">
              <p className="max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-panel-2 px-3 py-2 text-[13px] leading-relaxed">
                {message.content || (busy ? '…' : '')}
              </p>
            </article>
          ),
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red/40 bg-red/10 px-3 py-2">
            <p className="min-w-0 flex-1 font-mono text-[11px] text-red">{error}</p>
            {lastRequest && !busy && (
              <button
                type="button"
                onClick={retry}
                className="shrink-0 rounded-full border border-red/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-red hover:bg-red hover:text-on-bright"
              >
                retry
              </button>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="border-t border-line p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
      >
        {pending.length > 0 && (
          <div className="mb-2 flex gap-2">
            {pending.map((src, index) => (
              <div key={index} className="relative">
                <img
                  src={src}
                  alt=""
                  className="h-14 w-14 rounded-lg border border-line object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPending((current) => current.filter((_, i) => i !== index))}
                  aria-label="Remove image"
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red text-[11px] leading-none text-on-bright"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onPaste={(event) => {
            const files = Array.from(event.clipboardData.files);
            if (files.some((file) => file.type.startsWith('image/'))) {
              event.preventDefault();
              void addFiles(files);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void send(input);
            }
          }}
          rows={2}
          disabled={status === 'offline' || busy}
          placeholder="no 8ams, or paste a screenshot"
          aria-label="Message the agent"
          className="w-full resize-none rounded-xl border border-line bg-panel-2 p-2.5 text-[13px] placeholder:text-muted/70 focus:border-lime focus:outline-none disabled:opacity-60"
        />

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy || status === 'offline' || pending.length >= 2}
              className="flex shrink-0 items-center gap-1 rounded-full border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted hover:border-purple hover:text-ink disabled:opacity-40"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden
              >
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m5 16 5-5 4 4 3-3 2 2" />
              </svg>
              image
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files) void addFiles(Array.from(event.target.files));
                event.target.value = '';
              }}
            />
            <span className="truncate font-mono text-[10px] text-muted">
              {busy
                ? 'thinking…'
                : pending.length > 0
                  ? `${pending.length} attached`
                  : 'enter to send'}
            </span>
          </div>

          <button
            type="submit"
            disabled={
              busy || status === 'offline' || (input.trim().length === 0 && pending.length === 0)
            }
            className="shrink-0 rounded-full bg-lime px-4 py-1.5 font-display text-xs font-bold text-on-bright transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-line disabled:text-muted disabled:hover:scale-100"
          >
            send
          </button>
        </div>
      </form>
    </div>
  );
}
