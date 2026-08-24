import 'server-only';
import { sql } from './db';

// ── Ported verbatim from the Replit progressEngine.ts (the crown jewel) ──────
export type Tier = 'red' | 'yellow' | 'good' | 'great' | 'perfect';

export function tierForPct(pct: number): Tier {
  if (pct >= 100) return 'perfect';
  if (pct >= 80) return 'great';
  if (pct >= 60) return 'good';
  if (pct >= 50) return 'yellow';
  return 'red';
}

export const TIER_LABELS: Record<Tier, string> = {
  red: 'Needs support',
  yellow: 'Needs attention',
  good: 'Good day',
  great: 'Great day',
  perfect: 'Perfect day',
};

// Bonus at day-finalize, on top of per-item points.
export const TIER_BONUS_POINTS: Record<Tier, number> = {
  red: 0, yellow: 1, good: 5, great: 10, perfect: 20,
};

export interface DailyScore {
  totalItems: number;
  completedItems: number;
  pct: number | null;  // null = nothing assigned that day (never penalize)
  tier: Tier | null;
}

/** ISO-week key (year-Www), for the one-grace-day-per-week rule. */
function weekOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = (d.getUTCDay() + 6) % 7;                 // Mon=0
  d.setUTCDate(d.getUTCDate() - day + 3);              // nearest Thursday
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d.getTime() - firstThu.getTime()) / 86400000 - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/**
 * Live completion score for a date, from actions + required routine steps +
 * practice-of-day. Only actions.is_scoring=true count — this is the Sandy 67%
 * ceiling fix: structurally uncompletable anchors are visible but never poison
 * the denominator, so 100% is always reachable.
 */
export async function computeDailyScore(clientId: string, date: string): Promise<DailyScore> {
  const actions = await sql`
    select id, is_completed from actions
    where client_id = ${clientId} and assigned_date = ${date} and is_scoring = true`;

  const steps = await sql`
    select rs.id from routine_steps rs
    join routines r on r.id = rs.routine_id
    where r.client_id = ${clientId} and r.active = true and rs.required = true`;

  const progress = await sql`
    select completed_step_ids from daily_progress
    where client_id = ${clientId} and date = ${date} limit 1`;
  const completedStepIds: string[] = (progress[0]?.completed_step_ids as string[] | null) ?? [];

  // Practice-of-day counts as ONE item once assigned (from its assigned_date on).
  const pod = await sql`
    select id, assigned_date from practices
    where client_id = ${clientId} and is_practice_of_day = true
    order by assigned_date desc nulls last limit 1`;
  let practiceItems = 0, practiceDone = false;
  if (pod[0] && (!pod[0].assigned_date || date >= String(pod[0].assigned_date))) {
    practiceItems = 1;
    const c = await sql`
      select id from practice_completions
      where client_id = ${clientId} and practice_id = ${pod[0].id} and completed_date = ${date} limit 1`;
    practiceDone = c.length > 0;
  }

  const totalItems = actions.length + steps.length + practiceItems;
  const completedItems =
    actions.filter((a: any) => a.is_completed).length +
    steps.filter((s: any) => completedStepIds.includes(s.id)).length +
    (practiceDone ? 1 : 0);

  if (totalItems === 0) return { totalItems: 0, completedItems: 0, pct: null, tier: null };
  const pct = Math.round((completedItems / totalItems) * 100);
  return { totalItems, completedItems, pct, tier: tierForPct(pct) };
}

/**
 * Advances streaks for a local day and writes the finalized daily_progress row.
 * Momentum streak: alive on any activity (pct>0), one grace day per week absorbs
 * a single zero-day. Good-day streak: consecutive 60%+ only, no grace.
 */
export async function finalizeDay(clientId: string, date: string): Promise<void> {
  const score = await computeDailyScore(clientId, date);
  const pct = score.pct;
  const tier = score.tier;

  // Nothing assigned → record the (null) score, leave streaks untouched.
  if (pct === null) {
    await sql`
      insert into daily_progress (client_id, date, completion_pct, tier, finalized)
      values (${clientId}, ${date}, null, null, true)
      on conflict (client_id, date) do update set finalized = true`;
    return;
  }

  const [client] = await sql`
    select current_streak, longest_streak, good_day_streak, longest_good_day_streak,
           grace_day_week_of, total_points from clients where id = ${clientId}`;
  let momentum = client.current_streak ?? 0;
  let longest = client.longest_streak ?? 0;
  let good = client.good_day_streak ?? 0;
  let longestGood = client.longest_good_day_streak ?? 0;
  let graceWeek: string | null = client.grace_day_week_of ? weekOf(String(client.grace_day_week_of)) : null;
  const wk = weekOf(date);

  if (pct > 0) {
    momentum += 1;
  } else if (graceWeek !== wk) {
    graceWeek = wk;               // spend this week's grace day; streak survives
  } else {
    momentum = 0;                 // grace already used → streak breaks
  }
  longest = Math.max(longest, momentum);

  if (pct >= 60) { good += 1; } else { good = 0; }
  longestGood = Math.max(longestGood, good);

  const bonus = tier ? TIER_BONUS_POINTS[tier] : 0;
  const points = bonus + score.completedItems * 5;
  const totalPoints = (client.total_points ?? 0) + points;

  await sql`
    insert into daily_progress (client_id, date, completion_pct, tier, completed, points_earned, finalized)
    values (${clientId}, ${date}, ${pct}, ${tier}, ${pct >= 60}, ${points}, true)
    on conflict (client_id, date) do update set
      completion_pct = ${pct}, tier = ${tier}, completed = ${pct >= 60},
      points_earned = ${points}, finalized = true`;

  await sql`
    update clients set
      current_streak = ${momentum}, longest_streak = ${longest},
      good_day_streak = ${good}, longest_good_day_streak = ${longestGood},
      grace_day_week_of = ${date}::date, total_points = ${totalPoints}
    where id = ${clientId}`;
}

/** 7-day rolling completion (average of scored days' pct) + good-day count. */
export async function sevenDaySummary(clientId: string) {
  const rows = await sql`
    select completion_pct from daily_progress
    where client_id = ${clientId} and completion_pct is not null
      and date >= (current_date - interval '6 days')`;
  const pcts = rows.map((r: any) => r.completion_pct as number);
  const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
  const goodDays = pcts.filter((p) => p >= 60).length;
  return { completionRate7d: avg, goodDays7d: goodDays, tier: avg === null ? null : tierForPct(avg) };
}
