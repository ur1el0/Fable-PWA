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
  { id: 'WRITE', label: 'Write', icon: PenTool },
  { id: 'SHELF', label: 'Shelf', icon: Bookmark },
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
        <header className="fable-glass sticky top-0 z-30 border-b border-[var(--border-subtle)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
            <button
              type="button"
              onClick={() => selectTab('LIBRARY')}
              className="flex items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-[var(--border-focus)]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--action-primary)] text-[var(--text-on-action)] shadow-sm">
                <BookOpen className="h-4 w-4" />
              </span>
              <span className="font-editorial text-xl font-bold tracking-tight text-[var(--text-primary)]">
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
                    className={`fable-btn rounded-[var(--radius-pill)] px-3.5 py-2 text-xs transition-all ${
                      active
                        ? 'bg-[var(--action-primary-tint)] font-semibold text-[var(--action-primary)]'
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
              <button
                type="button"
                onClick={() => selectTab('ACCOUNT')}
                aria-label="Account and profile"
                className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all ${
                  activeTab === 'ACCOUNT' && currentDest.type === 'TAB_ROOT'
                    ? 'border-[var(--action-primary)] bg-[var(--action-primary-tint)] text-[var(--action-primary)]'
                    : 'border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                }`}
              >
                <User className="h-4 w-4" />
              </button>
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
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:hidden">
          <nav
            aria-label="Mobile navigation"
            className="fable-glass pointer-events-auto mx-auto max-w-md rounded-[32px] border border-[var(--border-subtle)] px-2.5 py-2"
            style={{ boxShadow: 'var(--shadow-pill)' }}
          >
            <div className="grid grid-cols-4">
              {NAV_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id && currentDest.type === 'TAB_ROOT';
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => selectTab(tab.id)}
                    className="flex flex-col items-center justify-center gap-0.5 py-0.5 transition-transform active:scale-95"
                  >
                    <span
                      className={`flex h-[38px] w-[38px] items-center justify-center rounded-full transition-colors duration-200 ${
                        active
                          ? 'bg-[var(--action-primary-tint)] text-[var(--action-primary)]'
                          : 'text-[var(--text-tertiary)]'
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 1.75} />
                    </span>
                    <span
                      className={`text-[10px] leading-tight transition-colors ${
                        active
                          ? 'font-bold text-[var(--action-primary)]'
                          : 'font-medium text-[var(--text-tertiary)]'
                      }`}
                    >
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
