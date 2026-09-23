# Verification record

Tested September 23, 2026 with system Chromium, Python 3.13, Node 24, and Wrangler 4.136.3. Testing dependencies were installed under `/tmp/commonroom-tools`, not in the frontend. There are no runtime npm dependencies.

## Passed checks

- 18 JSON entries validated against required fields, local file existence, unique IDs, media availability, generated checksums, and curator references.
- Eight focused filter assertions: creator/genre/year search, combined filters, conflicting filters, decade, sorting, empty results, creator selection, and source array preservation.
- Every document route and all four valid/invalid detail types checked in Chromium.
- Home at 320, 390, 768, 1280, and 1920 CSS pixels; detail layouts at 320, 390, and 768; no horizontal document overflow.
- Mobile menu, Escape close, query restoration, combined filters, no-results state, reset, list view, search, saved items/removal, and random selection.
- Original MP4 metadata, playback, seeking, subtitle track loading, and fullscreen.
- Audio play/pause, next/previous, seek control, volume control, paused equalizer, and mini-player restoration after document navigation.
- TXT loading, font/theme/width controls, scroll-position restoration, and PDF iframe presence. Actual PDF renderer support remains browser-dependent.
- Browser game frame loads with only `allow-scripts`; the game advances to the interactive memory round.
- Hostile comment strings remain literal text, with no injected image or script elements; reply/cancel controls work.
- Reduced-motion disables poster animations. No JavaScript page errors in the interaction suite.
- Local Cloudflare D1 migrations and actual API reads/writes, pending moderation, approval/hiding, one-level replies, cross-title reply rejection, deduplicated reporting, whitespace/length validation, payload bounds, honeypot rejection, origin rejection, and throttling.
- Test comments were removed from local D1 after the API test. No sample discussions ship in the catalogue.

## Lighthouse

Mobile audit through local Cloudflare Pages after responsive artwork and layout fixes:

| Category | Score |
| --- | ---: |
| Performance | 87 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |

LCP 2.6 seconds; cumulative layout shift 0; total blocking time 310 ms. Results are lab measurements on this machine, not a guarantee for production users. The first audit exposed oversized artwork and a moving footer during initial catalogue loading; responsive WebP images, thumbnails, direct CSS links, image preload, and reserved loading space addressed those issues. Native image lazy-loading remains browser-controlled.

## Reproduce

Install development tools outside the deployed directory:

```sh
npm install --prefix /tmp/commonroom-tools playwright lighthouse wrangler
python3 scripts/validate.py
node tests/filters.mjs
```

Run the local application in separate terminals:

```sh
cp .dev.vars.example .dev.vars
python3 scripts/build.py
/tmp/commonroom-tools/node_modules/.bin/wrangler d1 migrations apply common-room-comments --local
/tmp/commonroom-tools/node_modules/.bin/wrangler pages dev public --port 8788
```

```sh
python3 scripts/serve.py --port 8089 --api http://localhost:8788
```

Then:

```sh
TEST_URL=http://localhost:8089 NODE_PATH=/tmp/commonroom-tools/node_modules node tests/browser.cjs
WRANGLER_PATH=/tmp/commonroom-tools/node_modules/.bin/wrangler node tests/api.mjs
CHROME_PATH=/usr/bin/chromium /tmp/commonroom-tools/node_modules/.bin/lighthouse http://localhost:8788 --chrome-flags='--headless --no-sandbox' --output=json --output-path=/tmp/commonroom-audit.json
```

Set `CHROME_PATH` in the browser test if Chromium is installed elsewhere. `--no-sandbox` is only needed in this container; retain the browser sandbox on a normal machine. API tests are restricted to localhost, clear local rate-limit rows, create their own temporary comments, and remove those comments afterward. Use a disposable local database for testing.

The simple `python3 -m http.server` and Wrangler preview served full media responses in this environment, so reliable seeking tests use the included range-capable server. Verify real R2/CDN `206` responses independently after deployment.

## Not claimed

No live Cloudflare deployment, external R2 upload, production domain validation, or real public moderation was performed. Firefox, Edge, Safari, physical touch devices, assistive technology, and production CDN behavior were not independently exercised. The implementation uses standard HTML/CSS/ES modules and native players with fallbacks; test target devices before a public launch. The automated PDF check verifies the embedded reader URL, not every browser's PDF rendering implementation.
