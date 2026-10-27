import type { ReactNode } from 'react';

type Mark = 'circle' | 'square' | 'triangle' | 'sparkle';

const MARKS: Record<Mark, { path: ReactNode; className: string }> = {
  circle: { path: <circle cx="8" cy="8" r="6" />, className: 'text-lime' },
  square: { path: <rect x="2.5" y="2.5" width="11" height="11" rx="2" />, className: 'text-purple' },
  triangle: { path: <path d="M8 2.5 14 13.5H2L8 2.5Z" />, className: 'text-yellow' },
  sparkle: {
    path: <path d="M8 1c.6 4 2.4 5.9 6.4 6.5-4 .6-5.8 2.5-6.4 6.5C7.4 10 5.6 8.1 1.6 7.5 5.6 6.9 7.4 5 8 1Z" />,
    className: 'text-pink',
  },
};

type Props = {
  title?: string;
  mark?: Mark;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function Panel({
  title,
  mark,
  action,
  children,
  className = '',
  bodyClassName = 'p-4',
}: Props) {
  const shape = mark ? MARKS[mark] : null;

  return (
    <section
      className={`overflow-hidden rounded-[var(--radius-panel)] border border-line bg-panel ${className}`}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="flex items-center gap-2 font-display text-[15px] font-bold tracking-tight">
            {shape && (
              <svg
                viewBox="0 0 16 16"
                className={`h-3 w-3 shrink-0 ${shape.className}`}
                fill="currentColor"
                aria-hidden
              >
                {shape.path}
              </svg>
            )}
            {title}
          </h2>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
