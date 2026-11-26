import type {
  AccountSession,
  AuthUser,
  Chapter,
  ChapterPage,
  ContentFormat,
  ReadingSessionRecord,
  ReadingStatsSummary,
  Story,
  StoryProvider,
  StorySubmission,
} from '../../domain/models';
import {
  DEFAULT_HOSTED_API_BASE_URL,
  SAME_ORIGIN_PROXY_API_BASE_URL,
  sanitizeImageUrl,
  validateServerUrl,
} from './serverUrlValidator';

const SERVER_URL_STORAGE_KEY = 'fable.server.base_url';

export class ApiException extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ApiException';
    this.statusCode = statusCode;
  }
}

export function getActiveApiBaseUrl(): string {
  try {
    const saved = localStorage.getItem(SERVER_URL_STORAGE_KEY);
    if (saved) {
      const check = validateServerUrl(saved);
      if (check.isValid && check.normalizedUrl) {
        return check.normalizedUrl;
      }
    }
  } catch {
    // ignore storage errors
  }
  // In local Vite dev or Cloudflare Pages with /api/v1 proxy, '/api/v1/' works same-origin;
  // fallback to hosted Render URL if running from file:// or custom origin.
  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    return SAME_ORIGIN_PROXY_API_BASE_URL;
  }
  return DEFAULT_HOSTED_API_BASE_URL;
}

export function setCustomApiBaseUrl(rawUrl: string): { ok: boolean; url: string; error?: string } {
  const result = validateServerUrl(rawUrl);
  if (!result.isValid || !result.normalizedUrl) {
    return {
      ok: false,
      url: getActiveApiBaseUrl(),
      error: result.errorMessage ?? 'Invalid server URL',
    };
  }
  try {
    localStorage.setItem(SERVER_URL_STORAGE_KEY, result.normalizedUrl);
  } catch {
    // ignore
  }
  return { ok: true, url: result.normalizedUrl };
}

export function resetApiBaseUrl(): string {
  try {
    localStorage.removeItem(SERVER_URL_STORAGE_KEY);
  } catch {
    // ignore
  }
  return getActiveApiBaseUrl();
}

function resolveEndpoint(path: string, baseUrl = getActiveApiBaseUrl()): string {
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${cleanBase}${cleanPath}`;
}

async function requestJson<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    accessToken?: string | null;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {}
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 7000;
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.accessToken) {
    headers['Authorization'] = `Bearer ${options.accessToken}`;
  }

  try {
    const response = await fetch(resolveEndpoint(path), {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      let detail = `Request failed (${response.status})`;
      try {
        const errJson = await response.json();
        if (typeof errJson?.detail === 'string') {
          detail = errJson.detail;
        } else if (Array.isArray(errJson?.detail) && errJson.detail[0]?.msg) {
          detail = errJson.detail[0].msg;
        }
      } catch {
        // non-json error response (e.g. Render 503 HTML)
        if (response.status === 503) {
          detail = 'Cloud server is waking up or temporarily suspended (503). Using local offline cache.';
        }
      }
      throw new ApiException(response.status, detail);
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onAbort);
  }
}

function normalizeProvider(raw?: string | null): StoryProvider {
  const upper = (raw ?? 'FABLE').toUpperCase().replace(/-/g, '_');
  if (upper.includes('GUTENBERG')) return 'GUTENBERG';
  if (upper.includes('STANDARD')) return 'STANDARD_EBOOKS';
  if (upper.includes('MANGA')) return 'MANGADEX';
  return 'FABLE';
}

function normalizeFormat(raw?: string | null, provider?: StoryProvider): ContentFormat {
  if (provider === 'MANGADEX') return 'COMIC';
  const upper = (raw ?? 'PROSE').toUpperCase();
  return upper === 'COMIC' || upper === 'MANGA' ? 'COMIC' : 'PROSE';
}

function mapChapterDto(dto: Record<string, any>, fallbackIndex: number, storyId: string): Chapter {
  const index = typeof dto.index === 'number' ? dto.index : fallbackIndex;
  const rawPages = Array.isArray(dto.pages)
    ? dto.pages
    : Array.isArray(dto.page_urls)
      ? dto.page_urls
      : [];
  const pages: ChapterPage[] = rawPages
    .map((p: any, pageIdx: number): ChapterPage | null => {
      if (typeof p === 'string') {
        const clean = sanitizeImageUrl(p);
        return clean ? { index: pageIdx, imageUrl: clean, width: null, height: null } : null;
      }
      const clean = sanitizeImageUrl(p?.image_url ?? p?.imageUrl ?? p?.url);
      if (!clean) return null;
      return {
        index: typeof p.index === 'number' ? p.index : pageIdx,
        imageUrl: clean,
        width: typeof p.width === 'number' ? p.width : null,
        height: typeof p.height === 'number' ? p.height : null,
      };
    })
    .filter((p): p is ChapterPage => p !== null);

  const content = typeof dto.content === 'string' ? dto.content : '';
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const computedReadMinutes = Math.max(1, Math.round(wordCount / 220));

  return {
    id: String(dto.id ?? dto.chapter_id ?? `${storyId}-ch-${index}`),
    index,
    title: String(dto.title ?? `Chapter ${index + 1}`),
    readTimeMinutes:
      typeof dto.read_time_minutes === 'number'
        ? dto.read_time_minutes
        : typeof dto.readTimeMinutes === 'number'
          ? dto.readTimeMinutes
          : pages.length > 0
            ? Math.max(3, Math.round(pages.length * 0.4))
            : computedReadMinutes,
    content,
    pages,
    pageCount:
      typeof dto.page_count === 'number'
        ? dto.page_count
        : typeof dto.pageCount === 'number'
          ? dto.pageCount
          : pages.length,
  };
}

export function mapStoryDto(
  dto: Record<string, any>,
  defaultProvider?: StoryProvider
): Story {
  const provider = defaultProvider ?? normalizeProvider(dto.provider ?? dto.source);
  const contentFormat = normalizeFormat(dto.content_format ?? dto.contentFormat, provider);
  const rawId = String(dto.id ?? dto.external_id ?? dto.externalId ?? crypto.randomUUID());
  const id =
    provider === 'GUTENBERG' && !rawId.startsWith('gutenberg-')
      ? `gutenberg-${rawId}`
      : provider === 'STANDARD_EBOOKS' && !rawId.startsWith('se-')
        ? `se-${rawId.replace(/\//g, '-')}`
        : provider === 'MANGADEX' && !rawId.startsWith('manga-')
          ? `manga-${rawId}`
          : rawId;

  const rawChapters = Array.isArray(dto.chapters) ? dto.chapters : [];
  const chapters = rawChapters.map((ch, idx) => mapChapterDto(ch, idx, id));

  return {
    id,
    ownerUserId: dto.owner_user_id ?? dto.ownerUserId ?? null,
    title: String(dto.title ?? 'Untitled Story'),
    author: String(dto.author ?? 'Unknown Author'),
    authorBio: String(dto.author_bio ?? dto.authorBio ?? ''),
    genre: String(dto.genre ?? (provider === 'MANGADEX' ? 'Manga' : 'Literary')),
    readTimeMinutes:
      typeof dto.read_time_minutes === 'number'
        ? dto.read_time_minutes
        : typeof dto.readTimeMinutes === 'number'
          ? dto.readTimeMinutes
          : Math.max(5, chapters.reduce((acc, c) => acc + c.readTimeMinutes, 0) || 10),
    rating: typeof dto.rating === 'number' ? dto.rating : 4.7,
    synopsis: String(dto.synopsis ?? dto.description ?? ''),
    accentHex: String(dto.accent_hex ?? dto.accentHex ?? '#3949AB'),
    featuredRank:
      typeof dto.featured_rank === 'number'
        ? dto.featured_rank
        : typeof dto.featuredRank === 'number'
          ? dto.featuredRank
          : null,
    isBookmarked: Boolean(dto.is_bookmarked ?? dto.isBookmarked ?? false),
    isCompleted: Boolean(dto.is_completed ?? dto.isCompleted ?? false),
    readingProgress:
      typeof dto.reading_progress === 'number'
        ? dto.reading_progress
        : typeof dto.readingProgress === 'number'
          ? dto.readingProgress
          : 0,
    lastReadChapterIndex:
      typeof dto.last_read_chapter_index === 'number'
        ? dto.last_read_chapter_index
        : typeof dto.lastReadChapterIndex === 'number'
          ? dto.lastReadChapterIndex
          : 0,
    provider,
    contentFormat,
    coverImageUrl: sanitizeImageUrl(dto.cover_image_url ?? dto.coverImageUrl ?? dto.cover_url),
    externalId: dto.external_id ?? dto.externalId ?? (provider !== 'FABLE' ? rawId : null),
    sourceUrl: dto.source_url ?? dto.sourceUrl ?? null,
    chapters,
  };
}

export const fableApiService = {
  async fetchFableStories(signal?: AbortSignal): Promise<Story[]> {
    const data = await requestJson<any[]>('stories', { signal });
    return (data ?? []).map((item) => mapStoryDto(item, 'FABLE'));
  },

  async fetchStoryDetail(storyId: string, signal?: AbortSignal): Promise<Story> {
    const data = await requestJson<any>(`stories/${encodeURIComponent(storyId)}`, { signal });
    return mapStoryDto(data, 'FABLE');
  },

  async fetchGutenbergDiscover(
    query?: string,
    sort = 'popular',
    signal?: AbortSignal
  ): Promise<Story[]> {
    const path = query?.trim()
      ? `books/gutenberg/search?q=${encodeURIComponent(query.trim())}&sort=${encodeURIComponent(sort)}`
      : `books/gutenberg/discover?sort=${encodeURIComponent(sort)}`;
    try {
      const data = await requestJson<any[]>(path, { signal });
      return (data ?? []).map((item) => mapStoryDto(item, 'GUTENBERG'));
    } catch {
      // Fallback to /public/gutenberg if backend uses public prefix
      const altPath = query?.trim()
        ? `public/gutenberg?search=${encodeURIComponent(query.trim())}`
        : `public/gutenberg`;
      const data = await requestJson<any[]>(altPath, { signal });
      return (data ?? []).map((item) => mapStoryDto(item, 'GUTENBERG'));
    }
  },

  async fetchGutenbergChapters(externalId: string, storyId: string, signal?: AbortSignal): Promise<Chapter[]> {
    const cleanExt = externalId.replace(/^gutenberg-/, '');
    try {
      const data = await requestJson<any[]>(
        `books/gutenberg/${encodeURIComponent(cleanExt)}/chapters`,
        { signal }
      );
      return (data ?? []).map((ch, idx) => mapChapterDto(ch, idx, storyId));
    } catch {
      const data = await requestJson<any[]>(
        `public/gutenberg/${encodeURIComponent(cleanExt)}/chapters`,
        { signal }
      );
      return (data ?? []).map((ch, idx) => mapChapterDto(ch, idx, storyId));
    }
  },

  async fetchStandardEbooksDiscover(query?: string, signal?: AbortSignal): Promise<Story[]> {
    const path = query?.trim()
      ? `books/standard-ebooks/search?q=${encodeURIComponent(query.trim())}`
      : `books/standard-ebooks/discover`;
    try {
      const data = await requestJson<any[]>(path, { signal });
      return (data ?? []).map((item) => mapStoryDto(item, 'STANDARD_EBOOKS'));
    } catch {
      const altPath = query?.trim()
        ? `public/standard-ebooks?search=${encodeURIComponent(query.trim())}`
        : `public/standard-ebooks`;
      const data = await requestJson<any[]>(altPath, { signal });
      return (data ?? []).map((item) => mapStoryDto(item, 'STANDARD_EBOOKS'));
    }
  },

  async fetchStandardEbooksChapters(
    externalId: string,
    storyId: string,
    signal?: AbortSignal
  ): Promise<Chapter[]> {
    const cleanExt = externalId.replace(/^se-/, '');
    const data = await requestJson<any[]>(
      `books/standard-ebooks/${encodeURIComponent(cleanExt)}/chapters`,
      { signal }
    );
    return (data ?? []).map((ch, idx) => mapChapterDto(ch, idx, storyId));
  },

  async fetchMangaDiscover(query?: string, signal?: AbortSignal): Promise<Story[]> {
    const path = query?.trim()
      ? `public/manga?search=${encodeURIComponent(query.trim())}`
      : `public/manga`;
    try {
      const data = await requestJson<any[]>(path, { signal });
      return (data ?? []).map((item) => mapStoryDto(item, 'MANGADEX'));
    } catch {
      const altPath = query?.trim()
        ? `manga/search?q=${encodeURIComponent(query.trim())}`
        : `manga/discover`;
      const data = await requestJson<any[]>(altPath, { signal });
      return (data ?? []).map((item) => mapStoryDto(item, 'MANGADEX'));
    }
  },

  async fetchMangaChapters(externalId: string, storyId: string, signal?: AbortSignal): Promise<Chapter[]> {
    const cleanExt = externalId.replace(/^manga-/, '');
    try {
      const data = await requestJson<any[]>(
        `public/manga/${encodeURIComponent(cleanExt)}/chapters`,
        { signal }
      );
      return (data ?? []).map((ch, idx) => mapChapterDto(ch, idx, storyId));
    } catch {
      const data = await requestJson<any[]>(
        `manga/${encodeURIComponent(cleanExt)}/chapters`,
        { signal }
      );
      return (data ?? []).map((ch, idx) => mapChapterDto(ch, idx, storyId));
    }
  },

  async publishStory(submission: StorySubmission, accessToken: string): Promise<Story> {
    const data = await requestJson<any>('stories', {
      method: 'POST',
      accessToken,
      body: {
        title: submission.title,
        author: submission.author,
        author_bio: submission.authorBio,
        genre: submission.genre,
        synopsis: submission.synopsis,
        accent_hex: submission.accentHex ?? '#3949AB',
        chapters: submission.chapters.map((c, index) => ({
          index,
          title: c.title,
          content: c.content,
        })),
      },
    });
    return mapStoryDto(data, 'FABLE');
  },

  async updateStory(
    storyId: string,
    submission: StorySubmission,
    accessToken: string
  ): Promise<Story> {
    const data = await requestJson<any>(`stories/${encodeURIComponent(storyId)}`, {
      method: 'PATCH',
      accessToken,
      body: {
        title: submission.title,
        genre: submission.genre,
        synopsis: submission.synopsis,
        chapters: submission.chapters.map((c, index) => ({
          index,
          title: c.title,
          content: c.content,
        })),
      },
    });
    return mapStoryDto(data, 'FABLE');
  },

  async deleteStory(storyId: string, accessToken: string): Promise<void> {
    await requestJson<void>(`stories/${encodeURIComponent(storyId)}`, {
      method: 'DELETE',
      accessToken,
    });
  },

  async register(email: string, password: string, displayName: string): Promise<AccountSession> {
    const data = await requestJson<any>('auth/register', {
      method: 'POST',
      body: { email, password, display_name: displayName },
    });
    return mapSessionDto(data);
  },

  async login(email: string, password: string): Promise<AccountSession> {
    const data = await requestJson<any>('auth/login', {
      method: 'POST',
      body: { email, password },
    });
    return mapSessionDto(data);
  },

  async updateProfile(
    displayName: string,
    bio: string,
    accessToken: string
  ): Promise<AuthUser> {
    const data = await requestJson<any>('auth/me', {
      method: 'PATCH',
      accessToken,
      body: { display_name: displayName, bio },
    });
    return mapUserDto(data);
  },

  async resetPassword(email: string, newPassword: string): Promise<void> {
    await requestJson<any>('auth/password-reset', {
      method: 'POST',
      body: { email, new_password: newPassword },
    });
  },

  async deleteAccount(accessToken: string): Promise<void> {
    await requestJson<void>('auth/me', {
      method: 'DELETE',
      accessToken,
    });
  },

  async recordReadingSession(
    session: ReadingSessionRecord,
    accessToken: string
  ): Promise<ReadingStatsSummary | null> {
    const data = await requestJson<any>('me/reading-sessions', {
      method: 'POST',
      accessToken,
      body: {
        session_id: session.sessionId,
        story_id: session.storyId,
        chapter_index: session.chapterIndex,
        duration_seconds: session.durationSeconds,
        words_read: session.wordsRead,
        completed_story: session.completedStory,
        ended_at: session.endedAtIso,
      },
    });
    if (!data) return null;
    return {
      totalReadingMinutes: Number(data.total_reading_minutes ?? 0),
      totalWordsRead: Number(data.total_words_read ?? 0),
      completedStoriesCount: Number(data.completed_stories_count ?? 0),
      activeDaysLast7: Number(data.active_days_last_7 ?? 0),
      currentStreakDays: Number(data.current_streak_days ?? 0),
      sessionsCount: Number(data.sessions_count ?? 0),
      lastReadAtIso: data.last_read_at ?? null,
    };
  },
};

function mapUserDto(dto: Record<string, any>): AuthUser {
  return {
    id: String(dto.id ?? dto.user_id ?? 'user'),
    email: String(dto.email ?? ''),
    displayName: String(dto.display_name ?? dto.displayName ?? 'Reader'),
    bio: String(dto.bio ?? ''),
    createdAt: dto.created_at ?? null,
  };
}

function mapSessionDto(dto: Record<string, any>): AccountSession {
  const userDto = dto.user ?? dto;
  return {
    accessToken: String(dto.access_token ?? dto.accessToken ?? ''),
    user: mapUserDto(userDto),
  };
}
