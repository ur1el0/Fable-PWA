import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Clock,
  Download,
  Share,
  Smartphone,
  Star,
  X,
} from 'lucide-react';
import type { Story, StoryProvider } from '../../domain/models';

export function providerBadgeLabel(provider: StoryProvider): string {
  switch (provider) {
    case 'FABLE':
      return 'Fable Original';
    case 'GUTENBERG':
      return 'Project Gutenberg';
    case 'STANDARD_EBOOKS':
      return 'Standard Ebooks';
    case 'MANGADEX':
      return 'MangaDex';
  }
}

function spineCssVar(provider: StoryProvider): string {
  switch (provider) {
    case 'FABLE':
      return 'var(--spine-terracotta)';
    case 'STANDARD_EBOOKS':
      return 'var(--spine-forest)';
    case 'GUTENBERG':
      return 'var(--spine-slate)';
    case 'MANGADEX':
      return 'var(--spine-plum)';
  }
}

export function BookSpineCover({
  story,
  size = 'md',
}: {
  story: Story;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dims =
    size === 'lg'
      ? 'h-56 w-40 p-4'
      : size === 'sm'
        ? 'h-24 w-16 p-2'
        : 'h-32 w-24 p-3';

  return (
    <div
      className={`relative flex shrink-0 flex-col justify-between overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border-subtle)] ${dims}`}
      style={{
        backgroundColor: spineCssVar(story.provider),
        color: 'var(--text-on-action)',
      }}
    >
      {story.coverImageUrl ? (
        <img
          src={story.coverImageUrl}
          alt={story.title}
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-current/25 pb-1.5">
            <span className="text-[length:var(--text-2xs)] font-semibold uppercase tracking-widest opacity-85">
              {story.contentFormat === 'COMIC' ? 'Comic' : story.genre.split(' ')[0]}
            </span>
          </div>
          <p
            className={`font-editorial font-semibold leading-snug ${
              size === 'lg' ? 'text-base line-clamp-4' : 'text-xs line-clamp-3'
            }`}
          >
            {story.title}
          </p>
          <p className="truncate text-[length:var(--text-2xs)] opacity-80">{story.author}</p>
        </>
      )}
    </div>
  );
}

/**
 * Editorial Index Ledger Row:
 * Clean flat horizontal hairline separation (no repeated heavy card boxes),
 * crisp serif title, 65ch synopsis measure, and explicit primary/secondary action tokens.
 */
export function StoryCardRow({
  story,
  isOfflineDownloaded,
  onOpenDetail,
  onOpenReader,
  onToggleBookmark,
}: {
  story: Story;
  isOfflineDownloaded: boolean;
  onOpenDetail: () => void;
  onOpenReader: () => void;
  onToggleBookmark: () => void;
}) {
  return (
    <article
      onClick={onOpenDetail}
      className="group flex cursor-pointer flex-col gap-4 border-b border-[var(--border-subtle)] py-6 transition-colors first:pt-2 last:border-b-0 sm:flex-row sm:items-start sm:gap-6"
    >
      <div className="flex items-start gap-4 sm:contents">
        <BookSpineCover story={story} size="md" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-tertiary)]">
            <span className="font-semibold uppercase tracking-wider text-[var(--text-link)]">
              {providerBadgeLabel(story.provider)}
            </span>
            <span aria-hidden="true">/</span>
            <span>{story.genre}</span>
            {isOfflineDownloaded && (
              <span
                className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border px-2 py-0.5 text-[length:var(--text-xxs)] font-semibold"
                style={{
                  backgroundColor: 'var(--status-success-bg)',
                  color: 'var(--status-success-text)',
                  borderColor: 'var(--status-success-border)',
                }}
              >
                <CheckCircle2 className="h-3 w-3" />
                Saved Offline
              </span>
            )}
          </div>

          <h3 className="mt-1.5 font-editorial text-xl font-semibold leading-snug text-[var(--text-primary)] transition-colors group-hover:text-[var(--text-link)]">
            {story.title}
          </h3>
          <p className="mt-0.5 text-sm font-medium text-[var(--text-secondary)]">
            by {story.author}
          </p>

          <p className="prose-measure mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            {story.synopsis || 'Open to read the synopsis and chapter list.'}
          </p>

          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {story.readTimeMinutes} min
              </span>
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5" />
                {story.rating.toFixed(1)}
              </span>
              {story.readingProgress > 0 && (
                <span className="font-semibold text-[var(--text-primary)]">
                  {Math.round(story.readingProgress * 100)}% read
                </span>
              )}
            </div>

            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={onToggleBookmark}
                aria-label={story.isBookmarked ? 'Remove from Shelf' : 'Save to Shelf'}
                aria-pressed={story.isBookmarked}
                className="fable-btn fable-btn-secondary px-3"
              >
                {story.isBookmarked ? (
                  <BookmarkCheck className="h-4 w-4 text-[var(--text-link)]" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {story.isBookmarked ? 'Saved' : 'Save'}
                </span>
              </button>
              <button
                type="button"
                onClick={onOpenReader}
                className="fable-btn fable-btn-primary"
              >
                {story.readingProgress > 0 ? 'Continue' : 'Read'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Quiet Header/Inline Install Control + Modal Guide:
 * Replaces the bulky viewport-stealing banner with a compact editorial action pill.
 */
export function PwaInstallAction() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (!showGuideModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowGuideModal(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showGuideModal]);

  if (isStandalone) return null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstall}
        className="fable-btn fable-btn-secondary text-xs"
      >
        <Download className="h-3.5 w-3.5" />
        <span>{deferredPrompt ? 'Install App' : 'Get Mobile App'}</span>
      </button>

      {showGuideModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="fable-install-dialog-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowGuideModal(false);
            }}
            className="fable-backdrop-enter fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'var(--surface-backdrop)' }}
          >
            <div
              className="fable-card fable-modal-enter max-h-[85vh] w-full max-w-md overflow-y-auto p-6"
              style={{ boxShadow: 'var(--shadow-modal)' }}
            >
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="h-5 w-5 text-[var(--text-link)]" />
                  <h2
                    id="fable-install-dialog-title"
                    className="font-editorial text-lg font-semibold text-[var(--text-primary)]"
                  >
                    Install Fable
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  aria-label="Close install instructions"
                  className="fable-btn fable-btn-ghost min-h-0 p-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 space-y-4 text-sm text-[var(--text-secondary)]">
                <div className="rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-4">
                  <p className="font-semibold text-[var(--text-primary)]">
                    iPhone & iPad (Safari)
                  </p>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-5">
                    <li>
                      Tap <strong className="text-[var(--text-primary)]">Share</strong>{' '}
                      <Share className="inline h-3.5 w-3.5 text-[var(--text-link)]" /> in Safari.
                    </li>
                    <li>
                      Tap{' '}
                      <strong className="text-[var(--text-primary)]">Add to Home Screen</strong>.
                    </li>
                    <li>
                      Tap <strong className="text-[var(--text-primary)]">Add</strong>.
                    </li>
                  </ol>
                </div>

                <div className="rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-4">
                  <p className="font-semibold text-[var(--text-primary)]">
                    Android (Chrome, Edge, Firefox)
                  </p>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-5">
                    <li>Open the browser menu in the top-right.</li>
                    <li>
                      Tap <strong className="text-[var(--text-primary)]">Install app</strong> or{' '}
                      <strong className="text-[var(--text-primary)]">Add to Home screen</strong>.
                    </li>
                  </ol>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="fable-btn fable-btn-primary"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
