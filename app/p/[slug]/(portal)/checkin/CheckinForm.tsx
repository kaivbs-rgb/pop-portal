'use client';
import { useState } from 'react';
import { submitCheckin } from '../../actions';

const STATES = ['Grounded', 'Clear', 'Activated', 'Anxious', 'Overwhelmed', 'Collapsed'];

export default function CheckinForm({ slug }: { slug: string }) {
  const [energy, setEnergy] = useState(5);
  const [ns, setNs] = useState('');
  const action = submitCheckin.bind(null, slug);

  return (
    <form action={action as any}>
      <input type="hidden" name="energy" value={energy} />
      <input type="hidden" name="nervous_system" value={ns.toLowerCase()} />

      <label className="q">How is your energy?</label>
      <div className="dots">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <span key={n} className={`dot ${n <= energy ? 'on' : ''}`} onClick={() => setEnergy(n)} />
        ))}
      </div>

      <label className="q">Where is your nervous system?</label>
      <div className="pills">
        {STATES.map((s) => (
          <span key={s} className={`pill ${ns === s ? 'sel' : ''}`} onClick={() => setNs(s)}>{s}</span>
        ))}
      </div>

      <label className="q">What was a win today?</label>
      <textarea name="win" placeholder="However small." />

      <label className="q">What did you avoid?</label>
      <textarea name="avoided" placeholder="No judgment. Just honest." />

      <label className="q">What support do you need?</label>
      <textarea name="support" placeholder="Optional." />

      <button className="btn gold" style={{ marginTop: 22 }}>Save today's check-in</button>
    </form>
  );
}
