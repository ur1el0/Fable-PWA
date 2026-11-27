import React, { useEffect } from 'react';
import {
  Bookmark,
  BookOpen,
  Compass,
  PenTool,
  User,
  X,
} from 'lucide-react';
import { useFableStore, type FableTab } from './store/useFableStore';
import { PwaInstallAction } from './ui/components/FableComponents';
import { LibraryScreen } from './ui/screens/LibraryScreen';
import { ExploreScreen } from './ui/screens/ExploreScreen';
import { ShelfScreen } from './ui/screens/ShelfScreen';
import { WriteScreen } from './ui/screens/WriteScreen';
import { AccountScreen } from './ui/screens/AccountScreen';
import { StoryDetailScreen } from './ui/screens/StoryDetailScreen';
import { EditStoryScreen } from './ui/screens/EditStoryScreen';
import { StoryReaderScreen } from './ui/screens/StoryReaderScreen';

const NAV_TABS: Array<{ id: FableTab; label: string; icon: any }> = [
  { id: 'LIBRARY', label: 'Library', icon: BookOpen },
  { id: 'EXPLORE', label: 'Explore', icon: Compass },
  { id: 'SHELF', label: 'Shelf', icon: Bookmark },
  { id: 'WRITE', label: 'Write', icon: PenTool },
  { id: 'ACCOUNT', label: 'Account', icon: User },
];

export function App() {
  const activeTab = useFableStore((s) => s.activeTab);
  const backStack = useFableStore((s) => s.backStack);
  const appAppearance = useFableStore((s) => s.readerPreferences.appAppearance);
  const statusMessage = useFableStore((s) => s.statusMessage);
  const clearStatusMessage = useFableStore((s) => s.clearStatusMessage);
  const selectTab = useFableStore((s) => s.selectTab);
  const initializeApp = useFableStore((s) => s.initializeApp);

  useEffect(() => {
    void initializeApp();
  }, [initializeApp]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const isDark =
        appAppearance === 'DARK' ||
        (appAppearance === 'SYSTEM' && media.matches);
      document.documentElement.classList.toggle('dark', isDark);
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      const themeMeta = document.getElementById('fable-theme-color');
      if (themeMeta) {
        themeMeta.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--surface-page').trim());
      }
    };
    applyTheme();
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [appAppearance]);

  useEffect(() => {
    if (!statusMessage) return;
    const t = setTimeout(() => clearStatusMessage(), 4500);
    return () => clearTimeout(t);
  }, [statusMessage, clearStatusMessage]);

  const currentDest = backStack[backStack.length - 1] ?? {
    type: 'TAB_ROOT',
    tab: activeTab,
  };
  const isFullscreenReader = currentDest.type === 'STORY_READER';

  return (
    <div className="min-h-screen bg-[var(--surface-page)] text-[var(--text-primary)]">
      {!isFullscreenReader && (
        <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--surface-page)]/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-8">
            <button
              type="button"
              onClick={() => selectTab('LIBRARY')}
              className="flex items-baseline gap-3 text-left focus-visible:outline-2 focus-visible:outline-[var(--border-focus)]"
            >
              <span className="font-editorial text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                Fable
              </span>
            </button>

            <nav aria-label="Main navigation" className="hidden items-center gap-1 sm:flex">
              {NAV_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id && currentDest.type === 'TAB_ROOT';
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => selectTab(tab.id)}
                    className={`fable-btn px-3.5 py-2 text-xs ${
                      active
                        ? 'bg-[var(--surface-raised)] font-semibold text-[var(--text-primary)] border-[var(--border-strong)]'
                        : 'fable-btn-ghost'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <PwaInstallAction />
            </div>
          </div>
        </header>
      )}

      <main
        className={
          isFullscreenReader
            ? 'mx-auto w-full max-w-4xl px-0 pt-0 pb-0 sm:px-8 sm:pt-6 sm:pb-12'
            : 'mx-auto max-w-6xl px-4 pt-6 pb-28 sm:px-8 sm:pt-10 sm:pb-16'
        }
      >
        <div
          key={
            currentDest.type === 'TAB_ROOT'
              ? `tab-${activeTab}`
              : `${currentDest.type}-${currentDest.storyId}-${
                  currentDest.type === 'STORY_READER' ? currentDest.chapterIndex : 0
                }`
          }
          className="fable-view-enter"
        >
          {currentDest.type === 'STORY_DETAIL' ? (
            <StoryDetailScreen storyId={currentDest.storyId} />
          ) : currentDest.type === 'STORY_EDIT' ? (
            <EditStoryScreen storyId={currentDest.storyId} />
          ) : currentDest.type === 'STORY_READER' ? (
            <StoryReaderScreen
              storyId={currentDest.storyId}
              initialChapterIndex={currentDest.chapterIndex}
            />
          ) : activeTab === 'LIBRARY' ? (
            <LibraryScreen />
          ) : activeTab === 'EXPLORE' ? (
            <ExploreScreen />
          ) : activeTab === 'SHELF' ? (
            <ShelfScreen />
          ) : activeTab === 'WRITE' ? (
            <WriteScreen />
          ) : (
            <AccountScreen />
          )}
        </div>
      </main>

      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fable-card fixed right-4 bottom-24 z-50 flex items-center gap-3 px-4 py-3 text-sm font-medium text-[var(--text-primary)] sm:bottom-6"
          style={{ boxShadow: 'var(--shadow-raised)' }}
        >
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={clearStatusMessage}
            aria-label="Dismiss notification"
            className="fable-btn fable-btn-ghost min-h-0 p-1.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {!isFullscreenReader && (
        <nav
          aria-label="Mobile navigation"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border-subtle)] bg-[var(--surface-page)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm sm:hidden"
        >
          <div className="grid grid-cols-5">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => selectTab(tab.id)}
                  className={`flex min-h-12 flex-col items-center justify-center gap-1 py-2 text-[length:var(--text-xxs)] font-semibold transition-colors ${
                    active
                      ? 'text-[var(--text-link)]'
                      : 'text-[var(--text-tertiary)]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
