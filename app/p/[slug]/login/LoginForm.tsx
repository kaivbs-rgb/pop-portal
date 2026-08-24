'use client';
import { useActionState } from 'react';
import { loginAction } from '../actions';

export default function LoginForm({ slug, name }: { slug: string; name: string }) {
  const [state, action, pending] = useActionState(loginAction.bind(null, slug), null);
  return (
    <form action={action}>
      <input
        name="last4"
        type="tel"
        inputMode="numeric"
        maxLength={4}
        placeholder="••••"
        autoFocus
        style={{ textAlign: 'center', fontSize: 24, letterSpacing: '.3em' }}
      />
      <button className="btn gold" style={{ marginTop: 14 }} disabled={pending}>
        {pending ? 'Opening…' : 'Enter'}
      </button>
      {state?.error && <div className="err">{state.error}</div>}
    </form>
  );
}
