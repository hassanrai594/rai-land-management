'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Landmark } from 'lucide-react';

const copy = {
  login: {
    title: 'Welcome back',
    subtitle: 'Sign in to your estate workspace.',
    endpoint: '/api/auth/login',
    submit: 'Sign in',
    busy: 'Signing in…',
    switchPrompt: 'New to Land Ledger?',
    switchHref: '/signup',
    switchLabel: 'Create an account',
  },
  signup: {
    title: 'Create your account',
    subtitle: 'Plots, buyers and payments in one private workspace.',
    endpoint: '/api/auth/signup',
    submit: 'Create account',
    busy: 'Creating account…',
    switchPrompt: 'Already have an account?',
    switchHref: '/login',
    switchLabel: 'Sign in',
  },
};

export default function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const text = copy[mode];
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError('');
    try {
      const res = await fetch(text.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Something went wrong. Please try again.');
      }
      // The session cookie is now set, so the server renders the dashboard.
      router.replace('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="brand">
          <span className="brand-icon">
            <Landmark size={24} />
          </span>
          land<span className="brand-light">ledger</span>
          <span className="brand-dot">.</span>
        </div>
        <div>
          <h1>{text.title}</h1>
          <p>{text.subtitle}</p>
        </div>
        {mode === 'signup' && (
          <label>
            Full name
            <input name="name" autoComplete="name" required maxLength={100} />
          </label>
        )}
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required maxLength={254} />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={mode === 'signup' ? 8 : undefined}
            maxLength={200}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="btn primary" disabled={busy}>
          {busy ? text.busy : text.submit}
        </button>
        <p className="auth-switch">
          {text.switchPrompt} <Link href={text.switchHref}>{text.switchLabel}</Link>
        </p>
      </form>
    </main>
  );
}
