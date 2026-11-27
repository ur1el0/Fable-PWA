import React, { useMemo, useState } from 'react';
import {
  Check,
  Loader2,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { useFableStore } from '../../store/useFableStore';
import { BookSpineCover, StoryCardRow } from '../components/FableComponents';

type QuickFilter = 'All' | 'Under 5 mins' | 'Quick Reads' | 'Books' | 'Manga';

const QUICK_FILTERS: QuickFilter[] = [
  'All',
  'Under 5 mins',
  'Quick Reads',
  'Books',
  'Manga',
];

const GENRE_GRADIENTS = [
  'from-[#1E293B] via-[#2A3F6B] to-[#3B59F6]',
  'from-[#1E1B4B] via-[#312E81] to-[#4F46E5]',
  'from-[#0F172A] via-[#1E3A5F] to-[#2563EB]',
  'from-[#18181B] via-[#27272A] to-[#4338CA]',
];

export function ExploreScreen() {
  const stories = useFableStore((s) => s.stories);
  const downloadedIds = useFableStore((s) => s.downloadedStoryIds);
  const exploreQuery = useFableStore((s) => s.exploreQuery);
  const isSearching = useFableStore((s) => s.isSearchingExplore);
  const setExploreQuery = useFableStore((s) => s.setExploreQuery);
  const setExploreFormat = useFableStore((s) => s.setExploreFormat);
  const openStoryDetail = useFableStore((s) => s.openStoryDetail);
  const openStoryReader = useFableStore((s) => s.openStoryReader);
  const toggleBookmark = useFableStore((s) => s.toggleBookmark);

  const [quickFilter, setQuickFilter] = useState<QuickFilter>('All');
  const [searchFocused, setSearchFocused] = useState(false);

  const searchResults = useMemo(() => {
    const q = exploreQuery.trim().toLowerCase();
    if (!q) return [];
    return stories.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.author.toLowerCase().includes(q) ||
        s.genre.toLowerCase().includes(q) ||
        s.synopsis.toLowerCase().includes(q)
    );
  }, [stories, exploreQuery]);

  const curatedStories = useMemo(() => {
    switch (quickFilter) {
      case 'Under 5 mins':
        return stories.filter((s) => s.readTimeMinutes > 0 && s.readTimeMinutes <= 5);
      case 'Quick Reads':
        return stories.filter((s) => s.readTimeMinutes > 0 && s.readTimeMinutes <= 3);
      case 'Books':
        return stories.filter((s) => s.contentFormat === 'PROSE');
      case 'Manga':
        return stories.filter((s) => s.contentFormat === 'COMIC');
      default:
        return stories;
    }
  }, [stories, quickFilter]);

  const popularGenres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of stories) {
      if (!s.genre) continue;
      counts.set(s.genre, (counts.get(s.genre) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [stories]);

  const trendingCreators = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of stories) {
      if (!s.author) continue;
      counts.set(s.author, (counts.get(s.author) ?? 0) + 1);
    }
    return Array.from(counts.entries()).slice(0, 8);
  }, [stories]);

  return (
    <div className="space-y-7 pb-8">
      {/* Editorial Title Area */}
      <header className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--action-primary)]">
            CURATED CATALOG
          </p>
          <span className="text-xs font-semibold text-[var(--text-tertiary)]">
            Discovery
          </span>
        </div>
        <h1 className="font-prose text-[34px] font-bold leading-tight text-[var(--text-primary)]">
          Explore
        </h1>
      </header>

      {/* Focus-Reactive Search Bar (iOS 14pt radius) */}
      <div
        className={`flex items-center gap-3 rounded-[14px] border bg-[var(--surface-card)] px-4 py-3 transition-all ${
          searchFocused
            ? 'border-[var(--action-primary)] ring-2 ring-[var(--action-primary-tint)]'
            : 'border-[var(--border-subtle)]'
        }`}
        style={{ boxShadow: 'var(--shadow-raised)' }}
      >
        {isSearching ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--action-primary)]" />
        ) : (
          <Search
            className={`h-4 w-4 shrink-0 ${
              searchFocused
                ? 'text-[var(--action-primary)]'
                : 'text-[var(--text-tertiary)]'
            }`}
          />
        )}
        <input
          type="search"
          value={exploreQuery}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          onChange={(e) => setExploreQuery(e.target.value)}
          placeholder="Search stories, genres, or authors..."
          aria-label="Search stories, genres, or authors"
          className="w-full bg-transparent text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
        />
        {exploreQuery && (
          <button
            type="button"
            onClick={() => setExploreQuery('')}
            aria-label="Clear search"
            className="rounded-full p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Live Search Results */}
      {exploreQuery.trim() ? (
        <section className="space-y-3">
          <h2 className="font-prose text-lg font-bold text-[var(--text-primary)]">
            Search Results ({searchResults.length})
          </h2>
          {searchResults.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 text-center">
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                No titles found matching &ldquo;{exploreQuery}&rdquo;
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map((story) => (
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
          )}
        </section>
      ) : (
        <>
          {/* Filter Pills */}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            {QUICK_FILTERS.map((filter) => {
              const active = quickFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => {
                    setQuickFilter(filter);
                    if (filter === 'Books') setExploreFormat('PROSE');
                    if (filter === 'Manga') setExploreFormat('COMIC');
                  }}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-[13px] transition-all active:scale-95 ${
                    active
                      ? 'bg-[var(--action-primary)] font-semibold text-white shadow-sm'
                      : 'bg-[var(--surface-sunken)] font-medium text-[var(--text-primary)] hover:bg-[var(--action-secondary-hover)]'
                  }`}
                >
                  {active && <Check className="h-3.5 w-3.5" />}
                  <span>{filter}</span>
                </button>
              );
            })}
          </div>

          {/* Curated Carousel */}
          <section className="space-y-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[var(--action-primary)]" />
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {quickFilter === 'All' ? 'Curated Picks' : quickFilter}
              </h2>
            </div>
            <div className="-mx-4 flex gap-3.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
              {curatedStories.slice(0, 10).map((story) => (
                <button
                  key={story.id}
                  type="button"
                  onClick={() => openStoryDetail(story.id)}
                  className="w-[124px] shrink-0 space-y-2 text-left transition-transform active:scale-95"
                >
                  <div className="h-[160px] w-[124px] overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
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
                  </div>
                  <p className="line-clamp-2 font-prose text-[13px] font-bold leading-snug text-[var(--text-primary)]">
                    {story.title}
                  </p>
                </button>
              ))}
            </div>
          </section>

          {/* Popular Genres (2-column iOS 16pt-radius image cards) */}
          {popularGenres.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Popular Genres
              </h2>
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
                {popularGenres.map(([genre, count], idx) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => setExploreQuery(genre)}
                    className={`relative flex h-36 flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br ${
                      GENRE_GRADIENTS[idx % GENRE_GRADIENTS.length]
                    } p-4 text-left transition-transform active:scale-95`}
                    style={{ boxShadow: 'var(--shadow-raised)' }}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    <div className="relative z-10 space-y-1.5">
                      <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                        {count} {count === 1 ? 'title' : 'titles'}
                      </span>
                      <p className="font-prose text-lg font-bold leading-tight text-white">
                        {genre}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Trending Creators */}
          {trendingCreators.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Trending Creators
              </h2>
              <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                {trendingCreators.map(([author, count]) => (
                  <button
                    key={author}
                    type="button"
                    onClick={() => setExploreQuery(author)}
                    className="flex w-[95px] shrink-0 flex-col items-center gap-2 text-center transition-transform active:scale-95"
                  >
                    <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full border-2 border-white bg-[var(--action-primary-tint)] font-prose text-xl font-bold text-[var(--action-primary)] shadow-sm dark:border-[var(--border-subtle)]">
                      {author.slice(0, 1).toUpperCase()}
                    </div>
                    <p className="line-clamp-1 w-full font-prose text-[13px] font-bold text-[var(--text-primary)]">
                      {author}
                    </p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">
                      {count} {count === 1 ? 'work' : 'works'}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
