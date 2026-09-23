# GitHub → Cloudflare Pages + D1 + R2

The frontend has no bundler. The Python copy script prepares `public/`; the root `functions/` directory provides the API. Use Node.js 22+ for Wrangler. Commands run from the repository root. Never add `.dev.vars`, tokens, or passwords to Git.

## 1. Prepare and push GitHub source

Review the demo content and set a monitored `contactEmail` in `assets/js/config.js`. Install Git. Create an empty GitHub repository using the GitHub website. Then, using your actual repository URL:

```sh
git init
git add .
git commit -m "Build Common Room catalogue"
git branch -M main
git remote add origin https://github.com/YOUR-ACCOUNT/common-room.git
git push -u origin main
```

If this directory is already a repository, use its existing branch/remote rather than reinitializing. GitHub authentication is handled by your usual credential manager or SSH configuration.

## 2. Create D1 and apply migrations

Authenticate your own Cloudflare account:

```sh
npx wrangler login
npx wrangler d1 create common-room-comments
```

Copy the returned database UUID into `wrangler.toml` replacing the all-zero `database_id`. Keep the binding exactly `DB`. Then:

```sh
npx wrangler d1 migrations apply common-room-comments --remote
```

This creates comments, reports, rate limits, and indexes. Verify tables in Cloudflare Dashboard → Storage & databases → D1 → common-room-comments → Console. For isolated local testing:

```sh
cp .dev.vars.example .dev.vars
npx wrangler d1 migrations apply common-room-comments --local
python3 scripts/build.py
npx wrangler pages dev public
```

For full local media seeking, keep Wrangler running and start `python3 scripts/serve.py --port 8089 --api http://localhost:8788` in another terminal, then open http://localhost:8089. The custom local server implements HTTP range requests and forwards discussions to Wrangler. Wrangler preview itself may return full media responses instead of `206`; verify production media delivery independently.

The local `.dev.vars` example is not a production secret. Generate a fresh salt for production, for example `openssl rand -hex 32`, and place it only in Cloudflare's encrypted secret configuration.

## 3. Connect Cloudflare Pages to GitHub

In Cloudflare Dashboard, open Workers & Pages → Create application → Pages → Connect to Git. Authorize only the GitHub repository you want to deploy. Choose `main` as the production branch.

Set:

- Project name: `common-room` or your chosen available name.
- Framework preset: None.
- Build command: `python3 scripts/build.py`.
- Build output directory: `public`.
- Root directory: repository root.
- Build environment variable `SITE_URL`: your actual `https://PROJECT.pages.dev` address. Set this to the custom domain later if you add one.

The project gets a free Pages subdomain. The existing `wrangler.toml` declares `pages_build_output_dir` and the D1 binding; commit your actual D1 database ID before deploying. Use a separate D1 database for preview deployments if untrusted branches will be deployed. Do not point untrusted previews at the production comments database.

In project Settings → Variables and Secrets, add **encrypted** `RATE_LIMIT_SALT` for production (and a different preview value). Keep `DB` bound to the correct D1 database under Settings → Bindings; Wrangler configuration is the source of truth when present. Redeploy after changing bindings or secrets. Do not add the salt to public JavaScript or build output.

If choosing CLI deployment instead of Git integration:

```sh
npx wrangler pages project create common-room
npx wrangler pages secret put RATE_LIMIT_SALT --project-name common-room
SITE_URL=https://YOUR-PROJECT.pages.dev python3 scripts/build.py
npx wrangler pages deploy public --project-name common-room
```

Functions must be in the root `functions/` directory when running the deployment command. Do not upload only the static folder using a method that omits Functions.

## 4. Create and populate R2

In Cloudflare Dashboard → R2 Object Storage, activate R2 if required by your account and create a bucket such as `common-room-media`. Do not upload secrets. Upload media using the dashboard (Upload) or your preferred S3-compatible client. Preserve the hierarchy in adding-content.md. For a single object with Wrangler:

```sh
npx wrangler r2 object put common-room-media/media/movies/your-title/movie.mp4 --file ./movie.mp4 --content-type video/mp4 --remote
```

Use actual verified files and correct MIME types: `video/mp4`, `video/webm`, `audio/mpeg`, `audio/wav`, `text/vtt`, `text/plain; charset=utf-8`, `application/pdf`, `application/epub+zip`, or the appropriate archive type. Never proxy large media through the comments API.

Bucket Settings → Public access → enable an R2 development URL for **testing**, or configure a custom domain such as `media.your-domain.com` for production. Public access exposes all objects in that bucket; use a separate private bucket for private data. The `r2.dev` URL is rate-limited and intended for development. A production custom domain must be in a zone you control on Cloudflare. Without such a domain, keep the tiny local demo assets or choose another production media CDN until one is available.

Set each catalogue `streamUrl`, `downloadUrl`, format URL, track URL, and image URL to the actual public object address. Alternatively, set `mediaBaseUrl` once to the public bucket origin and retain `/media/...` paths. Do not set it while only local demo files exist unless you upload those too. Test both streaming and downloading before publishing a record.

## 5. CORS, seeking, and downloads

Native video/audio often work across origins without JavaScript fetch permissions. TXT readers and cross-origin subtitle tracks need CORS. In R2 → bucket → Settings → CORS policy, use your actual site origins (no wildcard for private media):

```json
[
  {
    "AllowedOrigins": ["https://YOUR-PROJECT.pages.dev", "https://www.your-domain.com"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range"],
    "ExposeHeaders": ["Accept-Ranges", "Content-Length", "Content-Range", "ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Replace or remove sample origins. Clear cached responses after CORS changes. Serve TXT/VTT with correct types. Use `crossorigin="anonymous"` on a video using cross-origin subtitle tracks (the application sets this for remote media). Do not add credentialed cross-origin requests to public media.

Check delivery:

```sh
curl -I https://media.your-domain.com/media/movies/your-title/movie.mp4
curl -H 'Range: bytes=0-1023' -D - -o /dev/null https://media.your-domain.com/media/movies/your-title/movie.mp4
```

The range request should return `206 Partial Content` with a correct `Content-Range`; native browser seeking should work without downloading the entire file. MP4 encoding should use `-movflags +faststart`. Confirm the audio/video codec on each target browser.

The cross-origin `download` attribute may be ignored. Use a dedicated object with `Content-Disposition: attachment; filename="your-title.mp4"` when a forced download is needed; keep the streaming object suitable for inline use. State format, size, platform, source, and licence. A checksum verifies file integrity, not safety or trustworthiness.

## 6. Caching and security

`_headers` applies CSP, MIME protection, referrer, frame, and permissions policies to static responses. The Function sets its own API headers. The included default allows HTTPS media/images/frames; narrow these directives to your own verified media origins in production. Only `allow-scripts` is granted to game frames.

Current unversioned assets have a one-hour cache, and JSON revalidates. Do not use immutable year-long caching for files you overwrite at the same URL. For versioned object keys such as `movie.v2.mp4`, set `Cache-Control: public, max-age=31536000, immutable` during upload and use new keys after changes. Connect the R2 custom domain to enable Cloudflare caching. Configure cache rules to match media paths, never `/api/*`. Comments responses are always `no-store`.

## 7. Verify production

1. Open every category, search, filter, save a title, reload, and open My Library.
2. Open a real item directly using its detail URL.
3. Submit a test comment; verify a `201` response and pending status in D1.
4. Approve that comment through the authenticated D1 Console; reload and verify it appears.
5. Post a reply, approve it, report it, and inspect `reported` and `report_count`.
6. Verify empty names, whitespace-only bodies, extra-long input, and honeypots are rejected. Five posts per ten minutes per salted network hash are allowed; the next is `429`.
7. Seek within video/audio, show subtitles, test fullscreen, and download the exact expected files.
8. Open TXT and PDF, resize reading text, reload and verify position memory.
9. Test navigation and touch controls at 320px, 390px, tablet, and desktop.
10. Inspect security/cache headers, robots, canonical URLs, and generated sitemap.

## 8. Add a custom domain later

In Pages → project → Custom domains → Set up a custom domain, follow Cloudflare's DNS verification flow. Use the Pages UI so the hostname is attached to the project, not just an unassociated DNS record. After TLS is active, update `SITE_URL`, R2 CORS origins, and any origin restrictions. Redeploy so canonical URLs and sitemap use the new hostname. Set a redirect to your preferred canonical host if both are public.

## Provider references

Instructions follow Cloudflare's official documentation: [Pages Functions setup](https://developers.cloudflare.com/pages/functions/get-started/), [Pages Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/), [D1 bindings](https://developers.cloudflare.com/pages/functions/bindings/), [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/), and [R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/). Console labels may change; binding names and configuration files in this project remain the operational reference.
