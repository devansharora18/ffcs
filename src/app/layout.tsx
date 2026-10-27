import '@fontsource-variable/archivo';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';

import { ads } from '@/config/ads';

import './globals.css';

const title = 'FFCS planner — build your VIT timetable by talking';
const description =
  'Ask which faculty teach a slot, then build and edit a clash-free VIT FFCS timetable in plain English.';

export const metadata: Metadata = {
  title,
  description,
  applicationName: 'FFCS planner',
  robots: { index: true, follow: true },
  openGraph: { title, description, type: 'website' },
  twitter: { card: 'summary', title, description },
};

export const viewport: Viewport = {
  themeColor: '#fbfaf8',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
      {ads.client && (
        <Script
          async
          crossOrigin="anonymous"
          strategy="afterInteractive"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads.client}`}
        />
      )}
    </html>
  );
}
