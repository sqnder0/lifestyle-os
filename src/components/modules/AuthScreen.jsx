import { useState } from 'react';

export default function AuthScreen({ onGoogleSignIn, loading = false, errorMessage = '' }) {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const signInGoogle = async () => {
    setError('');
    setSubmitting(true);
    try {
      await onGoogleSignIn?.();
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
      setSubmitting(false);
    }
  };

  const busy = loading || submitting;
  const displayError = errorMessage || error;

  return (
    <div className="min-h-screen bg-[var(--surface-page)] flex items-center justify-center p-4">
      <div className="w-full max-w-md card px-6 py-6 space-y-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[var(--text-muted)]">Lifestyle OS</p>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mt-1">
            Continue with Google
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Google account required for sync and calendar access
          </p>
        </div>

        {displayError && (
          <p className="text-xs text-red-500 bg-[var(--fill-red)] px-3 py-2 rounded-lg border border-red-100">
            {displayError}
          </p>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={signInGoogle}
          className="w-full py-2.5 rounded-xl text-sm font-semibold border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-inset)] transition-colors disabled:opacity-40"
        >
          {busy ? 'Connecting...' : 'Continue with Google'}
        </button>
      </div>
    </div>
  );
}
