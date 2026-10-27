import '@fontsource-variable/archivo';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'FFCS planner — build your VIT timetable by talking',
  description:
    'Ask which faculty teach a slot, then build and edit a clash-free VIT FFCS timetable in plain English.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
