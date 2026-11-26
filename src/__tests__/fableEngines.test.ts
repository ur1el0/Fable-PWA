import { describe, expect, it } from 'vitest';
import {
  sanitizeImageUrl,
  validateServerUrl,
} from '../data/remote/serverUrlValidator';
import {
  pageIndexForProgress,
  pageIndexForWordOffset,
  paginateParagraphs,
  progressForPageIndex,
  splitChapterIntoParagraphs,
} from '../domain/reading/readerPagination';
import {
  exportHighlightsAsMarkdown,
  searchStory,
  sliceWordRange,
  tokenizeWords,
} from '../domain/reading/inBookSearchAndHighlights';
import {
  clampComicPanOffset,
  clampComicZoom,
  toggleDoubleTapZoom,
} from '../domain/reading/comicZoomMath';
import { coalesceChapters } from '../data/repository/storyRepository';
import { parseManuscriptIntoChapters } from '../store/useFableStore';
import { SEED_STORIES } from '../data/db/seedStories';

describe('ServerUrlValidator & Manga Image Sanitizer', () => {
  it('normalizes valid HTTP/HTTPS URLs to end with /api/v1/', () => {
    const res = validateServerUrl('https://fable-api-cbo8.onrender.com');
    expect(res.isValid).toBe(true);
    expect(res.normalizedUrl).toBe('https://fable-api-cbo8.onrender.com/api/v1/');
  });

  it('accepts same-origin proxy path /api/v1/', () => {
    const res = validateServerUrl('/api/v1');
    expect(res.isValid).toBe(true);
    expect(res.normalizedUrl).toBe('/api/v1/');
  });

  it('rejects embedded credentials and non-HTTP schemes', () => {
    expect(validateServerUrl('https://user:pass@example.com/api/v1/').isValid).toBe(false);
    expect(validateServerUrl('javascript:alert(1)').isValid).toBe(false);
    expect(
      validateServerUrl('http://10.0.2.2:8000/api/v1/', { requireHttps: true }).isValid
    ).toBe(false);
  });

  it('sanitizes external cover and comic page URLs', () => {
    expect(sanitizeImageUrl('https://uploads.mangadex.org/covers/abc.jpg')).toBe(
      'https://uploads.mangadex.org/covers/abc.jpg'
    );
    expect(sanitizeImageUrl('javascript:evil()')).toBeNull();
    expect(sanitizeImageUrl('')).toBeNull();
  });
});

describe('ReaderTextPaginator & ReaderProgressMapper', () => {
  const sampleContent = Array.from(
    { length: 12 },
    (_, i) =>
      `Paragraph ${i + 1} with twenty words of prose text so that pagination slices chapters deterministically across font sizes.`
  ).join('\n\n');

  it('splits paragraphs and preserves word-offset position across font size changes', () => {
    const paragraphs = splitChapterIntoParagraphs(sampleContent);
    expect(paragraphs.length).toBe(12);

    const smallFontPages = paginateParagraphs(paragraphs, {
      fontSizeSp: 16,
      lineHeightMultiplier: 1.4,
    });
    const largeFontPages = paginateParagraphs(paragraphs, {
      fontSizeSp: 24,
      lineHeightMultiplier: 1.8,
    });

    expect(largeFontPages.length).toBeGreaterThanOrEqual(smallFontPages.length);

    const anchorWord = smallFontPages[1]?.firstWordIndex ?? 0;
    const mappedPage = pageIndexForWordOffset(largeFontPages, anchorWord);
    expect(largeFontPages[mappedPage].firstWordIndex).toBeLessThanOrEqual(anchorWord);
  });

  it('maps normalized progress <-> page index symmetrically', () => {
    const progress = progressForPageIndex(2, 5);
    expect(progress).toBeCloseTo(0.5);
    expect(pageIndexForProgress(progress, 5)).toBe(2);
  });
});

describe('InBookSearchEngine & HighlightExporter', () => {
  it('tokenizes words and slices exact word ranges', () => {
    const sentence = 'The key to the upper greenhouse had been cast from soft brass.';
    const tokens = tokenizeWords(sentence);
    expect(tokens.length).toBe(12);
    expect(sliceWordRange(sentence, 1, 5)).toBe('key to the upper greenhouse');
  });

  it('finds cross-chapter search matches with context snippets', () => {
    const story = SEED_STORIES[0];
    const matches = searchStory(story, 'greenhouse');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].matchedTerm.toLowerCase()).toBe('greenhouse');
    expect(matches[0].chapterIndex).toBe(0);
  });

  it('exports highlights and notes as Markdown', () => {
    const md = exportHighlightsAsMarkdown(
      { title: 'The Glass Conservatory', author: 'Elena Vance' },
      [
        {
          id: 'hl-1',
          storyId: 's1',
          chapterIndex: 0,
          chapterTitle: 'Chapter 1',
          paragraphIndex: 0,
          startWordIndex: 0,
          endWordIndex: 4,
          quoteText: 'Moonlight fell through the dome',
          note: 'Great imagery',
          color: 'TERRACOTTA',
          createdAtEpochMillis: 1000,
        },
      ]
    );
    expect(md).toContain('# The Glass Conservatory');
    expect(md).toContain('> “Moonlight fell through the dome”');
    expect(md).toContain('**Note:** Great imagery');
  });
});

describe('ComicZoomMath', () => {
  it('clamps zoom to 1x..4x and toggles double-tap zoom 1x <-> 2.5x', () => {
    expect(clampComicZoom(0.4)).toBe(1.0);
    expect(clampComicZoom(6.0)).toBe(4.0);
    expect(toggleDoubleTapZoom(1.0)).toBe(2.5);
    expect(toggleDoubleTapZoom(2.5)).toBe(1.0);
  });

  it('resets pan offset at 1x and bounds pan offset when zoomed', () => {
    expect(
      clampComicPanOffset({ x: 100, y: -80 }, 1.0, { width: 400, height: 600 })
    ).toEqual({ x: 0, y: 0 });
    const bounded = clampComicPanOffset({ x: 999, y: -999 }, 2.0, {
      width: 400,
      height: 600,
    });
    expect(bounded.x).toBe(200);
    expect(bounded.y).toBe(-300);
  });
});

describe('Non-destructive coalesceChapters & Manuscript Parser', () => {
  it('preserves cached chapter prose and comic pages when incoming summary is empty', () => {
    const existing = [
      {
        pk: 's1:0',
        storyId: 's1',
        index: 0,
        chapterId: 's1-ch-0',
        title: 'Chapter 1',
        readTimeMinutes: 7,
        content: 'Full cached chapter text stored offline.',
        pagesJson: '[]',
        pageCount: 0,
      },
    ];
    const incomingSummary = [
      {
        id: 's1-ch-0',
        index: 0,
        title: 'Chapter 1',
        readTimeMinutes: 7,
        content: '',
        pages: [],
        pageCount: 0,
      },
    ];

    const merged = coalesceChapters(incomingSummary, existing);
    expect(merged[0].content).toBe('Full cached chapter text stored offline.');
  });

  it('splits writer manuscript body on Chapter N: markers', () => {
    const body = [
      'First chapter paragraph one.',
      '',
      'Chapter 2: The Second Part',
      'Second chapter paragraph one.',
    ].join('\n');

    const chapters = parseManuscriptIntoChapters('Chapter 1: Opening', body);
    expect(chapters.length).toBe(2);
    expect(chapters[0].title).toBe('Chapter 1: Opening');
    expect(chapters[1].title).toBe('Chapter 2: The Second Part');
    expect(chapters[1].content).toBe('Second chapter paragraph one.');
  });
});
