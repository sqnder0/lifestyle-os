import { useState } from 'react';

export default function AuthScreen({ onSignIn, onSignUp, loading = false }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }

    if (mode === 'signup' && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await onSignIn({ email: email.trim(), password });
      } else {
        await onSignUp({ email: email.trim(), password });
      }
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const busy = loading || submitting;

  return (
    <div className="min-h-screen bg-[var(--surface-page)] flex items-center justify-center p-4">
      <div className="w-full max-w-md card px-6 py-6 space-y-5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[var(--text-muted)]">Lifestyle OS</p>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mt-1">
            {mode === 'signin' ? 'Login' : 'Create your account'}
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            User-first mode with PostgreSQL sync
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            className="input-base"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
          <input
            className="input-base"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />

          {error && (
            <p className="text-xs text-red-500 bg-[var(--fill-red)] px-3 py-2 rounded-lg border border-red-100">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {busy ? 'Please wait...' : (mode === 'signin' ? 'Login' : 'Sign up')}
          </button>
        </form>

        <div className="text-xs text-[var(--text-muted)] flex items-center justify-between gap-2">
          <span>{mode === 'signin' ? 'Need an account?' : 'Already have an account?'}</span>
          <button
            onClick={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))}
            className="text-[var(--text-primary)] hover:underline"
            disabled={busy}
          >
            {mode === 'signin' ? 'Sign up' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  );
}
