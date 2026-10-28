import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy — FFCS planner',
  description: 'What this planner stores, where it is stored, and what ads do.',
};

export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <a
        href="/"
        className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted underline decoration-line underline-offset-4 hover:text-lime"
      >
        ← back to the planner
      </a>

      <h1 className="mt-6 font-display text-2xl font-extrabold tracking-tight">Privacy</h1>

      <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted">
        <section>
          <h2 className="font-display text-base font-bold text-ink">What is stored</h2>
          <p className="mt-1">
            Your timetables, tabs and chat history are stored in your browser&apos;s local storage on
            this device. They are not uploaded to us and they are not attached to an account.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-bold text-ink">What is sent</h2>
          <p className="mt-1">
            When you message the agent, the message text, the timetable state and any screenshot you
            attach are sent to the model provider to produce a reply. Nothing else is sent.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-bold text-ink">Ads</h2>
          <p className="mt-1">
            This page shows at most one ad slot below the timetable. When ad serving is enabled,
            Google may set cookies to personalise ads. You can review or reset those choices at{' '}
            <a
              className="text-lime underline underline-offset-4"
              href="https://myadcenter.google.com/"
              target="_blank"
              rel="noreferrer"
            >
              Google Ad Center
            </a>
            . With no ad network configured, the slot shows a plain sponsor notice and sets no cookies.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-bold text-ink">Deleting your data</h2>
          <p className="mt-1">
            Clearing this site&apos;s data in your browser removes every stored timetable and the chat
            history. There is nothing to delete on a server.
          </p>
        </section>
      </div>
    </main>
  );
}
