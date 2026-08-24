import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { sql } from './db';

const MODEL = process.env.AI_MODEL || 'claude-sonnet-5';

/**
 * The per-client AI companion. Grounded on: the client's distilled profile,
 * global coaching knowledge, their portal sections, and their call
 * transcripts/summaries. It is NOT Kai, it is read-only, it never changes
 * supplements/dosages/protocols or interprets labs beyond approved guidance,
 * and it escalates anything urgent to Kai.
 */
export async function replyForClient(client: any, message: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return "Your companion is almost ready. Kai is connecting my mind to your history and his methodology. Check back shortly.";
  }

  // Layer 2 — global coaching knowledge
  const knowledge = await sql`select key, title, content from coach_knowledge`;
  // Layer 3 — this client's material (portal + sessions relevant to the message)
  const sections = await sql`select title, body from portal_sections where client_id = ${client.id} and is_visible = true order by display_order limit 12`;
  const sessions = await sql`
    select title, session_date, summary, key_themes, transcript_text from sessions
    where client_id = ${client.id} and include_in_ai_context = true and private_to_coach = false
    order by session_date desc limit 6`;

  const ground = [
    `# The client\nName: ${client.name}\n${client.ai_context || ''}`,
    `# Coaching knowledge\n${knowledge.map((k: any) => `## ${k.title || k.key}\n${k.content}`).join('\n\n')}`,
    `# Their portal\n${sections.map((s: any) => `## ${s.title || ''}\n${s.body || ''}`).join('\n\n')}`,
    `# Their sessions\n${sessions.map((s: any) => `## ${s.title} (${s.session_date || ''})\nThemes: ${JSON.stringify(s.key_themes)}\nSummary: ${JSON.stringify(s.summary)}\n${(s.transcript_text || '').slice(0, 4000)}`).join('\n\n')}`,
  ].join('\n\n');

  const system = `You are ${client.name}'s Pathway of Power companion. You are NOT Kai; you carry his methodology and voice to support ${client.name} between sessions.
Rules, absolute:
- Read-only. Never change supplements, dosages, or protocols. Never interpret lab values beyond what is already written in their material.
- Answer ONLY from the grounding below and general supportive coaching. If something is not in their material and you are unsure, say so and suggest they ask Kai.
- Warm, grounded, concise. Their own notes, so speak to them directly (you/we), never about Kai in the third person unless quoting guidance.
- Anything urgent, medical, or a safety concern: gently tell them you are looping Kai in, and to reach him directly.

GROUNDING:
${ground}`;

  try {
    const client_ = new Anthropic();
    const resp = await client_.messages.create({
      model: MODEL,
      max_tokens: 800,
      system,
      messages: [{ role: 'user', content: message }],
    });
    const text = resp.content.filter((b) => b.type === 'text').map((b: any) => b.text).join('\n');
    return text || 'I am here. Say a little more?';
  } catch (e: any) {
    return 'I had trouble reaching my mind just now. Try again in a moment, and if it keeps happening tell Kai.';
  }
}
