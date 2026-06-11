# Bible Bedtime — biblebedtime.uk

Marketing/legal site for the Bible Bedtime app. Astro 5 + React + Tailwind 3,
fully static output (no SSR), deployed to GitHub Pages via
`.github/workflows/deploy.yml` on push to `main`.

## Commands

```bash
npm ci                      # install
npm run dev                 # Astro dev server on :4321
npm run build               # static build → dist/
npm test                    # build + full Playwright suite (needs Chromium)
npx playwright test tests/e2e/static-output.spec.mjs   # contract tests only, no browser needed
UPDATE_BASELINE=1 npm test  # additionally refresh tests/baseline/*.png screenshots
```

## Routes

| URL                   | Source                              | Notes |
| --------------------- | ----------------------------------- | ----- |
| `/`                   | `src/pages/index.astro`             | Hero, navy wave band, verse of the day |
| `/childrens-stories/` | `src/pages/childrens-stories.astro` | Personalised kids' stories landing |
| `/bible-stories/`     | `src/pages/bible-stories.astro`     | Bible story collections landing |
| `/daily-scriptures/`  | `src/pages/daily-scriptures.astro`  | Daily verse landing; primary "Start Free" target |
| `/devotionals/`       | `src/pages/devotionals.astro`       | Devotionals landing |
| `/about/`             | `src/pages/about.astro`             | About / mission |
| `/childrens-emails/`  | `src/pages/childrens-emails.astro`  | Personalised kids' story signup landing |
| `/terms/`, `/privacy/`| `src/pages/{terms,privacy}.astro`   | Legal |
| `/app/`               | `public/app/index.html`             | Legacy static — don't rewrite |
| `/platform-info/`     | `public/platform-info/index.html`   | TikTok-approved page — preserve unchanged |
| `/callback/`          | `public/callback/index.html`        | TikTok OAuth callback — don't touch |
| `/tiktok*.txt`        | `public/**/tiktok*.txt`             | TikTok verification — **never delete** |

All six former placeholder nav links now resolve to real pages, so
`knownDeadLinks` in `tests/e2e/static-output.spec.mjs` is empty. The
landing-page CTAs point to `/app/` for signup (there is no email-capture
backend in this repo yet). `@astrojs/sitemap` generates
`dist/sitemap-index.xml`; `public/robots.txt` references it.

## Hard boundaries

- Never delete or rename anything under `public/` — especially `tiktok*.txt`
  files, `/platform-info/`, `/callback/`, and `CNAME` (`biblebedtime.uk`).
- Brand decisions are user-approved and locked: navy `#06142a`, cream
  `#f7eddc`, gold `#d4a14a`; Cormorant Garamond headings, Inter body
  (tokens in `tailwind.config.mjs`). Don't change colours, fonts, the
  stacked "Bible / Bedtime" wordmark, or the hero layout.
- `dist/.nojekyll` and `dist/CNAME` must survive every build (tested).

## Testing

- `tests/e2e/static-output.spec.mjs` — filesystem contract against `dist/`:
  links, single h1, meta, assets, fonts, CNAME/.nojekyll. No browser needed.
- `tests/e2e/rendered-pages.spec.mjs` — browser checks: overflow at
  375/768/1280/1440, hero fade geometry, header/footer parity, axe a11y,
  plus a Lighthouse spec (a11y ≥ 95, perf ≥ 90).
- CI runs everything except the Lighthouse spec (`--grep-invert lighthouse`)
  on every PR and push to `main`; deploy only happens on `main` after tests
  pass. Lighthouse is local-only because scores are noisy on shared runners.
- `tests/baseline/` screenshots are reference images; they are only
  rewritten when `UPDATE_BASELINE=1` is set. There is no automated pixel
  diff yet — comparison is manual.
