import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pathway of Power',
    short_name: 'Pathway',
    description: 'Your portal. Home base for our work together.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b0a07',
    theme_color: '#0b0a07',
    icons: [
      { src: 'https://kvb-power-os.b-cdn.net/covers/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'https://kvb-power-os.b-cdn.net/covers/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
