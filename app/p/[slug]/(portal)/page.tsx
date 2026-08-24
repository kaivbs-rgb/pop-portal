import { redirect } from 'next/navigation';
import { currentClient } from '@/lib/session';
import { getToday } from '@/lib/data';
import { TIER_LABELS } from '@/lib/engine';
import { toggleActionItem, toggleStep, togglePractice } from '../actions';

const TIER_COLOR: Record<string, string> = {
  red: 'var(--red)', yellow: 'var(--yellow)', good: 'var(--green)', great: 'var(--green)', perfect: 'var(--gold-bright)',
};

export default async function Today({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await currentClient(slug);
  if (!client) redirect(`/p/${slug}/login`);
  const d = await getToday(client.id, client.timezone);
  const pct = d.score.pct;
  const tier = d.score.tier;
  const ringColor = tier ? TIER_COLOR[tier] : 'var(--gold)';

  return (
    <main className="wrap">
      {/* score header */}
      <div className="scorehead">
        <div className="ring" style={{ ['--pct' as any]: pct ?? 0, ['--c' as any]: ringColor }}>
          <div className="inner">{pct === null ? '—' : `${pct}%`}</div>
        </div>
        <div className="meta">
          <div className="t">{tier ? TIER_LABELS[tier] : 'A fresh day'}</div>
          <div className="s">{pct === null ? 'Nothing due yet today.' : `${d.score.completedItems} of ${d.score.totalItems} complete`}</div>
          <div className="streaks">
            <div><b>{client.current_streak ?? 0}</b> <span>day streak</span></div>
            <div><b>{client.good_day_streak ?? 0}</b> <span>good days</span></div>
          </div>
        </div>
      </div>

      {/* the one thing */}
      {d.hla && (
        <section>
          <div className="hla">
            <div className="lab">Today's one thing</div>
            <h3>{d.hla.title}</h3>
            {d.hla.why && <p>{d.hla.why}</p>}
          </div>
        </section>
      )}

      {/* actions */}
      {d.actions.length > 0 && (
        <section>
          <div className="eyebrow">Your anchors</div>
          <ul className="items">
            {d.actions.map((a: any) => (
              <li key={a.id} className={`item ${a.is_completed ? 'done' : ''}`}>
                {a.is_scoring ? (
                  <form action={toggleActionItem.bind(null, slug, a.id)}>
                    <button className={`box ${a.is_completed ? 'done' : ''}`} aria-label="toggle">✓</button>
                  </form>
                ) : (
                  <span className="box" style={{ borderStyle: 'dashed', cursor: 'default' }} />
                )}
                <span className="t">{a.title}</span>
                {!a.is_scoring && <span className="anchor">anchor</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* routine steps */}
      {d.routines.map((r: any) => (
        (r.steps as any[]).length > 0 && (
          <section key={r.id}>
            <div className="eyebrow">{r.title}</div>
            <ul className="items">
              {(r.steps as any[]).filter((s) => s.required).map((s: any) => {
                const done = d.completedSteps.includes(s.id);
                return (
                  <li key={s.id} className={`item ${done ? 'done' : ''}`}>
                    <form action={toggleStep.bind(null, slug, s.id)}>
                      <button className={`box ${done ? 'done' : ''}`} aria-label="toggle">✓</button>
                    </form>
                    <span className="t">{s.title}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )
      ))}

      {/* practice of the day */}
      {d.pod && (
        <section>
          <div className="eyebrow">Practice of the day</div>
          <div className="ptile">
            <form action={togglePractice.bind(null, slug, d.pod.id)}>
              <button className={`box ${d.podDone ? 'done' : ''}`} aria-label="mark done">✓</button>
            </form>
            <div style={{ flex: 1 }}>
              <div className="t">{d.pod.title}</div>
              <div className="d">{d.pod.duration_minutes ? `${d.pod.duration_minutes} min` : ''}{d.podDone ? ' · done today' : ''}</div>
            </div>
          </div>
        </section>
      )}

      <footer><div className="mark">Pathway of Power</div></footer>
    </main>
  );
}
