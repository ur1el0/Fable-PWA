import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  ExternalLink,
  Loader2,
  Star,
  Trash2,
} from 'lucide-react';
import { useFableStore } from '../../store/useFableStore';
import { BookSpineCover, providerBadgeLabel } from '../components/FableComponents';

export function StoryDetailScreen({ storyId }: { storyId: string }) {
  const stories = useFableStore((s) => s.stories);
  const downloadedIds = useFableStore((s) => s.downloadedStoryIds);
  const downloadingStoryId = useFableStore((s) => s.downloadingStoryId);
  const session = useFableStore((s) => s.session);
  const navigateBack = useFableStore((s) => s.navigateBack);
  const openStoryReader = useFableStore((s) => s.openStoryReader);
  const openStoryEdit = useFableStore((s) => s.openStoryEdit);
  const toggleBookmark = useFableStore((s) => s.toggleBookmark);
  const downloadStoryForOffline = useFableStore((s) => s.downloadStoryForOffline);
  const removeStoryOfflineCopy = useFableStore((s) => s.removeStoryOfflineCopy);
  const deleteOwnedStory = useFableStore((s) => s.deleteOwnedStory);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const story = stories.find((s) => s.id === storyId);
  if (!story) {
    return (
      <div className="space-y-4 py-8">
        <button
          type="button"
          onClick={navigateBack}
          className="fable-btn fable-btn-secondary text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <p className="text-sm text-[var(--text-secondary)]">Story not found.</p>
      </div>
    );
  }

  const isDownloaded = downloadedIds.has(story.id);
  const isDownloading = downloadingStoryId === story.id;
  const isOwner =
    story.provider === 'FABLE' &&
    Boolean(
      story.id.startsWith('fable-local-') ||
        (session && story.ownerUserId && story.ownerUserId === session.user.id)
    );

  return (
    <div className="space-y-12">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
        <button
          type="button"
          onClick={navigateBack}
          className="fable-btn fable-btn-secondary text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Catalog</span>
        </button>

        {isOwner && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openStoryEdit(story.id)}
              className="fable-btn fable-btn-secondary text-xs"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Edition</span>
            </button>
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="fable-btn fable-btn-destructive text-xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void deleteOwnedStory(story.id)}
                  className="fable-btn fable-btn-destructive text-xs"
                >
                  <span>Confirm Delete</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="fable-btn fable-btn-secondary text-xs"
                >
                  <span>Cancel</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* iOS Hero Cover & Metadata Card */}
      <section
        className="overflow-hidden rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-card)]"
        style={{ boxShadow: 'var(--shadow-raised)' }}
      >
        <div className="relative h-56 w-full overflow-hidden bg-[var(--brand-secondary)] sm:h-64">
          {story.coverImageUrl ? (
            <img
              src={story.coverImageUrl}
              alt={story.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1E293B] via-[#273654] to-[#3B59F6] p-6">
              <BookSpineCover story={story} size="lg" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

          <div className="absolute inset-x-5 bottom-5 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--action-primary)] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                {providerBadgeLabel(story.provider)}
              </span>
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                {story.genre}
              </span>
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                {story.contentFormat === 'COMIC' ? 'Manga' : 'Prose'}
              </span>
            </div>
            <h1 className="font-prose text-2xl font-bold leading-tight text-white sm:text-3xl">
              {story.title}
            </h1>
            <p className="text-xs font-medium text-white/85">
              By {story.author}
            </p>
          </div>
        </div>

        <div className="grid gap-8 p-5 sm:p-7 md:grid-cols-12">
          <div className="space-y-5 md:col-span-8">
            <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[var(--action-primary)]" />
                {story.readTimeMinutes} min read
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Star className="h-4 w-4 text-[var(--action-primary)]" />
                {story.rating.toFixed(1)} rating
              </span>
              <span>
                {Math.max(1, story.chapters.length)}{' '}
                {story.chapters.length === 1 ? 'chapter' : 'chapters'}
              </span>
            </div>

            <p className="prose-measure text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
              {story.synopsis}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => openStoryReader(story.id)}
                className="fable-btn fable-btn-primary rounded-[14px] px-6"
              >
                <BookOpen className="h-4 w-4" />
                <span>
                  {story.readingProgress > 0
                    ? `Continue (Chapter ${story.lastReadChapterIndex + 1})`
                    : 'Begin Reading'}
                </span>
              </button>

              <button
                type="button"
                aria-pressed={story.isBookmarked}
                onClick={() => void toggleBookmark(story.id)}
                className="fable-btn fable-btn-secondary rounded-[14px]"
              >
                {story.isBookmarked ? (
                  <>
                    <BookmarkCheck className="h-4 w-4 text-[var(--action-primary)]" />
                    <span>Saved on Shelf</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="h-4 w-4" />
                    <span>Save to Shelf</span>
                  </>
                )}
              </button>

              {story.sourceUrl && (
                <a
                  href={story.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="fable-btn fable-btn-ghost text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Original Source</span>
                </a>
              )}
            </div>
          </div>

          <aside className="space-y-5 md:col-span-4">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--action-primary)]">
                About the Author
              </h2>
              <p className="mt-1.5 font-prose text-sm font-bold text-[var(--text-primary)]">
                {story.author}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                {story.authorBio || 'Featured contributor in the Fable literary catalog.'}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
              <div className="flex items-start gap-3">
                {isDownloaded ? (
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0"
                    style={{ color: 'var(--status-success-text)' }}
                  />
                ) : (
                  <Download className="mt-0.5 h-5 w-5 shrink-0 text-[var(--action-primary)]" />
                )}
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {isDownloaded ? 'Stored Offline on Device' : 'Offline Reading Copy'}
                  </h3>
                  <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                    {isDownloaded
                      ? 'All chapters are saved in IndexedDB for reading without a connection.'
                      : 'Save every chapter to this device so you can read offline anytime.'}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                {isDownloaded ? (
                  <button
                    type="button"
                    onClick={() => void removeStoryOfflineCopy(story.id)}
                    className="fable-btn fable-btn-secondary w-full rounded-xl text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-[var(--action-destructive)]" />
                    <span>Remove Offline Copy</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isDownloading}
                    onClick={() => void downloadStoryForOffline(story.id)}
                    className="fable-btn fable-btn-secondary w-full rounded-xl text-xs"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving Chapters...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5" />
                        <span>Download for Offline</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Table of Contents Index */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-[var(--text-primary)]">
          Table of Contents ({story.chapters.length})
        </h2>

        <div className="space-y-2.5">
          {story.chapters.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => openStoryReader(story.id, ch.index)}
              className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-5 py-4 text-left transition-all hover:border-[var(--action-primary)] active:scale-[0.99]"
              style={{ boxShadow: 'var(--shadow-raised)' }}
            >
              <div>
                <p className="font-prose text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--action-primary)]">
                  {ch.title}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {story.contentFormat === 'COMIC'
                    ? `${Math.max(ch.pageCount, ch.pages.length)} illustrated panels`
                    : `${ch.readTimeMinutes} min read`}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--action-primary-tint)] px-3 py-1 text-xs font-semibold text-[var(--action-primary)]">
                <span>Read</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
