import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Highlighter,
  List,
  Search,
  SlidersHorizontal,
  ZoomIn,
} from 'lucide-react';
import {
  HIGHLIGHT_SWATCHES,
  type HighlightColor,
  type ReaderTheme,
  type StoryHighlight,
} from '../../domain/models';
import {
  pageIndexForProgress,
  pageIndexForWordOffset,
  paginateParagraphs,
  progressForPageIndex,
  splitChapterIntoParagraphs,
} from '../../domain/reading/readerPagination';
import {
  searchStory,
  sliceWordRange,
  tokenizeWords,
} from '../../domain/reading/inBookSearchAndHighlights';
import {
  clampComicPanOffset,
  clampComicZoom,
  toggleDoubleTapZoom,
} from '../../domain/reading/comicZoomMath';
import { shareOrDownloadQuoteCard } from '../../domain/reading/quoteCardExporter';
import { useFableStore } from '../../store/useFableStore';
import {
  PassageHighlightSheet,
  QuoteCardShareSheet,
  ReaderChaptersSheet,
  ReaderDisplaySheet,
  ReaderHighlightsSheet,
  ReaderSearchSheet,
} from '../components/reader/ReaderSheets';

const READER_SURFACE_VARS: Record<
  ReaderTheme,
  { bg: string; ink: string; muted: string; border: string }
> = {
  PAPER: {
    bg: 'var(--reader-paper-bg)',
    ink: 'var(--reader-paper-ink)',
    muted: 'var(--reader-paper-muted)',
    border: 'var(--reader-paper-border)',
  },
  SEPIA: {
    bg: 'var(--reader-sepia-bg)',
    ink: 'var(--reader-sepia-ink)',
    muted: 'var(--reader-sepia-muted)',
    border: 'var(--reader-sepia-border)',
  },
  NIGHT: {
    bg: 'var(--reader-night-bg)',
    ink: 'var(--reader-night-ink)',
    muted: 'var(--reader-night-muted)',
    border: 'var(--reader-night-border)',
  },
};

export function StoryReaderScreen({
  storyId,
  initialChapterIndex,
}: {
  storyId: string;
  initialChapterIndex: number;
}) {
  const stories = useFableStore((s) => s.stories);
  const prefs = useFableStore((s) => s.readerPreferences);
  const highlights = useFableStore((s) => s.activeStoryHighlights);
  const navigateBack = useFableStore((s) => s.navigateBack);
  const updateReaderPreference = useFableStore((s) => s.updateReaderPreference);
  const resetReaderTypography = useFableStore((s) => s.resetReaderTypography);
  const setAppAppearance = useFableStore((s) => s.setAppAppearance);
  const updateReadingProgress = useFableStore((s) => s.updateReadingProgress);
  const recordReadingSession = useFableStore((s) => s.recordReadingSession);
  const saveHighlight = useFableStore((s) => s.saveHighlight);
  const deleteHighlight = useFableStore((s) => s.deleteHighlight);

  const story = stories.find((s) => s.id === storyId);
  const [chapterIndex, setChapterIndex] = useState(initialChapterIndex);
  const [pageIndex, setPageIndex] = useState(0);
  const [anchorWordOffset, setAnchorWordOffset] = useState(0);

  const [showChaptersSheet, setShowChaptersSheet] = useState(false);
  const [showDisplaySheet, setShowDisplaySheet] = useState(false);
  const [showSearchSheet, setShowSearchSheet] = useState(false);
  const [showHighlightsSheet, setShowHighlightsSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [editingParagraphIndex, setEditingParagraphIndex] = useState<number | null>(null);
  const [startWordIdx, setStartWordIdx] = useState(0);
  const [endWordIdx, setEndWordIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState<HighlightColor>('TERRACOTTA');
  const [highlightNote, setHighlightNote] = useState('');

  const [quoteCardHighlight, setQuoteCardHighlight] = useState<StoryHighlight | null>(null);
  const [isExportingQuote, setIsExportingQuote] = useState(false);

  const [comicZoom, setComicZoom] = useState(1.0);
  const [comicPan, setComicPan] = useState({ x: 0, y: 0 });
  const [comicPageIndex, setComicPageIndex] = useState(0);
  const [failedComicPages, setFailedComicPages] = useState<Record<number, number>>({});

  const sessionStartRef = useRef<number>(Date.now());

  const activeChapter =
    story?.chapters[Math.min(chapterIndex, Math.max(0, (story?.chapters.length ?? 1) - 1))] ??
    null;

  const paragraphs = useMemo(
    () => splitChapterIntoParagraphs(activeChapter?.content ?? ''),
    [activeChapter?.content]
  );

  const pages = useMemo(
    () =>
      paginateParagraphs(paragraphs, {
        fontSizeSp: prefs.fontSizeSp,
        lineHeightMultiplier: prefs.lineHeightMultiplier,
      }),
    [paragraphs, prefs.fontSizeSp, prefs.lineHeightMultiplier]
  );

  useEffect(() => {
    if (pages.length > 0) {
      const targetPage = pageIndexForWordOffset(pages, anchorWordOffset);
      setPageIndex(targetPage);
    }
  }, [pages, anchorWordOffset]);

  useEffect(() => {
    if (story && pages.length > 0 && story.readingProgress > 0 && anchorWordOffset === 0) {
      const restoredPage = pageIndexForProgress(story.readingProgress, pages.length);
      setPageIndex(restoredPage);
      setAnchorWordOffset(pages[restoredPage]?.firstWordIndex ?? 0);
    }
  }, [story?.id, pages.length]);

  // Throttled SCROLL progress tracking so continuous scroll saves reading progress
  useEffect(() => {
    if (!story || story.contentFormat !== 'PROSE' || prefs.layout !== 'SCROLL') {
      return;
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const scrollable =
          document.documentElement.scrollHeight - window.innerHeight;
        if (scrollable <= 0) return;
        const ratio = Math.max(0.05, Math.min(1, window.scrollY / scrollable));
        void updateReadingProgress(story.id, chapterIndex, ratio);
      }, 350);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (timer) clearTimeout(timer);
    };
  }, [story?.id, story?.contentFormat, prefs.layout, chapterIndex, updateReadingProgress]);

  useEffect(() => {
    sessionStartRef.current = Date.now();
    return () => {
      if (!story) return;
      const elapsedSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
      if (elapsedSeconds >= 5) {
        const words = paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
        void recordReadingSession(
          story.id,
          chapterIndex,
          elapsedSeconds,
          Math.min(words, Math.round(elapsedSeconds * 3.5)),
          chapterIndex >= story.chapters.length - 1
        );
      }
    };
  }, [story?.id, chapterIndex]);

  // Keyboard shortcuts: Escape closes any open modal sheet; Arrow keys turn pages in Paginated mode
  useEffect(() => {
    const anyModalOpen =
      showChaptersSheet ||
      showDisplaySheet ||
      showSearchSheet ||
      showHighlightsSheet ||
      editingParagraphIndex !== null ||
      quoteCardHighlight !== null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && anyModalOpen) {
        e.preventDefault();
        if (quoteCardHighlight !== null) setQuoteCardHighlight(null);
        else if (editingParagraphIndex !== null) setEditingParagraphIndex(null);
        else if (showSearchSheet) setShowSearchSheet(false);
        else if (showHighlightsSheet) setShowHighlightsSheet(false);
        else if (showChaptersSheet) setShowChaptersSheet(false);
        else if (showDisplaySheet) setShowDisplaySheet(false);
        return;
      }
      if (anyModalOpen) return;
      if (story?.contentFormat === 'PROSE' && prefs.layout === 'PAGINATED') {
        if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          handleSelectPage(Math.min(pages.length - 1, pageIndex + 1));
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handleSelectPage(Math.max(0, pageIndex - 1));
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    story?.contentFormat,
    prefs.layout,
    pages.length,
    pageIndex,
    showChaptersSheet,
    showDisplaySheet,
    showSearchSheet,
    showHighlightsSheet,
    editingParagraphIndex,
    quoteCardHighlight,
  ]);

  if (!story || !activeChapter) {
    return (
      <div className="p-6">
        <button
          type="button"
          onClick={navigateBack}
          className="fable-btn fable-btn-secondary text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <p className="mt-4 text-sm text-[var(--text-secondary)]">Loading...</p>
      </div>
    );
  }

  const surface = READER_SURFACE_VARS[prefs.theme] ?? READER_SURFACE_VARS.PAPER;
  const fontFamilyVar =
    prefs.font === 'SERIF'
      ? 'var(--font-serif)'
      : prefs.font === 'MONO'
        ? 'var(--font-mono)'
        : 'var(--font-sans)';

  const handleSelectPage = (nextPage: number) => {
    const clamped = Math.max(0, Math.min(pages.length - 1, nextPage));
    setPageIndex(clamped);
    const slice = pages[clamped];
    if (slice) {
      setAnchorWordOffset(slice.firstWordIndex);
    }
    const progress = progressForPageIndex(clamped, pages.length);
    void updateReadingProgress(story.id, chapterIndex, progress);
  };

  const handleOpenParagraphHighlighter = (paragraphIdx: number) => {
    const paraText = paragraphs[paragraphIdx] ?? '';
    const tokens = tokenizeWords(paraText);
    if (tokens.length === 0) return;
    setEditingParagraphIndex(paragraphIdx);
    setStartWordIdx(0);
    setEndWordIdx(Math.min(tokens.length - 1, 14));
    setSelectedColor('TERRACOTTA');
    setHighlightNote('');
  };

  const chapterHighlights = highlights.filter((h) => h.chapterIndex === chapterIndex);
  const searchMatches = useMemo(
    () => (searchQuery.trim().length >= 2 ? searchStory(story, searchQuery) : []),
    [story, searchQuery]
  );

  const brightnessValue = prefs.readerBrightness ?? 1.0;
  const dimmerAlpha = Math.max(0, Math.min(0.82, 1 - brightnessValue));

  return (
    <div
      className="relative min-h-screen sm:min-h-[calc(100vh-3rem)] sm:rounded-[var(--radius-lg)] sm:border"
      style={{
        backgroundColor: surface.bg,
        color: surface.ink,
        borderColor: surface.border,
      }}
    >
      {dimmerAlpha > 0.01 && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-40"
          style={{ backgroundColor: `rgba(16, 15, 13, ${dimmerAlpha})` }}
        />
      )}

      {/* Minimalist Reader Top Bar */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b px-4 py-3 backdrop-blur-md sm:rounded-t-[var(--radius-lg)] sm:px-6"
        style={{
          backgroundColor: surface.bg,
          borderColor: surface.border,
        }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={navigateBack}
            className="fable-btn min-h-10 shrink-0 px-2.5 py-2 text-xs hover:bg-[var(--action-primary-tint)]"
            style={{ color: surface.ink }}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate font-editorial text-xs font-bold sm:text-sm">
              {story.title}
            </p>
            <p className="truncate text-[length:var(--text-xxs)]" style={{ color: surface.muted }}>
              {activeChapter.title}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {story.contentFormat === 'COMIC' && (
            <button
              type="button"
              onClick={() => {
                const nextZoom = toggleDoubleTapZoom(comicZoom);
                setComicZoom(nextZoom);
                setComicPan({ x: 0, y: 0 });
              }}
              className="fable-btn min-h-9 border px-2.5 py-1.5 text-xs"
              style={{ borderColor: surface.border, color: surface.ink }}
            >
              <ZoomIn className="h-3.5 w-3.5" />
              <span>
                {comicZoom > 1.05 ? `${Math.round(comicZoom * 100)}%` : 'Zoom'}
              </span>
            </button>
          )}

          {story.contentFormat === 'PROSE' && (
            <>
              <button
                type="button"
                onClick={() => setShowSearchSheet(true)}
                aria-label="Search inside book"
                className="fable-btn min-h-10 min-w-10 p-2.5 hover:bg-[var(--action-primary-tint)]"
                style={{ color: surface.ink }}
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowHighlightsSheet(true)}
                aria-label="Saved highlights"
                className="fable-btn relative min-h-10 min-w-10 p-2.5 hover:bg-[var(--action-primary-tint)]"
                style={{ color: surface.ink }}
              >
                <Highlighter className="h-4 w-4" />
                {highlights.length > 0 && (
                  <span
                    className="ml-1 rounded-[var(--radius-pill)] px-1.5 py-0.5 text-[length:var(--text-2xs)] font-bold"
                    style={{
                      backgroundColor: 'var(--action-primary)',
                      color: 'var(--text-on-action)',
                    }}
                  >
                    {highlights.length}
                  </span>
                )}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowChaptersSheet(true)}
            aria-label="Chapters"
            className="fable-btn min-h-10 min-w-10 p-2.5 hover:bg-[var(--action-primary-tint)]"
            style={{ color: surface.ink }}
          >
            <List className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowDisplaySheet(true)}
            aria-label="Display options"
            className="fable-btn min-h-10 border px-3 py-2 text-xs hover:bg-[var(--action-primary-tint)]"
            style={{ borderColor: surface.border, color: surface.ink }}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Aa</span>
          </button>
        </div>
      </header>

      {/* Reader Canvas */}
      <div
        key={`${chapterIndex}-${pageIndex}-${prefs.layout}`}
        className="fable-view-enter mx-auto max-w-2xl px-6 py-8 sm:px-10 sm:py-12"
      >
        {story.contentFormat === 'COMIC' ? (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span style={{ color: surface.muted }}>
                {prefs.comicLayout === 'WEBTOON' ? 'Webtoon' : 'Manga'}
              </span>
              <button
                type="button"
                onClick={() =>
                  updateReaderPreference(
                    'comicLayout',
                    prefs.comicLayout === 'WEBTOON' ? 'MANGA' : 'WEBTOON'
                  )
                }
                className="fable-btn min-h-9 border px-3 py-1 text-xs"
                style={{ borderColor: surface.border, color: surface.ink }}
              >
                <span>{prefs.comicLayout === 'WEBTOON' ? 'Manga Mode' : 'Webtoon Mode'}</span>
              </button>
            </div>

            {prefs.comicLayout === 'WEBTOON' ? (
              <div
                onDoubleClick={() => {
                  const next = toggleDoubleTapZoom(comicZoom);
                  setComicZoom(next);
                  setComicPan({ x: 0, y: 0 });
                }}
                className="overflow-hidden rounded-[var(--radius-md)] border"
                style={{ borderColor: surface.border }}
              >
                <div
                  style={{
                    transform: `scale(${comicZoom}) translate(${comicPan.x}px, ${comicPan.y}px)`,
                    transformOrigin: 'center top',
                  }}
                >
                  {activeChapter.pages.map((page) => {
                    const retryCount = failedComicPages[page.index] ?? 0;
                    return (
                      <div
                        key={`${page.index}-${retryCount}`}
                        className="relative min-h-72 w-full bg-[var(--surface-sunken)]"
                      >
                        <img
                          src={page.imageUrl}
                          alt={`Page ${page.index + 1}`}
                          referrerPolicy="no-referrer"
                          className="block w-full select-none"
                          onError={() =>
                            setFailedComicPages((prev) => ({
                              ...prev,
                              [page.index]: (prev[page.index] ?? 0) + 1,
                            }))
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {activeChapter.pages[comicPageIndex] && (
                  <div
                    onDoubleClick={() => {
                      const next = toggleDoubleTapZoom(comicZoom);
                      setComicZoom(next);
                      setComicPan({ x: 0, y: 0 });
                    }}
                    className="relative overflow-hidden rounded-[var(--radius-md)] border bg-[var(--surface-sunken)]"
                    style={{ borderColor: surface.border }}
                  >
                    <img
                      src={activeChapter.pages[comicPageIndex].imageUrl}
                      alt={`Page ${comicPageIndex + 1}`}
                      referrerPolicy="no-referrer"
                      className="mx-auto max-h-[72vh] w-auto select-none"
                      style={{
                        transform: `scale(${comicZoom}) translate(${comicPan.x}px, ${comicPan.y}px)`,
                      }}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    disabled={comicPageIndex <= 0}
                    onClick={() => {
                      const next = Math.max(0, comicPageIndex - 1);
                      setComicPageIndex(next);
                      void updateReadingProgress(
                        story.id,
                        chapterIndex,
                        progressForPageIndex(next, activeChapter.pages.length)
                      );
                    }}
                    className="fable-btn border text-xs"
                    style={{ borderColor: surface.border, color: surface.ink }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Prev</span>
                  </button>
                  <span className="font-code text-xs font-semibold">
                    {comicPageIndex + 1} / {Math.max(1, activeChapter.pages.length)}
                  </span>
                  <button
                    type="button"
                    disabled={comicPageIndex >= activeChapter.pages.length - 1}
                    onClick={() => {
                      const next = Math.min(
                        activeChapter.pages.length - 1,
                        comicPageIndex + 1
                      );
                      setComicPageIndex(next);
                      void updateReadingProgress(
                        story.id,
                        chapterIndex,
                        progressForPageIndex(next, activeChapter.pages.length)
                      );
                    }}
                    className="fable-btn border text-xs"
                    style={{ borderColor: surface.border, color: surface.ink }}
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border p-4 text-xs"
              style={{ borderColor: surface.border }}
            >
              <label htmlFor="comic-zoom-range" className="font-semibold">
                Zoom: {Math.round(comicZoom * 100)}%
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="comic-zoom-range"
                  type="range"
                  min={1}
                  max={4}
                  step={0.25}
                  value={comicZoom}
                  onChange={(e) => {
                    const next = clampComicZoom(Number(e.target.value));
                    setComicZoom(next);
                    setComicPan((p) =>
                      clampComicPanOffset(p, next, { width: 600, height: 800 })
                    );
                  }}
                />
                {comicZoom > 1.01 && (
                  <button
                    type="button"
                    onClick={() => {
                      setComicZoom(1.0);
                      setComicPan({ x: 0, y: 0 });
                    }}
                    className="fable-btn min-h-8 border px-2.5 py-1 text-xs"
                    style={{ borderColor: surface.border, color: surface.ink }}
                  >
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : prefs.layout === 'SCROLL' ? (
          <article className="prose-measure mx-auto space-y-6">
            <header className="border-b pb-6" style={{ borderColor: surface.border }}>
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: surface.muted }}
              >
                Chapter {chapterIndex + 1} of {story.chapters.length}
              </p>
              <h1
                className="mt-2 font-bold leading-tight"
                style={{
                  fontFamily: fontFamilyVar,
                  fontSize: `calc(${prefs.fontSizeSp} * 0.0625rem + 0.625rem)`,
                }}
              >
                {activeChapter.title}
              </h1>
            </header>

            {paragraphs.map((para, pIdx) => {
              const paraHighlights = chapterHighlights.filter(
                (h) => h.paragraphIndex === pIdx
              );
              return (
                <div
                  key={pIdx}
                  onClick={() => handleOpenParagraphHighlighter(pIdx)}
                  className="group cursor-pointer rounded-[var(--radius-sm)] p-2 -mx-2 transition-colors hover:bg-[var(--action-primary-tint)]"
                >
                  <p
                    style={{
                      fontFamily: fontFamilyVar,
                      fontSize: `calc(${prefs.fontSizeSp} * 0.0625rem)`,
                      lineHeight: prefs.lineHeightMultiplier,
                    }}
                  >
                    {renderHighlightedParagraph(para, paraHighlights)}
                  </p>
                </div>
              );
            })}
          </article>
        ) : (
          <div className="prose-measure mx-auto space-y-6">
            <div
              className="flex items-center justify-between border-b pb-3 text-xs"
              style={{ borderColor: surface.border, color: surface.muted }}
            >
              <span className="min-w-0 truncate pr-3 font-semibold">{activeChapter.title}</span>
              <span className="shrink-0 font-code">
                Page <strong style={{ color: surface.ink }}>{pageIndex + 1}</strong> /{' '}
                {Math.max(1, pages.length)}
              </span>
            </div>

            <div className="min-h-[52vh] space-y-5">
              {(pages[pageIndex]?.paragraphs ?? []).map((item) => {
                const paraHighlights = chapterHighlights.filter(
                  (h) => h.paragraphIndex === item.paragraphIndex
                );
                return (
                  <div
                    key={item.paragraphIndex}
                    onClick={() => handleOpenParagraphHighlighter(item.paragraphIndex)}
                    className="cursor-pointer rounded-[var(--radius-sm)] p-2 -mx-2 transition-colors hover:bg-[var(--action-primary-tint)]"
                  >
                    <p
                      style={{
                        fontFamily: fontFamilyVar,
                        fontSize: `calc(${prefs.fontSizeSp} * 0.0625rem)`,
                        lineHeight: prefs.lineHeightMultiplier,
                      }}
                    >
                      {renderHighlightedParagraph(item.text, paraHighlights)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div
              className="flex items-center justify-between border-t pt-4"
              style={{ borderColor: surface.border }}
            >
              <button
                type="button"
                disabled={pageIndex <= 0}
                onClick={() => handleSelectPage(pageIndex - 1)}
                className="fable-btn border text-xs"
                style={{ borderColor: surface.border, color: surface.ink }}
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>

              <span className="font-code text-xs" style={{ color: surface.muted }}>
                #{pages[pageIndex]?.firstWordIndex ?? 0}
              </span>

              <button
                type="button"
                disabled={pageIndex >= pages.length - 1}
                onClick={() => handleSelectPage(pageIndex + 1)}
                className="fable-btn border text-xs"
                style={{ borderColor: surface.border, color: surface.ink }}
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Chapter Footer */}
        <footer
          className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t pt-6"
          style={{ borderColor: surface.border }}
        >
          <button
            type="button"
            disabled={chapterIndex <= 0}
            onClick={() => {
              const prev = Math.max(0, chapterIndex - 1);
              setChapterIndex(prev);
              setPageIndex(0);
              setAnchorWordOffset(0);
              setComicPageIndex(0);
              void updateReadingProgress(story.id, prev, 0.05);
            }}
            className="fable-btn border text-xs"
            style={{ borderColor: surface.border, color: surface.ink }}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Prev Chapter</span>
          </button>

          <span className="text-xs font-medium" style={{ color: surface.muted }}>
            {chapterIndex + 1} / {story.chapters.length}
          </span>

          {chapterIndex < story.chapters.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                const next = chapterIndex + 1;
                setChapterIndex(next);
                setPageIndex(0);
                setAnchorWordOffset(0);
                setComicPageIndex(0);
                void updateReadingProgress(story.id, next, 0.1);
              }}
              className="fable-btn fable-btn-primary text-xs"
            >
              <span>Next Chapter</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                void updateReadingProgress(story.id, chapterIndex, 1.0);
                navigateBack();
              }}
              className="fable-btn fable-btn-primary text-xs"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Finish</span>
            </button>
          )}
        </footer>
      </div>

      {showDisplaySheet && (
        <ReaderDisplaySheet
          story={story}
          prefs={prefs}
          onUpdatePreference={updateReaderPreference}
          onSetAppearance={setAppAppearance}
          onResetTypography={resetReaderTypography}
          onClose={() => setShowDisplaySheet(false)}
        />
      )}

      {showChaptersSheet && (
        <ReaderChaptersSheet
          story={story}
          activeChapterIndex={chapterIndex}
          onSelectChapter={(idx) => {
            setChapterIndex(idx);
            setPageIndex(0);
            setAnchorWordOffset(0);
            setComicPageIndex(0);
            setShowChaptersSheet(false);
          }}
          onClose={() => setShowChaptersSheet(false)}
        />
      )}

      {showSearchSheet && (
        <ReaderSearchSheet
          story={story}
          searchQuery={searchQuery}
          searchMatches={searchMatches}
          onChangeQuery={setSearchQuery}
          onSelectMatch={(m) => {
            setChapterIndex(m.chapterIndex);
            setAnchorWordOffset(m.wordIndex);
            setShowSearchSheet(false);
          }}
          onClose={() => setShowSearchSheet(false)}
        />
      )}

      {editingParagraphIndex !== null && (
        <PassageHighlightSheet
          paragraphText={paragraphs[editingParagraphIndex] ?? ''}
          startWordIdx={startWordIdx}
          endWordIdx={endWordIdx}
          selectedColor={selectedColor}
          note={highlightNote}
          onChangeStart={setStartWordIdx}
          onChangeEnd={setEndWordIdx}
          onChangeColor={setSelectedColor}
          onChangeNote={setHighlightNote}
          onClose={() => setEditingParagraphIndex(null)}
          onSave={async () => {
            const paraText = paragraphs[editingParagraphIndex] ?? '';
            const quoteText = sliceWordRange(paraText, startWordIdx, endWordIdx);
            if (!quoteText) return;
            const highlight: StoryHighlight = {
              id: `hl-${Date.now()}`,
              storyId: story.id,
              chapterIndex,
              chapterTitle: activeChapter.title,
              paragraphIndex: editingParagraphIndex,
              startWordIndex: startWordIdx,
              endWordIndex: endWordIdx,
              quoteText,
              note: highlightNote.trim(),
              color: selectedColor,
              createdAtEpochMillis: Date.now(),
            };
            await saveHighlight(highlight);
            setEditingParagraphIndex(null);
          }}
        />
      )}

      {showHighlightsSheet && (
        <ReaderHighlightsSheet
          story={story}
          highlights={highlights}
          onSelectQuoteCard={(h) => setQuoteCardHighlight(h)}
          onDeleteHighlight={(id) => void deleteHighlight(story.id, id)}
          onClose={() => setShowHighlightsSheet(false)}
        />
      )}

      {quoteCardHighlight && (
        <QuoteCardShareSheet
          story={story}
          highlight={quoteCardHighlight}
          isExporting={isExportingQuote}
          onShareOrDownload={async () => {
            setIsExportingQuote(true);
            try {
              await shareOrDownloadQuoteCard(quoteCardHighlight, {
                title: story.title,
                author: story.author,
              });
            } finally {
              setIsExportingQuote(false);
            }
          }}
          onClose={() => setQuoteCardHighlight(null)}
        />
      )}
    </div>
  );
}

function renderHighlightedParagraph(
  paragraphText: string,
  highlights: StoryHighlight[]
): React.ReactNode {
  if (highlights.length === 0) return paragraphText;
  const words = paragraphText.trim().split(/\s+/);
  if (words.length === 0) return paragraphText;

  return words.map((word, wIdx) => {
    const matched = highlights.find(
      (h) => wIdx >= h.startWordIndex && wIdx <= h.endWordIndex
    );
    const suffix = wIdx < words.length - 1 ? ' ' : '';
    if (!matched) {
      return <React.Fragment key={wIdx}>{word + suffix}</React.Fragment>;
    }
    const swatch = HIGHLIGHT_SWATCHES[matched.color] ?? HIGHLIGHT_SWATCHES.TERRACOTTA;
    return (
      <mark
        key={wIdx}
        className="rounded-[var(--radius-sm)] px-0.5"
        style={{
          backgroundColor: swatch.fillCss,
          color: 'inherit',
        }}
      >
        {word + suffix}
      </mark>
    );
  });
}
