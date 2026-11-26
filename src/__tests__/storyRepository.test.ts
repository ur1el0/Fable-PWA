import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../data/db/fableDb';
import {
  assembleStoriesWithState,
  ensureSeedStoriesLoaded,
  highlightRepository,
  storyRepository,
  upsertStoriesIntoDb,
  writerDraftRepository,
} from '../data/repository/storyRepository';
import { SEED_STORIES } from '../data/db/seedStories';

describe('Dexie IndexedDB Repositories (fake-indexeddb)', () => {
  beforeEach(async () => {
    await db.transaction(
      'rw',
      [
        db.stories,
        db.chapters,
        db.shelfStates,
        db.readingSessions,
        db.readingStats,
        db.writerDrafts,
        db.storyHighlights,
      ],
      async () => {
        await db.stories.clear();
        await db.chapters.clear();
        await db.shelfStates.clear();
        await db.readingSessions.clear();
        await db.readingStats.clear();
        await db.writerDrafts.clear();
        await db.storyHighlights.clear();
      }
    );
  });

  it('seeds initial stories and marks offline-downloaded story IDs', async () => {
    await ensureSeedStoriesLoaded();
    const { stories, downloadedStoryIds } = await assembleStoriesWithState();
    expect(stories.length).toBe(SEED_STORIES.length);
    expect(downloadedStoryIds.has('fable-glass-conservatory')).toBe(true);
    expect(downloadedStoryIds.has('mangadex-starlight-express-demo')).toBe(true);
  });

  it('preserves cached chapters and shelf state when summary catalog payloads arrive', async () => {
    await ensureSeedStoriesLoaded();
    await storyRepository.updateReadingProgress('fable-glass-conservatory', 1, 0.72);

    const summaryOverwrite = [
      {
        ...SEED_STORIES[0],
        isBookmarked: false,
        readingProgress: 0,
        chapters: SEED_STORIES[0].chapters.map((c) => ({ ...c, content: '' })),
      },
    ];
    await upsertStoriesIntoDb(summaryOverwrite, { preserveShelfState: true });

    const { stories } = await assembleStoriesWithState();
    const updated = stories.find((s) => s.id === 'fable-glass-conservatory')!;
    expect(updated.readingProgress).toBeCloseTo(0.72);
    expect(updated.chapters[0].content.length).toBeGreaterThan(20);
  });

  it('removes offline chapter bodies without deleting story metadata or shelf progress', async () => {
    await ensureSeedStoriesLoaded();
    await storyRepository.removeStoryOfflineCopy('fable-glass-conservatory');

    const { stories, downloadedStoryIds } = await assembleStoriesWithState();
    const story = stories.find((s) => s.id === 'fable-glass-conservatory')!;
    expect(story).toBeDefined();
    expect(story.isBookmarked).toBe(true);
    expect(downloadedStoryIds.has('fable-glass-conservatory')).toBe(false);
  });

  it('persists and deletes passage highlights and writer drafts in IndexedDB', async () => {
    await highlightRepository.saveHighlight({
      id: 'hl-test-1',
      storyId: 'fable-glass-conservatory',
      chapterIndex: 0,
      chapterTitle: 'Chapter 1',
      paragraphIndex: 0,
      startWordIndex: 1,
      endWordIndex: 5,
      quoteText: 'key to the upper greenhouse',
      note: 'Opening motif',
      color: 'SAGE',
      createdAtEpochMillis: 12345,
    });
    const list = await highlightRepository.listHighlights('fable-glass-conservatory');
    expect(list.length).toBe(1);
    expect(list[0].quoteText).toBe('key to the upper greenhouse');

    await highlightRepository.deleteHighlight('hl-test-1');
    expect((await highlightRepository.listHighlights('fable-glass-conservatory')).length).toBe(0);

    await writerDraftRepository.saveDraft({
      draftKey: 'primary',
      title: 'Night Ferry',
      genre: 'Mystery',
      synopsis: 'A ferry crosses a fogbound strait.',
      chapterTitle: 'Chapter 1: Pier Four',
      body: 'Lanterns swayed along the wet timber.',
      updatedAtEpochMillis: 9999,
    });
    const draft = await writerDraftRepository.getDraft();
    expect(draft?.title).toBe('Night Ferry');

    await writerDraftRepository.clearDraft();
    expect(await writerDraftRepository.getDraft()).toBeNull();
  });
});
