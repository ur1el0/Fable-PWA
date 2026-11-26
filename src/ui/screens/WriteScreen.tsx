import React, { useState } from 'react';
import {
  AlertCircle,
  Clock,
  FilePlus2,
  PenTool,
  Send,
  Trash2,
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
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-link)]">
            Drafts
          </p>
          <h1 className="display-headline mt-1 font-bold text-[var(--text-primary)]">
            Write
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)]">
          <span className="inline-flex items-center gap-1.5 font-code">
            <PenTool className="h-3.5 w-3.5 text-[var(--text-link)]" />
            {wordCount.toLocaleString()} words ({parsedChapters.length}{' '}
            {parsedChapters.length === 1 ? 'ch' : 'chs'})
          </span>
          <span className="inline-flex items-center gap-1.5 font-code">
            <Clock className="h-3.5 w-3.5 text-[var(--text-link)]" />
            ~{estimatedMinutes} min read
          </span>
        </div>
      </header>

      {validationError && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--action-destructive)] p-4 text-sm font-medium text-[var(--text-primary)]"
          style={{ backgroundColor: 'var(--action-destructive-tint)' }}
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-[var(--action-destructive)]" />
          <span>{validationError}</span>
        </div>
      )}

      <form onSubmit={handlePublish} className="grid gap-10 lg:grid-cols-12">
        {/* Left 4-col Metadata Sheet */}
        <aside className="space-y-5 lg:col-span-4">
          <div>
            <label
              htmlFor="write-title"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
            >
              Title
            </label>
            <input
              id="write-title"
              type="text"
              value={draft.title}
              onChange={(e) => void updateDraft({ title: e.target.value })}
              placeholder="The Cartographer of Glass Harbor"
              className="fable-input mt-1.5 font-editorial text-base font-semibold"
            />
          </div>

          <div>
            <label
              htmlFor="write-genre"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
            >
              Genre
            </label>
            <input
              id="write-genre"
              type="text"
              value={draft.genre}
              onChange={(e) => void updateDraft({ genre: e.target.value })}
              placeholder="Literary Fiction"
              className="fable-input mt-1.5"
            />
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {GENRE_SUGGESTIONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={draft.genre === g}
                  onClick={() => void updateDraft({ genre: g })}
                  className="fable-chip"
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="write-synopsis"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
            >
              Jacket Synopsis
            </label>
            <textarea
              id="write-synopsis"
              rows={4}
              value={draft.synopsis}
              onChange={(e) => void updateDraft({ synopsis: e.target.value })}
              placeholder="Describe the setting, protagonist, and central question..."
              className="fable-input mt-1.5 leading-relaxed"
            />
          </div>

          <div>
            <label
              htmlFor="write-ch-title"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
            >
              Opening Chapter Heading
            </label>
            <input
              id="write-ch-title"
              type="text"
              value={draft.chapterTitle}
              onChange={(e) => void updateDraft({ chapterTitle: e.target.value })}
              placeholder="Chapter 1: Opening"
              className="fable-input mt-1.5"
            />
          </div>
        </aside>

        {/* Right 8-col Focused Literary Manuscript Sheet */}
        <div className="space-y-4 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="write-body"
              className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
            >
              Prose Manuscript
            </label>
            <button
              type="button"
              onClick={handleInsertNextChapter}
              className="fable-btn fable-btn-secondary min-h-9 px-3 py-1.5 text-xs"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              <span>Insert Chapter {parsedChapters.length + 1} Heading</span>
            </button>
          </div>

          <textarea
            id="write-body"
            rows={16}
            value={draft.body}
            onChange={(e) => void updateDraft({ body: e.target.value })}
            placeholder="Write your opening paragraph here. Start a new line with 'Chapter 2: Title' anytime to split into chapters."
            className="fable-input font-editorial text-lg leading-relaxed"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            {!confirmClear ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="fable-btn fable-btn-secondary text-xs"
              >
                <Trash2 className="h-4 w-4 text-[var(--action-destructive)]" />
                <span>Discard Draft</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void clearDraft();
                    setConfirmClear(false);
                  }}
                  className="fable-btn fable-btn-destructive text-xs"
                >
                  <span>Confirm Discard</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="fable-btn fable-btn-secondary text-xs"
                >
                  <span>Keep Draft</span>
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="fable-btn fable-btn-primary px-6"
            >
              <Send className="h-4 w-4" />
              <span>{isSaving ? 'Publishing...' : 'Publish Edition'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
