import type { Story, StoryHighlight } from '../models';
import { splitChapterIntoParagraphs } from './readerPagination';

export interface WordToken {
  index: number;
  word: string;
}

export interface InBookSearchMatch {
  chapterIndex: number;
  chapterTitle: string;
  paragraphIndex: number;
  wordIndex: number;
  matchedTerm: string;
  snippetBefore: string;
  snippetMatch: string;
  snippetAfter: string;
}

/**
 * Mirrors InBookSearchEngine.tokenizeWords:
 * Splits a paragraph into indexed word tokens for passage word-range selection.
 */
export function tokenizeWords(paragraphText: string): WordToken[] {
  const trimmed = paragraphText.trim();
  if (!trimmed) return [];
  return trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => ({ index, word }));
}

/**
 * Mirrors InBookSearchEngine.sliceWordRange:
 * Extracts the exact phrase spanning `[startWordIndex..endWordIndex]` inclusive.
 */
export function sliceWordRange(
  paragraphText: string,
  startWordIndex: number,
  endWordIndex: number
): string {
  const tokens = tokenizeWords(paragraphText);
  if (tokens.length === 0) return '';
  const safeStart = Math.max(0, Math.min(tokens.length - 1, startWordIndex));
  const safeEnd = Math.max(safeStart, Math.min(tokens.length - 1, endWordIndex));
  return tokens
    .slice(safeStart, safeEnd + 1)
    .map((t) => t.word)
    .join(' ');
}

/**
 * Mirrors InBookSearchEngine.searchStory:
 * Performs a case-insensitive cross-chapter search with surrounding context snippets.
 */
export function searchStory(
  story: Story,
  rawQuery: string,
  maxResults = 60
): InBookSearchMatch[] {
  const query = rawQuery.trim();
  if (query.length < 2) return [];
  const lowerQuery = query.toLowerCase();
  const matches: InBookSearchMatch[] = [];

  for (const chapter of story.chapters) {
    const paragraphs = splitChapterIntoParagraphs(chapter.content);
    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const para = paragraphs[pIdx];
      const lowerPara = para.toLowerCase();
      let searchFrom = 0;

      while (searchFrom < lowerPara.length) {
        const foundAt = lowerPara.indexOf(lowerQuery, searchFrom);
        if (foundAt === -1) break;

        const prefixText = para.slice(0, foundAt);
        const wordIndex = prefixText.trim()
          ? prefixText.trim().split(/\s+/).length
          : 0;

        const snippetStart = Math.max(0, foundAt - 48);
        const snippetEnd = Math.min(para.length, foundAt + query.length + 56);
        const snippetBefore =
          (snippetStart > 0 ? '…' : '') + para.slice(snippetStart, foundAt);
        const snippetMatch = para.slice(foundAt, foundAt + query.length);
        const snippetAfter =
          para.slice(foundAt + query.length, snippetEnd) +
          (snippetEnd < para.length ? '…' : '');

        matches.push({
          chapterIndex: chapter.index,
          chapterTitle: chapter.title,
          paragraphIndex: pIdx,
          wordIndex,
          matchedTerm: snippetMatch,
          snippetBefore,
          snippetMatch,
          snippetAfter,
        });

        if (matches.length >= maxResults) {
          return matches;
        }
        searchFrom = foundAt + Math.max(1, query.length);
      }
    }
  }

  return matches;
}

/**
 * Mirrors HighlightExporter.kt:
 * Formats story highlights and notes as clean Markdown or plain text.
 */
export function exportHighlightsAsMarkdown(
  story: Pick<Story, 'title' | 'author'>,
  highlights: StoryHighlight[]
): string {
  const lines: string[] = [
    `# ${story.title}`,
    `*by ${story.author}* (${highlights.length} Highlight${highlights.length === 1 ? '' : 's'})`,
    '',
  ];

  for (const h of highlights) {
    lines.push(`### ${h.chapterTitle}`);
    lines.push(`> “${h.quoteText}”`);
    if (h.note && h.note.trim().length > 0) {
      lines.push('');
      lines.push(`**Note:** ${h.note.trim()}`);
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}
