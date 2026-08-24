import { redirect } from 'next/navigation';
import { currentClient } from '@/lib/session';
import { getPractices } from '@/lib/data';
import { togglePractice } from '../../actions';

export default async function Practice({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await currentClient(slug);
  if (!client) redirect(`/p/${slug}/login`);
  const { practices, doneSet } = await getPractices(client.id, client.timezone);

  return (
    <main className="wrap">
      <section>
        <div className="eyebrow">Your practices</div>
        {practices.length === 0 && <p style={{ color: 'var(--taupe)' }}>Your practices will appear here as we build them together.</p>}
        {practices.map((p: any) => {
          const done = doneSet.has(p.id);
          return (
            <div className="ptile" key={p.id} style={{ marginTop: 12 }}>
              {p.bunny_url ? (
                <a className="play" href={p.bunny_url} target="_blank" aria-label="play" />
              ) : (
                <span className="play" />
              )}
              <div style={{ flex: 1 }}>
                <div className="t">{p.title}</div>
                <div className="d">
                  {p.media_type === 'video' ? 'Video' : 'Audio'}{p.duration_minutes ? ` · ${p.duration_minutes} min` : ''}
                  {p.is_practice_of_day ? ' · today' : ''}
                </div>
              </div>
              <form action={togglePractice.bind(null, slug, p.id)}>
                <button className={`box ${done ? 'done' : ''}`} aria-label="mark done">✓</button>
              </form>
            </div>
          );
        })}
      </section>
    </main>
  );
}
