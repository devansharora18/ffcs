'use client';

import { useEffect } from 'react';

import { ads } from '@/config/ads';

/**
 * One placement, below the timetable. It must never sit inside the grid:
 * an ad that looks like a class is a trust failure this product cannot afford.
 */
export default function AdSlot() {
  useEffect(() => {
    if (!ads.client) return;

    try {
      const target = window as unknown as { adsbygoogle?: unknown[] };
      target.adsbygoogle = target.adsbygoogle ?? [];
      target.adsbygoogle.push({});
    } catch {
      // An ad blocker is a valid user choice.
    }
  }, []);

  if (!ads.client) {
    return (
      <aside aria-label="sponsor slot" className="border-t border-line pt-3">
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted">Sponsor slot</p>
        <p className="mt-1 max-w-prose text-xs leading-relaxed text-muted">
          One placement under the timetable, shown while FFCS planning is open.
          {ads.contact ? (
            <>
              {' '}
              <a className="underline decoration-line underline-offset-4 hover:decoration-ink" href={`mailto:${ads.contact}`}>
                Ask about it
              </a>
              .
            </>
          ) : null}
        </p>
      </aside>
    );
  }

  return (
    <aside aria-label="advertisement" className="border-t border-line pt-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted">Advertisement</p>
      <ins
        className="adsbygoogle block"
        data-ad-client={ads.client}
        data-ad-slot={ads.slot ?? ''}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
