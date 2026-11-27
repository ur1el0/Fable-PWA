import React, { useMemo } from 'react';
import {
  Bookmark,
  Copy,
  RotateCcw,
  Search,
  Share2,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import {
  HIGHLIGHT_SWATCHES,
  type AppAppearance,
  type ComicReaderLayout,
  type HighlightColor,
  type ReaderFont,
  type ReaderLayout,
  type ReaderPreferences,
  type ReaderTheme,
  type Story,
  type StoryHighlight,
} from '../../../domain/models';
import {
  exportHighlightsAsMarkdown,
  sliceWordRange,
  tokenizeWords,
  type InBookSearchMatch,
} from '../../../domain/reading/inBookSearchAndHighlights';

export function ReaderDisplaySheet({
  story,
  prefs,
  onUpdatePreference,
  onSetAppearance,
  onResetTypography,
  onClose,
}: {
  story: Story;
  prefs: ReaderPreferences;
  onUpdatePreference: <K extends keyof ReaderPreferences>(
    key: K,
    value: ReaderPreferences[K]
  ) => void;
  onSetAppearance: (appearance: AppAppearance) => void;
  onResetTypography: () => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reader display options"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fable-backdrop-enter fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      style={{ backgroundColor: 'var(--surface-backdrop)' }}
    >
      <div
        className="fable-card fable-modal-enter w-full max-w-lg p-6 text-[var(--text-primary)]"
        style={{ boxShadow: 'var(--shadow-modal)' }}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <h2 className="font-editorial text-lg font-bold">Display</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close display options"
            className="fable-btn fable-btn-ghost min-h-0 p-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-5 text-xs">
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="reader-brightness-slider"
                className="inline-flex items-center gap-1.5 font-semibold"
              >
                <Sun className="h-4 w-4 text-[var(--text-link)]" />
                <span>
                  Brightness (
                  {prefs.readerBrightness === null
                    ? 'Auto'
                    : `${Math.round(prefs.readerBrightness * 100)}%`}
                  )
                </span>
              </label>
              <button
                type="button"
                aria-pressed={prefs.readerBrightness === null}
                onClick={() => onUpdatePreference('readerBrightness', null)}
                className="fable-chip min-h-7 py-0.5"
              >
                Auto
              </button>
            </div>
            <input
              id="reader-brightness-slider"
              type="range"
              min={0.2}
              max={1.0}
              step={0.05}
              value={prefs.readerBrightness ?? 1.0}
              onChange={(e) =>
                onUpdatePreference('readerBrightness', Number(e.target.value))
              }
              className="mt-2 w-full"
            />
          </div>

          <div>
            <span className="block font-semibold">Reading Surface</span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(['PAPER', 'SEPIA', 'NIGHT'] as ReaderTheme[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={prefs.theme === t}
                  onClick={() => onUpdatePreference('theme', t)}
                  className={`fable-btn text-xs ${
                    prefs.theme === t ? 'fable-btn-primary' : 'fable-btn-secondary'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block font-semibold">App Appearance</span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(['SYSTEM', 'LIGHT', 'DARK'] as AppAppearance[]).map((appMode) => (
                <button
                  key={appMode}
                  type="button"
                  aria-pressed={prefs.appAppearance === appMode}
                  onClick={() => onSetAppearance(appMode)}
                  className={`fable-btn text-xs ${
                    prefs.appAppearance === appMode
                      ? 'fable-btn-primary'
                      : 'fable-btn-secondary'
                  }`}
                >
                  {appMode}
                </button>
              ))}
            </div>
          </div>

          {story.contentFormat === 'PROSE' ? (
            <>
              <div>
                <span className="block font-semibold">Page Layout</span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'SCROLL', label: 'Scroll' },
                      { id: 'PAGINATED', label: 'Paginated' },
                    ] as Array<{ id: ReaderLayout; label: string }>
                  ).map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      aria-pressed={prefs.layout === l.id}
                      onClick={() => onUpdatePreference('layout', l.id)}
                      className={`fable-btn text-xs ${
                        prefs.layout === l.id
                          ? 'fable-btn-primary'
                          : 'fable-btn-secondary'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block font-semibold">Font</span>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(['SERIF', 'SANS', 'MONO'] as ReaderFont[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      aria-pressed={prefs.font === f}
                      onClick={() => onUpdatePreference('font', f)}
                      className={`fable-btn text-xs ${
                        prefs.font === f ? 'fable-btn-primary' : 'fable-btn-secondary'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="reader-fontsize-slider" className="block font-semibold">
                    Size ({prefs.fontSizeSp}pt)
                  </label>
                  <input
                    id="reader-fontsize-slider"
                    type="range"
                    min={15}
                    max={26}
                    step={1}
                    value={prefs.fontSizeSp}
                    onChange={(e) =>
                      onUpdatePreference('fontSizeSp', Number(e.target.value))
                    }
                    className="mt-2 w-full"
                  />
                </div>
                <div>
                  <label htmlFor="reader-leading-slider" className="block font-semibold">
                    Spacing ({prefs.lineHeightMultiplier.toFixed(2)}x)
                  </label>
                  <input
                    id="reader-leading-slider"
                    type="range"
                    min={1.25}
                    max={1.9}
                    step={0.05}
                    value={prefs.lineHeightMultiplier}
                    onChange={(e) =>
                      onUpdatePreference('lineHeightMultiplier', Number(e.target.value))
                    }
                    className="mt-2 w-full"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <span className="block font-semibold">Comic Direction</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(['WEBTOON', 'MANGA'] as ComicReaderLayout[]).map((cl) => (
                  <button
                    key={cl}
                    type="button"
                    aria-pressed={prefs.comicLayout === cl}
                    onClick={() => onUpdatePreference('comicLayout', cl)}
                    className={`fable-btn text-xs ${
                      prefs.comicLayout === cl
                        ? 'fable-btn-primary'
                        : 'fable-btn-secondary'
                    }`}
                  >
                    {cl === 'WEBTOON' ? 'Webtoon' : 'Manga'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between border-t border-[var(--border-subtle)] pt-4">
            <button
              type="button"
              onClick={onResetTypography}
              className="fable-btn fable-btn-secondary text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="fable-btn fable-btn-primary text-xs"
            >
              <span>Done</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReaderChaptersSheet({
  story,
  activeChapterIndex,
  onSelectChapter,
  onClose,
}: {
  story: Story;
  activeChapterIndex: number;
  onSelectChapter: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Chapters"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fable-backdrop-enter fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      style={{ backgroundColor: 'var(--surface-backdrop)' }}
    >
      <div
        className="fable-card fable-modal-enter w-full max-w-md p-6 text-[var(--text-primary)]"
        style={{ boxShadow: 'var(--shadow-modal)' }}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <h2 className="font-editorial text-lg font-bold">
            Chapters ({story.chapters.length})
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chapters"
            className="fable-btn fable-btn-ghost min-h-0 p-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 max-h-80 divide-y divide-[var(--border-subtle)] overflow-y-auto">
          {story.chapters.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => onSelectChapter(ch.index)}
              className={`flex w-full items-center justify-between py-3.5 text-left text-sm ${
                ch.index === activeChapterIndex
                  ? 'font-semibold text-[var(--text-link)]'
                  : 'text-[var(--text-primary)]'
              }`}
            >
              <span className="min-w-0 truncate pr-3 font-editorial">{ch.title}</span>
              <span className="shrink-0 font-code text-xs text-[var(--text-tertiary)]">
                {ch.readTimeMinutes}m
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ReaderSearchSheet({
  story,
  searchQuery,
  searchMatches,
  onChangeQuery,
  onSelectMatch,
  onClose,
}: {
  story: Story;
  searchQuery: string;
  searchMatches: InBookSearchMatch[];
  onChangeQuery: (q: string) => void;
  onSelectMatch: (match: InBookSearchMatch) => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search inside book"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fable-backdrop-enter fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      style={{ backgroundColor: 'var(--surface-backdrop)' }}
    >
      <div
        className="fable-card fable-modal-enter w-full max-w-lg p-6 text-[var(--text-primary)]"
        style={{ boxShadow: 'var(--shadow-modal)' }}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <h2 className="font-editorial text-lg font-bold">Search</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="fable-btn fable-btn-ghost min-h-0 p-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <input
            type="text"
            autoFocus
            value={searchQuery}
            onChange={(e) => onChangeQuery(e.target.value)}
            placeholder="Search chapters..."
            className="fable-input pr-9 pl-10"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onChangeQuery('')}
              aria-label="Clear search"
              className="fable-btn fable-btn-ghost absolute top-1/2 right-1 min-h-0 -translate-y-1/2 p-1.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="mt-4 max-h-80 space-y-2.5 overflow-y-auto text-xs">
          {searchQuery.trim().length < 2 ? (
            <p className="py-6 text-center text-[var(--text-secondary)]">
              Enter 2+ characters to search {story.chapters.length} chapters.
            </p>
          ) : searchMatches.length === 0 ? (
            <p className="py-6 text-center text-[var(--text-secondary)]">
              No matches for “{searchQuery}”.
            </p>
          ) : (
            searchMatches.map((m, idx) => (
              <button
                key={`${m.chapterIndex}-${m.paragraphIndex}-${idx}`}
                type="button"
                onClick={() => onSelectMatch(m)}
                className="block w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-3.5 text-left hover:border-[var(--border-strong)]"
              >
                <p className="font-semibold text-[var(--text-link)]">
                  {m.chapterTitle} · Paragraph {m.paragraphIndex + 1}
                </p>
                <p className="mt-1 leading-relaxed text-[var(--text-secondary)]">
                  {m.snippetBefore}
                  <mark
                    className="rounded-[var(--radius-sm)] px-1 font-semibold"
                    style={{
                      backgroundColor: 'var(--action-primary-tint)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {m.snippetMatch}
                  </mark>
                  {m.snippetAfter}
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function ReaderHighlightsSheet({
  story,
  highlights,
  onSelectQuoteCard,
  onDeleteHighlight,
  onClose,
}: {
  story: Story;
  highlights: StoryHighlight[];
  onSelectQuoteCard: (h: StoryHighlight) => void;
  onDeleteHighlight: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Saved highlights"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fable-backdrop-enter fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      style={{ backgroundColor: 'var(--surface-backdrop)' }}
    >
      <div
        className="fable-card fable-modal-enter w-full max-w-lg p-6 text-[var(--text-primary)]"
        style={{ boxShadow: 'var(--shadow-modal)' }}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <h2 className="font-editorial text-lg font-bold">
            Highlights ({highlights.length})
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close highlights"
            className="fable-btn fable-btn-ghost min-h-0 p-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {highlights.length > 0 && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => {
                const md = exportHighlightsAsMarkdown(story, highlights);
                void navigator.clipboard?.writeText(md);
              }}
              className="fable-btn fable-btn-secondary min-h-9 px-3 py-1.5 text-xs"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Markdown</span>
            </button>
          </div>
        )}

        <div className="mt-3 max-h-80 space-y-3 overflow-y-auto text-xs">
          {highlights.length === 0 ? (
            <p className="py-8 text-center text-[var(--text-secondary)]">
              Tap any paragraph while reading to save a highlight.
            </p>
          ) : (
            highlights.map((h) => {
              const swatch = HIGHLIGHT_SWATCHES[h.color] ?? HIGHLIGHT_SWATCHES.TERRACOTTA;
              return (
                <div
                  key={h.id}
                  className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="rounded-[var(--radius-pill)] px-2.5 py-0.5 text-[length:var(--text-2xs)] font-bold"
                      style={{
                        backgroundColor: swatch.accentHex,
                        color: 'var(--text-on-action)',
                      }}
                    >
                      {h.chapterTitle}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectQuoteCard(h)}
                        className="fable-btn fable-btn-secondary min-h-8 px-2.5 py-1 text-xs"
                      >
                        <Share2 className="h-3 w-3" />
                        <span>Quote Card</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteHighlight(h.id)}
                        aria-label="Delete highlight"
                        className="fable-btn fable-btn-destructive min-h-8 p-1.5"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2.5 font-editorial text-sm italic">“{h.quoteText}”</p>
                  {h.note && (
                    <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                      Note: {h.note}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export function QuoteCardShareSheet({
  story,
  highlight,
  isExporting,
  onShareOrDownload,
  onClose,
}: {
  story: Story;
  highlight: StoryHighlight;
  isExporting: boolean;
  onShareOrDownload: () => void;
  onClose: () => void;
}) {
  const swatch = HIGHLIGHT_SWATCHES[highlight.color] ?? HIGHLIGHT_SWATCHES.TERRACOTTA;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share Quote Card"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fable-backdrop-enter fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--surface-backdrop)' }}
    >
      <div
        className="fable-card fable-modal-enter w-full max-w-md p-6 text-[var(--text-primary)]"
        style={{ boxShadow: 'var(--shadow-modal)' }}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <h2 className="font-editorial text-lg font-bold">Quote Card</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Quote Card preview"
            className="fable-btn fable-btn-ghost min-h-0 p-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className="mt-4 rounded-[var(--radius-md)] border p-6"
          style={{
            backgroundColor: swatch.cardBgHex,
            color: swatch.cardInkHex,
            borderColor: swatch.accentHex,
          }}
        >
          <p
            className="text-[length:var(--text-2xs)] font-bold uppercase tracking-widest"
            style={{ color: swatch.accentHex }}
          >
            Fable
          </p>
          <p className="mt-4 font-editorial text-base font-medium leading-relaxed">
            “{highlight.quoteText}”
          </p>
          {highlight.note && (
            <p className="mt-3 text-xs italic" style={{ color: swatch.accentHex }}>
              Note: {highlight.note}
            </p>
          )}
          <div className="mt-5 border-t pt-3" style={{ borderColor: swatch.accentHex }}>
            <p className="font-editorial text-xs font-bold">{story.title}</p>
            <p className="text-[length:var(--text-xxs)]" style={{ color: swatch.accentHex }}>
              {story.author} · {highlight.chapterTitle}
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="fable-btn fable-btn-secondary text-xs"
          >
            <span>Close</span>
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={onShareOrDownload}
            className="fable-btn fable-btn-primary text-xs"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>{isExporting ? 'Rendering...' : 'Share PNG'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function PassageHighlightSheet({
  paragraphText,
  startWordIdx,
  endWordIdx,
  selectedColor,
  note,
  onChangeStart,
  onChangeEnd,
  onChangeColor,
  onChangeNote,
  onClose,
  onSave,
}: {
  paragraphText: string;
  startWordIdx: number;
  endWordIdx: number;
  selectedColor: HighlightColor;
  note: string;
  onChangeStart: (idx: number) => void;
  onChangeEnd: (idx: number) => void;
  onChangeColor: (c: HighlightColor) => void;
  onChangeNote: (n: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const tokens = useMemo(() => tokenizeWords(paragraphText), [paragraphText]);
  const maxWordIndex = Math.max(0, tokens.length - 1);
  const previewQuote = sliceWordRange(paragraphText, startWordIdx, endWordIdx);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Highlight passage range"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fable-backdrop-enter fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      style={{ backgroundColor: 'var(--surface-backdrop)' }}
    >
      <div
        className="fable-card fable-modal-enter w-full max-w-lg p-6 text-[var(--text-primary)]"
        style={{ boxShadow: 'var(--shadow-modal)' }}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <h2 className="font-editorial text-lg font-bold">Highlight Passage</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close highlight editor"
            className="fable-btn fable-btn-ghost min-h-0 p-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs">
          <div
            className="rounded-[var(--radius-md)] border p-4 font-editorial text-sm leading-relaxed"
            style={{
              backgroundColor: HIGHLIGHT_SWATCHES[selectedColor].fillCss,
              borderColor: HIGHLIGHT_SWATCHES[selectedColor].accentHex,
            }}
          >
            “{previewQuote}”
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="hl-start-word" className="font-semibold">
                Start ({startWordIdx + 1}/{tokens.length})
              </label>
              <input
                id="hl-start-word"
                type="range"
                min={0}
                max={maxWordIndex}
                value={startWordIdx}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  onChangeStart(next);
                  if (next > endWordIdx) onChangeEnd(next);
                }}
                className="mt-1.5 w-full"
              />
            </div>

            <div>
              <label htmlFor="hl-end-word" className="font-semibold">
                End ({endWordIdx + 1}/{tokens.length})
              </label>
              <input
                id="hl-end-word"
                type="range"
                min={startWordIdx}
                max={maxWordIndex}
                value={endWordIdx}
                onChange={(e) => onChangeEnd(Number(e.target.value))}
                className="mt-1.5 w-full"
              />
            </div>
          </div>

          <div>
            <span className="block font-semibold">Color</span>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(['TERRACOTTA', 'AMBER', 'SAGE'] as HighlightColor[]).map((c) => {
                const sw = HIGHLIGHT_SWATCHES[c];
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={selectedColor === c}
                    onClick={() => onChangeColor(c)}
                    className="fable-btn border text-xs"
                    style={{
                      backgroundColor: sw.fillCss,
                      borderColor: sw.accentHex,
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span
                      className="h-3 w-3 rounded-[var(--radius-pill)]"
                      style={{ backgroundColor: sw.accentHex }}
                    />
                    <span>{sw.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="hl-reader-note" className="block font-semibold">
              Note (Optional)
            </label>
            <input
              id="hl-reader-note"
              type="text"
              value={note}
              onChange={(e) => onChangeNote(e.target.value)}
              placeholder="Add a note..."
              className="fable-input mt-1.5"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="fable-btn fable-btn-secondary text-xs"
            >
              <span>Cancel</span>
            </button>
            <button
              type="button"
              onClick={onSave}
              className="fable-btn fable-btn-primary text-xs"
            >
              <Bookmark className="h-3.5 w-3.5" />
              <span>Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
