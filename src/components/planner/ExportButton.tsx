'use client';

import { toPng } from 'html-to-image';
import { useState } from 'react';

export default function ExportButton({ disabled }: { disabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleExport() {
    const desktop = window.matchMedia('(min-width: 1024px)').matches;
    const node = document.getElementById(desktop ? 'timetable-export' : 'agenda-export');
    if (!node) return;

    setBusy(true);
    setFailed(false);

    try {
      const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = 'ffcs-timetable.png';
      link.href = dataUrl;
      link.click();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="flex items-center gap-2">
      {failed && <span className="font-mono text-[10px] text-signal">export failed</span>}
      <button
        type="button"
        onClick={handleExport}
        disabled={disabled || busy}
        className="border border-ink px-2 py-1 font-mono text-[10px] uppercase tracking-wider hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:border-line disabled:text-muted disabled:hover:bg-transparent"
      >
        {busy ? 'rendering…' : 'export png'}
      </button>
    </span>
  );
}
