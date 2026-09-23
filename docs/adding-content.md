# Adding a title

1. Verify media and artwork rights; retain source evidence (see licensing.md).
2. Upload large files to your R2 bucket/CDN. Generate small WebP thumbnails and backdrop sizes.
3. Add one object to the appropriate `data/*.json` array. IDs must be unique across all four files and stable after publication.
4. Run `python3 scripts/validate.py`, test the item locally, then deploy.

Every object needs `id`, `slug`, `title`, `description`, `year`, `genres` (array), `cover`, `dateAdded` (ISO date), `license`, `licenseUrl`, `sourceName`, `sourceUrl`, `attribution`, `demo` and `available`. `featured` selects category editorial placement. Use empty attribution only when none is required. Do not use `available: true` without an actual stream, game, track, or readable format. Replace fictional sample records rather than relabelling their nonexistent media as licensed.

`backdrop` is optional, but recommended for category features and details. `language`, `format`, `fileSize`, and `sha256` are optional, honest metadata. URLs can be same-origin paths or explicit HTTPS URLs; JavaScript/data URLs are rejected. An optional `mediaBaseUrl` maps `/media/...` paths onto another origin. Leave it empty when using explicit URLs or bundled demos.

## Movie

```json
{
  "id": "your-verified-short", "slug": "your-verified-short",
  "title": "Your verified short", "description": "An accurate description.",
  "year": 2026, "genres": ["Documentary"], "dateAdded": "2026-09-23",
  "cover": "/assets/images/your-short.webp", "backdrop": "/assets/images/your-short-wide.webp",
  "featured": false, "demo": false, "available": true,
  "director": "Actual director", "duration": "8 min", "country": "Actual country",
  "language": "English", "cast": [], "resolution": "1920 × 1080",
  "license": "CC BY", "licenseUrl": "https://creativecommons.org/licenses/by/4.0/",
  "sourceName": "Actual publisher", "sourceUrl": "https://your-publisher.example/short",
  "attribution": "Exact creator credit and required attribution, including modifications.",
  "streamUrl": "https://your-media.example/movies/your-verified-short/movie.mp4",
  "downloadUrl": "https://your-media.example/movies/your-verified-short/movie.mp4",
  "format": "MP4", "fileSize": "Actual measured size",
  "subtitles": [{"src": "https://your-media.example/movies/your-verified-short/subtitles-en.vtt", "language": "en", "label": "English"}]
}
```

The example domains are schema examples, not supplied content. Omit subtitles/trailer/cast if unavailable. `trailerUrl` links to the verified trailer page. `streamUrl` may point to MP4 or a browser-supported WebM file; test the actual codecs. A SHA-256 must come from `sha256sum actual-file`, never invented.

## Game fields

Use the common fields, plus:

```json
{
  "developer": "Actual developer", "platforms": ["Windows", "Linux"],
  "requirements": "Actual minimum hardware and software requirements.",
  "screenshots": ["/assets/images/your-game-screen.webp"],
  "downloadUrl": "https://your-media.example/games/your-game/downloads/game.zip",
  "format": "ZIP · Linux x64", "fileSize": "Actual measured size",
  "sha256": "Output of sha256sum for that exact archive"
}
```

For a real HTML browser build, add `browserUrl` and `Browser` to `platforms`. The iframe grants **only** `allow-scripts`; it has an opaque origin. Builds needing same-origin storage or cross-origin requests require a reviewed, isolated hosting strategy. Native installers never get a browser-play button. Verify redistribution of bundled game assets independently from source-code licences.

## Book fields

```json
{
  "author": "Actual author", "language": "English", "pageCount": 180,
  "formats": [
    {"label": "TXT", "url": "https://your-media.example/books/your-book/book.txt", "size": "Actual size"},
    {"label": "PDF", "url": "https://your-media.example/books/your-book/book.pdf", "size": "Actual size"},
    {"label": "EPUB", "url": "https://your-media.example/books/your-book/book.epub", "size": "Actual size"}
  ]
}
```

Only list files you actually have permission to distribute. TXT must be UTF-8 and is inserted as text, never HTML. Reading mode prefers TXT, then PDF. EPUB is download-only. Page count is optional, as editions differ.

## Album fields

```json
{
  "artist": "Actual artist", "format": "MP3", "fileSize": "Actual total size",
  "tracks": [
    {"title": "Actual track", "url": "https://your-media.example/music/artist/album/01-track.mp3", "duration": "3:24"}
  ],
  "downloadUrl": "https://your-media.example/music/artist/album/album.zip"
}
```

Ensure album-wide licence/attribution applies to every track. If licences differ, create distinct records or extend the track licence display before publishing. Native browser Audio handles supported codecs. Never fabricate track durations.

## Recommended storage

```text
media/
  movies/title-slug/{poster.webp,backdrop.webp,movie.mp4,subtitles-en.vtt}
  games/title-slug/cover.webp
  games/title-slug/screenshots/
  games/title-slug/downloads/
  books/title-slug/{cover.webp,book.pdf,book.epub,book.txt}
  music/artist-slug/album-slug/{cover.webp,01-track.mp3,02-track.mp3}
```

Editorial notes live in `data/picks.json` and refer to existing IDs. Homepage selections are intentionally curated in `assets/js/pages/home.js`; change those editorial selections when replacing the demo collection. Category shelves and search populate automatically.
