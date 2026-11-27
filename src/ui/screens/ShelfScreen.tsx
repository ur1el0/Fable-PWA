import React, { useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  Clock,
  Flame,
  Settings,
  Trophy,
  User,
  WifiOff,
} from 'lucide-react';
import { useFableStore } from '../../store/useFableStore';
import { StoryCardRow } from '../components/FableComponents';

type ShelfFilter = 'SAVED' | 'IN_PROGRESS' | 'FINISHED' | 'OFFLINE';

export function ShelfScreen() {
  const [filter, setFilter] = useState<ShelfFilter>('SAVED');
  const stories = useFableStore((s) => s.stories);
  const downloadedIds = useFableStore((s) => s.downloadedStoryIds);
  const readingStats = useFableStore((s) => s.readingStats);
  const highlights = useFableStore((s) => s.activeStoryHighlights);
  const session = useFableStore((s) => s.session);
  const openStoryDetail = useFableStore((s) => s.openStoryDetail);
  const openStoryReader = useFableStore((s) => s.openStoryReader);
  const toggleBookmark = useFableStore((s) => s.toggleBookmark);
  const selectTab = useFableStore((s) => s.selectTab);

  const filteredStories = stories.filter((s) => {
    switch (filter) {
      case 'SAVED':
        return s.isBookmarked;
      case 'IN_PROGRESS':
        return s.readingProgress > 0 && !s.isCompleted;
      case 'FINISHED':
        return s.isCompleted || s.readingProgress >= 0.99;
      case 'OFFLINE':
        return downloadedIds.has(s.id);
    }
  });

  const finishedCount = Math.max(
    readingStats.completedStoriesCount,
    stories.filter((s) => s.isCompleted || s.readingProgress >= 0.99).length
  );

  return (
    <div className="space-y-6 pb-8">
      {/* iOS ShelfView Header */}
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--action-primary)]">
            {session ? `Synced as ${session.user.displayName}` : 'PERSONAL QUEUE'}
          </p>
          <h1 className="font-prose text-[32px] font-bold leading-tight text-[var(--text-primary)]">
            My Shelf
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => selectTab('ACCOUNT')}
            aria-label="Profile"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm transition-transform active:scale-95"
          >
            <User className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => selectTab('ACCOUNT')}
            aria-label="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)] shadow-sm transition-transform active:scale-95"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* iOS Segmented Pill Control */}
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-[var(--surface-sunken)] p-1">
        {(
          [
            { id: 'SAVED', label: 'Saved', icon: Bookmark },
            { id: 'IN_PROGRESS', label: 'Reading', icon: Clock },
            { id: 'FINISHED', label: 'Finished', icon: CheckCircle2 },
            { id: 'OFFLINE', label: `Offline (${downloadedIds.size})`, icon: WifiOff },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`flex items-center justify-center gap-1.5 rounded-[10px] py-2 text-xs font-semibold transition-all ${
                active
                  ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Reading Journal & Stats Card (iOS 18pt radius + circular 44x44 hubs) */}
      <section
        className="space-y-4 rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5"
        style={{ boxShadow: 'var(--shadow-raised)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            Reading Journal &amp; Stats
          </h2>
          <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
            {readingStats.totalWordsRead.toLocaleString()} words read
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--action-primary-tint)] text-[var(--action-primary)]">
              <Flame className="h-5 w-5" />
            </div>
            <p className="font-mono text-[22px] font-bold leading-none text-[var(--text-primary)]">
              {Math.max(1, readingStats.currentStreakDays)}d
            </p>
            <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
              Day Streak
            </p>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--action-primary-tint)] text-[var(--action-primary)]">
              <Clock className="h-5 w-5" />
            </div>
            <p className="font-mono text-[22px] font-bold leading-none text-[var(--text-primary)]">
              {readingStats.totalReadingMinutes}m
            </p>
            <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
              Minutes Read
            </p>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{
                backgroundColor: 'var(--status-success-bg)',
                color: 'var(--status-success-text)',
              }}
            >
              <Trophy className="h-5 w-5" />
            </div>
            <p className="font-mono text-[22px] font-bold leading-none text-[var(--text-primary)]">
              {finishedCount}
            </p>
            <p className="text-[11px] font-medium text-[var(--text-tertiary)]">
              Finished
            </p>
          </div>
        </div>

        {/* Pinned Passages */}
        {highlights.length > 0 && (
          <div className="space-y-2 border-t border-[var(--border-subtle)] pt-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--action-primary)]">
              PINNED PASSAGES ({highlights.length})
            </p>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {highlights.slice(0, 6).map((hl) => (
                <div
                  key={hl.id}
                  onClick={() => openStoryReader(hl.storyId, hl.chapterIndex)}
                  className="w-64 shrink-0 cursor-pointer space-y-2 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3.5 transition-transform active:scale-95"
                >
                  <p className="line-clamp-3 font-prose text-[13px] font-medium italic leading-relaxed text-[var(--text-primary)]">
                    &ldquo;{hl.quoteText}&rdquo;
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="truncate text-[11px] text-[var(--text-tertiary)]">
                      Chapter {hl.chapterIndex + 1}
                    </span>
                    <span className="rounded-full bg-[var(--action-primary-tint)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--action-primary)]">
                      OPEN
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Active Titles */}
      {filteredStories.length === 0 ? (
        <div
          className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-8 text-center"
          style={{ boxShadow: 'var(--shadow-raised)' }}
        >
          <p className="font-prose text-base font-bold text-[var(--text-primary)]">
            No titles in this shelf view yet
          </p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {filter === 'OFFLINE'
              ? 'Open any story and download it for offline reading.'
              : 'Bookmark stories from Library or Explore to build your personal queue.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
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
    </div>
  );
}
