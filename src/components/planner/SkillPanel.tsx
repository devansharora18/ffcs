'use client';

import { useEffect, useState } from 'react';

export default function SkillPanel() {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const command = `curl -fsSL ${origin || 'https://your-domain'}/ffcs-planner-skill.zip -o ffcs-skill.zip && unzip -o ffcs-skill.zip`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked: the command stays selectable.
    }
  }

  return (
    <section className="rounded-[var(--radius-panel)] border border-line bg-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[15px] font-bold tracking-tight">
            Take the skill with you
          </h2>
          <p className="mt-1 max-w-md text-[11px] leading-relaxed text-muted">
            SKILL.md, 450 courses, 902 teachers and the Python solver in one archive. Claude Code,
            OpenCode and any agent that reads a skills folder can use it as-is. On Claude web or
            desktop, upload the zip.
          </p>
        </div>

        <a
          href="/ffcs-planner-skill.zip"
          download
          className="rounded-xl bg-purple px-4 py-2 font-display text-sm font-bold text-on-bright transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Download .zip
        </a>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-panel-2 px-3 py-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[11px] text-ink/80">
          {command}
        </code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-full border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted hover:border-lime hover:text-lime"
        >
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
    </section>
  );
}
