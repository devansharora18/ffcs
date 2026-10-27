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
};

export default function Chat({ state, onAgentState }: Props) {
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
      for await (const event of streamChat({ messages: history, state }, new AbortController().signal)) {
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
      <header className="border-b border-ink px-4 py-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.18em]">Agent</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Ask who teaches a slot, or describe the timetable you want and change it in plain English.
        </p>
      </header>

      {status === 'offline' && (
        <p className="border-b border-signal bg-signal/5 px-4 py-2 text-xs">
          Agent offline — add <code className="font-mono">OPENCODE_API_KEY</code> to .env and restart.
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="space-y-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Try</p>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void send(suggestion)}
                className="block text-left text-sm underline decoration-line underline-offset-4 hover:decoration-ink"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {messages.map((message, index) => (
          <article
            key={`${message.role}-${index}`}
            className={message.role === 'assistant' ? 'mt-3 border-l-2 border-line pl-3' : 'mt-3'}
          >
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
              {message.role === 'user' ? 'you' : 'agent'}
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content || (busy ? '…' : '')}
            </p>
          </article>
        ))}

        {error && <p className="mt-3 font-mono text-[11px] text-signal">{error}</p>}
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
          className="w-full resize-none border border-line bg-white p-2 text-sm placeholder:text-muted/70 focus:border-ink focus:outline-none disabled:bg-line/20"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted">
            {busy ? 'thinking…' : 'enter to send · shift+enter for a line'}
          </span>
          <button
            type="submit"
            disabled={busy || status === 'offline' || input.trim().length === 0}
            className="border border-ink px-3 py-1 font-mono text-[10px] uppercase tracking-wider hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:border-line disabled:text-muted disabled:hover:bg-transparent"
          >
            send
          </button>
        </div>
      </form>
    </div>
  );
}
