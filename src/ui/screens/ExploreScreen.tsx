import React from 'react';
import { BookOpen, Image as ImageIcon, Loader2, Search, UserCheck, X } from 'lucide-react';
import { useFableStore } from '../../store/useFableStore';
import type { StoryProvider } from '../../domain/models';
import { StoryCardRow } from '../components/FableComponents';

const PROSE_PROVIDER_CHIPS: Array<{ id: StoryProvider | 'ALL'; label: string }> = [
  { id: 'ALL', label: 'All Books' },
  { id: 'FABLE', label: 'Fable Originals' },
  { id: 'GUTENBERG', label: 'Project Gutenberg' },
  { id: 'STANDARD_EBOOKS', label: 'Standard Ebooks' },
];

const TRENDING_TAGS = [
  'Literary Fiction',
  'Speculative',
  'Classic',
  'Historical',
  'Fantasy',
  'Pride',
  'Observatory',
];

export function ExploreScreen() {
  const stories = useFableStore((s) => s.stories);
  const downloadedIds = useFableStore((s) => s.downloadedStoryIds);
  const exploreFormat = useFableStore((s) => s.exploreFormat);
  const exploreProvider = useFableStore((s) => s.exploreProvider);
  const exploreQuery = useFableStore((s) => s.exploreQuery);
  const isSearching = useFableStore((s) => s.isSearchingExplore);
  const setExploreFormat = useFableStore((s) => s.setExploreFormat);
  const setExploreProvider = useFableStore((s) => s.setExploreProvider);
  const setExploreQuery = useFableStore((s) => s.setExploreQuery);
  const openStoryDetail = useFableStore((s) => s.openStoryDetail);
  const openStoryReader = useFableStore((s) => s.openStoryReader);
  const toggleBookmark = useFableStore((s) => s.toggleBookmark);

  const filteredStories = stories.filter((story) => {
    if (story.contentFormat !== exploreFormat) return false;
    if (exploreProvider !== 'ALL' && story.provider !== exploreProvider) return false;
    if (!exploreQuery.trim()) return true;
    const q = exploreQuery.trim().toLowerCase();
    return (
      story.title.toLowerCase().includes(q) ||
      story.author.toLowerCase().includes(q) ||
      story.genre.toLowerCase().includes(q) ||
      story.synopsis.toLowerCase().includes(q)
    );
  });

  const featuredAuthors = Array.from(
    new Set(
      stories
        .filter((s) => s.contentFormat === exploreFormat)
        .map((s) => s.author)
    )
  ).slice(0, 5);

  return (
    <div className="space-y-10">
      {/* Masthead */}
      <header className="border-b border-[var(--border-subtle)] pb-6">
        <h1 className="display-headline font-bold text-[var(--text-primary)]">
          Explore
        </h1>
      </header>

      {/* Asymmetric Filter Rail + Results Split */}
      <div className="grid gap-10 lg:grid-cols-12">
        <aside className="space-y-6 lg:col-span-4">
          {/* Format Toggle */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Reading Medium
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={exploreFormat === 'PROSE'}
                onClick={() => setExploreFormat('PROSE')}
                className={`fable-btn text-xs ${
                  exploreFormat === 'PROSE'
                    ? 'fable-btn-primary'
                    : 'fable-btn-secondary'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                <span>Books</span>
              </button>
              <button
                type="button"
                aria-pressed={exploreFormat === 'COMIC'}
                onClick={() => setExploreFormat('COMIC')}
                className={`fable-btn text-xs ${
                  exploreFormat === 'COMIC'
                    ? 'fable-btn-primary'
                    : 'fable-btn-secondary'
                }`}
              >
                <ImageIcon className="h-4 w-4" />
                <span>Manga</span>
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="space-y-2">
            <label
              htmlFor="explore-search-input"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]"
            >
              Keyword Search
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                id="explore-search-input"
                type="text"
                value={exploreQuery}
                onChange={(e) => setExploreQuery(e.target.value)}
                placeholder={
                  exploreFormat === 'COMIC'
                    ? 'Title, creator, or genre...'
                    : 'Title, author, or subject...'
                }
                className="fable-input pr-9 pl-10"
              />
              {exploreQuery.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExploreQuery('')}
                  aria-label="Clear search query"
                  className="fable-btn fable-btn-ghost absolute top-1/2 right-1 min-h-0 -translate-y-1/2 p-1.5"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {isSearching && (
              <p className="inline-flex items-center gap-2 text-xs font-medium text-[var(--text-link)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Querying catalog sources...
              </p>
            )}
          </div>

          {/* Source Chips */}
          {exploreFormat === 'PROSE' && (
            <div className="space-y-2">
              <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Source Archive
              </span>
              <div className="flex flex-wrap gap-2">
                {PROSE_PROVIDER_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    aria-pressed={exploreProvider === chip.id}
                    onClick={() => setExploreProvider(chip.id)}
                    className="fable-chip"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subjects */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Subjects
            </span>
            <div className="flex flex-wrap gap-1.5">
              {TRENDING_TAGS.map((tag) => {
                const selected = exploreQuery.toLowerCase() === tag.toLowerCase();
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setExploreQuery(selected ? '' : tag)}
                    className="fable-chip"
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Featured Authors */}
          {featuredAuthors.length > 0 && (
            <div className="space-y-2">
              <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Featured Voices
              </span>
              <div className="flex flex-wrap gap-1.5">
                {featuredAuthors.map((author) => {
                  const selected = exploreQuery.toLowerCase() === author.toLowerCase();
                  return (
                    <button
                      key={author}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setExploreQuery(selected ? '' : author)}
                      className="fable-chip"
                    >
                      <UserCheck className="h-3 w-3" />
                      <span>{author}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </aside>

        {/* Results Column */}
        <section className="lg:col-span-8">
          <div className="flex items-center justify-between border-b border-[var(--border-strong)] pb-3 text-xs text-[var(--text-secondary)]">
            <span>
              <strong className="font-semibold text-[var(--text-primary)]">
                {filteredStories.length}
              </strong>{' '}
              {filteredStories.length === 1 ? 'edition' : 'editions'} available
            </span>
            {exploreQuery && (
              <button
                type="button"
                onClick={() => setExploreQuery('')}
                className="font-semibold text-[var(--text-link)] hover:underline"
              >
                Reset filter
              </button>
            )}
          </div>

          {filteredStories.length === 0 ? (
            <div className="fable-card mt-6 flex min-h-64 flex-col items-center justify-center p-8 text-center">
              <p className="font-editorial text-xl font-semibold text-[var(--text-primary)]">
                No matching editions found
              </p>
              <p className="prose-measure mt-2 text-sm text-[var(--text-secondary)]">
                Clear the active search filter or switch between Books and Manga to browse the full archive.
              </p>
              <button
                type="button"
                onClick={() => setExploreQuery('')}
                className="fable-btn fable-btn-secondary mt-5"
              >
                Clear Search Filter
              </button>
            </div>
          ) : (
            <div className="mt-2">
              {filteredStories.map((story) => (
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
      </div>
    </div>
  );
}
