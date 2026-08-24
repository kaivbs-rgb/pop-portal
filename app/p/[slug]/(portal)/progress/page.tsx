import { redirect } from 'next/navigation';
import { currentClient } from '@/lib/session';
import { getProgress } from '@/lib/data';

export default async function Progress({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await currentClient(slug);
  if (!client) redirect(`/p/${slug}/login`);
  const { rows, client: c, summary } = await getProgress(client.id);
  const byDate = new Map(rows.map((r: any) => [String(r.date), r]));

  // last 35 days grid
  const cells: { label: string; tier: string | null }[] = [];
  const today = new Date();
  for (let i = 34; i >= 0; i--) {
    const dt = new Date(today); dt.setDate(today.getDate() - i);
    const key = dt.toLocaleDateString('sv-SE');
    const row: any = byDate.get(key);
    cells.push({ label: String(dt.getDate()), tier: row?.tier ?? null });
  }

  return (
    <main className="wrap">
      <section>
        <div className="eyebrow">Your momentum</div>
        <div className="scorehead">
          <div className="ring" style={{ ['--pct' as any]: summary.completionRate7d ?? 0, ['--c' as any]: 'var(--gold-bright)' }}>
            <div className="inner">{summary.completionRate7d === null ? '—' : `${summary.completionRate7d}%`}</div>
          </div>
          <div className="meta">
            <div className="t">Last 7 days</div>
            <div className="s">{summary.goodDays7d} good days this week</div>
            <div className="streaks">
              <div><b>{c?.current_streak ?? 0}</b> <span>current</span></div>
              <div><b>{c?.longest_streak ?? 0}</b> <span>longest</span></div>
              <div><b>{c?.total_points ?? 0}</b> <span>points</span></div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="eyebrow">Last five weeks</div>
        <div className="cal">
          {cells.map((cell, i) => (
            <div key={i} className={`cell ${cell.tier ?? ''}`}>{cell.label}</div>
          ))}
        </div>
      </section>
    </main>
  );
}
