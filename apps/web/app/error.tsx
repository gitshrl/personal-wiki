"use client";

export default function Error({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="error-view">
      <section>
        <p className="error-view__eyebrow">wiki</p>
        <h1>Something broke.</h1>
        <p>Refresh the view and try again.</p>
        <button type="button" onClick={reset}>
          refresh
        </button>
      </section>
    </main>
  );
}
