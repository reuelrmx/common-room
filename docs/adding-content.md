# Add music, movies, and books

## Edit the source, then build

**Edit `data/*.json`. Do not edit `public/data/*.json`.** `public/` is the generated deployment folder. It is replaced by the build; the server on that folder will not see source changes until you rebuild.

```sh
python3 scripts/validate.py
python3 scripts/build.py
```

Reload the website afterward. If you use `python3 scripts/serve.py --port 8089`, it serves source files directly, so JSON changes need only a refresh. Wrangler serves the generated `public/` folder and needs the build. Catalogue data is fetched on each page load; filters run locally afterward.

The build remembers the last generated data. If you accidentally edit a generated JSON file, the next build stops instead of overwriting it. Move your intended changes into the matching `data/` file, make the two copies match, and rebuild.

All catalogue files are **JSON arrays**. Add an object inside the existing array; do not create a second array or use trailing commas. IDs must be permanent and globally unique. The existing song keeps its original ID, so its saved links still work.

## Choose the right structure

| Content | File | Required distinction |
| --- | --- | --- |
| One standalone song | `data/music.json` | `releaseType: "single"`, one `streamUrl` or one track |
| Album | `data/music.json` | `releaseType: "album"`, ordered `tracks` array |
| Standalone movie | `data/movies.json` | `kind: "standalone"` |
| Movie in a trilogy/franchise/film series | `data/movies.json` | `kind: "film"`, listed in a collection |
| TV episode | `data/movies.json` | `kind: "episode"`, series membership with season and episode |
| Standalone book | `data/books.json` | `kind: "standalone"` |
| Book in a trilogy/franchise/series | `data/books.json` | `kind: "volume"`, listed in a collection |
| Trilogy, franchise, or series definition | `data/collections.json` | `category`, `type`, ordered `members` |

Movie and book files always contain **individual playable/readable titles**, not a group masquerading as a downloadable film/book. Group definitions live separately. One film or book can belong to both a trilogy and a broader franchise. Each gets its own directly linkable detail page, comments, and favourite. Collection links open the category with `?collection=the-group-id`; order and filters survive refreshes.

## Common fields

Required for an entry: `id`, `title`, and the category discriminator in the table. Recommended: `slug`, `description`, `year`, `genres` (an array), `cover`, `backdrop`, `dateAdded` (ISO date), `featured`, `available`, `demo: false`, and creator (`artist`, `director`, `author`, or `developer`). Omitted genres default to an empty array; omitted artwork uses the fallback. Never invent a year, duration, or creator credit to fill a field.

Before enabling downloads, supply actual `license`, `licenseUrl`, `sourceName`, and `sourceUrl`, plus `attribution` where required. URLs alone do not establish permission. Missing licence/source details are shown honestly and hide download buttons. Metadata validation cannot determine legal rights; follow licensing.md. Existing streaming URLs are preserved.

`streamUrl` means playback. `downloadUrl` means an explicitly offered downloadable file; it may differ. `format` and `fileSize` describe that file. Cross-origin download behavior also depends on the server's Content-Disposition header. All example domains and titles below are **schema examples only**, not real additions to the live catalogue.

## Single: one song

Add to `data/music.json`:

```json
{
  "id": "your-single",
  "slug": "your-single",
  "releaseType": "single",
  "title": "Your song title",
  "artist": "Actual artist",
  "description": "",
  "genres": [],
  "cover": "/assets/images/your-single.jpg",
  "dateAdded": "2026-09-23",
  "featured": true,
  "demo": false,
  "available": true,
  "format": "MP3",
  "streamUrl": "https://media.example.com/music/artist/your-single.mp3",
  "downloadUrl": "https://media.example.com/music/artist/your-single.mp3",
  "license": "",
  "licenseUrl": "",
  "sourceName": "",
  "sourceUrl": "",
  "attribution": ""
}
```

A single does **not** need a `tracks` array. Alternatively, keep one track inside `tracks` (as your existing Those Eyes record does). Set its `streamUrl`, optional `downloadUrl`, `title`, and optional `duration`. Legacy track `url` is supported, but use `streamUrl` for new entries. Do not duplicate a single as an album just to make playback work.

## Album: a release with an ordered track list

Add one object to `data/music.json`:

```json
{
  "id": "your-album",
  "releaseType": "album",
  "title": "Your album title",
  "artist": "Actual artist",
  "genres": [],
  "cover": "/assets/images/your-album.webp",
  "dateAdded": "2026-09-23",
  "demo": false,
  "available": true,
  "format": "MP3",
  "tracks": [
    {"title": "First track", "streamUrl": "https://media.example.com/music/album/01.mp3", "downloadUrl": "https://media.example.com/music/album/01.mp3"},
    {"title": "Second track", "streamUrl": "https://media.example.com/music/album/02.mp3", "downloadUrl": "https://media.example.com/music/album/02.mp3"}
  ],
  "license": "",
  "licenseUrl": "",
  "sourceName": "",
  "sourceUrl": "",
  "attribution": ""
}
```

Array order is playback order. `Play album` starts the first track; next/previous moves through the array. Track `artist` and `format` override the album values. Durations are optional; the player reads the file duration. An album archive is optional: add a top-level `downloadUrl`, `format: "ZIP"`, and measured `fileSize` only when a real archive exists, and set each track's format to `MP3`. Do not point an album's download button at just its first song. Licences must apply to every track; split releases or extend the schema before mixing licences.

## Standalone movie

Add to `data/movies.json`:

```json
{
  "id": "your-film",
  "kind": "standalone",
  "title": "Your film title",
  "director": "Actual director",
  "description": "An accurate description.",
  "genres": ["Documentary"],
  "cover": "/assets/images/your-film.webp",
  "dateAdded": "2026-09-23",
  "demo": false,
  "available": true,
  "streamUrl": "https://media.example.com/movies/your-film/movie.mp4",
  "downloadUrl": "https://media.example.com/movies/your-film/movie.mp4",
  "format": "MP4",
  "license": "",
  "licenseUrl": "",
  "sourceName": "",
  "sourceUrl": "",
  "attribution": ""
}
```

Optional movie fields: `year`, `duration`, `country`, `language`, `resolution`, `fileSize`, `cast`, `trailerUrl`, `sha256`, and `subtitles: [{"src":"/media/subtitles-en.vtt","language":"en","label":"English"}]`. Use only measured/verified metadata. `streamUrl` can also be a supported WebM file. A standalone movie needs no collection.

## Movie trilogy or franchise

Add each film separately to `data/movies.json` using `kind: "film"`, its own media URLs, and the common movie fields. Then add a collection to `data/collections.json`:

```json
{
  "id": "your-trilogy",
  "category": "movies",
  "type": "trilogy",
  "title": "Your trilogy title",
  "description": "Viewing order for this trilogy.",
  "members": [
    {"id": "film-one", "position": 1},
    {"id": "film-two", "position": 2},
    {"id": "film-three", "position": 3}
  ]
}
```

Every member ID must exist in `movies.json`. A trilogy allows up to three listed parts (you may add available parts incrementally). Use `type: "franchise"` for a broader group with any number of titles. Use `type: "series"` for an ordered film series. A film may appear in more than one group; define its position independently in each. Positions are positive integers and cannot repeat within a group.

## Television series

Create one movie record per episode with `kind: "episode"` and its own stream and licence fields. Define a series in `collections.json`:

```json
{
  "id": "your-tv-series",
  "category": "movies",
  "type": "series",
  "title": "Your series title",
  "members": [
    {"id": "episode-one", "position": 1, "season": 1, "episode": 1},
    {"id": "episode-two", "position": 2, "season": 1, "episode": 2},
    {"id": "episode-three", "position": 3, "season": 2, "episode": 1}
  ]
}
```

Episodes display season/episode labels and sort by season, then episode. Season/episode numbers must be positive and unique together. A collection itself has no fake Watch button; visitors choose an actual episode. A TV episode belongs to a series, not directly to a movie trilogy.

## Standalone book

Add to `data/books.json`:

```json
{
  "id": "your-book",
  "kind": "standalone",
  "title": "Your book title",
  "author": "Actual author",
  "genres": [],
  "language": "English",
  "cover": "/assets/images/your-book.webp",
  "dateAdded": "2026-09-23",
  "demo": false,
  "available": true,
  "formats": [
    {"label": "TXT", "url": "https://media.example.com/books/your-book/book.txt", "size": "Actual size"},
    {"label": "PDF", "url": "https://media.example.com/books/your-book/book.pdf", "size": "Actual size"},
    {"label": "EPUB", "url": "https://media.example.com/books/your-book/book.epub", "size": "Actual size"}
  ],
  "license": "",
  "licenseUrl": "",
  "sourceName": "",
  "sourceUrl": "",
  "attribution": ""
}
```

List only existing files. TXT is the on-site text reader, PDF uses browser-native display, EPUB is download-only. `pageCount` and publication `year` are optional. The licence must cover the actual edition and translation.

## Book trilogy, franchise, or series

Use `kind: "volume"` for each book, with its own formats. Add to `collections.json`:

```json
{
  "id": "your-book-series",
  "category": "books",
  "type": "series",
  "title": "Your book series title",
  "description": "Recommended reading order.",
  "members": [
    {"id": "book-one", "position": 1},
    {"id": "book-two", "position": 2}
  ]
}
```

Use `type: "trilogy"` for up to three parts, `series` for a continuing sequence, or `franchise` for a broader shared universe. A book can appear in both a subseries and a franchise. Set the order you intend visitors to read; the interface does not infer publication or chronological order.

## Games and files

Signal Garden is the only retained original demo. Add other games to `data/games.json` with common fields plus `developer`, `platforms`, `requirements`, `screenshots`, and optional `browserUrl` or `downloadUrl`. Native games are never described as browser-playable. Game frames grant only `allow-scripts`.

Upload production media to object storage; keep compact artwork under `assets/images/` if desired. Suggested object paths: `movies/title/movie.mp4`, `music/artist/album/01.mp3`, `books/title/book.epub`, `games/title/downloads/game.zip`. Check the actual URL, MIME type, seeking support, and CORS for TXT/subtitles. Never derive permissions from an R2 URL.
