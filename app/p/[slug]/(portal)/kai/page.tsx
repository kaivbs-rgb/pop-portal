import { redirect } from 'next/navigation';
import { currentClient } from '@/lib/session';
import { getChat } from '@/lib/data';
import { sendChat } from '../../actions';

export default async function Kai({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await currentClient(slug);
  if (!client) redirect(`/p/${slug}/login`);
  const messages = await getChat(client.id);

  return (
    <main className="wrap">
      <section>
        <div className="eyebrow">Your companion</div>
        <div className="chat">
          {messages.length === 0 && (
            <div className="msg assistant">
              I carry Kai's work and your history. Ask me about your practices, your vision, or what to focus on. For anything urgent, reach Kai directly.
            </div>
          )}
          {messages.map((m: any, i: number) => (
            <div key={i} className={`msg ${m.role}`}>{m.content}</div>
          ))}
        </div>
      </section>
      <div className="chatbar">
        <form action={sendChat.bind(null, slug)}>
          <input name="message" type="text" placeholder="Ask your companion…" autoComplete="off" />
          <button className="btn gold" style={{ width: 'auto', padding: '13px 20px' }}>Send</button>
        </form>
      </div>
    </main>
  );
}
