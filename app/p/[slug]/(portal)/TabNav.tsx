'use client';
import { usePathname } from 'next/navigation';

const ALL = [
  { key: 'today', href: '', ic: '☀️', label: 'Today' },
  { key: 'checkin', href: '/checkin', ic: '🌗', label: 'Check-in' },
  { key: 'progress', href: '/progress', ic: '📈', label: 'Progress' },
  { key: 'practice', href: '/practice', ic: '🌬️', label: 'Practice' },
  { key: 'vault', href: '/vault', ic: '📼', label: 'Vault' },
  { key: 'kai', href: '/kai', ic: '✦', label: 'Kai' },
];

export default function TabNav({ slug, tabs }: { slug: string; tabs: string[] }) {
  const path = usePathname();
  const base = `/p/${slug}`;
  const items = ALL.filter((t) => tabs.includes(t.key));
  return (
    <nav className="tabnav">
      {items.map((t) => {
        const href = base + t.href;
        const active = t.href === '' ? path === base : path.startsWith(href);
        return (
          <a key={t.key} href={href} className={active ? 'active' : ''}>
            <span className="ic">{t.ic}</span>
            {t.label}
          </a>
        );
      })}
    </nav>
  );
}
