# Common Room

A complete, plain-HTML entertainment library with a dark editorial design, separate movie/game/book/music catalogues, and a moderated anonymous discussion system. No frontend framework, bundler, runtime package dependencies, trackers, or user accounts.

## Maintaining the catalogue

Edit **`data/`**, not **`public/data/`**. Build with `python3 scripts/build.py` after edits when serving or deploying `public/`. The build validates entries and protects generated data edits from being silently overwritten.

See [Adding content](docs/adding-content.md) for complete, separate examples of singles, albums, standalone movies/books, trilogies, franchises, and series with episode or reading order.

- Music: `releaseType: "single"` or `"album"`; tracks use `streamUrl` (legacy `url` is accepted).
- Movies: `kind: "standalone"`, `"film"`, or `"episode"`.
- Books: `kind: "standalone"` or `"volume"`.
- Groups: `data/collections.json`, with `category`, `type`, and ordered member IDs.

The old movie, music, book, and nonplayable game demos have been removed. The operator's music entry is preserved. Signal Garden is the only retained playable demo. Source/licence metadata remains the operator's responsibility; downloads without it are hidden rather than assigned an invented licence.

## Run locally

Python 3 is sufficient for the frontend. The included server supports HTTP range requests for media seeking:

```sh
python3 scripts/serve.py --port 8080
```

Open http://localhost:8080. Do not open the HTML with `file://`; browsers block module and JSON loading. The simpler `python3 -m http.server 8080` also works for browsing but does not implement byte-range seeking. Without Wrangler, the static server cannot serve the comments API; it gracefully shows “Discussion is temporarily unavailable.”

For the complete local application with D1, install Node.js 22 or newer and use Wrangler as development tooling:

```sh
cp .dev.vars.example .dev.vars
python3 scripts/build.py
npx wrangler d1 migrations apply common-room-comments --local
npx wrangler pages dev public
```

Open the address printed by Wrangler (normally http://localhost:8788). The all-zero database ID in `wrangler.toml` is a local configuration placeholder; replace it with your actual D1 ID before deployment. For local media seeking with the API, leave Wrangler running, then run `python3 scripts/serve.py --port 8089 --api http://localhost:8788` in another terminal and open port 8089. Wrangler preview may not implement range responses. No cloud credentials belong in frontend files. Local test comments are separate from production.

## What works

- Home with mixed shelves, curator notes, category discovery, and category-aware random selection.
- Category-specific covers and layouts, combined filters, sorting, list/grid views, URL restoration, and search across title, creator, genre, and year.
- Directly linkable details, source/licence panels, real format downloads, optional SHA-256, sharing, and browser-local favourites.
- Native video, subtitle tracks, lazy sandboxed browser games, TXT reading controls with position memory, and native PDF display.
- Native Audio-backed mini-player: track selection, play/pause, next/previous, seek, volume, and session position restoration. Navigation creates a new document; the visitor presses play to resume.
- Lazy-loaded discussions, replies, reporting, review-before-publication, validation, honeypot, same-origin JSON writes, D1 rate limiting, parameterized queries, and safe text rendering.
- Mobile navigation, keyboard focus, reduced motion, missing-art fallbacks, no-results/error states, no autoplay, and lazy shelf images.

## Architecture

```text
GitHub source
  └─ Cloudflare Pages: public HTML / CSS / ES modules / JSON / artwork
       ├─ /api/comments → Pages Function → D1
       └─ native browser media requests → R2 custom domain / media CDN
```

`scripts/build.py` copies a safe public subset. It does not compile the frontend. Secrets, migrations, source configuration, and tests are never copied to `public/`. Large production media should live in object storage. The small original browser game is included in `media/demo/`.

## Repository

```text
*.html                  Real documents and permanent navigation
assets/css/             Base, layout, component, responsive styles
assets/js/              Catalogue, filters, comments, shared utilities
assets/js/pages/        Home, browse, and detail rendering
assets/js/players/      Audio, native video, text/PDF reader
assets/images/          Local photographs, WebP cover art, SVG favicon
media/demo/             Small original playable/readable samples
data/                   Four catalogues, ordered collections, editorial picks
functions/api/comments/ Cloudflare Pages API implementation
migrations/             D1 schema and indexes
scripts/                Static deployment and validation helpers
tests/                  Browser and API verification
docs/                   Deployment, content, licensing, artwork
```

## Configuration

Edit `assets/js/config.js`: site name, canonical site URL, optional media base URL, comments API base, max comment length, and contact email. The static brand, shared headers, and page titles should also be updated when rebranding. `SITE_URL` passed to the copy script fills the deployed canonical configuration, robots sitemap reference, and sitemap URLs. The default comments API is same-origin; cross-origin deployments need explicit Worker CORS and origin allowlisting changes, not a wildcard.

Set `contactEmail` to a real monitored mailbox before launch. Until then the About page explicitly says this is an undeployed demonstration. Production media must have verified licences and a functioning correction/takedown contact.

## Deployment & content management

Follow [the full Cloudflare/GitHub guide](docs/deployment.md), [exact catalogue fields and examples](docs/adding-content.md), and [the licensing checklist](docs/licensing.md). The public build is `python3 scripts/build.py`, output directory `public`. D1 and R2 are separate services; the comments Function never proxies media.

## Moderation

No insecure admin page is included. Use authenticated Cloudflare Dashboard → D1 → your database → Console, or your authenticated Wrangler CLI. Review the content before approval:

```sql
SELECT id, content_id, username, body, created_at FROM comments
WHERE approved = 0 ORDER BY created_at DESC;
SELECT id, username, body, report_count FROM comments
WHERE reported = 1 ORDER BY report_count DESC;
UPDATE comments SET approved = 1 WHERE id = 'reviewed-comment-id';
UPDATE comments SET approved = 0 WHERE id = 'comment-to-hide';
DELETE FROM comments WHERE id = 'spam-comment-id';
UPDATE comments SET reported = 0, report_count = 0 WHERE id = 'reviewed-report-id';
DELETE FROM reports WHERE comment_id = 'reviewed-report-id';
```

Deleting a parent cascades to replies. Hiding a parent does not automatically hide approved replies; moderate the thread explicitly if needed. There is one level of replies. Names are unverified, all new comments are pending, and the API returns at most the first 200 approved comments for a title. For busier communities add pagination and authenticated moderation with Cloudflare Access. Network identifiers are salted per day; raw IPs are never persisted in D1. Expired rate limits and reports older than seven days are pruned during writes. Add scheduled maintenance if predictable deletion timing is required. Provider access logs have independent retention.

## Testing

`python3 scripts/validate.py` checks the catalogue and referenced local assets. `node tests/filters.mjs` checks combined filtering and sorting. `node tests/content-model.mjs` checks releases and collection ordering. `python3 tests/build.py` checks generated-data overwrite protection. Browser and local D1 test instructions and results are recorded in `docs/testing.md`.

## Troubleshooting

- Blank shelves: serve over HTTP, inspect `/data/movies.json`, and check the browser console for malformed JSON.
- Discussion unavailable: check the `DB` binding, applied migrations, and `RATE_LIMIT_SALT`; redeploy after changing bindings.
- Comments disappear: they await moderation. Approval is intentional, not a failed submission.
- Audio pauses between pages: press play in the restored mini-player; cross-document autoplay is intentionally avoided.
- Media will not seek: inspect CDN support for `Range`, `206`, `Content-Length`, and the file's codec. MP4 should place its metadata before the media data (`faststart`).
- Cross-origin text/subtitles fail: allow only your site origin in the media bucket's CORS configuration.
- Native download opens instead: browsers ignore the download attribute for cross-origin URLs. Configure object `Content-Disposition: attachment` on a separate download object or let visitors use browser Save.
- PDF not displayed: native PDF support differs on mobile; offer the existing download link.

## Real limitations

Static catalogue changes require deployment. Loading all four JSON files is appropriate for this small library; add a search index/pagination for a large archive. No star ratings, popularity, view counts, fake discussions, or cloud-synced favourites are implied. Anonymous moderation is manual and IP-based throttling is not complete bot protection. EPUB reading is not implemented; add an EPUB download format only if a real licensed file exists. Browser codec and PDF support vary. Strictly sandboxed games cannot access cookies/storage or open popups; independently evaluate a game's capabilities before changing its sandbox. Cross-document audio cannot play continuously. R2 usage and custom domains may have costs; consult current provider terms. Deployment requires your Cloudflare/GitHub accounts and has not been performed by this repository.
