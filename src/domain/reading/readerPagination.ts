export interface ReaderPageSlice {
  pageIndex: number;
  paragraphs: Array<{
    paragraphIndex: number;
    text: string;
  }>;
  firstWordIndex: number;
  wordCount: number;
}

export function splitChapterIntoParagraphs(content: string): string[] {
  if (!content || !content.trim()) return [];
  return content
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Mirrors ReaderTextPaginator.kt:
 * Paginates chapter paragraphs into balanced screen-sized pages based on font size,
 * line height, and viewport budget while tracking exact global word offsets (`firstWordIndex`).
 */
export function paginateParagraphs(
  paragraphs: string[],
  options: { fontSizeSp: number; lineHeightMultiplier: number } = {
    fontSizeSp: 18,
    lineHeightMultiplier: 1.55,
  }
): ReaderPageSlice[] {
  if (paragraphs.length === 0) return [];

  const scaleFactor = (18 / Math.max(14, options.fontSizeSp)) * (1.55 / Math.max(1.2, options.lineHeightMultiplier));
  const targetWordsPerPage = Math.max(55, Math.min(240, Math.round(145 * scaleFactor)));

  const pages: ReaderPageSlice[] = [];
  let currentParagraphs: Array<{ paragraphIndex: number; text: string }> = [];
  let currentWordCount = 0;
  let currentPageFirstWord = 0;
  let runningWordIndex = 0;

  paragraphs.forEach((paraText, paragraphIndex) => {
    const words = paraText.split(/\s+/).filter(Boolean).length;

    if (currentParagraphs.length > 0 && currentWordCount + words > targetWordsPerPage) {
      pages.push({
        pageIndex: pages.length,
        paragraphs: currentParagraphs,
        firstWordIndex: currentPageFirstWord,
        wordCount: currentWordCount,
      });
      currentParagraphs = [];
      currentWordCount = 0;
      currentPageFirstWord = runningWordIndex;
    }

    if (currentParagraphs.length === 0) {
      currentPageFirstWord = runningWordIndex;
    }
    currentParagraphs.push({ paragraphIndex, text: paraText });
    currentWordCount += words;
    runningWordIndex += words;
  });

  if (currentParagraphs.length > 0) {
    pages.push({
      pageIndex: pages.length,
      paragraphs: currentParagraphs,
      firstWordIndex: currentPageFirstWord,
      wordCount: currentWordCount,
    });
  }

  return pages;
}

/**
 * Mirrors ReaderProgressMapper.kt:
 * Maps between chapter-level normalized progress (0..1), word offsets, and paginated page indices
 * so changing font size, line height, or scroll/paginated mode preserves exact reading location.
 */
export function pageIndexForWordOffset(pages: ReaderPageSlice[], targetWordIndex: number): number {
  if (pages.length <= 1 || targetWordIndex <= 0) return 0;
  for (let i = pages.length - 1; i >= 0; i--) {
    if (targetWordIndex >= pages[i].firstWordIndex) {
      return i;
    }
  }
  return 0;
}

export function progressForPageIndex(pageIndex: number, totalPages: number): number {
  if (totalPages <= 1) return 1;
  return Math.max(0, Math.min(1, pageIndex / (totalPages - 1)));
}

export function pageIndexForProgress(progress: number, totalPages: number): number {
  if (totalPages <= 1) return 0;
  const clamped = Math.max(0, Math.min(1, progress));
  return Math.min(totalPages - 1, Math.max(0, Math.round(clamped * (totalPages - 1))));
}
