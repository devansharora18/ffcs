const REPO = process.env.NEXT_PUBLIC_GITHUB_REPO ?? 'devansharora18/ffcs';
const SITE = 'https://devansharora.in';

export default function SupportPanel() {
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-panel)] border border-line bg-panel px-4 py-3">
      <div>
        <h2 className="font-display text-[15px] font-bold tracking-tight">No ads, no account</h2>
        <p className="mt-1 max-w-md text-[11px] leading-relaxed text-muted">
          If this saved you a clash, star the repo or say hi — that is the whole payment model.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <a
          href={`https://github.com/${REPO}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-lime px-4 py-2 font-display text-sm font-bold text-on-bright transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M8 1.2a6.8 6.8 0 0 0-2.15 13.25c.34.06.46-.15.46-.33v-1.17c-1.89.41-2.29-.91-2.29-.91-.31-.79-.76-1-.76-1-.62-.42.05-.41.05-.41.69.05 1.05.71 1.05.71.61 1.05 1.6.75 1.99.57.06-.44.24-.75.43-.92-1.51-.17-3.1-.76-3.1-3.36 0-.74.27-1.35.71-1.83-.07-.17-.31-.87.07-1.81 0 0 .58-.19 1.88.7a6.5 6.5 0 0 1 3.42 0c1.3-.89 1.88-.7 1.88-.7.38.94.14 1.64.07 1.81.44.48.71 1.09.71 1.83 0 2.61-1.6 3.19-3.12 3.36.25.21.46.63.46 1.27v1.88c0 .18.12.4.46.33A6.8 6.8 0 0 0 8 1.2Z" />
          </svg>
          Star on GitHub
        </a>

        <a
          href={SITE}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-line px-4 py-2 font-display text-sm font-bold text-ink transition-colors hover:border-purple hover:text-purple"
        >
          devansharora.in
        </a>
      </div>
    </section>
  );
}
