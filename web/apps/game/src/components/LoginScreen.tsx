import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { login, register } from '../api/client';
import { useAuth } from '../store/auth';
import { LanguageSwitcher } from './LanguageSwitcher';

export function LoginScreen() {
  const { t } = useTranslation();
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
      setError(err instanceof Error ? err.message : t('login.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center p-4">
      <form onSubmit={submit} className="panel w-[360px] rounded-2xl p-8 bg-white border border-zen-border shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-zen-text tracking-tight">Food Rescue</h1>
          <LanguageSwitcher />
        </div>
        <p className="mb-8 text-xs text-zen-light font-medium tracking-wide">
          {t('login.subtitle')}
        </p>

        <label className="mb-1.5 block text-xs font-medium text-zen-text">{t('login.callsign')}</label>
        <input
          className="mb-4 w-full rounded-lg border border-zen-border bg-[#fdfbf7] px-3 py-2 text-zen-text outline-none focus:border-zen-accent focus:ring-1 focus:ring-zen-accent transition-all"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />

        {mode === 'register' && (
          <>
            <label className="mb-1.5 block text-xs font-medium text-zen-text">{t('login.email')}</label>
            <input
              className="mb-4 w-full rounded-lg border border-zen-border bg-[#fdfbf7] px-3 py-2 text-zen-text outline-none focus:border-zen-accent focus:ring-1 focus:ring-zen-accent transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </>
        )}

        <label className="mb-1.5 block text-xs font-medium text-zen-text">{t('login.passphrase')}</label>
        <input
          type="password"
          className="mb-6 w-full rounded-lg border border-zen-border bg-[#fdfbf7] px-3 py-2 text-zen-text outline-none focus:border-zen-accent focus:ring-1 focus:ring-zen-accent transition-all"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />

        {error && <p className="mb-4 text-xs text-zen-alert font-medium">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-zen-primary py-2.5 font-bold text-white shadow-sm hover:bg-zen-primary/90 transition-colors disabled:opacity-50"
        >
          {busy ? '...' : mode === 'login' ? t('login.jackIn') : t('login.register')}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="mt-6 w-full text-center text-xs font-medium text-zen-light hover:text-zen-text transition-colors"
        >
          {mode === 'login' ? t('login.toRegister') : t('login.toLogin')}
        </button>
      </form>
    </div>
  );
}
