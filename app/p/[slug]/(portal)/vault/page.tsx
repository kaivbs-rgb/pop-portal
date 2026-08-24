import { redirect } from 'next/navigation';
import { currentClient } from '@/lib/session';
import { getVault } from '@/lib/data';

export default async function Vault({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await currentClient(slug);
  if (!client) redirect(`/p/${slug}/login`);
  const { sections, sessions } = await getVault(client.id);

  return (
    <main className="wrap">
      {sessions.length > 0 && (
        <section>
          <div className="eyebrow">Your sessions</div>
          {sessions.map((s: any) => (
            <details key={s.id} className="card" style={{ marginTop: 12 }}>
              <summary style={{ cursor: 'pointer', listStyle: 'none' }}>
                <span className="serif" style={{ fontSize: 20, color: '#fff' }}>{s.title}</span>
                <span style={{ color: 'var(--taupe)', fontSize: 13, marginLeft: 8 }}>{s.session_date || ''}{s.duration ? ` · ${s.duration}` : ''}</span>
              </summary>
              <div style={{ marginTop: 12 }}>
                {s.video_url && (
                  <div style={{ position: 'relative', paddingTop: '56%', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--line)' }}>
                    <iframe src={s.video_url} allow="autoplay; fullscreen" allowFullScreen
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
                  </div>
                )}
                {Array.isArray(s.summary) && s.summary.length > 0 && (
                  <ul className="items" style={{ marginTop: 12 }}>
                    {s.summary.map((b: string, i: number) => <li key={i} className="item"><span className="t">{b}</span></li>)}
                  </ul>
                )}
                {Array.isArray(s.chapters) && s.chapters.length > 0 && (
                  <div className="pills" style={{ marginTop: 10 }}>
                    {s.chapters.map((ch: any, i: number) => <span key={i} className="pill" style={{ cursor: 'default' }}><b style={{ color: 'var(--gold)' }}>{ch.t}</b> {ch.label}</span>)}
                  </div>
                )}
              </div>
            </details>
          ))}
        </section>
      )}

      {sections.map((sec: any) => (
        <section key={sec.id}>
          <div className="eyebrow">{sec.title}</div>
          <div className="card">
            {sec.body && <p style={{ color: 'var(--cream)', opacity: .88 }}>{sec.body}</p>}
            {sec.metadata?.cards && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8 }}>
                {sec.metadata.cards.map((c: any, i: number) => (
                  <div key={i} style={{ borderLeft: '2px solid var(--line)', paddingLeft: 12 }}>
                    <h4 className="serif" style={{ color: 'var(--gold-bright)', fontSize: 17 }}>{c.h}</h4>
                    <p style={{ fontSize: 14, opacity: .82 }}>{c.p}</p>
                  </div>
                ))}
              </div>
            )}
            {sec.metadata?.links && (
              <div className="pills" style={{ marginTop: 8 }}>
                {sec.metadata.links.map((l: any, i: number) => <a key={i} className="pill" href={l.url} target="_blank">{l.label}</a>)}
              </div>
            )}
          </div>
        </section>
      ))}

      {sections.length === 0 && sessions.length === 0 && (
        <main className="wrap"><section><p style={{ color: 'var(--taupe)' }}>Your vault will fill with session replays, your vision, and resources as we work together.</p></section></main>
      )}
    </main>
  );
}
