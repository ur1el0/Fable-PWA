import React, { useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  Clock,
  Flame,
  Trophy,
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
  const session = useFableStore((s) => s.session);
  const openStoryDetail = useFableStore((s) => s.openStoryDetail);
  const openStoryReader = useFableStore((s) => s.openStoryReader);
  const toggleBookmark = useFableStore((s) => s.toggleBookmark);

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
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--fable-primary)]">
            Personal Reading Queue
          </p>
          <h1 className="font-serif text-2xl font-bold text-[var(--fable-text)] sm:text-3xl">
            Shelf
          </h1>
        </div>

        <span className="rounded-full border border-[var(--fable-outline)] bg-[var(--fable-surface)] px-3 py-1 text-xs text-[var(--fable-muted)]">
          {session ? `Synced as ${session.user.displayName}` : 'Local Guest Shelf'}
        </span>
      </div>

      {/* Bordered Reading Analytics Stat Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[var(--fable-outline)] bg-[var(--fable-surface)] p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--fable-muted)]">
            <Flame className="h-4 w-4 text-[var(--text-link)]" />
            Streak
          </div>
          <p className="mt-1.5 font-serif text-xl font-bold text-[var(--fable-text)]">
            {Math.max(1, readingStats.currentStreakDays)}d
          </p>
          <p className="text-[length:var(--text-xxs)] text-[var(--fable-muted)]">Active reading</p>
        </div>

        <div className="rounded-2xl border border-[var(--fable-outline)] bg-[var(--fable-surface)] p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--fable-muted)]">
            <Clock className="h-4 w-4 text-[var(--fable-primary)]" />
            Minutes
          </div>
          <p className="mt-1.5 font-serif text-xl font-bold text-[var(--fable-text)]">
            {readingStats.totalReadingMinutes}m
          </p>
          <p className="text-[length:var(--text-xxs)] text-[var(--fable-muted)]">
            {readingStats.totalWordsRead.toLocaleString()} words
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--fable-outline)] bg-[var(--fable-surface)] p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--fable-muted)]">
            <Trophy className="h-4 w-4 text-[var(--status-success-text)]" />
            Finished
          </div>
          <p className="mt-1.5 font-serif text-xl font-bold text-[var(--fable-text)]">
            {finishedCount}
          </p>
          <p className="text-[length:var(--text-xxs)] text-[var(--fable-muted)]">
            {downloadedIds.size} offline
          </p>
        </div>
      </div>

      {/* Filter Tabs: Saved, In Progress, Finished, Offline */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(
          [
            { id: 'SAVED', label: 'Saved', icon: Bookmark },
            { id: 'IN_PROGRESS', label: 'In Progress', icon: Clock },
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
              className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition ${
                active
                  ? 'border-[var(--fable-primary)] bg-[var(--fable-primary)] text-white'
                  : 'border-[var(--fable-outline)] bg-[var(--fable-surface)] text-[var(--fable-muted)] hover:border-[var(--fable-primary)]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Story List */}
      {filteredStories.length === 0 ? (
        <div className="rounded-2xl border border-[var(--fable-outline)] bg-[var(--fable-surface)] p-8 text-center">
          <p className="font-serif text-base font-bold text-[var(--fable-text)]">
            No stories in this shelf view yet
          </p>
          <p className="mt-1 text-xs text-[var(--fable-muted)]">
            {filter === 'OFFLINE'
              ? 'Open any story detail screen and tap “Download for offline” to cache chapters on your device.'
              : 'Bookmark stories from Library or Explore to build your personal reading list.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3.5">
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
