import React from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  RefreshCw,
  Star,
  WifiOff,
} from 'lucide-react';
import { useFableStore } from '../../store/useFableStore';
import {
  BookSpineCover,
  providerBadgeLabel,
  StoryCardRow,
} from '../components/FableComponents';

export function LibraryScreen() {
  const stories = useFableStore((s) => s.stories);
  const downloadedIds = useFableStore((s) => s.downloadedStoryIds);
  const isRefreshing = useFableStore((s) => s.isRefreshingCatalog);
  const usingOfflineFallback = useFableStore((s) => s.usingOfflineFallback);
  const refreshCatalog = useFableStore((s) => s.refreshCatalog);
  const openStoryDetail = useFableStore((s) => s.openStoryDetail);
  const openStoryReader = useFableStore((s) => s.openStoryReader);
  const toggleBookmark = useFableStore((s) => s.toggleBookmark);
  const selectTab = useFableStore((s) => s.selectTab);

  const featuredStory =
    stories.find((s) => s.featuredRank === 1) ?? stories[0] ?? null;
  const continueReading = stories.filter(
    (s) => s.readingProgress > 0 && s.readingProgress < 0.99
  );
  const ledgerStories = stories.filter((s) => s.id !== featuredStory?.id);

  return (
    <div className="space-y-14">
      {/* SECTION 1: Asymmetric 8/4 Editorial Lead Split (Variance Archetype #1) */}
      {featuredStory && (
        <section className="border-b border-[var(--border-subtle)] pb-10 sm:pb-14">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-semibold uppercase tracking-widest text-[var(--text-link)]">
                Featured
              </span>
              <span className="text-[var(--text-tertiary)]">/</span>
              <span className="font-medium text-[var(--text-secondary)]">
                {providerBadgeLabel(featuredStory.provider)}
              </span>
              {usingOfflineFallback && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-[length:var(--text-xxs)] font-medium"
                  style={{
                    backgroundColor: 'var(--status-warning-bg)',
                    color: 'var(--status-warning-text)',
                    borderColor: 'var(--status-warning-border)',
                  }}
                >
                  <WifiOff className="h-3 w-3" />
                  Offline
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => void refreshCatalog()}
              disabled={isRefreshing}
              className="fable-btn fable-btn-ghost min-h-9 px-2.5 py-1 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
            </button>
          </div>

          <div className="grid gap-8 md:grid-cols-12 md:items-start">
            {/* 8-column Typography Lead */}
            <div className="space-y-5 md:col-span-8">
              <h1 className="display-headline font-bold text-[var(--text-primary)]">
                {featuredStory.title}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
                <span>
                  By <strong className="font-semibold text-[var(--text-primary)]">{featuredStory.author}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>{featuredStory.genre}</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {featuredStory.readTimeMinutes} min read
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" />
                  {featuredStory.rating.toFixed(1)}
                </span>
                {downloadedIds.has(featuredStory.id) && (
                  <span
                    className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border px-2.5 py-0.5 text-xs font-semibold"
                    style={{
                      backgroundColor: 'var(--status-success-bg)',
                      color: 'var(--status-success-text)',
                      borderColor: 'var(--status-success-border)',
                    }}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Offline Ready
                  </span>
                )}
              </div>

              <p className="prose-measure text-base leading-relaxed text-[var(--text-secondary)]">
                {featuredStory.synopsis}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => openStoryReader(featuredStory.id)}
                  className="fable-btn fable-btn-primary px-6"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>
                    {featuredStory.readingProgress > 0 ? 'Continue' : 'Read'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => openStoryDetail(featuredStory.id)}
                  className="fable-btn fable-btn-secondary"
                >
                  <span>Details</span>
                </button>
              </div>
            </div>

            {/* 4-column Book Folio & Chapter Excerpt Preview */}
            <aside
              onClick={() => openStoryDetail(featuredStory.id)}
              className="fable-card fable-card-interactive cursor-pointer p-5 md:col-span-4"
            >
              <div className="flex items-start gap-4">
                <BookSpineCover story={featuredStory} size="md" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                    Edition Notes
                  </p>
                  <p className="font-editorial text-sm font-semibold text-[var(--text-primary)]">
                    {featuredStory.chapters.length}{' '}
                    {featuredStory.chapters.length === 1 ? 'Chapter' : 'Chapters'}
                  </p>
                  <p className="line-clamp-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                    {featuredStory.authorBio ||
                      'Typeset for continuous scroll and paginated reading.'}
                  </p>
                </div>
              </div>
              {featuredStory.chapters[0]?.content && (
                <blockquote className="mt-4 border-t border-[var(--border-subtle)] pt-3.5 font-editorial text-xs italic leading-relaxed text-[var(--text-secondary)] line-clamp-3">
                  “{featuredStory.chapters[0].content.split('\n\n')[0]}”
                </blockquote>
              )}
            </aside>
          </div>
        </section>
      )}

      {/* SECTION 2: Compact Active Reading Band */}
      {continueReading.length > 0 && (
        <section className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4">
            <h2 className="font-editorial text-lg font-semibold text-[var(--text-primary)]">
              Continue Reading
            </h2>
            <button
              type="button"
              onClick={() => selectTab('SHELF')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-link)] hover:underline"
            >
              <span>Shelf</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[var(--border-subtle)]">
            {continueReading.map((story) => {
              const pct = Math.max(4, Math.round(story.readingProgress * 100));
              return (
                <div
                  key={story.id}
                  onClick={() => openStoryReader(story.id)}
                  className="flex cursor-pointer flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-editorial text-base font-semibold text-[var(--text-primary)]">
                      {story.title}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {story.author} · Chapter {story.lastReadChapterIndex + 1} of{' '}
                      {Math.max(1, story.chapters.length)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 sm:w-64">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-[var(--radius-pill)] bg-[var(--border-subtle)]">
                      <div
                        className="h-full rounded-[var(--radius-pill)] bg-[var(--action-primary)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-code text-xs font-medium text-[var(--text-primary)]">
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 3: Editorial Index Ledger (Variance Archetype #3: Typographic List) */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border-strong)] pb-3">
          <div>
            <h2 className="font-editorial text-2xl font-bold text-[var(--text-primary)]">
              Library
            </h2>
          </div>
          <button
            type="button"
            onClick={() => selectTab('EXPLORE')}
            className="fable-btn fable-btn-secondary text-xs"
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Explore</span>
          </button>
        </div>

        <div className="mt-2">
          {ledgerStories.map((story) => (
            <StoryCardRow
              key={story.id}
              story={story}
              isOfflineDownloaded={downloadedIds.has(story.id)}
              onOpenDetail={() => openStoryDetail(story.id)}
              onOpenReader={() => openStoryReader(story.id)}
              onToggleBookmark={() => void toggleBookmark(story.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
