import { redirect } from 'next/navigation';
import { currentClient } from '@/lib/session';
import TabNav from './TabNav';

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const client = await currentClient(slug);
  if (!client) redirect(`/p/${slug}/login`);

  const cfg = (client.config as any) || {};
  const tabs: string[] = cfg.tabs || ['today', 'checkin', 'progress', 'practice', 'vault', 'kai'];
  const cover = client.cover_url || 'https://kvb-power-os.b-cdn.net/covers/gabrielle-shasta.jpg';

  return (
    <>
      <header className="hero">
        <img src={cover} alt="" />
        <div className="hero-inner wrap">
          <div className="kicker">Pathway of Power</div>
          <h1>{client.name.split(' ')[0]}</h1>
          <div className="sub">{client.welcome || 'Home base for our work together'}</div>
        </div>
      </header>
      {children}
      <TabNav slug={slug} tabs={tabs} />
    </>
  );
}
