import 'server-only';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { sql } from './db';

const COOKIE = 'pop_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function sign(payload: string): string {
  const mac = crypto.createHmac('sha256', process.env.SESSION_SECRET!).update(payload).digest('base64url');
  return `${Buffer.from(payload).toString('base64url')}.${mac}`;
}
function verify(token: string): { clientId: string; slug: string; exp: number } | null {
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  const payload = Buffer.from(body, 'base64url').toString();
  const expected = crypto.createHmac('sha256', process.env.SESSION_SECRET!).update(payload).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(payload);
    if (data.exp < Date.now() / 1000) return null;
    return data;
  } catch { return null; }
}

/** Verify last-4 of phone for a slug. Returns the client row on success. */
export async function loginWithLast4(slug: string, last4: string) {
  const [client] = await sql`select * from clients where slug = ${slug} limit 1`;
  if (!client) return null;
  // constant-time-ish compare of the 4 digits
  const a = Buffer.from(String(client.phone_last4).padEnd(8, '\0'));
  const b = Buffer.from(String(last4).trim().padEnd(8, '\0'));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return client;
}

export async function setSession(clientId: string, slug: string) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const token = sign(JSON.stringify({ clientId, slug, exp }));
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

/** Returns the signed-in client row scoped to `slug`, or null. Never trusts the URL alone. */
export async function currentClient(slug: string) {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const data = verify(token);
  if (!data || data.slug !== slug) return null;
  const [client] = await sql`select * from clients where id = ${data.clientId} and slug = ${slug} limit 1`;
  return client ?? null;
}
