'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sql } from '@/lib/db';
import { loginWithLast4, setSession, clearSession, currentClient } from '@/lib/session';
import { todayIn } from '@/lib/data';

export async function loginAction(slug: string, _prev: unknown, formData: FormData) {
  const last4 = String(formData.get('last4') ?? '').trim();
  const client = await loginWithLast4(slug, last4);
  if (!client) return { error: 'That did not match. Try the last four digits of your phone.' };
  await setSession(client.id, slug);
  redirect(`/p/${slug}`);
}

export async function logoutAction(slug: string) {
  await clearSession();
  redirect(`/p/${slug}/login`);
}

async function guard(slug: string) {
  const client = await currentClient(slug);
  if (!client) redirect(`/p/${slug}/login`);
  return client;
}

export async function toggleActionItem(slug: string, actionId: string) {
  const client = await guard(slug);
  await sql`update actions set is_completed = not is_completed,
      completed_at = case when is_completed then null else now() end
    where id = ${actionId} and client_id = ${client.id}`;
  revalidatePath(`/p/${slug}`);
}

export async function toggleStep(slug: string, stepId: string) {
  const client = await guard(slug);
  const date = todayIn(client.timezone);
  const [row] = await sql`select completed_step_ids from daily_progress where client_id = ${client.id} and date = ${date} limit 1`;
  const ids: string[] = (row?.completed_step_ids as string[] | null) ?? [];
  const next = ids.includes(stepId) ? ids.filter((i) => i !== stepId) : [...ids, stepId];
  await sql`insert into daily_progress (client_id, date, completed_step_ids) values (${client.id}, ${date}, ${JSON.stringify(next)}::jsonb)
    on conflict (client_id, date) do update set completed_step_ids = ${JSON.stringify(next)}::jsonb`;
  revalidatePath(`/p/${slug}`);
}

export async function togglePractice(slug: string, practiceId: string) {
  const client = await guard(slug);
  const date = todayIn(client.timezone);
  const [existing] = await sql`select id from practice_completions where client_id=${client.id} and practice_id=${practiceId} and completed_date=${date} limit 1`;
  if (existing) {
    await sql`delete from practice_completions where id = ${existing.id}`;
  } else {
    await sql`insert into practice_completions (practice_id, client_id, completed_date) values (${practiceId}, ${client.id}, ${date})`;
  }
  revalidatePath(`/p/${slug}`);
  revalidatePath(`/p/${slug}/practice`);
}

export async function submitCheckin(slug: string, _prev: unknown, formData: FormData) {
  const client = await guard(slug);
  const date = todayIn(client.timezone);
  const energy = Number(formData.get('energy') || 0) || null;
  const ns = String(formData.get('nervous_system') || '') || null;
  const win = String(formData.get('win') || '') || null;
  const avoided = String(formData.get('avoided') || '') || null;
  const support = String(formData.get('support') || '') || null;
  await sql`insert into daily_progress (client_id, date, energy_level, nervous_system_state, win, avoided, support_needed, reflection_submitted_at)
      values (${client.id}, ${date}, ${energy}, ${ns}, ${win}, ${avoided}, ${support}, now())
    on conflict (client_id, date) do update set
      energy_level = ${energy}, nervous_system_state = ${ns}, win = ${win},
      avoided = ${avoided}, support_needed = ${support}, reflection_submitted_at = now()`;
  redirect(`/p/${slug}`);
}

export async function sendChat(slug: string, formData: FormData) {
  const client = await guard(slug);
  const msg = String(formData.get('message') || '').trim();
  if (!msg) return;
  await sql`insert into chat_messages (client_id, role, content) values (${client.id}, 'user', ${msg})`;
  const { replyForClient } = await import('@/lib/ai');
  const reply = await replyForClient(client, msg);
  await sql`insert into chat_messages (client_id, role, content) values (${client.id}, 'assistant', ${reply})`;
  revalidatePath(`/p/${slug}/kai`);
}
