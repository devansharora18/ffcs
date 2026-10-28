'use client';

import { useState } from 'react';

const REPO = process.env.NEXT_PUBLIC_GITHUB_REPO ?? 'devansharora18/ffcs';
const BRANCH = process.env.NEXT_PUBLIC_GITHUB_BRANCH ?? 'main';
const INSTALL_URL = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/install.sh`;
const REPO_URL = `https://github.com/${REPO}`;

export default function SkillPanel() {
  const [copied, setCopied] = useState<'default' | 'claude' | null>(null);

  const command = `curl -fsSL ${INSTALL_URL} | bash`;
  const claudeCommand = `curl -fsSL ${INSTALL_URL} | bash -s -- --claude`;

  async function copy(value: string, which: 'default' | 'claude') {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(null), 1600);
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
            Installs SKILL.md, the full course catalog, every teacher and the Python solver into your
            agent&apos;s skills folder. OpenCode by default, <code className="font-mono">--claude</code>{' '}
            for Claude Code. On Claude web or desktop, upload the zip instead.
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
          onClick={() => copy(command, 'default')}
          className="shrink-0 rounded-full border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted hover:border-lime hover:text-lime"
        >
          {copied === 'default' ? 'copied' : 'copy'}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-mono text-[10px] text-muted">Claude Code:</span>
        <code className="min-w-0 overflow-x-auto whitespace-nowrap rounded bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] text-ink/70">
          {claudeCommand}
        </code>
        <button
          type="button"
          onClick={() => copy(claudeCommand, 'claude')}
          className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-muted underline decoration-line underline-offset-4 hover:text-lime"
        >
          {copied === 'claude' ? 'copied' : 'copy'}
        </button>
      </div>

      <p className="mt-2 font-mono text-[10px] text-muted">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-line underline-offset-4 hover:text-lime hover:decoration-lime"
        >
          {REPO}
        </a>{' '}
        · {BRANCH} · installs to ~/.config/opencode/skills
      </p>
    </section>
  );
}
