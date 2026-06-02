# Codex testing handover — biblebedtime.uk

You are picking this up cold. Read this whole file first, then run the
test pass. Do **not** push to the remote, do **not** change brand /
font / colour decisions, and do **not** delete any `tiktok*.txt` files.

## Repo at a glance

- **Path:** `/Users/jarvis/.openclaw/workspace/bible-bedtime-legal`
- **Live URL:** https://biblebedtime.uk (currently serving the *old*
  static homepage; the new build is local-only, 6 commits ahead of
  `origin/main`, not pushed)
- **Stack:** Astro 5 + React + Tailwind 3. Static output, no SSR. Build
  goes to `dist/` and is intended to deploy via GitHub Actions to
  GitHub Pages (`.github/workflows/deploy.yml`).
- **Source of truth:**
  - `src/pages/*.astro` — routes
  - `src/components/*.astro` — Header, Footer, Hero, FeatureBand,
    VerseOfTheDay
  - `src/layouts/BaseLayout.astro` — shared `<head>` (Google Fonts,
    meta, canonical)
  - `public/` — passthrough static (CNAME, assets, legacy HTML pages,
    TikTok verification txts)
- **Design tokens:** see `tailwind.config.mjs`. Navy `#06142a`, cream
  `#f7eddc`, gold `#d4a14a`. Serif headings = Cormorant Garamond,
  body = Inter (both via Google Fonts).

## Routes and where they come from

| URL                    | Source                                       | Notes |
| ---------------------- | -------------------------------------------- | ----- |
| `/`                    | `src/pages/index.astro`                      | Homepage with hero, wave navy band, verse |
| `/childrens-stories/`  | `src/pages/childrens-stories.astro`          | Personalised kids' stories landing |
| `/terms/`              | `src/pages/terms.astro`                      | Legal |
| `/privacy/`            | `src/pages/privacy.astro`                    | Legal |
| `/app/`                | `public/app/index.html` (legacy static)      | Legacy. Don't rewrite. |
| `/platform-info/`      | `public/platform-info/index.html`            | The page TikTok approved. Preserved unchanged. |
| `/callback/`           | `public/callback/index.html`                 | TikTok OAuth callback. Don't touch. |
| `/tiktok*.txt`         | `public/{terms,privacy,app}/tiktok*.txt`     | TikTok verification. Never delete. |

## Commands

```bash
cd /Users/jarvis/.openclaw/workspace/bible-bedtime-legal

# Install (if node_modules missing)
npm ci

# Build (writes to dist/)
npm run build

# Dev server (Astro on :4321)
npm run dev

# Serve the built dist/ statically (mirrors GH Pages behaviour)
python3 -m http.server 8765 --directory dist
```

There are currently **no automated tests**. Your job is to set them up
and run them. The user has not picked a framework — pick the one that
makes the test pass below cheapest, and document your choice.

## What to test

### Must pass before this can ship

1. **Build is clean.** `npm run build` exits 0 with no errors or
   warnings about missing assets. 4 pages currently generate.
2. **No broken internal links.** Crawl `dist/` and every internal
   `<a href="/...">` must resolve to an existing file. The header
   currently links to several routes that **do not exist yet** —
   list them as **known dead links**, do not flag as bugs:
   - `/bible-stories/`
   - `/daily-scriptures/`
   - `/devotionals/`
   - `/about/`
   - `/childrens-emails/`
   Everything else should resolve.
3. **One H1 per page.** Each generated HTML file in `dist/` must
   contain exactly one `<h1>`.
4. **Meta title and description present.** Every page in `dist/`
   has non-empty `<title>` and `<meta name="description">`.
5. **`/` and `/childrens-stories/` images load.** No 404s for
   `/assets/home-hero-sunrise-20260602.png`,
   `/assets/childrens-stories-hero-20260602.png`,
   `/assets/bible-bedtime-logo-20260520.png`,
   `/assets/icon-{book,cross,people}-20260602.png`,
   `/assets/leaf-decoration-20260602.png`.
6. **Google Fonts load.** Network tab shows
   `fonts.googleapis.com/css2?family=Cormorant+Garamond...&family=Inter...`
   on every Astro-rendered page (homepage, /childrens-stories/,
   /terms/, /privacy/). Inline-styled legacy pages (/app/,
   /platform-info/) also load these fonts.

### Should pass — flag what doesn't

7. **Accessibility — Axe / Lighthouse on each route.** Target ≥ 95
   accessibility score. Known cosmetic issue: feature-band icons have
   baked-in navy backgrounds and may flag low contrast on the icon
   container edge — flag separately, don't block.
8. **Responsive at 375 / 768 / 1280 / 1440.** No horizontal scrollbar
   on any route at any breakpoint. Hero photo on `/` should fade on
   its **left** edge (not bottom). Navy band's top wave should
   overlap the bottom of the hero photo at ≥ lg breakpoint.
9. **Header consistency.** Stacked "Bible / Bedtime" wordmark renders
   identically on `/`, `/childrens-stories/`, `/terms/`, `/privacy/`.
   Logo is `/assets/bible-bedtime-logo-20260520.png`. Same 6-link nav,
   same gold "Start Free" button.
10. **Footer consistency.** Same footer on every Astro-rendered page.
11. **CNAME file.** `dist/CNAME` exists and contains exactly
    `biblebedtime.uk`.
12. **`.nojekyll` present.** `dist/.nojekyll` exists (prevents GitHub
    Pages from running Jekyll on the output).

### Nice to have

13. **Lighthouse performance** on each route. Target ≥ 90 desktop.
    Hero photo is currently ~2 MB PNG — flag as the most likely
    perf issue and suggest WebP conversion.
14. **Snapshot / visual regression baseline.** If you set up
    Playwright, capture screenshots at 375 / 768 / 1280 for each
    route into a baseline folder so future runs can diff.

## Boundaries

- **Don't push to `origin/main`.** Six commits are deliberately held
  back pending the user flipping GitHub Pages source to "GitHub
  Actions" in repo Settings.
- **Don't delete or rename** anything in `public/` except after
  explicit user approval. The TikTok verification `.txt` files and
  `/platform-info/` content matter for TikTok app approval.
- **Don't change** colours, fonts, brand wordmark style, or hero
  layout decisions. Those are user-approved.
- **Don't add a new framework.** Pick a test runner that works with
  the existing Astro/React setup (Vitest or Playwright are both
  fine). If something heavier is needed, surface it and ask.
- **Don't run anything that requires network credentials** (TikTok
  API, R2, etc.). Tests must be self-contained against `dist/`.

## Deliverable

When done, produce a short report:

- Test framework chosen + one-line why
- `npm test` (or equivalent) command added to `package.json`
- Which of the 14 checks above pass / fail / are blocked
- For each failure, file path and exact line / selector
- For each known-issue from this brief that you confirmed (dead nav
  links, baked-in icon backgrounds, ~2 MB hero photo), one line
  acknowledging it so the user knows you saw it

Stop before opening a PR or pushing. Hand the report back to the user
and let them decide what to fix and when.
