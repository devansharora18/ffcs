'use client';

import { toPng } from 'html-to-image';
import { useState } from 'react';

export default function ExportButton({ name }: { name: string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleExport() {
    const node = document.getElementById('timetable-export');
    if (!node) return;

    setBusy(true);
    setFailed(false);

    try {
      const dataUrl = await toPng(node, { pixelRatio: 2, backgroundColor: '#1b1b1f' });
      const link = document.createElement('a');
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      link.download = `ffcs-${slug || 'timetable'}.png`;
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
      {failed && <span className="font-mono text-[10px] text-red">export failed</span>}
      <button
        type="button"
        onClick={handleExport}
        disabled={busy}
        className="rounded-full border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:border-lime hover:text-lime disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-line disabled:hover:text-muted"
      >
        {busy ? 'rendering…' : 'export png'}
      </button>
    </span>
  );
}
