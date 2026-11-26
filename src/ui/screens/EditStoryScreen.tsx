import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, FilePlus2, Save } from 'lucide-react';
import { GENRE_SUGGESTIONS } from '../../domain/models';
import {
  parseManuscriptIntoChapters,
  useFableStore,
} from '../../store/useFableStore';

export function EditStoryScreen({ storyId }: { storyId: string }) {
  const stories = useFableStore((s) => s.stories);
  const isHydrating = useFableStore((s) => s.isHydratingReaderStory);
  const isSaving = useFableStore((s) => s.isSavingStory);
  const updateOwnedStory = useFableStore((s) => s.updateOwnedStory);
  const navigateBack = useFableStore((s) => s.navigateBack);

  const story = stories.find((s) => s.id === storyId);

  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [chapterTitle, setChapterTitle] = useState('Chapter 1');
  const [body, setBody] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (story && !initialized && !isHydrating) {
      setTitle(story.title);
      setGenre(story.genre);
      setSynopsis(story.synopsis);
      if (story.chapters.length > 0) {
        setChapterTitle(story.chapters[0].title || 'Chapter 1');
        const combined = story.chapters
          .map((ch, idx) =>
            idx === 0
              ? ch.content
              : `${ch.title || `Chapter ${idx + 1}: Section`}\n\n${ch.content}`
          )
          .join('\n\n');
        setBody(combined);
      }
      setInitialized(true);
    }
  }, [story, initialized, isHydrating]);

  if (!story) {
    return (
      <div className="space-y-4 py-8">
        <button
          type="button"
          onClick={navigateBack}
          className="fable-btn fable-btn-secondary text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <p className="text-sm text-[var(--text-secondary)]">Edition not found.</p>
      </div>
    );
  }

  const parsedChapters = parseManuscriptIntoChapters(chapterTitle, body);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 3) {
      setError('Title must be at least 3 characters.');
      return;
    }
    if (body.trim().split(/\s+/).filter(Boolean).length < 5) {
      setError('Manuscript content cannot be empty.');
      return;
    }

    const updated = await updateOwnedStory(story.id, {
      title: title.trim(),
      author: story.author,
      authorBio: story.authorBio,
      genre: genre.trim() || story.genre,
      synopsis: synopsis.trim(),
      chapters: parsedChapters,
    });
    if (updated) {
      navigateBack();
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
        <button
          type="button"
          onClick={navigateBack}
          className="fable-btn fable-btn-secondary text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Discard Edits</span>
        </button>
        <h1 className="font-editorial text-2xl font-bold text-[var(--text-primary)]">
          Edit Published Edition
        </h1>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--action-destructive)] p-4 text-sm font-medium text-[var(--text-primary)]"
          style={{ backgroundColor: 'var(--action-destructive-tint)' }}
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-[var(--action-destructive)]" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="grid gap-10 lg:grid-cols-12">
        <aside className="space-y-5 lg:col-span-4">
          <div>
            <label
              htmlFor="edit-title"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
            >
              Title
            </label>
            <input
              id="edit-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="fable-input mt-1.5 font-editorial text-base font-semibold"
            />
          </div>

          <div>
            <label
              htmlFor="edit-genre"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
            >
              Genre
            </label>
            <input
              id="edit-genre"
              type="text"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="fable-input mt-1.5"
            />
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {GENRE_SUGGESTIONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={genre === g}
                  onClick={() => setGenre(g)}
                  className="fable-chip"
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-synopsis"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
            >
              Synopsis
            </label>
            <textarea
              id="edit-synopsis"
              rows={4}
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              className="fable-input mt-1.5 leading-relaxed"
            />
          </div>

          <div>
            <label
              htmlFor="edit-first-chapter"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
            >
              Opening Chapter Heading
            </label>
            <input
              id="edit-first-chapter"
              type="text"
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
              className="fable-input mt-1.5"
            />
          </div>
        </aside>

        <div className="space-y-4 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="edit-body"
              className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
            >
              Manuscript ({parsedChapters.length}{' '}
              {parsedChapters.length === 1 ? 'chapter' : 'chapters'})
            </label>
            <button
              type="button"
              onClick={() =>
                setBody(
                  (prev) =>
                    `${prev.trimEnd()}\n\nChapter ${parsedChapters.length + 1}: New Section\n\n`
                )
              }
              className="fable-btn fable-btn-secondary min-h-9 px-3 py-1.5 text-xs"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              <span>Insert Chapter Marker</span>
            </button>
          </div>

          <textarea
            id="edit-body"
            rows={15}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="fable-input font-editorial text-lg leading-relaxed"
          />

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="fable-btn fable-btn-primary px-6"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save Edition'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
