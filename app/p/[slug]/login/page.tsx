import { notFound } from 'next/navigation';
import { getClientBySlug } from '@/lib/data';
import LoginForm from './LoginForm';

export default async function LoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const client = await getClientBySlug(slug);
  if (!client) notFound();
  return (
    <main className="login">
      <div className="box">
        <div className="kicker" style={{ color: 'var(--gold)', letterSpacing: '.4em' }}>Pathway of Power</div>
        <h1 className="serif">{client.name.split(' ')[0]}</h1>
        <p>Enter the last four digits of your phone number to open your portal.</p>
        <LoginForm slug={slug} name={client.name} />
      </div>
    </main>
  );
}
