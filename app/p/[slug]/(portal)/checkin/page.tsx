import CheckinForm from './CheckinForm';

export default async function Checkin({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <main className="wrap">
      <section>
        <div className="eyebrow">Daily check-in</div>
        <p style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--cream)', fontStyle: 'italic' }}>
          A few honest breaths with yourself. This is for you, not a test.
        </p>
        <CheckinForm slug={slug} />
      </section>
    </main>
  );
}
