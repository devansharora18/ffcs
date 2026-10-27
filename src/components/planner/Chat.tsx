'use client';

import { useEffect, useRef, useState } from 'react';

import { agentConfigured, streamChat, type ChatMessage } from '@/lib/client/api';
import type { SolveResult, TimetableState } from '@/lib/ffcs/types';

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
};

export default function Chat({ state, onAgentState, onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'checking' | 'ready' | 'offline'>('checking');
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
  }, [messages, ready]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (trimmed.length === 0 || busy || status === 'offline') return;

    setError(null);
    setBusy(true);
    setInput('');

    const history: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
    setMessages([...history, { role: 'assistant', content: '' }]);

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

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[15px] font-bold tracking-tight">
            Agent
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
        {messages.length === 0 && (
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
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-lime px-3 py-2 text-[13px] leading-snug text-on-bright">
                {message.content}
              </p>
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
          <p className="rounded-xl border border-red/40 bg-red/10 px-3 py-2 font-mono text-[11px] text-red">
            {error}
          </p>
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
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void send(input);
            }
          }}
          rows={2}
          disabled={status === 'offline' || busy}
          placeholder="no 8ams, and keep Tuesday free"
          aria-label="Message the agent"
          className="w-full resize-none rounded-xl border border-line bg-panel-2 p-2.5 text-[13px] placeholder:text-muted/70 focus:border-lime focus:outline-none disabled:opacity-60"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] text-muted">
            {busy ? 'thinking…' : 'enter to send'}
          </span>
          <button
            type="submit"
            disabled={busy || status === 'offline' || input.trim().length === 0}
            className="rounded-full bg-lime px-4 py-1.5 font-display text-xs font-bold text-on-bright transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-line disabled:text-muted disabled:hover:scale-100"
          >
            send
          </button>
        </div>
      </form>
    </div>
  );
}
