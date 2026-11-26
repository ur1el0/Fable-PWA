import Dexie, { type Table } from 'dexie';
import type {
  ChapterPage,
  ContentFormat,
  HighlightColor,
  ReadingSessionRecord,
  ReadingStatsSummary,
  StoryHighlight,
  StoryProvider,
  WriterDraft,
} from '../../domain/models';

export interface StoryRow {
  id: string;
  ownerUserId: string | null;
  title: string;
  author: string;
  authorBio: string;
  genre: string;
  readTimeMinutes: number;
  rating: number;
  synopsis: string;
  accentHex: string;
  featuredRank: number | null;
  provider: StoryProvider;
  contentFormat: ContentFormat;
  coverImageUrl: string | null;
  externalId: string | null;
  sourceUrl: string | null;
}

export interface ChapterRow {
  pk: string; // `${storyId}:${index}`
  storyId: string;
  index: number;
  chapterId: string;
  title: string;
  readTimeMinutes: number;
  content: string;
  pagesJson: string;
  pageCount: number;
}

export interface ShelfStateRow {
  pk: string; // `${ownerId}:${storyId}`
  ownerId: string;
  storyId: string;
  isBookmarked: boolean;
  isCompleted: boolean;
  readingProgress: number;
  lastReadChapterIndex: number;
  updatedAtEpochMillis: number;
  pendingSync: boolean;
}

export interface ReadingSessionRow extends ReadingSessionRecord {
  ownerId: string;
  pendingSync: boolean;
}

export interface ReadingStatsRow extends ReadingStatsSummary {
  ownerId: string;
}

export type WriterDraftRow = WriterDraft;

export type StoryHighlightRow = StoryHighlight & {
  color: HighlightColor;
};

export const GUEST_OWNER_ID = '__guest__';

export class FableDexieDatabase extends Dexie {
  stories!: Table<StoryRow, string>;
  chapters!: Table<ChapterRow, string>;
  shelfStates!: Table<ShelfStateRow, string>;
  readingSessions!: Table<ReadingSessionRow, string>;
  readingStats!: Table<ReadingStatsRow, string>;
  writerDrafts!: Table<WriterDraftRow, string>;
  storyHighlights!: Table<StoryHighlightRow, string>;

  constructor() {
    super('fable_pwa_db_v1');
    this.version(1).stores({
      stories: 'id, provider, contentFormat, featuredRank, ownerUserId, genre, title',
      chapters: 'pk, storyId, [storyId+index]',
      shelfStates: 'pk, ownerId, storyId, [ownerId+storyId]',
      readingSessions: 'sessionId, ownerId, storyId',
      readingStats: 'ownerId',
      writerDrafts: 'draftKey, updatedAtEpochMillis',
      storyHighlights: 'id, storyId, [storyId+chapterIndex], createdAtEpochMillis',
    });
  }
}

export const db = new FableDexieDatabase();

export function parsePagesJson(pagesJson: string): ChapterPage[] {
  if (!pagesJson || pagesJson === '[]') return [];
  try {
    const parsed = JSON.parse(pagesJson);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p) => p && typeof p.imageUrl === 'string' && p.imageUrl.trim().length > 0)
      .map((p, idx) => ({
        index: typeof p.index === 'number' ? p.index : idx,
        imageUrl: p.imageUrl,
        width: typeof p.width === 'number' ? p.width : null,
        height: typeof p.height === 'number' ? p.height : null,
      }));
  } catch {
    return [];
  }
}
