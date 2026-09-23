const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.TEST_URL || "http://localhost:8091";
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 1280, height: 900 },
      }),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const go = async (path) => {
      await page.goto(base + path);
      await page.waitForFunction(
        () => !document.querySelector(".initial-state"),
      );
    };
    await go("/music.html");
    assert.equal(await page.locator("#results .card").count(), 1);
    assert.match(await page.locator("#results").innerText(), /single/i);
    await page.locator('select[name="type"]').selectOption("album");
    assert.equal(await page.locator("#results .card").count(), 0);
    await page.locator('select[name="type"]').selectOption("single");
    await page.reload();
    await page.waitForSelector("#results .card");
    assert.equal(
      await page.locator('select[name="type"]').inputValue(),
      "single",
    );
    await go("/album.html?id=New-West-Those-Eyes");
    assert.equal(await page.locator("video").count(), 0);
    assert.equal(
      await page.locator("#play-album").innerText(),
      "▷ Play single",
    );
    assert.equal(await page.locator("a[download]").count(), 0);
    if (process.env.TEST_REMOTE_AUDIO === "1") {
      await page.locator("#play-album").click();
      await page.waitForSelector("#audio-dock.playing", { timeout: 30000 });
      await page.waitForFunction(
        () => document.querySelector(".total").textContent !== "0:00",
      );
      console.log(
        "Actual R2 single plays:",
        await page.locator(".total").innerText(),
      );
      await page.locator('[data-audio="close"]').click();
    }
    for (const category of ["movies", "books"]) {
      await go(`/${category}.html`);
      assert.equal(await page.locator("#results .card").count(), 0);
      assert.match(await page.locator("#results").innerText(), /added yet/);
    }
    await go("/games.html");
    assert.equal(await page.locator("#results .card").count(), 1);
    await go("/game.html?id=signal-garden");
    await page.locator("#play-game").click();
    await page.frameLocator("#game-panel iframe").locator("#start").click();
    await page.waitForTimeout(1600);
    assert.match(
      await page
        .frameLocator("#game-panel iframe")
        .locator("#status")
        .innerText(),
      /Your turn/,
    );
    await go("/");
    assert.equal(
      await page.locator(".main-feature h2").innerText(),
      "New West - Those Eyes",
    );
    assert.equal(
      await page.getByRole("heading", { name: "Singles", exact: true }).count(),
      1,
    );
    assert.equal(
      await page.getByRole("heading", { name: "Albums", exact: true }).count(),
      1,
    );
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    }
    // Collection test fixtures are intercepted in memory, never added to the live catalogue.
    const make = (id, category, kind) => ({
      id,
      title: id,
      kind,
      category,
      cover: "/assets/images/fallback.svg",
      genres: [],
      demo: false,
      available: false,
      dateAdded: "2026-09-23",
    });
    const fixtures = {
      movies: [
        make("film-1", "movies", "film"),
        make("film-2", "movies", "film"),
        make("film-3", "movies", "film"),
        make("solo-film", "movies", "standalone"),
        make("episode-1", "movies", "episode"),
        make("episode-2", "movies", "episode"),
      ],
      books: [
        make("book-1", "books", "volume"),
        make("book-2", "books", "volume"),
        make("solo-book", "books", "standalone"),
      ],
      music: [
        {
          ...make("test-album", "music"),
          releaseType: "album",
          artist: "Test artist",
          tracks: [
            { title: "First song", streamUrl: "https://example.com/first.mp3" },
            {
              title: "Second song",
              streamUrl: "https://example.com/second.mp3",
            },
          ],
        },
      ],
      games: [],
      collections: [
        {
          id: "trilogy",
          title: "The Trilogy",
          category: "movies",
          type: "trilogy",
          members: [
            { id: "film-3", position: 3 },
            { id: "film-1", position: 1 },
            { id: "film-2", position: 2 },
          ],
        },
        {
          id: "franchise",
          title: "The Franchise",
          category: "movies",
          type: "franchise",
          members: [
            { id: "film-1", position: 1 },
            { id: "film-2", position: 2 },
          ],
        },
        {
          id: "show",
          title: "The Show",
          category: "movies",
          type: "series",
          members: [
            { id: "episode-2", position: 2, season: 2, episode: 1 },
            { id: "episode-1", position: 1, season: 1, episode: 1 },
          ],
        },
        {
          id: "books",
          title: "The Books",
          category: "books",
          type: "series",
          members: [
            { id: "book-2", position: 2 },
            { id: "book-1", position: 1 },
          ],
        },
      ],
      picks: [],
    };
    await page.route("**/data/*.json", (route) => {
      const name = new URL(route.request().url()).pathname
        .split("/")
        .pop()
        .replace(".json", "");
      return route.fulfill({ json: fixtures[name] || [] });
    });
    await go("/movies.html?collection=trilogy");
    assert.deepEqual(await page.locator("#results h3").allTextContents(), [
      "film-1",
      "film-2",
      "film-3",
    ]);
    assert.match(
      await page.locator("#collection-intro").innerText(),
      /The Trilogy/,
    );
    await page.reload();
    await page.waitForSelector("#results .card");
    assert.equal(
      await page.locator('select[name="sort"]').inputValue(),
      "sequence",
    );
    await page.locator('select[name="collection"]').selectOption("franchise");
    assert.equal(await page.locator("#results .card").count(), 2);
    await page.locator('select[name="collection"]').selectOption("show");
    assert.deepEqual(await page.locator("#results h3").allTextContents(), [
      "episode-1",
      "episode-2",
    ]);
    assert.match(
      await page.locator("#results").innerText(),
      /Season 2 · Episode 1/i,
    );
    await go("/movies.html?type=standalone");
    assert.deepEqual(await page.locator("#results h3").allTextContents(), [
      "solo-film",
    ]);
    await go("/movie.html?id=film-2");
    assert.equal(await page.locator(".collection-order").count(), 2);
    assert.deepEqual(
      await page
        .locator(".collection-order")
        .first()
        .locator("li a")
        .allTextContents(),
      ["film-1", "film-2", "film-3"],
    );
    await go("/books.html?collection=books");
    assert.deepEqual(await page.locator("#results h3").allTextContents(), [
      "book-1",
      "book-2",
    ]);
    await go("/book.html?id=book-1");
    assert.match(
      await page.locator(".collection-order").innerText(),
      /Reading order/,
    );
    await go("/music.html?type=album");
    assert.equal(await page.locator("#results .card").count(), 1);
    await go("/album.html?id=test-album");
    assert.equal(await page.locator("#play-album").innerText(), "▷ Play album");
    assert.equal(await page.locator("[data-track]").count(), 2);
    await go("/movies.html?collection=missing");
    assert.equal(await page.locator("#results .card").count(), 0);
    assert.match(
      await page.locator("#collection-intro").innerText(),
      /not found/,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Browser tests passed: live single, empty shelves, playable game, responsive home, album/single filters, ordered trilogy/franchise/series, seasons, book reading order, reload persistence, and missing collections.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
