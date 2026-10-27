const STICKERS = [
  { className: 'left-2 -top-3 text-pink', rotate: 18, shape: 'squiggle' },
  { className: 'right-2 top-[9rem] text-lime', rotate: 12, shape: 'coil' },
  { className: 'left-2 top-[24rem] text-yellow', rotate: -18, shape: 'sparkle' },
  { className: 'right-2 top-[38rem] text-purple', rotate: -8, shape: 'asterisk' },
  { className: 'left-2 bottom-[10rem] text-blue', rotate: 14, shape: 'paperclip' },
  { className: 'right-2 bottom-[4rem] text-yellow', rotate: -22, shape: 'triangle' },
] as const;

function Shape({ shape }: { shape: (typeof STICKERS)[number]['shape'] }) {
  switch (shape) {
    case 'sparkle':
      return <path d="M12 2c.8 5.6 3.6 8.4 9.2 9.2-5.6.8-8.4 3.6-9.2 9.2-.8-5.6-3.6-8.4-9.2-9.2C8.4 10.4 11.2 7.6 12 2Z" />;
    case 'coil':
      return <path d="M4 18c0-4 16-4 16 0s-16 4-16 0 16-4 16 0" />;
    case 'squiggle':
      return <path d="M2 14c3.5-9 6.5 9 10 0s6.5 9 10 0" />;
    case 'asterisk':
      return <path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9" />;
    case 'paperclip':
      return <path d="M16 7.5V16a4 4 0 0 1-8 0V6.5a2.5 2.5 0 0 1 5 0V15a1 1 0 0 1-2 0V8.5" />;
    case 'triangle':
      return <path d="M12 4 21 20H3L12 4Z" />;
  }
}

/**
 * Sticker layer. Purely decorative, never interactive, and never behind text
 * that has to stay legible — panels sit on top of it.
 */
export default function Doodles() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {STICKERS.map((sticker) => (
        <svg
          key={sticker.className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ rotate: `${sticker.rotate}deg` }}
          className={`absolute hidden h-9 w-9 opacity-70 2xl:block ${sticker.className}`}
        >
          <Shape shape={sticker.shape} />
        </svg>
      ))}
    </div>
  );
}
