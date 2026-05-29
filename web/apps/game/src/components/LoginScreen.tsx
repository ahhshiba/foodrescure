import { useState } from 'react';
import { login, register } from '../api/client';
import { useAuth } from '../store/auth';

export function LoginScreen() {
  const setToken = useAuth((s) => s.setToken);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res =
        mode === 'login'
          ? await login({ username, password })
          : await register({ username, email, password });
      setToken(res.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="crt flex h-full items-center justify-center">
      <form onSubmit={submit} className="panel w-[360px] rounded-lg p-8 shadow-neon">
        <h1 className="glitch-text mb-1 text-2xl font-bold text-neon-green">GLITCH SALVAGE</h1>
        <p className="mb-6 text-xs uppercase tracking-[0.3em] text-neon-cyan">Neon Feast // operator login</p>

        <label className="mb-1 block text-xs text-neon-cyan">CALLSIGN</label>
        <input
          className="mb-3 w-full rounded border border-neon-green/40 bg-black/60 px-3 py-2 text-neon-green outline-none focus:border-neon-green"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />

        {mode === 'register' && (
          <>
            <label className="mb-1 block text-xs text-neon-cyan">UPLINK EMAIL</label>
            <input
              className="mb-3 w-full rounded border border-neon-green/40 bg-black/60 px-3 py-2 text-neon-green outline-none focus:border-neon-green"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </>
        )}

        <label className="mb-1 block text-xs text-neon-cyan">PASSPHRASE</label>
        <input
          type="password"
          className="mb-4 w-full rounded border border-neon-green/40 bg-black/60 px-3 py-2 text-neon-green outline-none focus:border-neon-green"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />

        {error && <p className="mb-3 text-xs text-neon-magenta">⚠ {error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-neon-green/20 py-2 font-bold text-neon-green ring-1 ring-neon-green transition hover:bg-neon-green/30 disabled:opacity-50"
        >
          {busy ? '...' : mode === 'login' ? 'JACK IN' : 'REGISTER'}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="mt-4 w-full text-center text-xs text-neon-cyan underline-offset-2 hover:underline"
        >
          {mode === 'login' ? 'No rig yet? Register a new operator' : 'Already an operator? Jack in'}
        </button>
      </form>
    </div>
  );
}
