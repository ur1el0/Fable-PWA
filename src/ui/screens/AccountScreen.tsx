import React, { useState } from 'react';
import {
  AlertCircle,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  LogOut,
  Monitor,
  Moon,
  Server,
  Sun,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useFableStore } from '../../store/useFableStore';
import type { AppAppearance } from '../../domain/models';

type AuthMode = 'SIGN_IN' | 'REGISTER' | 'RESET_PASSWORD';

export function AccountScreen() {
  const session = useFableStore((s) => s.session);
  const stories = useFableStore((s) => s.stories);
  const readerPreferences = useFableStore((s) => s.readerPreferences);
  const isAuthBusy = useFableStore((s) => s.isAuthBusy);
  const authError = useFableStore((s) => s.authError);
  const apiBaseUrl = useFableStore((s) => s.apiBaseUrl);
  const serverConfigError = useFableStore((s) => s.serverConfigError);

  const setAppAppearance = useFableStore((s) => s.setAppAppearance);
  const signIn = useFableStore((s) => s.signIn);
  const registerAccount = useFableStore((s) => s.registerAccount);
  const updateProfile = useFableStore((s) => s.updateProfile);
  const resetPassword = useFableStore((s) => s.resetPassword);
  const signOut = useFableStore((s) => s.signOut);
  const deleteAccount = useFableStore((s) => s.deleteAccount);
  const openStoryDetail = useFableStore((s) => s.openStoryDetail);
  const openStoryEdit = useFableStore((s) => s.openStoryEdit);
  const deleteOwnedStory = useFableStore((s) => s.deleteOwnedStory);
  const applyServerUrl = useFableStore((s) => s.applyServerUrl);
  const resetServerUrl = useFableStore((s) => s.resetServerUrl);

  const [authMode, setAuthMode] = useState<AuthMode>('SIGN_IN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [editName, setEditName] = useState(session?.user.displayName ?? '');
  const [editBio, setEditBio] = useState(session?.user.bio ?? '');
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [confirmDeleteStoryId, setConfirmDeleteStoryId] = useState<string | null>(null);
  const [serverInput, setServerInput] = useState(apiBaseUrl);

  const ownedStories = stories.filter(
    (s) =>
      s.provider === 'FABLE' &&
      (s.id.startsWith('fable-local-') ||
        (session && s.ownerUserId === session.user.id))
  );

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'SIGN_IN') {
      await signIn(email, password);
    } else if (authMode === 'REGISTER') {
      await registerAccount(email, password, displayName || 'Fable Writer');
    } else {
      await resetPassword(email, password);
      setAuthMode('SIGN_IN');
    }
  };

  return (
    <div className="space-y-8 pb-8">
      <header className="space-y-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--action-primary)]">
          PROFILE &amp; PREFERENCES
        </p>
        <h1 className="font-prose text-[32px] font-bold leading-tight text-[var(--text-primary)]">
          Account
        </h1>
      </header>

      {/* Asymmetric 7/5 Grid */}
      <div className="grid gap-10 lg:grid-cols-12">
        {/* Primary Column: Auth / Profile + Published Editions */}
        <div className="space-y-10 lg:col-span-7">
          {!session ? (
            <section className="fable-card p-6 sm:p-8">
              <div className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-4">
                <button
                  type="button"
                  aria-pressed={authMode === 'SIGN_IN'}
                  onClick={() => setAuthMode('SIGN_IN')}
                  className="fable-chip"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  aria-pressed={authMode === 'REGISTER'}
                  onClick={() => setAuthMode('REGISTER')}
                  className="fable-chip"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Create Account</span>
                </button>
                <button
                  type="button"
                  aria-pressed={authMode === 'RESET_PASSWORD'}
                  onClick={() => setAuthMode('RESET_PASSWORD')}
                  className="fable-chip"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Reset Password</span>
                </button>
              </div>

              {authError && (
                <div
                  role="alert"
                  className="mt-4 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--action-destructive)] p-3 text-xs font-medium text-[var(--text-primary)]"
                  style={{ backgroundColor: 'var(--action-destructive-tint)' }}
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-[var(--action-destructive)]" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="mt-5 space-y-4">
                {authMode === 'REGISTER' && (
                  <div>
                    <label
                      htmlFor="account-display-name"
                      className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
                    >
                      Pen Name
                    </label>
                    <input
                      id="account-display-name"
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Elena Vance"
                      className="fable-input mt-1.5"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="account-email"
                    className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
                  >
                    Email Address
                  </label>
                  <input
                    id="account-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="reader@fable.app"
                    className="fable-input mt-1.5"
                  />
                </div>

                <div>
                  <label
                    htmlFor="account-password"
                    className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
                  >
                    {authMode === 'RESET_PASSWORD' ? 'New Password' : 'Password'}
                  </label>
                  <div className="relative mt-1.5">
                    <input
                      id="account-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="fable-input pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="fable-btn fable-btn-ghost absolute top-1/2 right-1 min-h-0 -translate-y-1/2 p-2"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAuthBusy}
                  className="fable-btn fable-btn-primary w-full"
                >
                  <span>
                    {isAuthBusy
                      ? 'Submitting...'
                      : authMode === 'SIGN_IN'
                        ? 'Sign In'
                        : authMode === 'REGISTER'
                          ? 'Create Account'
                          : 'Update Password'}
                  </span>
                </button>
              </form>
            </section>
          ) : (
            <section className="fable-card space-y-5 p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-editorial text-xl font-bold text-[var(--text-primary)]">
                    {session.user.displayName}
                  </h2>
                  <p className="break-all text-xs text-[var(--text-secondary)]">
                    {session.user.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="fable-btn fable-btn-secondary text-xs"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="profile-name"
                    className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
                  >
                    Display Name
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="fable-input mt-1.5"
                  />
                </div>
                <div>
                  <label
                    htmlFor="profile-bio"
                    className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
                  >
                    Author Bio
                  </label>
                  <input
                    id="profile-bio"
                    type="text"
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="fable-input mt-1.5"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    void updateProfile(editName || session.user.displayName, editBio)
                  }
                  className="fable-btn fable-btn-primary text-xs"
                >
                  <span>Save Profile</span>
                </button>

                {!confirmDeleteAccount ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteAccount(true)}
                    className="fable-btn fable-btn-destructive text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Account</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void deleteAccount();
                        setConfirmDeleteAccount(false);
                      }}
                      className="fable-btn fable-btn-destructive text-xs"
                    >
                      <span>Confirm Permanent Delete</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteAccount(false)}
                      className="fable-btn fable-btn-secondary text-xs"
                    >
                      <span>Cancel</span>
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Published Stories Ledger */}
          <section className="space-y-4">
            <h2 className="border-b border-[var(--border-strong)] pb-2.5 font-editorial text-xl font-bold text-[var(--text-primary)]">
              Published Editions ({ownedStories.length})
            </h2>
            {ownedStories.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">
                Editions you publish from the Manuscript Desk appear here with editing and removal controls.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {ownedStories.map((st) => (
                  <div
                    key={st.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
                  >
                    <button
                      type="button"
                      onClick={() => openStoryDetail(st.id)}
                      className="text-left"
                    >
                      <p className="font-editorial text-base font-semibold text-[var(--text-primary)] hover:text-[var(--text-link)]">
                        {st.title}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {st.genre} · {st.chapters.length}{' '}
                        {st.chapters.length === 1 ? 'chapter' : 'chapters'}
                      </p>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openStoryEdit(st.id)}
                        className="fable-btn fable-btn-secondary min-h-9 px-3 py-1.5 text-xs"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                      {confirmDeleteStoryId !== st.id ? (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteStoryId(st.id)}
                          className="fable-btn fable-btn-destructive min-h-9 px-3 py-1.5 text-xs"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              void deleteOwnedStory(st.id);
                              setConfirmDeleteStoryId(null);
                            }}
                            className="fable-btn fable-btn-destructive min-h-9 px-3 py-1.5 text-xs"
                          >
                            <span>Confirm</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteStoryId(null)}
                            className="fable-btn fable-btn-secondary min-h-9 px-2.5 py-1.5 text-xs"
                          >
                            <span>Cancel</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Secondary 5-col Rail: Appearance & Server Diagnostics */}
        <aside className="space-y-6 lg:col-span-5">
          <section
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5"
            style={{ boxShadow: 'var(--shadow-raised)' }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--action-primary)]">
              APPEARANCE
            </p>
            <h2 className="mt-1 font-prose text-lg font-bold text-[var(--text-primary)]">
              App Theme
            </h2>

            <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-[var(--surface-sunken)] p-1">
              {(
                [
                  { id: 'SYSTEM', label: 'System', icon: Monitor },
                  { id: 'LIGHT', label: 'Light', icon: Sun },
                  { id: 'DARK', label: 'Dark', icon: Moon },
                ] as Array<{ id: AppAppearance; label: string; icon: any }>
              ).map((opt) => {
                const Icon = opt.icon;
                const active = readerPreferences.appAppearance === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setAppAppearance(opt.id)}
                    className={`flex items-center justify-center gap-1.5 rounded-[10px] py-2 text-xs font-semibold transition-all ${
                      active
                        ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="fable-card space-y-3 p-6">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-[var(--text-link)]" />
              <h2 className="font-editorial text-base font-bold text-[var(--text-primary)]">
                API Endpoint
              </h2>
            </div>
            <p className="break-all text-xs text-[var(--text-secondary)]">
              Active base URL: <code className="font-code text-[var(--text-link)]">{apiBaseUrl}</code>
            </p>

            {serverConfigError && (
              <p className="text-xs font-semibold text-[var(--action-destructive)]">
                {serverConfigError}
              </p>
            )}

            <label htmlFor="server-endpoint-input" className="sr-only">
              API Server Base URL
            </label>
            <input
              id="server-endpoint-input"
              type="text"
              value={serverInput}
              onChange={(e) => setServerInput(e.target.value)}
              placeholder="/api/v1/"
              className="fable-input font-code text-xs"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyServerUrl(serverInput)}
                className="fable-btn fable-btn-primary text-xs"
              >
                <span>Apply Endpoint</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  resetServerUrl();
                  setServerInput('/api/v1/');
                }}
                className="fable-btn fable-btn-secondary text-xs"
              >
                <span>Reset Default</span>
              </button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
