import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowUp,
  CheckCircle2,
  FilePlus2,
} from 'lucide-react';
import { GENRE_SUGGESTIONS } from '../../domain/models';
import {
  parseManuscriptIntoChapters,
  useFableStore,
} from '../../store/useFableStore';

export function WriteScreen() {
  const draft = useFableStore((s) => s.writerDraft);
  const isSaving = useFableStore((s) => s.isSavingStory);
  const session = useFableStore((s) => s.session);
  const updateDraft = useFableStore((s) => s.updateWriterDraft);
  const clearDraft = useFableStore((s) => s.clearWriterDraft);
  const publishStory = useFableStore((s) => s.publishStory);
  const openStoryDetail = useFableStore((s) => s.openStoryDetail);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const wordCount = draft.body.trim()
    ? draft.body.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const estimatedMinutes = Math.max(1, Math.round(wordCount / 220));
  const parsedChapters = parseManuscriptIntoChapters(draft.chapterTitle, draft.body);

  const handleInsertNextChapter = () => {
    const nextNum = parsedChapters.length + 1;
    const prefix = draft.body.trim().length > 0 ? `${draft.body.trimEnd()}\n\n` : '';
    void updateDraft({
      body: `${prefix}Chapter ${nextNum}: Untitled Chapter\n\n`,
    });
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    if (draft.title.trim().length < 3) {
      setValidationError('Enter a story title with at least 3 characters.');
      return;
    }
    if (draft.synopsis.trim().length < 10) {
      setValidationError('Write a brief synopsis with at least 10 characters.');
      return;
    }
    if (wordCount < 10) {
      setValidationError('Manuscript body must contain at least 10 words.');
      return;
    }

    const created = await publishStory({
      title: draft.title.trim(),
      author: session?.user.displayName ?? 'Community Writer',
      authorBio: session?.user.bio || 'Published via Fable Writer Studio.',
      genre: draft.genre.trim() || 'Literary Fiction',
      synopsis: draft.synopsis.trim(),
      chapters: parsedChapters,
    });
    openStoryDetail(created.id);
  };

  return (
    <form onSubmit={handlePublish} className="space-y-5 pb-24">
      {/* iOS WriteView Top Bar */}
      <header className="flex items-center justify-between gap-3">
        {confirmClear ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void clearDraft();
                setConfirmClear(false);
              }}
              className="rounded-full bg-[var(--action-destructive)] px-3 py-1.5 text-xs font-semibold text-white"
            >
              Confirm Clear
            </button>
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="text-xs font-semibold text-[var(--text-secondary)]"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="text-[15px] font-semibold text-[var(--action-destructive)]"
          >
            Clear
          </button>
        )}

        <span className="rounded-full bg-[var(--surface-raised)] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-primary)]">
          WRITER&apos;S STUDIO
        </span>

        <button
          type="submit"
          disabled={isSaving}
          aria-label="Publish story"
          className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-[var(--action-primary)] text-white shadow-sm transition-transform active:scale-95 disabled:opacity-50"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </header>

      {validationError && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-2xl border border-[var(--action-destructive)] p-4 text-sm font-medium text-[var(--text-primary)]"
          style={{ backgroundColor: 'var(--action-destructive-tint)' }}
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-[var(--action-destructive)]" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Card 1: IDENTITY */}
      <section
        className="space-y-4 rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5"
        style={{ boxShadow: 'var(--shadow-raised)' }}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--action-primary)]">
          IDENTITY
        </p>

        <input
          type="text"
          value={draft.title}
          onChange={(e) => void updateDraft({ title: e.target.value })}
          placeholder="Story title..."
          aria-label="Story title"
          className="w-full border-b border-[var(--border-subtle)] bg-transparent pb-2 font-prose text-[22px] font-bold text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--action-primary)] focus:outline-none"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">
              Genre
            </label>
            <input
              type="text"
              value={draft.genre}
              onChange={(e) => void updateDraft({ genre: e.target.value })}
              placeholder="Literary Fiction"
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--action-primary)] focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">
              Chapter Title (optional)
            </label>
            <input
              type="text"
              value={draft.chapterTitle}
              onChange={(e) => void updateDraft({ chapterTitle: e.target.value })}
              placeholder="Chapter 1: Opening"
              className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3.5 py-2 text-[13px] font-medium text-[var(--text-primary)] focus:border-[var(--action-primary)] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {GENRE_SUGGESTIONS.slice(0, 6).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => void updateDraft({ genre: g })}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                draft.genre === g
                  ? 'bg-[var(--action-primary)] text-white'
                  : 'bg-[var(--surface-sunken)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </section>

      {/* Card 2: SYNOPSIS */}
      <section
        className="space-y-2.5 rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5"
        style={{ boxShadow: 'var(--shadow-raised)' }}
      >
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--action-primary)]">
            SYNOPSIS
          </p>
          <span className="font-mono text-[11px] text-[var(--text-tertiary)]">
            {draft.synopsis.length} / 200
          </span>
        </div>
        <textarea
          rows={3}
          maxLength={400}
          value={draft.synopsis}
          onChange={(e) => void updateDraft({ synopsis: e.target.value })}
          placeholder="Write a compelling hook for readers..."
          aria-label="Story synopsis"
          className="w-full resize-none bg-transparent text-sm leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
        />
      </section>

      {/* Card 3: MANUSCRIPT */}
      <section
        className="space-y-3 rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-5"
        style={{ boxShadow: 'var(--shadow-raised)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--action-primary)]">
            MANUSCRIPT
          </p>
          <button
            type="button"
            onClick={handleInsertNextChapter}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface-sunken)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--action-secondary-hover)]"
          >
            <FilePlus2 className="h-3.5 w-3.5 text-[var(--action-primary)]" />
            <span>Add Chapter</span>
          </button>
        </div>
        <textarea
          rows={12}
          value={draft.body}
          onChange={(e) => void updateDraft({ body: e.target.value })}
          placeholder="Begin writing your story..."
          aria-label="Manuscript body"
          className="w-full resize-y bg-transparent font-prose text-base leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
        />
      </section>

      {/* Floating Glass Studio HUD */}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-20 flex justify-center px-4 sm:bottom-6">
        <div
          className="fable-glass pointer-events-auto flex items-center gap-4 rounded-3xl border border-[var(--border-subtle)] px-5 py-2.5 text-xs"
          style={{ boxShadow: 'var(--shadow-pill)' }}
        >
          <span className="font-mono font-semibold text-[var(--text-primary)]">
            {wordCount.toLocaleString()} words
          </span>
          <span className="text-[var(--text-tertiary)]">~{estimatedMinutes}m read</span>
          <span
            className="inline-flex items-center gap-1 font-semibold"
            style={{ color: 'var(--status-success-text)' }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Saved locally
          </span>
        </div>
      </div>
    </form>
  );
}
