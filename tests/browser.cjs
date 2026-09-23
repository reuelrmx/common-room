/* Run with NODE_PATH pointing to a development-only Playwright installation. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const base = process.env.TEST_URL || "http://localhost:8087";
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const go = async (path) => {
    await page.goto(base + path);
    await page.waitForFunction(() => !document.querySelector(".initial-state"));
  };
  await go("/index.html");
  assert.equal(await page.locator(".main-feature").count(), 1);
  for (const width of [320, 390, 768, 1280, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `home overflow at ${width}`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".menu-toggle").click();
  assert.equal(await page.locator("#navigation").isVisible(), true);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#navigation").isVisible(), false);
  await page.setViewportSize({ width: 1280, height: 900 });
  await go("/movies.html?genre=Drama&sort=title");
  assert.equal(await page.locator("#results .card").count(), 3);
  await page.reload();
  await page.waitForSelector("#results");
  assert.equal(
    await page.locator('select[name="genre"]').inputValue(),
    "Drama",
  );
  await page.locator('select[name="available"]').selectOption("1");
  assert.equal(await page.locator("#results .card").count(), 0);
  await page.locator('button[type="reset"]').click();
  await page.waitForFunction(
    () => document.querySelectorAll("#results .card").length === 6,
  );
  await page.locator("#view-toggle").click();
  assert.equal(await page.locator("#results.list").count(), 1);
  await go("/search.html?q=ambient");
  assert.equal(await page.locator("#results .card").count(), 2);
  await page.locator("#results [data-save]").first().click();
  await go("/library.html");
  assert.equal(await page.locator("#results .card").count(), 1);
  await page.locator("#results [data-save]").click();
  assert.equal(await page.locator("#results .card").count(), 0);
  await go("/index.html");
  await page.locator(".random-header").click();
  await page.waitForURL(/id=/);
  await page.waitForSelector(".detail-hero");
  assert.equal(await page.locator(".detail-hero").count(), 1);
  for (const path of [
    "/movies.html",
    "/games.html",
    "/books.html",
    "/music.html",
    "/recently-added.html",
    "/about.html",
    "/404.html",
    "/movie.html?id=bad-id",
  ]) {
    await go(path);
    assert.equal(await page.locator("h1").count(), 1, path);
  }
  await go("/movie.html?id=the-quiet-earth");
  await page.waitForFunction(
    () => document.querySelector("video").readyState >= 1,
  );
  assert.equal(await page.locator("track").count(), 1);
  await page.locator("video").evaluate(async (video) => {
    await video.play();
    video.currentTime = 4;
    video.pause();
  });
  assert.equal(
    await page.locator("video").evaluate((video) => video.currentTime >= 4),
    true,
  );
  await page.locator("video").evaluate((video) => {
    video.textTracks[0].mode = "showing";
  });
  await page.waitForFunction(
    () => document.querySelector("track").readyState === 2,
  );
  await page.locator("video").click();
  await page.locator("video").evaluate((video) => video.requestFullscreen());
  assert.equal(await page.evaluate(() => !!document.fullscreenElement), true);
  await page.evaluate(() => document.exitFullscreen());
  await go("/album.html?id=still-rooms");
  await page.locator("#play-album").click();
  await page.waitForSelector("#audio-dock.playing");
  await page.locator('[data-audio="next"]').click();
  assert.equal(
    await page.locator(".audio-track strong").textContent(),
    "Before the Rain",
  );
  await page.locator('[data-audio="prev"]').click();
  await page.locator(".audio-volume").fill("0.3");
  await page.locator(".audio-progress input").fill("5");
  await page.locator('[data-audio="play"]').click();
  assert.equal(await page.locator("#audio-dock.playing").count(), 0);
  await page.waitForTimeout(100);
  await go("/books.html");
  assert.equal(await page.locator("#audio-dock").isVisible(), true);
  assert.equal(await page.locator("#audio-dock.playing").count(), 0);
  await go("/book.html?id=field-notes");
  await page.locator("#read-book").click();
  await page.waitForFunction(() =>
    document.querySelector(".reader-text").textContent.includes("THE WINDOW"),
  );
  await page.locator('[data-reader="larger"]').click();
  await page.locator('[data-reader="theme"]').click();
  await page.locator('[data-reader="width"]').click();
  assert.equal(await page.locator(".reader.dark").count(), 1);
  await page.locator(".reader-text").evaluate((el) => (el.scrollTop = 350));
  await page.waitForTimeout(100);
  await page.reload();
  await page.waitForSelector("#read-book");
  await page.locator("#read-book").click();
  await page.waitForFunction(
    () => document.querySelector(".reader-text").scrollTop > 300,
  );
  await page.getByRole("button", { name: "Read PDF", exact: true }).click();
  assert.equal(await page.locator("#pdf-reader iframe").count(), 1);
  await go("/game.html?id=signal-garden");
  await page.locator("#play-game").click();
  const frame = page.frameLocator("#game-panel iframe");
  assert.equal(
    await page.locator("#game-panel iframe").getAttribute("sandbox"),
    "allow-scripts",
  );
  await frame.locator("#start").click();
  await page.waitForTimeout(1600);
  assert.match(await frame.locator("#status").textContent(), /Your turn/);
  for (const path of [
    "/movie.html?id=the-quiet-earth",
    "/game.html?id=signal-garden",
    "/book.html?id=field-notes",
    "/album.html?id=still-rooms",
  ]) {
    await go(path);
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
        `${path} overflow at ${width}`,
      );
    }
  }
  // Hostile discussion data must remain literal text, with no injected DOM.
  await page.route("**/api/comments?*", (route) =>
    route.fulfill({
      json: {
        ok: true,
        data: [
          {
            id: "123",
            username: "<img src=x onerror=alert(1)>",
            body: "<script>window.injected=true</script>",
            created_at: "2026-09-23T00:00:00Z",
            parent_id: null,
          },
        ],
      },
    }),
  );
  await go("/movie.html?id=the-quiet-earth");
  await page.locator("#comments").scrollIntoViewIfNeeded();
  await page.waitForSelector(".comment");
  assert.equal(await page.locator(".comment img,.comment script").count(), 0);
  assert.equal(
    await page.locator(".comment p").textContent(),
    "<script>window.injected=true</script>",
  );
  await page.getByRole("button", { name: "Reply", exact: true }).click();
  assert.equal(await page.locator(".reply-status").isVisible(), true);
  await page.locator(".cancel-reply").click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".card.movies .art")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  assert.deepEqual(errors, []);
  console.log(
    "Browser checks passed: routes, mobile navigation, filters, search, saved items, random, video/subtitles/fullscreen, audio controls/restoration, reader/PDF, sandboxed game, injection safety, and responsive detail pages.",
  );
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
