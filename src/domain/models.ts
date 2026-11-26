export type StoryProvider = 'FABLE' | 'GUTENBERG' | 'STANDARD_EBOOKS' | 'MANGADEX';
export type ContentFormat = 'PROSE' | 'COMIC';

export interface ChapterPage {
  index: number;
  imageUrl: string;
  width?: number | null;
  height?: number | null;
}

export interface Chapter {
  id: string;
  index: number;
  title: string;
  readTimeMinutes: number;
  content: string;
  pages: ChapterPage[];
  pageCount: number;
}

export interface Story {
  id: string;
  ownerUserId?: string | null;
  title: string;
  author: string;
  authorBio: string;
  genre: string;
  readTimeMinutes: number;
  rating: number;
  synopsis: string;
  accentHex: string;
  featuredRank?: number | null;
  isBookmarked: boolean;
  isCompleted: boolean;
  readingProgress: number;
  lastReadChapterIndex: number;
  provider: StoryProvider;
  contentFormat: ContentFormat;
  coverImageUrl?: string | null;
  externalId?: string | null;
  sourceUrl?: string | null;
  chapters: Chapter[];
}

export type HighlightColor = 'TERRACOTTA' | 'AMBER' | 'SAGE';

export const HIGHLIGHT_SWATCHES: Record<
  HighlightColor,
  { label: string; fillCss: string; accentHex: string; cardBgHex: string; cardInkHex: string }
> = {
  TERRACOTTA: {
    label: 'Terracotta',
    fillCss: 'rgba(217, 107, 67, 0.24)',
    accentHex: '#D96B43',
    cardBgHex: '#F9EFEA',
    cardInkHex: '#2C1710',
  },
  AMBER: {
    label: 'Amber',
    fillCss: 'rgba(212, 155, 39, 0.25)',
    accentHex: '#D49B27',
    cardBgHex: '#FAF3E3',
    cardInkHex: '#2A200B',
  },
  SAGE: {
    label: 'Sage',
    fillCss: 'rgba(78, 138, 110, 0.24)',
    accentHex: '#4E8A6E',
    cardBgHex: '#ECF4F0',
    cardInkHex: '#13261E',
  },
};

export interface StoryHighlight {
  id: string;
  storyId: string;
  chapterIndex: number;
  chapterTitle: string;
  paragraphIndex: number;
  startWordIndex: number;
  endWordIndex: number;
  quoteText: string;
  note: string;
  color: HighlightColor;
  createdAtEpochMillis: number;
}

export type ReaderTheme = 'PAPER' | 'SEPIA' | 'NIGHT';
export type ReaderFont = 'SERIF' | 'SANS' | 'MONO';
export type ReaderLayout = 'SCROLL' | 'PAGINATED';
export type ComicReaderLayout = 'WEBTOON' | 'MANGA';
export type AppAppearance = 'SYSTEM' | 'LIGHT' | 'DARK';

export interface ReaderPreferences {
  theme: ReaderTheme;
  font: ReaderFont;
  layout: ReaderLayout;
  comicLayout: ComicReaderLayout;
  fontSizeSp: number;
  lineHeightMultiplier: number;
  appAppearance: AppAppearance;
  readerBrightness: number | null;
}

export const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  theme: 'PAPER',
  font: 'SERIF',
  layout: 'SCROLL',
  comicLayout: 'WEBTOON',
  fontSizeSp: 18,
  lineHeightMultiplier: 1.55,
  appAppearance: 'SYSTEM',
  readerBrightness: null,
};

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  bio: string;
  createdAt?: string | null;
}

export interface AccountSession {
  accessToken: string;
  user: AuthUser;
}

export interface ReadingStatsSummary {
  totalReadingMinutes: number;
  totalWordsRead: number;
  completedStoriesCount: number;
  activeDaysLast7: number;
  currentStreakDays: number;
  sessionsCount: number;
  lastReadAtIso?: string | null;
}

export const EMPTY_READING_STATS: ReadingStatsSummary = {
  totalReadingMinutes: 0,
  totalWordsRead: 0,
  completedStoriesCount: 0,
  activeDaysLast7: 0,
  currentStreakDays: 0,
  sessionsCount: 0,
  lastReadAtIso: null,
};

export interface ReadingSessionRecord {
  sessionId: string;
  storyId: string;
  chapterIndex: number;
  durationSeconds: number;
  wordsRead: number;
  completedStory: boolean;
  endedAtIso: string;
}

export interface WriterDraft {
  draftKey: string;
  title: string;
  genre: string;
  synopsis: string;
  chapterTitle: string;
  body: string;
  updatedAtEpochMillis: number;
}

export interface StorySubmission {
  title: string;
  author: string;
  authorBio: string;
  genre: string;
  synopsis: string;
  accentHex?: string;
  chapters: Array<{ title: string; content: string }>;
}

export const GENRE_SUGGESTIONS = [
  'Literary Fiction',
  'Speculative',
  'Historical',
  'Mystery',
  'Cyberpunk',
  'Fantasy',
  'Essays',
  'Classic',
  'Romance',
  'Sci-Fi',
];
