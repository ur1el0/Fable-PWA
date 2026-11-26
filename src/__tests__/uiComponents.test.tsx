import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SEED_STORIES } from '../data/db/seedStories';
import { useFableStore } from '../store/useFableStore';
import { LibraryScreen } from '../ui/screens/LibraryScreen';
import { ExploreScreen } from '../ui/screens/ExploreScreen';

describe('Fable PWA React UI Components', () => {
  beforeEach(() => {
    useFableStore.setState({
      stories: SEED_STORIES,
      downloadedStoryIds: new Set(['fable-glass-conservatory']),
      exploreFormat: 'PROSE',
      exploreProvider: 'ALL',
      exploreQuery: '',
      isRefreshingCatalog: false,
      usingOfflineFallback: false,
      openStoryDetail: vi.fn(),
      openStoryReader: vi.fn(),
      toggleBookmark: vi.fn().mockResolvedValue(undefined),
      selectTab: vi.fn(),
      refreshCatalog: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders LibraryScreen lead story, Continue Reading, and Catalog list', () => {
    render(<LibraryScreen />);
    expect(screen.getAllByText('The Glass Conservatory').length).toBeGreaterThan(0);
    expect(screen.getByText('Continue Reading')).toBeTruthy();
    expect(screen.getAllByText('Pride and Prejudice').length).toBeGreaterThan(0);
  });

  it('switches ExploreScreen between Books and Manga mediums and filters results', () => {
    render(<ExploreScreen />);
    expect(screen.getAllByText('Pride and Prejudice').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Manga/i }));
    expect(useFableStore.getState().exploreFormat).toBe('COMIC');
  });
});
