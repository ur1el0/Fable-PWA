import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiException, fableApiService } from '../data/remote/fableApiService';

describe('fableApiService HTTP Contracts', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('normalizes Fable Originals story DTOs and chapters', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: 'story-1',
            owner_user_id: 'user-7',
            title: 'Harbor Bells',
            author: 'M. Lin',
            genre: 'Literary Fiction',
            synopsis: 'A coastal novella.',
            provider: 'fable',
            content_format: 'prose',
            chapters: [
              { id: 'ch-0', index: 0, title: 'Chapter 1', content: 'Salt air drifted.' },
            ],
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    ) as any;

    const stories = await fableApiService.fetchFableStories();
    expect(stories.length).toBe(1);
    expect(stories[0].id).toBe('story-1');
    expect(stories[0].ownerUserId).toBe('user-7');
    expect(stories[0].provider).toBe('FABLE');
    expect(stories[0].chapters[0].content).toBe('Salt air drifted.');
  });

  it('throws friendly ApiException on 503 Render cold-start/suspend response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('<html><body>Suspended</body></html>', {
        status: 503,
        headers: { 'Content-Type': 'text/html' },
      })
    ) as any;

    await expect(fableApiService.fetchFableStories()).rejects.toMatchObject({
      name: 'ApiException',
      statusCode: 503,
    });
  });

  it('sends bearer token on updateStory PATCH and deleteStory DELETE', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ id: 'story-1', title: 'Updated Title', genre: 'Classic', synopsis: 'Edited' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    globalThis.fetch = fetchMock as any;

    const updated = await fableApiService.updateStory(
      'story-1',
      {
        title: 'Updated Title',
        author: 'M. Lin',
        authorBio: '',
        genre: 'Classic',
        synopsis: 'Edited',
        chapters: [{ title: 'Chapter 1', content: 'Body text.' }],
      },
      'secret-jwt'
    );
    expect(updated.title).toBe('Updated Title');
    expect(fetchMock.mock.calls[0][1].method).toBe('PATCH');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer secret-jwt');

    await fableApiService.deleteStory('story-1', 'secret-jwt');
    expect(fetchMock.mock.calls[1][1].method).toBe('DELETE');
  });
});
