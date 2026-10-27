import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'FFCS planner',
  description: 'Plan your VIT FFCS timetable by chatting with an agent.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
