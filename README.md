# Fable PWA — Offline-First Reader & Writer (iOS, Android & Desktop)

Fable PWA is the Progressive Web App companion to **Fable-IOS** and **Fable Android**, built with **React + TypeScript + Vite PWA (Workbox) + Dexie.js (IndexedDB) + Tailwind CSS**.

It can be installed directly onto the home screen on **iOS / iPadOS (Safari)**, **Android (Chrome / Edge / Firefox)**, and **Desktop** from a single codebase for **$0 hosting cost** (Cloudflare Pages / Vercel / static hosting).

---

## Key Features (1:1 Parity with Fable-IOS & Fable Android)

- **Installable on Both iOS & Android (`PwaInstallBanner` + `manifest.webmanifest`)**:
  - **Android**: Native 1-tap `beforeinstallprompt` WebAPK installation.
  - **iOS / iPadOS**: Guided *Safari Share $\rightarrow$ Add to Home Screen* modal + `apple-mobile-web-app-capable` standalone fullscreen support and safe-area insets.
- **Offline-First IndexedDB Single Source of Truth (`src/data/db/fableDb.ts`)**:
  - Mirrors all 7 Room v6 tables (`stories`, `chapters`, `shelfStates`, `readingSessions`, `readingStats`, `writerDrafts`, `storyHighlights`).
  - Seeded with curated prose and manga stories (`src/data/db/seedStories.ts`) so the app launches and works 100% offline even when the cloud Render server is cold-starting or asleep.
  - Non-destructive chapter coalescing (`coalesceChapters`) ensures summary responses never overwrite cached offline chapters.
- **Multi-Source Discovery (`ExploreScreen`)**:
  - Format-aware toggle (**Books & Stories** vs **Manga & Comics**) across **Fable Originals**, **Project Gutenberg**, **Standard Ebooks**, and **MangaDex**, with cancellable `AbortController` search and clickable trending tags/writers.
- **Prose & Manga/Webtoon Reader (`StoryReaderScreen`)**:
  - **Prose**: Continuous Scroll and Paginated Book mode with word-offset progress preservation (`readerPagination.ts`), Paper/Sepia/Night themes, Serif/Sans/Mono fonts, adjustable font size (`15px`–`26px`), line height (`1.25x`–`1.9x`), and per-session screen brightness dimmer (`Auto` or slider).
  - **In-Book Search, Passage Highlights & 1080px Quote Cards**: Cross-chapter search (`inBookSearchAndHighlights.ts`), word-range highlight editor (`Start Word` / `End Word` sliders + `Terracotta`/`Amber`/`Sage` swatches + notes), Markdown highlight export, and 1080×1350 PNG Quote Card generation (`quoteCardExporter.ts`) with native Web Share API (`navigator.share`).
  - **Manga / Webtoon**: Vertical Webtoon strip and Horizontal Manga pager with `100%–400%` zoom, double-tap `250%` zoom toggle (`comicZoomMath.ts`), and `referrerPolicy="no-referrer"` hotlink protection.
- **Writer Studio, Story Edit/Delete & Account Lifecycle (`WriteScreen`, `EditStoryScreen`, `AccountScreen`)**:
  - Auto-saved local drafts in IndexedDB, `Chapter N:` marker splitting, live word count & estimated reading time, owner story editing/deletion, account deletion, adaptive `System`/`Light`/`Dark` theme with WCAG AA dark palette, and a runtime API server URL switcher.
- **Same-Origin Edge Proxy (`functions/api/v1/[[path]].ts`)**:
  - Proxies `/api/v1/*` to `https://fable-api-cbo8.onrender.com/api/v1/*` on Cloudflare Pages (and via Vite's dev proxy locally), eliminating browser CORS issues and preflight overhead.

---

## Commands

```bash
# Install dependencies
npm install

# Run unit tests (Vitest)
npm test

# Start local dev server (http://localhost:5173)
npm run dev

# Build production PWA bundle & Workbox Service Worker into dist/
npm run build

# Preview production PWA build locally
npm run preview
```
