import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FFCS planner',
    short_name: 'FFCS',
    description: 'Build a clash-free VIT FFCS timetable by talking to an agent.',
    start_url: '/',
    display: 'standalone',
    background_color: '#131316',
    theme_color: '#131316',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
