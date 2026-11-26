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

      {/* Asymmetric 8/4 Jacket Overview */}
      <section className="grid gap-10 border-b border-[var(--border-subtle)] pb-12 md:grid-cols-12">
        <div className="space-y-5 md:col-span-8">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-tertiary)]">
            <span className="font-semibold uppercase tracking-widest text-[var(--text-link)]">
              {providerBadgeLabel(story.provider)}
            </span>
            <span aria-hidden="true">/</span>
            <span>{story.contentFormat === 'COMIC' ? 'Sequential Art' : 'Prose Edition'}</span>
            <span aria-hidden="true">/</span>
            <span>{story.genre}</span>
          </div>

          <h1 className="display-headline font-bold text-[var(--text-primary)]">
            {story.title}
          </h1>

          <p className="text-base text-[var(--text-secondary)]">
            By <strong className="font-semibold text-[var(--text-primary)]">{story.author}</strong>
          </p>

          <div className="flex flex-wrap items-center gap-5 text-xs text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-[var(--text-link)]" />
              {story.readTimeMinutes} min read
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Star className="h-4 w-4 text-[var(--text-link)]" />
              {story.rating.toFixed(1)} rating
            </span>
            <span>
              {Math.max(1, story.chapters.length)}{' '}
              {story.chapters.length === 1 ? 'chapter' : 'chapters'}
            </span>
          </div>

          <p className="prose-measure text-base leading-relaxed text-[var(--text-secondary)]">
            {story.synopsis}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => openStoryReader(story.id)}
              className="fable-btn fable-btn-primary px-6"
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
              className="fable-btn fable-btn-secondary"
            >
              {story.isBookmarked ? (
                <>
                  <BookmarkCheck className="h-4 w-4 text-[var(--text-link)]" />
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

        {/* Right 4-col Spine + Author & Offline Card */}
        <aside className="space-y-6 md:col-span-4">
          <div className="flex items-start gap-4">
            <BookSpineCover story={story} size="lg" />
            <div className="space-y-2 pt-1">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                About the Author
              </h2>
              <p className="font-editorial text-sm font-bold text-[var(--text-primary)]">
                {story.author}
              </p>
              <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                {story.authorBio || 'Featured contributor in the Fable literary catalog.'}
              </p>
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5">
            <div className="flex items-start gap-3">
              {isDownloaded ? (
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0"
                  style={{ color: 'var(--status-success-text)' }}
                />
              ) : (
                <Download className="mt-0.5 h-5 w-5 shrink-0 text-[var(--text-link)]" />
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
                  className="fable-btn fable-btn-secondary w-full text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5 text-[var(--action-destructive)]" />
                  <span>Remove Offline Copy</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isDownloading}
                  onClick={() => void downloadStoryForOffline(story.id)}
                  className="fable-btn fable-btn-secondary w-full text-xs"
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
      </section>

      {/* Table of Contents Index */}
      <section className="space-y-4">
        <h2 className="border-b border-[var(--border-strong)] pb-3 font-editorial text-2xl font-bold text-[var(--text-primary)]">
          Table of Contents ({story.chapters.length})
        </h2>

        <div className="divide-y divide-[var(--border-subtle)]">
          {story.chapters.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => openStoryReader(story.id, ch.index)}
              className="group flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:text-[var(--text-link)]"
            >
              <div>
                <p className="font-editorial text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--text-link)]">
                  {ch.title}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {story.contentFormat === 'COMIC'
                    ? `${Math.max(ch.pageCount, ch.pages.length)} illustrated panels`
                    : `${ch.readTimeMinutes} min read`}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-link)]">
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
