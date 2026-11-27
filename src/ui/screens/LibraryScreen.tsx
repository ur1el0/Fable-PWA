import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  Clock,
  Play,
  RefreshCw,
  User,
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
  const session = useFableStore((s) => s.session);
  const refreshCatalog = useFableStore((s) => s.refreshCatalog);
  const openStoryDetail = useFableStore((s) => s.openStoryDetail);
  const openStoryReader = useFableStore((s) => s.openStoryReader);
  const toggleBookmark = useFableStore((s) => s.toggleBookmark);
  const selectTab = useFableStore((s) => s.selectTab);

  const [selectedGenre, setSelectedGenre] = useState<string>('All');

  const genres = useMemo(() => {
    const unique = Array.from(new Set(stories.map((s) => s.genre).filter(Boolean)));
    return ['All', ...unique];
  }, [stories]);

  const filteredStories = useMemo(() => {
    if (selectedGenre === 'All') return stories;
    return stories.filter(
      (s) => s.genre.toLowerCase() === selectedGenre.toLowerCase()
    );
  }, [stories, selectedGenre]);

  const featuredStory =
    filteredStories.find((s) => s.featuredRank === 1) ?? filteredStories[0] ?? null;

  const continueReading = filteredStories.filter(
    (s) => s.readingProgress > 0 && s.readingProgress < 0.99
  );

  const gutenbergStories = filteredStories.filter((s) => s.provider === 'GUTENBERG');
  const standardEbooksStories = filteredStories.filter(
    (s) => s.provider === 'STANDARD_EBOOKS'
  );
  const browseStories = filteredStories.filter((s) => s.id !== featuredStory?.id);

  return (
    <div className="space-y-7 pb-6">
      {/* iOS LibraryView Header */}
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--action-primary)]">
              DISCOVER
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{
                backgroundColor: usingOfflineFallback
                  ? 'var(--status-warning-bg)'
                  : 'var(--status-success-bg)',
                color: usingOfflineFallback
                  ? 'var(--status-warning-text)'
                  : 'var(--status-success-text)',
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: usingOfflineFallback
                    ? 'var(--status-warning-text)'
                    : 'var(--status-success-text)',
                }}
              />
              {usingOfflineFallback ? 'Offline Cache' : 'Live Cloud'}
            </span>
          </div>
          <h1 className="text-[32px] font-black leading-tight tracking-tight text-[var(--text-primary)]">
            Library
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refreshCatalog()}
            disabled={isRefreshing}
            aria-label="Sync catalog"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)]"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => selectTab('ACCOUNT')}
            aria-label="Open profile"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] text-xs font-bold text-[var(--action-primary)] shadow-sm transition-transform active:scale-95"
          >
            {session?.user.displayName ? (
              <span>{session.user.displayName.slice(0, 1).toUpperCase()}</span>
            ) : (
              <User className="h-4 w-4" />
            )}
          </button>
        </div>
      </header>

      {/* Category Filter Capsules */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {genres.map((cat) => {
          const active = selectedGenre === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedGenre(cat)}
              className={`shrink-0 rounded-full px-4 py-2 text-[13px] transition-all active:scale-95 ${
                active
                  ? 'bg-[var(--action-primary)] font-semibold text-white shadow-sm'
                  : 'bg-[var(--surface-sunken)] font-medium text-[var(--text-primary)] hover:bg-[var(--action-secondary-hover)]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Featured Hero Card (iOS 20pt radius + cover scrim + badge) */}
      {featuredStory && (
        <section
          onClick={() => openStoryReader(featuredStory.id)}
          className="cursor-pointer overflow-hidden rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-card)] transition-transform active:scale-[0.99]"
          style={{ boxShadow: 'var(--shadow-raised)' }}
        >
          <div className="relative h-52 w-full overflow-hidden bg-[var(--brand-secondary)] sm:h-60">
            {featuredStory.coverImageUrl ? (
              <img
                src={featuredStory.coverImageUrl}
                alt={`Cover for ${featuredStory.title}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1E293B] via-[#273654] to-[#3B59F6] p-6">
                <BookSpineCover story={featuredStory} size="lg" />
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

            <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-2">
              <span className="rounded-full bg-black/55 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white backdrop-blur-md">
                FEATURED TITLE
              </span>
              <button
                type="button"
                aria-label={featuredStory.isBookmarked ? 'Remove bookmark' : 'Bookmark story'}
                onClick={(e) => {
                  e.stopPropagation();
                  void toggleBookmark(featuredStory.id);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-transform active:scale-90"
              >
                <Bookmark
                  className="h-4 w-4"
                  fill={featuredStory.isBookmarked ? 'currentColor' : 'none'}
                />
              </button>
            </div>
          </div>

          <div className="space-y-2.5 p-5">
            <div className="flex flex-wrap items-center gap-2 text-[13px] text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">
                {featuredStory.author}
              </span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {featuredStory.readTimeMinutes}m read
              </span>
              {downloadedIds.has(featuredStory.id) && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    backgroundColor: 'var(--status-success-bg)',
                    color: 'var(--status-success-text)',
                  }}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  OFFLINE
                </span>
              )}
            </div>

            <h2 className="font-prose text-2xl font-bold leading-snug text-[var(--text-primary)]">
              {featuredStory.title}
            </h2>

            <p className="line-clamp-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              {featuredStory.synopsis}
            </p>
          </div>
        </section>
      )}

      {/* Continue Reading */}
      {continueReading.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Continue Reading
            </h2>
            <button
              type="button"
              onClick={() => selectTab('SHELF')}
              className="text-xs font-semibold text-[var(--action-primary)] hover:underline"
            >
              See All
            </button>
          </div>

          <div className="space-y-2.5">
            {continueReading.map((story) => {
              const pct = Math.max(4, Math.round(story.readingProgress * 100));
              return (
                <div
                  key={story.id}
                  onClick={() => openStoryReader(story.id)}
                  className="flex cursor-pointer items-center gap-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3.5 transition-transform active:scale-[0.99]"
                  style={{ boxShadow: 'var(--shadow-raised)' }}
                >
                  <BookSpineCover story={story} size="sm" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <span className="inline-block rounded-full bg-[var(--action-primary-tint)] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[var(--action-primary)]">
                      {story.contentFormat === 'COMIC' ? 'Manga' : story.genre}
                    </span>
                    <p className="truncate font-prose text-base font-bold text-[var(--text-primary)]">
                      {story.title}
                    </p>
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[var(--action-primary)] to-[var(--brand-accent)]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] font-medium text-[var(--text-secondary)]">
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--action-primary-tint)] text-[var(--action-primary)]">
                    <Play className="h-4 w-4 fill-current" />
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Horizontal Carousel: Project Gutenberg */}
      {gutenbergStories.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              New on Gutenberg
            </h2>
            <p className="text-xs text-[var(--text-tertiary)]">
              Timeless public domain editions
            </p>
          </div>
          <div className="-mx-4 flex gap-3.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {gutenbergStories.slice(0, 10).map((story) => (
              <button
                key={story.id}
                type="button"
                onClick={() => openStoryDetail(story.id)}
                className="w-[132px] shrink-0 space-y-2 text-left transition-transform active:scale-95"
              >
                <div className="relative h-[166px] w-[132px] overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
                  {story.coverImageUrl ? (
                    <img
                      src={story.coverImageUrl}
                      alt={story.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center p-2">
                      <BookSpineCover story={story} size="md" />
                    </div>
                  )}
                  <span className="absolute top-2 left-2 rounded-full bg-[var(--action-primary)] px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-white">
                    {providerBadgeLabel(story.provider)}
                  </span>
                </div>
                <p className="line-clamp-2 font-prose text-[13px] font-semibold leading-snug text-[var(--text-primary)]">
                  {story.title}
                </p>
                <p className="truncate text-[11px] text-[var(--text-tertiary)]">
                  {story.author}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Horizontal Carousel: Standard Ebooks */}
      {standardEbooksStories.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Standard Ebooks
            </h2>
            <p className="text-xs text-[var(--text-tertiary)]">
              Carefully typeset classics
            </p>
          </div>
          <div className="-mx-4 flex gap-3.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {standardEbooksStories.slice(0, 10).map((story) => (
              <button
                key={story.id}
                type="button"
                onClick={() => openStoryDetail(story.id)}
                className="w-[132px] shrink-0 space-y-2 text-left transition-transform active:scale-95"
              >
                <div className="relative h-[166px] w-[132px] overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
                  {story.coverImageUrl ? (
                    <img
                      src={story.coverImageUrl}
                      alt={story.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center p-2">
                      <BookSpineCover story={story} size="md" />
                    </div>
                  )}
                  <span className="absolute top-2 left-2 rounded-full bg-[var(--action-primary)] px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-white">
                    CLASSIC
                  </span>
                </div>
                <p className="line-clamp-2 font-prose text-[13px] font-semibold leading-snug text-[var(--text-primary)]">
                  {story.title}
                </p>
                <p className="truncate text-[11px] text-[var(--text-tertiary)]">
                  {story.author}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Browse Library */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Browse Library
          </h2>
          <button
            type="button"
            onClick={() => selectTab('EXPLORE')}
            className="text-xs font-semibold text-[var(--action-primary)] hover:underline"
          >
            Explore All
          </button>
        </div>

        <div className="space-y-3">
          {browseStories.map((story) => (
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
