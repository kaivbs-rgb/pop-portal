import 'server-only';
import { sql } from './db';
import { computeDailyScore, sevenDaySummary } from './engine';

/** Local YYYY-MM-DD in a client's timezone. */
export function todayIn(tz: string | null): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: tz || 'America/Los_Angeles' });
}

export async function getClientBySlug(slug: string) {
  const [c] = await sql`select * from clients where slug = ${slug} limit 1`;
  return c ?? null;
}

export async function getToday(clientId: string, tz: string | null) {
  const date = todayIn(tz);
  const [actions, routines, hla, pod, score, summary, milestones] = await Promise.all([
    sql`select * from actions where client_id = ${clientId} and assigned_date = ${date} order by display_order, title`,
    sql`select r.id, r.title, r.time_block,
          coalesce(json_agg(json_build_object('id',rs.id,'title',rs.title,'required',rs.required,'points',rs.points) order by rs.step_order) filter (where rs.id is not null),'[]') as steps
        from routines r left join routine_steps rs on rs.routine_id = r.id
        where r.client_id = ${clientId} and r.active = true group by r.id order by r.sort_order`,
    sql`select * from daily_hla where client_id = ${clientId} and date = ${date} limit 1`,
    sql`select * from practices where client_id = ${clientId} and is_practice_of_day = true order by assigned_date desc nulls last limit 1`,
    computeDailyScore(clientId, date),
    sevenDaySummary(clientId),
    sql`select * from client_milestones where client_id = ${clientId} and seen_at is null order by achieved_at desc`,
  ]);
  const [progress] = await sql`select completed_step_ids from daily_progress where client_id = ${clientId} and date = ${date} limit 1`;
  const completedSteps: string[] = (progress?.completed_step_ids as string[] | null) ?? [];
  let podDone = false;
  if (pod[0]) {
    const c = await sql`select id from practice_completions where client_id=${clientId} and practice_id=${pod[0].id} and completed_date=${date} limit 1`;
    podDone = c.length > 0;
  }
  return { date, actions, routines, hla: hla[0] ?? null, pod: pod[0] ?? null, podDone, completedSteps, score, summary, milestones };
}

export async function getProgress(clientId: string) {
  const rows = await sql`select date, completion_pct, tier, completed from daily_progress
    where client_id = ${clientId} and date >= (current_date - interval '34 days') order by date`;
  const [client] = await sql`select current_streak, longest_streak, good_day_streak, longest_good_day_streak, total_points from clients where id = ${clientId}`;
  const summary = await sevenDaySummary(clientId);
  return { rows, client, summary };
}

export async function getPractices(clientId: string, tz: string | null) {
  const date = todayIn(tz);
  const practices = await sql`select * from practices where (client_id = ${clientId} or client_id is null) and is_published = true order by is_practice_of_day desc, display_order, title`;
  const done = await sql`select practice_id from practice_completions where client_id = ${clientId} and completed_date = ${date}`;
  const doneSet = new Set(done.map((d: any) => d.practice_id));
  return { practices, doneSet, date };
}

export async function getVault(clientId: string) {
  const [sections, sessions] = await Promise.all([
    sql`select * from portal_sections where client_id = ${clientId} and is_visible = true order by display_order`,
    sql`select * from sessions where client_id = ${clientId} and private_to_coach = false order by sort, session_date desc`,
  ]);
  return { sections, sessions };
}

export async function getChat(clientId: string) {
  return sql`select role, content from chat_messages where client_id = ${clientId} order by created_at limit 200`;
}
