'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import { useUserStore } from '@/stores/user-store';
import { initials, ACME_COLORS } from '@/lib/utils';
import { CheckCircle, X as XIcon } from '@phosphor-icons/react';

export default function ProfilePage() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const updateUser = useUserStore((s) => s.updateUser);

  function handleClose() {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/contacts');
  }

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [avatarColor, setAvatarColor] = useState(user.avatarColor);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dirty = name !== user.name || email !== user.email || role !== user.role || avatarColor !== user.avatarColor;

  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  function handleSave() {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    else if (name.trim().length < 2) errs.name = 'Name must be at least 2 characters';
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address';
    setProfileErrors(errs);
    if (Object.values(errs).some(Boolean)) return;
    updateUser({ name, email, role, avatarColor });
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2400);
  }

  function handleReset() {
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setAvatarColor(user.avatarColor);
  }

  return (
    <>
      <Topbar title="My Profile" />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[720px] mx-auto px-6 py-6">
          <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl overflow-hidden">
            {/* Header with live avatar preview */}
            <div className="px-6 py-5 border-b border-[var(--border)] flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-[20px] font-extrabold text-white flex-shrink-0 transition-colors"
                style={{ background: avatarColor }}
              >
                {initials(name || 'U')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[16px] font-extrabold text-[var(--text-primary)] truncate">{name || 'Unnamed'}</div>
                <div className="text-[12px] text-[var(--text-tertiary)] truncate">{role} · {email}</div>
              </div>
              <button
                onClick={handleClose}
                aria-label="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer flex-shrink-0"
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-5 flex flex-col gap-5">
              <Field label="Display name *">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (profileErrors.name) setProfileErrors((p) => ({ ...p, name: '' })); }}
                  className={`w-full h-9 px-3 text-[13px] bg-[var(--surface-bg)] border rounded-md text-[var(--text-primary)] outline-none ${profileErrors.name ? 'border-[var(--danger)] shadow-[0_0_0_3px_var(--danger-bg)]' : 'border-[var(--border)] focus:border-[var(--brand-primary)]'}`}
                />
                {profileErrors.name && <div className="text-[10px] font-semibold text-[var(--danger)] mt-1">{profileErrors.name}</div>}
              </Field>

              <Field label="Email *">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (profileErrors.email) setProfileErrors((p) => ({ ...p, email: '' })); }}
                  className={`w-full h-9 px-3 text-[13px] bg-[var(--surface-bg)] border rounded-md text-[var(--text-primary)] outline-none ${profileErrors.email ? 'border-[var(--danger)] shadow-[0_0_0_3px_var(--danger-bg)]' : 'border-[var(--border)] focus:border-[var(--brand-primary)]'}`}
                />
                {profileErrors.email && <div className="text-[10px] font-semibold text-[var(--danger)] mt-1">{profileErrors.email}</div>}
              </Field>

              <Field label="Role">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full h-9 px-3 text-[13px] bg-[var(--surface-bg)] border border-[var(--border)] rounded-md text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
                >
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Sales">Sales</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </Field>

              <Field label="Avatar color">
                <div className="flex flex-wrap gap-2">
                  {ACME_COLORS.map((c) => {
                    const selected = avatarColor === c.hex;
                    return (
                      <button
                        key={c.hex}
                        onClick={() => setAvatarColor(c.hex)}
                        aria-label={c.name}
                        title={c.name}
                        className="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all cursor-pointer"
                        style={{
                          background: c.hex,
                          borderColor: selected ? 'var(--text-primary)' : 'transparent',
                          boxShadow: selected ? `0 0 0 2px var(--surface-card) inset` : undefined,
                        }}
                      >
                        {selected && <CheckCircle size={14} weight="fill" className="text-white" />}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--surface-bg)] flex items-center justify-between">
              <div className="text-[12px] text-[var(--success)] font-semibold flex items-center gap-1.5">
                {savedAt && <><CheckCircle size={14} weight="fill" /> Changes saved</>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  disabled={!dirty}
                  className="px-3 py-1.5 text-[12px] font-semibold text-[var(--text-secondary)] bg-transparent border border-[var(--border)] rounded-md cursor-pointer hover:bg-[var(--surface-raised)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
                <button
                  onClick={handleSave}
                  disabled={!dirty}
                  className="px-3 py-1.5 text-[12px] font-semibold text-white bg-[var(--brand-primary)] border-none rounded-md cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">{label}</span>
      {children}
    </label>
  );
}
