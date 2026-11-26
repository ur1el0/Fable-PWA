import {
  db,
  GUEST_OWNER_ID,
  parsePagesJson,
  type ChapterRow,
  type ShelfStateRow,
  type StoryRow,
} from '../db/fableDb';
import { SEED_STORIES } from '../db/seedStories';
import { fableApiService } from '../remote/fableApiService';
import type {
  Chapter,
  ReadingSessionRecord,
  ReadingStatsSummary,
  Story,
  StoryHighlight,
  StoryProvider,
  StorySubmission,
  WriterDraft,
} from '../../domain/models';
import { EMPTY_READING_STATS } from '../../domain/models';

const ACTIVE_OWNER_KEY = 'fable.auth.owner_id';

export function getActiveOwnerId(): string {
  try {
    return localStorage.getItem(ACTIVE_OWNER_KEY) || GUEST_OWNER_ID;
  } catch {
    return GUEST_OWNER_ID;
  }
}

export function setActiveOwnerId(ownerId: string | null): void {
  try {
    if (!ownerId) {
      localStorage.removeItem(ACTIVE_OWNER_KEY);
    } else {
      localStorage.setItem(ACTIVE_OWNER_KEY, ownerId);
    }
  } catch {
    // ignore
  }
}

/**
 * Mirrors RoomStoryRepository.coalesceChapters:
 * Never overwrite existing non-empty chapter content or comic page lists with blank summary payloads.
 */
export function coalesceChapters(incoming: Chapter[], existingRows: ChapterRow[]): ChapterRow[] {
  const existingByIndex = new Map<number, ChapterRow>();
  for (const row of existingRows) {
    existingByIndex.set(row.index, row);
  }

  if (incoming.length === 0 && existingRows.length > 0) {
    return existingRows;
  }

  return incoming.map((ch, idx) => {
    const index = typeof ch.index === 'number' ? ch.index : idx;
    const prev = existingByIndex.get(index);
    const hasIncomingContent = ch.content && ch.content.trim().length > 0;
    const content = hasIncomingContent ? ch.content : prev?.content ?? '';

    const hasIncomingPages = Array.isArray(ch.pages) && ch.pages.length > 0;
    const pagesJson = hasIncomingPages
      ? JSON.stringify(ch.pages)
      : prev?.pagesJson && prev.pagesJson !== '[]'
        ? prev.pagesJson
        : '[]';

    const pageCount =
      ch.pageCount > 0
        ? ch.pageCount
        : hasIncomingPages
          ? ch.pages.length
          : prev?.pageCount ?? 0;

    return {
      pk: `${ch.id.split('-ch-')[0] || prev?.storyId || 'story'}:${index}`,
      storyId: prev?.storyId ?? '',
      index,
      chapterId: ch.id || prev?.chapterId || `ch-${index}`,
      title: ch.title || prev?.title || `Chapter ${index + 1}`,
      readTimeMinutes: ch.readTimeMinutes || prev?.readTimeMinutes || 5,
      content,
      pagesJson,
      pageCount,
    };
  });
}

export async function upsertStoriesIntoDb(
  stories: Story[],
  options: { preserveShelfState?: boolean; ownerId?: string } = {}
): Promise<void> {
  const ownerId = options.ownerId ?? getActiveOwnerId();
  await db.transaction('rw', [db.stories, db.chapters, db.shelfStates], async () => {
    for (const story of stories) {
      const existingStory = await db.stories.get(story.id);
      const existingChapters = await db.chapters.where('storyId').equals(story.id).toArray();

      const storyRow: StoryRow = {
        id: story.id,
        ownerUserId: story.ownerUserId ?? existingStory?.ownerUserId ?? null,
        title: story.title,
        author: story.author,
        authorBio: story.authorBio || existingStory?.authorBio || '',
        genre: story.genre,
        readTimeMinutes: story.readTimeMinutes || existingStory?.readTimeMinutes || 10,
        rating: story.rating || existingStory?.rating || 4.7,
        synopsis:
          story.synopsis && story.synopsis.trim().length > 0
            ? story.synopsis
            : existingStory?.synopsis ?? '',
        accentHex: story.accentHex || existingStory?.accentHex || '#3949AB',
        featuredRank: story.featuredRank ?? existingStory?.featuredRank ?? null,
        provider: story.provider,
        contentFormat: story.contentFormat,
        coverImageUrl: story.coverImageUrl ?? existingStory?.coverImageUrl ?? null,
        externalId: story.externalId ?? existingStory?.externalId ?? null,
        sourceUrl: story.sourceUrl ?? existingStory?.sourceUrl ?? null,
      };
      await db.stories.put(storyRow);

      const mergedChapters = coalesceChapters(story.chapters, existingChapters).map((row) => ({
        ...row,
        pk: `${story.id}:${row.index}`,
        storyId: story.id,
      }));
      if (mergedChapters.length > 0) {
        await db.chapters.bulkPut(mergedChapters);
      }

      const shelfPk = `${ownerId}:${story.id}`;
      const existingShelf = await db.shelfStates.get(shelfPk);
      if (!existingShelf) {
        const shelfRow: ShelfStateRow = {
          pk: shelfPk,
          ownerId,
          storyId: story.id,
          isBookmarked: story.isBookmarked,
          isCompleted: story.isCompleted,
          readingProgress: story.readingProgress,
          lastReadChapterIndex: story.lastReadChapterIndex,
          updatedAtEpochMillis: Date.now(),
          pendingSync: false,
        };
        await db.shelfStates.put(shelfRow);
      } else if (options.preserveShelfState === false) {
        await db.shelfStates.put({
          ...existingShelf,
          isBookmarked: story.isBookmarked,
          isCompleted: story.isCompleted,
          readingProgress: story.readingProgress,
          lastReadChapterIndex: story.lastReadChapterIndex,
          updatedAtEpochMillis: Date.now(),
        });
      }
    }
  });
}

export async function ensureSeedStoriesLoaded(): Promise<void> {
  const count = await db.stories.count();
  if (count === 0) {
    await upsertStoriesIntoDb(SEED_STORIES);
  }
}

export async function assembleStoriesWithState(ownerId = getActiveOwnerId()): Promise<{
  stories: Story[];
  downloadedStoryIds: Set<string>;
}> {
  const [storyRows, chapterRows, shelfRows] = await Promise.all([
    db.stories.toArray(),
    db.chapters.toArray(),
    db.shelfStates.where('ownerId').equals(ownerId).toArray(),
  ]);

  const chaptersByStory = new Map<string, ChapterRow[]>();
  const downloadedStoryIds = new Set<string>();

  for (const ch of chapterRows) {
    const list = chaptersByStory.get(ch.storyId) ?? [];
    list.push(ch);
    chaptersByStory.set(ch.storyId, list);
    if ((ch.content && ch.content.trim().length > 0) || (ch.pagesJson && ch.pagesJson !== '[]')) {
      downloadedStoryIds.add(ch.storyId);
    }
  }

  const shelfByStory = new Map<string, ShelfStateRow>();
  for (const sh of shelfRows) {
    shelfByStory.set(sh.storyId, sh);
  }

  const stories: Story[] = storyRows.map((row) => {
    const rawChapters = (chaptersByStory.get(row.id) ?? []).sort((a, b) => a.index - b.index);
    const chapters: Chapter[] = rawChapters.map((ch) => ({
      id: ch.chapterId,
      index: ch.index,
      title: ch.title,
      readTimeMinutes: ch.readTimeMinutes,
      content: ch.content,
      pages: parsePagesJson(ch.pagesJson),
      pageCount: ch.pageCount,
    }));
    const shelf = shelfByStory.get(row.id);

    return {
      id: row.id,
      ownerUserId: row.ownerUserId,
      title: row.title,
      author: row.author,
      authorBio: row.authorBio,
      genre: row.genre,
      readTimeMinutes: row.readTimeMinutes,
      rating: row.rating,
      synopsis: row.synopsis,
      accentHex: row.accentHex,
      featuredRank: row.featuredRank,
      isBookmarked: shelf?.isBookmarked ?? false,
      isCompleted: shelf?.isCompleted ?? false,
      readingProgress: shelf?.readingProgress ?? 0,
      lastReadChapterIndex: shelf?.lastReadChapterIndex ?? 0,
      provider: row.provider,
      contentFormat: row.contentFormat,
      coverImageUrl: row.coverImageUrl,
      externalId: row.externalId,
      sourceUrl: row.sourceUrl,
      chapters,
    };
  });

  stories.sort((a, b) => {
    const rankA = a.featuredRank ?? 9999;
    const rankB = b.featuredRank ?? 9999;
    if (rankA !== rankB) return rankA - rankB;
    return a.title.localeCompare(b.title);
  });

  return { stories, downloadedStoryIds };
}

export const storyRepository = {
  /**
   * Mirrors RoomStoryRepository.refreshCatalog():
   * Runs Fable, Gutenberg, Standard Ebooks, and MangaDex fetches in parallel with fault isolation.
   */
  async refreshCatalog(): Promise<{ syncedProviders: StoryProvider[]; usingOfflineFallback: boolean }> {
    await ensureSeedStoriesLoaded();
    const results = await Promise.allSettled([
      fableApiService.fetchFableStories(),
      fableApiService.fetchGutenbergDiscover(),
      fableApiService.fetchStandardEbooksDiscover(),
      fableApiService.fetchMangaDiscover(),
    ]);

    const providers: StoryProvider[] = ['FABLE', 'GUTENBERG', 'STANDARD_EBOOKS', 'MANGADEX'];
    const syncedProviders: StoryProvider[] = [];
    const collected: Story[] = [];

    results.forEach((res, idx) => {
      if (res.status === 'fulfilled' && res.value.length > 0) {
        syncedProviders.push(providers[idx]);
        collected.push(...res.value);
      }
    });

    if (collected.length > 0) {
      await upsertStoriesIntoDb(collected);
      return { syncedProviders, usingOfflineFallback: false };
    }
    return { syncedProviders: [], usingOfflineFallback: true };
  },

  async searchCatalog(
    query: string,
    options: { provider?: StoryProvider | 'ALL'; format?: 'PROSE' | 'COMIC'; signal?: AbortSignal } = {}
  ): Promise<Story[]> {
    const trimmed = query.trim();
    const format = options.format ?? 'PROSE';
    const provider = options.provider ?? 'ALL';

    const tasks: Array<Promise<Story[]>> = [];
    if (format === 'COMIC' || provider === 'MANGADEX') {
      tasks.push(fableApiService.fetchMangaDiscover(trimmed, options.signal));
    } else {
      if (provider === 'ALL' || provider === 'GUTENBERG') {
        tasks.push(fableApiService.fetchGutenbergDiscover(trimmed, 'popular', options.signal));
      }
      if (provider === 'ALL' || provider === 'STANDARD_EBOOKS') {
        tasks.push(fableApiService.fetchStandardEbooksDiscover(trimmed, options.signal));
      }
      if (provider === 'ALL' || provider === 'FABLE') {
        tasks.push(
          fableApiService.fetchFableStories(options.signal).then((list) =>
            trimmed
              ? list.filter(
                  (s) =>
                    s.title.toLowerCase().includes(trimmed.toLowerCase()) ||
                    s.author.toLowerCase().includes(trimmed.toLowerCase()) ||
                    s.genre.toLowerCase().includes(trimmed.toLowerCase())
                )
              : list
          )
        );
      }
    }

    const settled = await Promise.allSettled(tasks);
    const remoteStories: Story[] = [];
    for (const item of settled) {
      if (item.status === 'fulfilled') {
        remoteStories.push(...item.value);
      }
    }
    if (remoteStories.length > 0) {
      await upsertStoriesIntoDb(remoteStories);
    }

    const { stories } = await assembleStoriesWithState();
    return stories.filter((s) => {
      if (s.contentFormat !== format) return false;
      if (provider !== 'ALL' && s.provider !== provider) return false;
      if (!trimmed) return true;
      const q = trimmed.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.author.toLowerCase().includes(q) ||
        s.genre.toLowerCase().includes(q) ||
        s.synopsis.toLowerCase().includes(q)
      );
    });
  },

  async hydrateStoryChapters(storyId: string): Promise<Story | null> {
    const { stories } = await assembleStoriesWithState();
    const existing = stories.find((s) => s.id === storyId) ?? null;
    if (!existing) return null;

    const hasHydratedContent =
      existing.chapters.length > 0 &&
      existing.chapters.some(
        (c) => (c.content && c.content.trim().length > 0) || c.pages.length > 0
      );

    if (hasHydratedContent && (existing.provider === 'GUTENBERG' || existing.synopsis.trim().length > 0)) {
      return existing;
    }

    try {
      if (existing.provider === 'FABLE') {
        const detailed = await fableApiService.fetchStoryDetail(existing.id);
        await upsertStoriesIntoDb([detailed]);
      } else if (existing.provider === 'GUTENBERG') {
        const extId = existing.externalId ?? existing.id;
        const chapters = await fableApiService.fetchGutenbergChapters(extId, existing.id);
        if (chapters.length > 0) {
          await upsertStoriesIntoDb([{ ...existing, chapters }]);
        }
      } else if (existing.provider === 'STANDARD_EBOOKS') {
        const extId = existing.externalId ?? existing.id;
        const chapters = await fableApiService.fetchStandardEbooksChapters(extId, existing.id);
        if (chapters.length > 0) {
          await upsertStoriesIntoDb([{ ...existing, chapters }]);
        }
      } else if (existing.provider === 'MANGADEX') {
        const extId = existing.externalId ?? existing.id;
        const chapters = await fableApiService.fetchMangaChapters(extId, existing.id);
        if (chapters.length > 0) {
          await upsertStoriesIntoDb([{ ...existing, chapters }]);
        }
      }
    } catch {
      // Keep cached story if offline or upstream times out
    }

    const refreshed = await assembleStoriesWithState();
    return refreshed.stories.find((s) => s.id === storyId) ?? existing;
  },

  async downloadStoryForOffline(storyId: string): Promise<boolean> {
    const hydrated = await this.hydrateStoryChapters(storyId);
    if (!hydrated) return false;
    return hydrated.chapters.some(
      (c) => (c.content && c.content.trim().length > 0) || c.pages.length > 0
    );
  },

  async removeStoryOfflineCopy(storyId: string): Promise<void> {
    await db.transaction('rw', db.chapters, async () => {
      const chapters = await db.chapters.where('storyId').equals(storyId).toArray();
      await db.chapters.bulkPut(
        chapters.map((ch) => ({
          ...ch,
          content: '',
          pagesJson: '[]',
          pageCount: 0,
        }))
      );
    });
  },

  async toggleBookmark(storyId: string): Promise<void> {
    const ownerId = getActiveOwnerId();
    const pk = `${ownerId}:${storyId}`;
    const existing = await db.shelfStates.get(pk);
    await db.shelfStates.put({
      pk,
      ownerId,
      storyId,
      isBookmarked: !(existing?.isBookmarked ?? false),
      isCompleted: existing?.isCompleted ?? false,
      readingProgress: existing?.readingProgress ?? 0,
      lastReadChapterIndex: existing?.lastReadChapterIndex ?? 0,
      updatedAtEpochMillis: Date.now(),
      pendingSync: true,
    });
  },

  async updateReadingProgress(
    storyId: string,
    chapterIndex: number,
    progress: number
  ): Promise<void> {
    const ownerId = getActiveOwnerId();
    const pk = `${ownerId}:${storyId}`;
    const clamped = Math.max(0, Math.min(1, progress));
    const existing = await db.shelfStates.get(pk);
    await db.shelfStates.put({
      pk,
      ownerId,
      storyId,
      isBookmarked: existing?.isBookmarked ?? false,
      isCompleted: clamped >= 0.98 || (existing?.isCompleted ?? false),
      readingProgress: clamped,
      lastReadChapterIndex: Math.max(0, chapterIndex),
      updatedAtEpochMillis: Date.now(),
      pendingSync: true,
    });
  },

  async createLocalOrRemoteStory(
    submission: StorySubmission,
    options: { accessToken?: string | null; ownerUserId?: string | null }
  ): Promise<Story> {
    if (options.accessToken) {
      try {
        const created = await fableApiService.publishStory(submission, options.accessToken);
        const withOwner = {
          ...created,
          ownerUserId: created.ownerUserId ?? options.ownerUserId ?? 'local-author',
        };
        await upsertStoriesIntoDb([withOwner]);
        return withOwner;
      } catch {
        // Fallback to local offline publish so writer work always succeeds
      }
    }

    const id = `fable-local-${Date.now()}`;
    const chapters: Chapter[] = submission.chapters.map((ch, idx) => {
      const words = ch.content.trim().split(/\s+/).filter(Boolean).length;
      return {
        id: `${id}-ch-${idx}`,
        index: idx,
        title: ch.title || `Chapter ${idx + 1}`,
        readTimeMinutes: Math.max(1, Math.round(words / 220)),
        content: ch.content,
        pages: [],
        pageCount: 0,
      };
    });

    const localStory: Story = {
      id,
      ownerUserId: options.ownerUserId ?? 'local-author',
      title: submission.title,
      author: submission.author,
      authorBio: submission.authorBio,
      genre: submission.genre,
      readTimeMinutes: Math.max(1, chapters.reduce((acc, c) => acc + c.readTimeMinutes, 0)),
      rating: 5.0,
      synopsis: submission.synopsis,
      accentHex: submission.accentHex ?? '#3949AB',
      featuredRank: 1,
      isBookmarked: true,
      isCompleted: false,
      readingProgress: 0,
      lastReadChapterIndex: 0,
      provider: 'FABLE',
      contentFormat: 'PROSE',
      coverImageUrl: null,
      externalId: null,
      sourceUrl: null,
      chapters,
    };
    await upsertStoriesIntoDb([localStory]);
    return localStory;
  },

  async updateOwnedStory(
    storyId: string,
    submission: StorySubmission,
    accessToken?: string | null
  ): Promise<Story | null> {
    if (accessToken && !storyId.startsWith('fable-local-')) {
      try {
        const updated = await fableApiService.updateStory(storyId, submission, accessToken);
        await upsertStoriesIntoDb([updated]);
        return updated;
      } catch {
        // Fallback to local update if server is asleep
      }
    }

    const { stories } = await assembleStoriesWithState();
    const existing = stories.find((s) => s.id === storyId);
    if (!existing) return null;

    const chapters: Chapter[] = submission.chapters.map((ch, idx) => {
      const words = ch.content.trim().split(/\s+/).filter(Boolean).length;
      return {
        id: `${storyId}-ch-${idx}`,
        index: idx,
        title: ch.title || `Chapter ${idx + 1}`,
        readTimeMinutes: Math.max(1, Math.round(words / 220)),
        content: ch.content,
        pages: [],
        pageCount: 0,
      };
    });

    const updatedStory: Story = {
      ...existing,
      title: submission.title,
      genre: submission.genre,
      synopsis: submission.synopsis,
      readTimeMinutes: Math.max(1, chapters.reduce((acc, c) => acc + c.readTimeMinutes, 0)),
      chapters,
    };

    await db.transaction('rw', [db.stories, db.chapters], async () => {
      await db.chapters.where('storyId').equals(storyId).delete();
    });
    await upsertStoriesIntoDb([updatedStory]);
    return updatedStory;
  },

  async deleteOwnedStory(storyId: string, accessToken?: string | null): Promise<void> {
    if (accessToken && !storyId.startsWith('fable-local-')) {
      try {
        await fableApiService.deleteStory(storyId, accessToken);
      } catch {
        // continue with local cleanup
      }
    }
    await db.transaction(
      'rw',
      [db.stories, db.chapters, db.shelfStates, db.storyHighlights],
      async () => {
        await db.stories.delete(storyId);
        await db.chapters.where('storyId').equals(storyId).delete();
        await db.shelfStates.where('storyId').equals(storyId).delete();
        await db.storyHighlights.where('storyId').equals(storyId).delete();
      }
    );
  },

  async purgeAccountData(ownerId: string): Promise<void> {
    await db.transaction(
      'rw',
      [db.stories, db.chapters, db.shelfStates, db.readingSessions, db.readingStats],
      async () => {
        const ownedStories = await db.stories.where('ownerUserId').equals(ownerId).toArray();
        for (const s of ownedStories) {
          await db.stories.delete(s.id);
          await db.chapters.where('storyId').equals(s.id).delete();
        }
        await db.shelfStates.where('ownerId').equals(ownerId).delete();
        await db.readingSessions.where('ownerId').equals(ownerId).delete();
        await db.readingStats.delete(ownerId);
      }
    );
  },
};

export const highlightRepository = {
  async listHighlights(storyId: string): Promise<StoryHighlight[]> {
    const rows = await db.storyHighlights.where('storyId').equals(storyId).toArray();
    return rows.sort((a, b) => {
      if (a.chapterIndex !== b.chapterIndex) return a.chapterIndex - b.chapterIndex;
      if (a.paragraphIndex !== b.paragraphIndex) return a.paragraphIndex - b.paragraphIndex;
      return a.startWordIndex - b.startWordIndex;
    });
  },

  async saveHighlight(highlight: StoryHighlight): Promise<void> {
    await db.storyHighlights.put(highlight);
  },

  async deleteHighlight(highlightId: string): Promise<void> {
    await db.storyHighlights.delete(highlightId);
  },
};

export const readingStatsRepository = {
  async getStats(ownerId = getActiveOwnerId()): Promise<ReadingStatsSummary> {
    const row = await db.readingStats.get(ownerId);
    if (!row) return EMPTY_READING_STATS;
    return {
      totalReadingMinutes: row.totalReadingMinutes,
      totalWordsRead: row.totalWordsRead,
      completedStoriesCount: row.completedStoriesCount,
      activeDaysLast7: row.activeDaysLast7,
      currentStreakDays: row.currentStreakDays,
      sessionsCount: row.sessionsCount,
      lastReadAtIso: row.lastReadAtIso,
    };
  },

  async recordSession(
    session: ReadingSessionRecord,
    accessToken?: string | null
  ): Promise<ReadingStatsSummary> {
    if (session.durationSeconds < 5) {
      return this.getStats();
    }
    const ownerId = getActiveOwnerId();
    await db.readingSessions.put({
      ...session,
      ownerId,
      pendingSync: true,
    });

    const current = await this.getStats(ownerId);
    const addedMinutes = Math.max(1, Math.round(session.durationSeconds / 60));
    const optimistic: ReadingStatsSummary = {
      totalReadingMinutes: current.totalReadingMinutes + addedMinutes,
      totalWordsRead: current.totalWordsRead + Math.max(0, session.wordsRead),
      completedStoriesCount:
        current.completedStoriesCount + (session.completedStory ? 1 : 0),
      activeDaysLast7: Math.max(1, current.activeDaysLast7),
      currentStreakDays: Math.max(1, current.currentStreakDays),
      sessionsCount: current.sessionsCount + 1,
      lastReadAtIso: session.endedAtIso,
    };

    await db.readingStats.put({
      ownerId,
      ...optimistic,
    });

    if (accessToken) {
      try {
        const remote = await fableApiService.recordReadingSession(session, accessToken);
        if (remote) {
          await db.readingStats.put({ ownerId, ...remote });
          await db.readingSessions.update(session.sessionId, { pendingSync: false });
          return remote;
        }
      } catch {
        // keep optimistic local stats
      }
    }
    return optimistic;
  },
};

export const writerDraftRepository = {
  async getDraft(draftKey = 'primary'): Promise<WriterDraft | null> {
    return (await db.writerDrafts.get(draftKey)) ?? null;
  },

  async saveDraft(draft: WriterDraft): Promise<void> {
    await db.writerDrafts.put(draft);
  },

  async clearDraft(draftKey = 'primary'): Promise<void> {
    await db.writerDrafts.delete(draftKey);
  },
};
