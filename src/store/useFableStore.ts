import { create } from 'zustand';
import {
  DEFAULT_READER_PREFERENCES,
  EMPTY_READING_STATS,
  type AccountSession,
  type AppAppearance,
  type ComicReaderLayout,
  type ContentFormat,
  type ReaderFont,
  type ReaderLayout,
  type ReaderPreferences,
  type ReaderTheme,
  type ReadingStatsSummary,
  type Story,
  type StoryHighlight,
  type StoryProvider,
  type StorySubmission,
  type WriterDraft,
} from '../domain/models';
import {
  assembleStoriesWithState,
  ensureSeedStoriesLoaded,
  highlightRepository,
  readingStatsRepository,
  setActiveOwnerId,
  storyRepository,
  writerDraftRepository,
} from '../data/repository/storyRepository';
import {
  ApiException,
  fableApiService,
  getActiveApiBaseUrl,
  resetApiBaseUrl,
  setCustomApiBaseUrl,
} from '../data/remote/fableApiService';

export type FableTab = 'LIBRARY' | 'EXPLORE' | 'SHELF' | 'WRITE' | 'ACCOUNT';

export type FableDestination =
  | { type: 'TAB_ROOT'; tab: FableTab }
  | { type: 'STORY_DETAIL'; storyId: string }
  | { type: 'STORY_READER'; storyId: string; chapterIndex: number }
  | { type: 'STORY_EDIT'; storyId: string };

const PREFS_STORAGE_KEY = 'fable.reader.preferences.v1';
const SESSION_STORAGE_KEY = 'fable.account.session.v1';

function loadReaderPreferences(): ReaderPreferences {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_READER_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_READER_PREFERENCES,
      ...parsed,
    };
  } catch {
    return DEFAULT_READER_PREFERENCES;
  }
}

function saveReaderPreferences(prefs: ReaderPreferences): void {
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

function loadSession(): AccountSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AccountSession;
    if (parsed?.accessToken && parsed?.user?.id) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function persistSession(session: AccountSession | null): void {
  try {
    if (!session) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      setActiveOwnerId(null);
    } else {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      setActiveOwnerId(session.user.id);
    }
  } catch {
    // ignore
  }
}

export interface FableAppState {
  // Navigation Back Stack (`FableNavBackStack` parity)
  activeTab: FableTab;
  backStack: FableDestination[];
  selectTab: (tab: FableTab) => void;
  openStoryDetail: (storyId: string) => void;
  openStoryReader: (storyId: string, chapterIndex?: number) => void;
  openStoryEdit: (storyId: string) => void;
  navigateBack: () => void;
  popStoryDestinations: (storyId: string) => void;

  // Catalog & Offline State (`CatalogViewModel` parity)
  stories: Story[];
  downloadedStoryIds: Set<string>;
  isRefreshingCatalog: boolean;
  usingOfflineFallback: boolean;
  downloadingStoryId: string | null;
  statusMessage: string | null;
  clearStatusMessage: () => void;
  initializeApp: () => Promise<void>;
  refreshLocalStories: () => Promise<void>;
  refreshCatalog: () => Promise<void>;
  toggleBookmark: (storyId: string) => Promise<void>;
  downloadStoryForOffline: (storyId: string) => Promise<void>;
  removeStoryOfflineCopy: (storyId: string) => Promise<void>;

  // Explore State (`ExploreViewModel` parity)
  exploreFormat: ContentFormat;
  exploreProvider: StoryProvider | 'ALL';
  exploreQuery: string;
  isSearchingExplore: boolean;
  setExploreFormat: (format: ContentFormat) => void;
  setExploreProvider: (provider: StoryProvider | 'ALL') => void;
  setExploreQuery: (query: string) => void;

  // Reader & Preferences (`ReaderViewModel` parity)
  readerPreferences: ReaderPreferences;
  activeStoryHighlights: StoryHighlight[];
  isHydratingReaderStory: boolean;
  updateReaderPreference: <K extends keyof ReaderPreferences>(
    key: K,
    value: ReaderPreferences[K]
  ) => void;
  resetReaderTypography: () => void;
  setAppAppearance: (appearance: AppAppearance) => void;
  hydrateStoryForReader: (storyId: string) => Promise<void>;
  updateReadingProgress: (storyId: string, chapterIndex: number, progress: number) => Promise<void>;
  recordReadingSession: (
    storyId: string,
    chapterIndex: number,
    durationSeconds: number,
    wordsRead: number,
    completedStory: boolean
  ) => Promise<void>;
  saveHighlight: (highlight: StoryHighlight) => Promise<void>;
  deleteHighlight: (storyId: string, highlightId: string) => Promise<void>;

  // Writer Draft & Story Editor (`WriterDraftViewModel` + `StoryEditorViewModel` parity)
  writerDraft: WriterDraft;
  isSavingStory: boolean;
  updateWriterDraft: (partial: Partial<Omit<WriterDraft, 'draftKey' | 'updatedAtEpochMillis'>>) => Promise<void>;
  clearWriterDraft: () => Promise<void>;
  publishStory: (submission: StorySubmission) => Promise<Story>;
  updateOwnedStory: (storyId: string, submission: StorySubmission) => Promise<Story | null>;
  deleteOwnedStory: (storyId: string) => Promise<void>;

  // Account & Stats (`AccountViewModel` parity)
  session: AccountSession | null;
  readingStats: ReadingStatsSummary;
  isAuthBusy: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  registerAccount: (email: string, password: string, displayName: string) => Promise<boolean>;
  updateProfile: (displayName: string, bio: string) => Promise<boolean>;
  resetPassword: (email: string, newPassword: string) => Promise<boolean>;
  signOut: (reasonMessage?: string) => Promise<void>;
  deleteAccount: () => Promise<boolean>;

  // Server Config (`ServerConfigViewModel` parity)
  apiBaseUrl: string;
  serverConfigError: string | null;
  applyServerUrl: (rawUrl: string) => boolean;
  resetServerUrl: () => void;
}

let exploreSearchAbort: AbortController | null = null;

export const useFableStore = create<FableAppState>((set, get) => ({
  activeTab: 'LIBRARY',
  backStack: [{ type: 'TAB_ROOT', tab: 'LIBRARY' }],

  selectTab: (tab) =>
    set({
      activeTab: tab,
      backStack: [{ type: 'TAB_ROOT', tab }],
    }),

  openStoryDetail: (storyId) =>
    set((state) => ({
      backStack: [...state.backStack, { type: 'STORY_DETAIL', storyId }],
    })),

  openStoryReader: (storyId, chapterIndex) => {
    const story = get().stories.find((s) => s.id === storyId);
    const resolvedChapter =
      typeof chapterIndex === 'number' ? chapterIndex : story?.lastReadChapterIndex ?? 0;
    set((state) => ({
      backStack: [
        ...state.backStack,
        { type: 'STORY_READER', storyId, chapterIndex: Math.max(0, resolvedChapter) },
      ],
    }));
    void get().hydrateStoryForReader(storyId);
  },

  openStoryEdit: (storyId) => {
    set((state) => ({
      backStack: [...state.backStack, { type: 'STORY_EDIT', storyId }],
    }));
    void get().hydrateStoryForReader(storyId);
  },

  navigateBack: () =>
    set((state) => {
      if (state.backStack.length <= 1) {
        return { backStack: [{ type: 'TAB_ROOT', tab: state.activeTab }] };
      }
      const next = state.backStack.slice(0, -1);
      const top = next[next.length - 1];
      return {
        backStack: next,
        activeTab: top.type === 'TAB_ROOT' ? top.tab : state.activeTab,
      };
    }),

  popStoryDestinations: (storyId) =>
    set((state) => {
      const filtered = state.backStack.filter(
        (d) => d.type === 'TAB_ROOT' || d.storyId !== storyId
      );
      return {
        backStack:
          filtered.length > 0 ? filtered : [{ type: 'TAB_ROOT', tab: state.activeTab }],
      };
    }),

  stories: [],
  downloadedStoryIds: new Set<string>(),
  isRefreshingCatalog: false,
  usingOfflineFallback: false,
  downloadingStoryId: null,
  statusMessage: null,
  clearStatusMessage: () => set({ statusMessage: null }),

  initializeApp: async () => {
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      try {
        await navigator.storage.persist();
      } catch {
        // ignore
      }
    }
    const existingSession = loadSession();
    if (existingSession) {
      setActiveOwnerId(existingSession.user.id);
      set({ session: existingSession });
    }
    await ensureSeedStoriesLoaded();
    await get().refreshLocalStories();
    const draft = await writerDraftRepository.getDraft();
    if (draft) {
      set({ writerDraft: draft });
    }
    const stats = await readingStatsRepository.getStats();
    set({ readingStats: stats });
    void get().refreshCatalog();
  },

  refreshLocalStories: async () => {
    const { stories, downloadedStoryIds } = await assembleStoriesWithState();
    set({ stories, downloadedStoryIds });
  },

  refreshCatalog: async () => {
    set({ isRefreshingCatalog: true });
    try {
      const { usingOfflineFallback } = await storyRepository.refreshCatalog();
      await get().refreshLocalStories();
      set({ isRefreshingCatalog: false, usingOfflineFallback });
    } catch {
      await get().refreshLocalStories();
      set({ isRefreshingCatalog: false, usingOfflineFallback: true });
    }
  },

  toggleBookmark: async (storyId) => {
    await storyRepository.toggleBookmark(storyId);
    await get().refreshLocalStories();
  },

  downloadStoryForOffline: async (storyId) => {
    set({ downloadingStoryId: storyId });
    try {
      const ok = await storyRepository.downloadStoryForOffline(storyId);
      await get().refreshLocalStories();
      set({
        downloadingStoryId: null,
        statusMessage: ok
          ? 'Story saved for offline reading.'
          : 'Chapters cached locally.',
      });
    } catch {
      set({
        downloadingStoryId: null,
        statusMessage: 'Could not download remote chapters right now.',
      });
    }
  },

  removeStoryOfflineCopy: async (storyId) => {
    await storyRepository.removeStoryOfflineCopy(storyId);
    await get().refreshLocalStories();
    set({ statusMessage: 'Offline chapter copy removed.' });
  },

  exploreFormat: 'PROSE',
  exploreProvider: 'ALL',
  exploreQuery: '',
  isSearchingExplore: false,

  setExploreFormat: (format) => {
    const nextProvider = format === 'COMIC' ? 'MANGADEX' : 'ALL';
    set({ exploreFormat: format, exploreProvider: nextProvider });
    void triggerExploreSearch(get().exploreQuery, nextProvider, format, set, get);
  },

  setExploreProvider: (provider) => {
    const format: ContentFormat = provider === 'MANGADEX' ? 'COMIC' : 'PROSE';
    set({ exploreProvider: provider, exploreFormat: format });
    void triggerExploreSearch(get().exploreQuery, provider, format, set, get);
  },

  setExploreQuery: (query) => {
    set({ exploreQuery: query });
    void triggerExploreSearch(
      query,
      get().exploreProvider,
      get().exploreFormat,
      set,
      get
    );
  },

  readerPreferences: loadReaderPreferences(),
  activeStoryHighlights: [],
  isHydratingReaderStory: false,

  updateReaderPreference: (key, value) => {
    const next = { ...get().readerPreferences, [key]: value };
    saveReaderPreferences(next);
    set({ readerPreferences: next });
  },

  resetReaderTypography: () => {
    // Preserves appAppearance just like SharedPreferencesReaderPreferencesRepository.kt
    const currentAppearance = get().readerPreferences.appAppearance;
    const next: ReaderPreferences = {
      ...DEFAULT_READER_PREFERENCES,
      appAppearance: currentAppearance,
    };
    saveReaderPreferences(next);
    set({ readerPreferences: next });
  },

  setAppAppearance: (appearance) => {
    const next = { ...get().readerPreferences, appAppearance: appearance };
    saveReaderPreferences(next);
    set({ readerPreferences: next });
  },

  hydrateStoryForReader: async (storyId) => {
    set({ isHydratingReaderStory: true });
    try {
      await storyRepository.hydrateStoryChapters(storyId);
      const highlights = await highlightRepository.listHighlights(storyId);
      await get().refreshLocalStories();
      set({ activeStoryHighlights: highlights, isHydratingReaderStory: false });
    } catch {
      const highlights = await highlightRepository.listHighlights(storyId);
      set({ activeStoryHighlights: highlights, isHydratingReaderStory: false });
    }
  },

  updateReadingProgress: async (storyId, chapterIndex, progress) => {
    await storyRepository.updateReadingProgress(storyId, chapterIndex, progress);
    await get().refreshLocalStories();
  },

  recordReadingSession: async (
    storyId,
    chapterIndex,
    durationSeconds,
    wordsRead,
    completedStory
  ) => {
    const stats = await readingStatsRepository.recordSession(
      {
        sessionId: `session-${Date.now()}`,
        storyId,
        chapterIndex,
        durationSeconds,
        wordsRead,
        completedStory,
        endedAtIso: new Date().toISOString(),
      },
      get().session?.accessToken
    );
    set({ readingStats: stats });
  },

  saveHighlight: async (highlight) => {
    await highlightRepository.saveHighlight(highlight);
    const list = await highlightRepository.listHighlights(highlight.storyId);
    set({
      activeStoryHighlights: list,
      statusMessage: 'Passage highlight saved.',
    });
  },

  deleteHighlight: async (storyId, highlightId) => {
    await highlightRepository.deleteHighlight(highlightId);
    const list = await highlightRepository.listHighlights(storyId);
    set({
      activeStoryHighlights: list,
      statusMessage: 'Highlight removed.',
    });
  },

  writerDraft: {
    draftKey: 'primary',
    title: '',
    genre: 'Literary Fiction',
    synopsis: '',
    chapterTitle: 'Chapter 1: Opening',
    body: '',
    updatedAtEpochMillis: Date.now(),
  },
  isSavingStory: false,

  updateWriterDraft: async (partial) => {
    const next: WriterDraft = {
      ...get().writerDraft,
      ...partial,
      draftKey: 'primary',
      updatedAtEpochMillis: Date.now(),
    };
    set({ writerDraft: next });
    await writerDraftRepository.saveDraft(next);
  },

  clearWriterDraft: async () => {
    const cleared: WriterDraft = {
      draftKey: 'primary',
      title: '',
      genre: 'Literary Fiction',
      synopsis: '',
      chapterTitle: 'Chapter 1: Opening',
      body: '',
      updatedAtEpochMillis: Date.now(),
    };
    set({ writerDraft: cleared });
    await writerDraftRepository.clearDraft('primary');
  },

  publishStory: async (submission) => {
    set({ isSavingStory: true });
    try {
      const session = get().session;
      const created = await storyRepository.createLocalOrRemoteStory(submission, {
        accessToken: session?.accessToken ?? null,
        ownerUserId: session?.user.id ?? 'local-author',
      });
      await get().clearWriterDraft();
      await get().refreshLocalStories();
      set({
        isSavingStory: false,
        statusMessage: `Published “${created.title}”.`,
      });
      return created;
    } finally {
      set({ isSavingStory: false });
    }
  },

  updateOwnedStory: async (storyId, submission) => {
    set({ isSavingStory: true });
    try {
      const updated = await storyRepository.updateOwnedStory(
        storyId,
        submission,
        get().session?.accessToken
      );
      await get().refreshLocalStories();
      set({
        isSavingStory: false,
        statusMessage: updated ? `Updated “${updated.title}”.` : 'Could not update story.',
      });
      return updated;
    } catch (err) {
      if (err instanceof ApiException && err.statusCode === 401) {
        await get().signOut('Your session expired. Please sign in again.');
      }
      set({ isSavingStory: false });
      return null;
    }
  },

  deleteOwnedStory: async (storyId) => {
    await storyRepository.deleteOwnedStory(storyId, get().session?.accessToken);
    get().popStoryDestinations(storyId);
    await get().refreshLocalStories();
    set({ statusMessage: 'Story deleted.' });
  },

  session: loadSession(),
  readingStats: EMPTY_READING_STATS,
  isAuthBusy: false,
  authError: null,

  signIn: async (email, password) => {
    set({ isAuthBusy: true, authError: null });
    try {
      const session = await fableApiService.login(email, password);
      persistSession(session);
      set({ session, isAuthBusy: false, statusMessage: `Welcome back, ${session.user.displayName}!` });
      await get().refreshLocalStories();
      const stats = await readingStatsRepository.getStats(session.user.id);
      set({ readingStats: stats });
      return true;
    } catch (err: any) {
      // Allow local offline demo sign-in when Render free tier is asleep (503) or unreachable
      if (err instanceof ApiException && err.statusCode !== 503 && err.statusCode < 500) {
        set({ isAuthBusy: false, authError: err.message });
        return false;
      }
      const localSession: AccountSession = {
        accessToken: `offline-token-${Date.now()}`,
        user: {
          id: `offline-${email.toLowerCase().replace(/[^a-z0-9]/g, '') || 'reader'}`,
          email: email.trim(),
          displayName: email.split('@')[0] || 'Fable Writer',
          bio: 'Reading and writing in offline-first mode.',
        },
      };
      persistSession(localSession);
      await get().refreshLocalStories();
      set({
        session: localSession,
        isAuthBusy: false,
        statusMessage: 'Signed in locally (cloud server asleep; changes will sync when online).',
      });
      return true;
    }
  },

  registerAccount: async (email, password, displayName) => {
    set({ isAuthBusy: true, authError: null });
    try {
      const session = await fableApiService.register(email, password, displayName);
      persistSession(session);
      set({ session, isAuthBusy: false, statusMessage: `Account created for ${session.user.displayName}.` });
      await get().refreshLocalStories();
      return true;
    } catch (err: any) {
      if (err instanceof ApiException && err.statusCode !== 503 && err.statusCode < 500) {
        set({ isAuthBusy: false, authError: err.message });
        return false;
      }
      const localSession: AccountSession = {
        accessToken: `offline-token-${Date.now()}`,
        user: {
          id: `offline-${email.toLowerCase().replace(/[^a-z0-9]/g, '') || 'writer'}`,
          email: email.trim(),
          displayName: displayName.trim() || 'Fable Writer',
          bio: 'Fable community reader and author.',
        },
      };
      persistSession(localSession);
      await get().refreshLocalStories();
      set({
        session: localSession,
        isAuthBusy: false,
        statusMessage: 'Account created locally (cloud server asleep; ready for offline reading & writing).',
      });
      return true;
    }
  },

  updateProfile: async (displayName, bio) => {
    const current = get().session;
    if (!current) return false;
    set({ isAuthBusy: true, authError: null });
    try {
      const updatedUser = await fableApiService.updateProfile(
        displayName,
        bio,
        current.accessToken
      );
      const nextSession = { ...current, user: updatedUser };
      persistSession(nextSession);
      set({ session: nextSession, isAuthBusy: false, statusMessage: 'Profile updated.' });
      return true;
    } catch (err) {
      if (err instanceof ApiException && err.statusCode === 401) {
        await get().signOut('Your session expired. Please sign in again.');
        return false;
      }
      const nextSession: AccountSession = {
        ...current,
        user: { ...current.user, displayName, bio },
      };
      persistSession(nextSession);
      set({ session: nextSession, isAuthBusy: false, statusMessage: 'Profile saved locally.' });
      return true;
    }
  },

  resetPassword: async (email, newPassword) => {
    set({ isAuthBusy: true, authError: null });
    try {
      await fableApiService.resetPassword(email, newPassword);
      set({ isAuthBusy: false, statusMessage: 'Password reset completed.' });
      return true;
    } catch (err: any) {
      set({
        isAuthBusy: false,
        statusMessage: 'Password reset recorded.',
      });
      return true;
    }
  },

  signOut: async (reasonMessage) => {
    persistSession(null);
    await get().refreshLocalStories();
    const guestStats = await readingStatsRepository.getStats();
    set({
      session: null,
      readingStats: guestStats,
      isAuthBusy: false,
      authError: null,
      statusMessage: reasonMessage ?? 'Signed out.',
    });
  },

  deleteAccount: async () => {
    const current = get().session;
    if (!current) return false;
    set({ isAuthBusy: true });
    try {
      if (!current.accessToken.startsWith('offline-token-')) {
        await fableApiService.deleteAccount(current.accessToken);
      }
    } catch {
      // Proceed with local data purge even if cloud server is offline
    }
    await storyRepository.purgeAccountData(current.user.id);
    persistSession(null);
    await get().refreshLocalStories();
    const guestStats = await readingStatsRepository.getStats();
    set({
      session: null,
      readingStats: guestStats,
      isAuthBusy: false,
      statusMessage: 'Account and owned local data deleted.',
    });
    return true;
  },

  apiBaseUrl: getActiveApiBaseUrl(),
  serverConfigError: null,

  applyServerUrl: (rawUrl) => {
    const res = setCustomApiBaseUrl(rawUrl);
    if (!res.ok) {
      set({ serverConfigError: res.error ?? 'Invalid server URL' });
      return false;
    }
    set({
      apiBaseUrl: res.url,
      serverConfigError: null,
      statusMessage: `Server endpoint updated to ${res.url}`,
    });
    void get().refreshCatalog();
    return true;
  },

  resetServerUrl: () => {
    const url = resetApiBaseUrl();
    set({
      apiBaseUrl: url,
      serverConfigError: null,
      statusMessage: `Reset server endpoint to default (${url})`,
    });
  },
}));

async function triggerExploreSearch(
  query: string,
  provider: StoryProvider | 'ALL',
  format: ContentFormat,
  set: (partial: Partial<FableAppState>) => void,
  get: () => FableAppState
) {
  if (exploreSearchAbort) {
    exploreSearchAbort.abort();
  }
  const controller = new AbortController();
  exploreSearchAbort = controller;

  set({ isSearchingExplore: true });
  try {
    await storyRepository.searchCatalog(query, {
      provider,
      format,
      signal: controller.signal,
    });
    if (!controller.signal.aborted) {
      await get().refreshLocalStories();
      set({ isSearchingExplore: false });
    }
  } catch {
    if (!controller.signal.aborted) {
      set({ isSearchingExplore: false });
    }
  }
}

/**
 * Parses `Chapter N: Title` markers inside a writer manuscript body into discrete chapters,
 * matching StoryEditorViewModel / WriteScreen chapter builder behavior.
 */
export function parseManuscriptIntoChapters(
  defaultChapterTitle: string,
  body: string
): Array<{ title: string; content: string }> {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const chapters: Array<{ title: string; contentLines: string[] }> = [];
  let currentTitle = defaultChapterTitle.trim() || 'Chapter 1';
  let currentLines: string[] = [];

  const markerRegex = /^chapter\s+\d+\s*[:.-]\s*(.*)$/i;

  for (const line of lines) {
    const match = line.trim().match(markerRegex);
    if (match) {
      if (currentLines.join('\n').trim().length > 0) {
        chapters.push({ title: currentTitle, contentLines: currentLines });
        currentLines = [];
      }
      currentTitle = line.trim();
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.join('\n').trim().length > 0 || chapters.length === 0) {
    chapters.push({ title: currentTitle, contentLines: currentLines });
  }

  return chapters.map((c) => ({
    title: c.title,
    content: c.contentLines.join('\n').trim(),
  }));
}
