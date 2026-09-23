# Current verification

The catalogue change was tested in Chromium against the actual operator-added single and isolated in-memory fixtures. No fixture movies, albums, or books were added to the live catalogue.

## Results

- The current New West entry renders despite optional missing metadata. Both track `streamUrl` and legacy `url` are supported.
- Actual R2 MP3 playback succeeded; the player reported 3:40. The URL returned HTTP 200, `audio/mpeg`, and `Accept-Ranges: bytes`. This checks delivery, not ownership or redistribution permission.
- Singles and albums have distinct badges, filters, headings, and playback labels. Music does not render a video player or a Watch button.
- Missing source/licence details show honest text and hide download links. No licence was assigned to the song.
- Movies and books have empty shelves after demo removal. Signal Garden is retained and reaches its playable round.
- Browser fixtures verified ordered trilogies, overlapping franchises, series season/episode order, book reading order, standalone filters, direct collection query links, reload restoration, and invalid collection states.
- Home layout has no horizontal document overflow at 320, 390, 768, and 1440 CSS pixels.
- No JavaScript page errors occurred in the browser suite.
- Pure model tests cover absent genres, top-level single streams, album tracks, URL compatibility, group membership, filtering/search, and ordering.
- Build regression tests verify that modified generated catalogue data cannot be silently overwritten, and removed media do not survive in `public/` after a successful build.
- Source data validation passed: two live catalogue titles and no collection definitions yet. It reports the existing single's missing source/licence fields as an actionable note.

## Reproduce

```sh
python3 scripts/validate.py
node tests/filters.mjs
node tests/content-model.mjs
python3 tests/build.py
python3 scripts/serve.py --port 8091
```

With a development-only Playwright installation available:

```sh
TEST_URL=http://localhost:8091 NODE_PATH=/tmp/commonroom-tools/node_modules node tests/browser.cjs
```

To include a real network playback check of the current R2 song:

```sh
TEST_URL=http://localhost:8091 TEST_REMOTE_AUDIO=1 NODE_PATH=/tmp/commonroom-tools/node_modules node tests/browser.cjs
```

The browser suite tests the current live single and playable game, then intercepts catalogue requests with isolated collection fixtures. The public source files are never modified by the browser fixtures. `CHROME_PATH` can override `/usr/bin/chromium`. Use the browser sandbox on a normal machine; `--no-sandbox` is for this test container.

The original local D1 integration tests remain available in `tests/api.mjs`, updated to use the retained game rather than deleted demo IDs. They were not rerun for this frontend/schema change; API implementation and migrations were unchanged. They require a disposable local Wrangler/D1 instance and the `WRANGLER_PATH` environment variable.

No production deployment, new media upload, full playback of every possible codec, or independent Firefox/Safari/Edge testing was performed. Previous Lighthouse scores applied to the original demo homepage and are not claimed for this updated catalogue.
