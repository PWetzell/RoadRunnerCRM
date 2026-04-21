'use client';

import { useEffect, useState } from 'react';
import { useUserStore } from '@/stores/user-store';
import { initials } from '@/lib/utils';
import { SignIn } from '@phosphor-icons/react';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const user = useUserStore((s) => s.user);
  const signIn = useUserStore((s) => s.signIn);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const [email, setEmail] = useState(user.email);
  const [name, setName] = useState(user.name);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Avoid hydration mismatch: render children on server, gate only after mount
  if (!hydrated) return <>{children}</>;

  if (isAuthenticated) return <>{children}</>;

  function validateField(field: string, value: string) {
    if (field === 'name') return !value.trim() ? 'Name is required' : value.trim().length < 2 ? 'Name must be at least 2 characters' : '';
    if (field === 'email') return !value.trim() ? 'Email is required' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Enter a valid email address' : '';
    return '';
  }

  function handleBlur(field: string, value: string) {
    setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nameErr = validateField('name', name);
    const emailErr = validateField('email', email);
    setFieldErrors({ name: nameErr, email: emailErr });
    if (nameErr || emailErr) {
      setError('');
      return;
    }
    setError('');
    signIn({ name: name.trim(), email: email.trim() });
  }

  function handleContinueAsExisting() {
    signIn();
  }

  return (
    <div className="fixed inset-0 z-[200] bg-[var(--surface-bg)] flex items-center justify-center p-6">
      <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl shadow-xl w-[420px] max-w-full overflow-hidden">
        {/* Brand header */}
        <div className="px-6 py-5 border-b border-[var(--border)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--brand-primary)] flex items-center justify-center flex-shrink-0 p-1">
            <img src="/roadrunner-logo-white.svg" alt="" className="w-full h-full" />
          </div>
          <div>
            <div className="text-[15px] font-extrabold text-[var(--text-primary)]">Roadrunner CRM</div>
            <div className="text-[11px] text-[var(--text-tertiary)]">AI-assisted contact intelligence</div>
          </div>
        </div>

        {/* Continue as returning user */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
          <button
            onClick={handleContinueAsExisting}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg bg-transparent border border-[var(--border)] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-bg)] cursor-pointer transition-all text-left"
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-extrabold text-white flex-shrink-0"
              style={{ background: user.avatarColor }}
            >
              {initials(user.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold text-[var(--text-primary)] truncate">Continue as {user.name}</div>
              <div className="text-[11px] text-[var(--text-tertiary)] truncate">{user.email}</div>
            </div>
            <SignIn size={16} className="text-[var(--brand-primary)] flex-shrink-0" />
          </button>
        </div>

        {/* Sign in form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 flex flex-col gap-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
            Or sign in as someone else
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Full name <span className="text-[var(--danger)]">*</span></span>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: validateField('name', e.target.value) })); }}
              onBlur={() => handleBlur('name', name)}
              placeholder="Your name"
              className={`h-9 px-3 text-[13px] bg-[var(--surface-bg)] border rounded-md text-[var(--text-primary)] outline-none ${fieldErrors.name ? 'border-[var(--danger)] shadow-[0_0_0_3px_var(--danger-bg)]' : 'border-[var(--border)] focus:border-[var(--brand-primary)]'}`}
              autoComplete="name"
            />
            {fieldErrors.name && <span className="text-[10px] font-semibold text-[var(--danger)]">{fieldErrors.name}</span>}
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-[var(--text-secondary)]">Email <span className="text-[var(--danger)]">*</span></span>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: validateField('email', e.target.value) })); }}
              onBlur={() => handleBlur('email', email)}
              placeholder="you@company.com"
              className={`h-9 px-3 text-[13px] bg-[var(--surface-bg)] border rounded-md text-[var(--text-primary)] outline-none ${fieldErrors.email ? 'border-[var(--danger)] shadow-[0_0_0_3px_var(--danger-bg)]' : 'border-[var(--border)] focus:border-[var(--brand-primary)]'}`}
              autoComplete="email"
            />
            {fieldErrors.email && <span className="text-[10px] font-semibold text-[var(--danger)]">{fieldErrors.email}</span>}
          </label>
          {error && (
            <div className="text-[11px] font-semibold text-[var(--danger)]">{error}</div>
          )}
          <button
            type="submit"
            className="h-9 mt-1 text-[13px] font-bold text-white bg-[var(--brand-primary)] border-none rounded-md cursor-pointer hover:opacity-90 flex items-center justify-center gap-1.5"
          >
            <SignIn size={14} /> Sign in
          </button>
          <div className="text-[10px] text-[var(--text-tertiary)] text-center pt-1">
            Demo mode — no password required
          </div>
        </form>
      </div>
    </div>
  );
}
