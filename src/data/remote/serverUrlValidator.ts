export const DEFAULT_HOSTED_API_BASE_URL = 'https://fable-api-eosin.vercel.app/api/v1/';
export const SAME_ORIGIN_PROXY_API_BASE_URL = '/api/v1/';

export interface ServerUrlValidationResult {
  isValid: boolean;
  normalizedUrl: string | null;
  errorMessage: string | null;
}

/**
 * Mirrors Android ServerUrlValidator.kt:
 * Accepts either the same-origin proxy path (`/api/v1/`) or a full HTTP(S) URL,
 * normalizing it to end with `/api/v1/` and rejecting embedded credentials or non-HTTP(S) schemes.
 */
export function validateServerUrl(
  rawUrl: string,
  options: { requireHttps?: boolean } = {}
): ServerUrlValidationResult {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return {
      isValid: false,
      normalizedUrl: null,
      errorMessage: 'Server URL cannot be blank.',
    };
  }

  if (trimmed === '/api/v1' || trimmed === '/api/v1/') {
    return {
      isValid: true,
      normalizedUrl: '/api/v1/',
      errorMessage: null,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      isValid: false,
      normalizedUrl: null,
      errorMessage: 'Must be a valid http:// or https:// URL (or /api/v1/).',
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      isValid: false,
      normalizedUrl: null,
      errorMessage: 'URL scheme must be http:// or https://.',
    };
  }

  if (options.requireHttps && parsed.protocol !== 'https:') {
    return {
      isValid: false,
      normalizedUrl: null,
      errorMessage: 'HTTPS is required for production endpoints.',
    };
  }

  if (parsed.username || parsed.password) {
    return {
      isValid: false,
      normalizedUrl: null,
      errorMessage: 'Server URL must not contain embedded user credentials.',
    };
  }

  if (!parsed.hostname) {
    return {
      isValid: false,
      normalizedUrl: null,
      errorMessage: 'Server URL must specify a valid host.',
    };
  }

  let path = parsed.pathname.replace(/\/+$/, '');
  if (!path || path === '') {
    path = '/api/v1/';
  } else if (path.endsWith('/api/v1')) {
    path = `${path}/`;
  } else {
    path = `${path}/`;
  }

  parsed.pathname = path;
  parsed.search = '';
  parsed.hash = '';

  return {
    isValid: true,
    normalizedUrl: parsed.toString(),
    errorMessage: null,
  };
}

/**
 * Mirrors MangaApiService.sanitizeHttpUrl:
 * Ensures external cover and comic page URLs use http:, https:, or data:image/svg+xml (for built-in demo panels).
 */
export function sanitizeImageUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname) {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}
