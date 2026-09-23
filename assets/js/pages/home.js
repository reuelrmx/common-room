import { card, detailUrl } from "../catalogue.js";
import { escapeHTML as e } from "../utils.js";
export function feature(item, compact = false) {
  if (!item) return "";
  return `<article class="main-feature ${compact ? "catalogue-feature" : ""}"><img src="${e(item.backdrop)}" srcset="${e(item.backdropSmall || item.backdrop)} 640w, ${e(item.backdrop)} 1280w" sizes="(max-width: 760px) 100vw, 65vw" alt="" fetchpriority="high" width="1600" height="900"><div class="feature-copy"><span class="eyebrow">${compact ? "IN THE SPOTLIGHT" : "TONIGHT’S PICK"} <span aria-hidden="true">·</span> ORIGINAL DEMO</span><h2>${e(item.title)}</h2><div class="meta">${e(item.year)} <span aria-hidden="true">·</span> ${e(item.genres.join(" / "))} <span aria-hidden="true">·</span> ${e(item.duration || "Made to explore")}</div><p>${e(item.description)}</p><div class="actions"><a class="button primary" href="${detailUrl(item)}">${item.category === "movies" ? "▷ Watch the short" : item.category === "games" ? "Play in browser" : item.category === "books" ? "Open the book" : "Listen to the album"}</a><a class="button" href="${detailUrl(item)}">More details <span aria-hidden="true">↗</span></a></div></div></article>`;
}
function section(title, subtitle, href, items, style = "poster-grid") {
  return `<section class="shelf-section"><div class="section-heading"><h2>${title}${subtitle ? `<span>${subtitle}</span>` : ""}</h2><a href="${href}">Browse all <span aria-hidden="true">→</span></a></div><div class="${style}">${items.map(card).join("")}</div></section>`;
}
export async function renderHome(root, items) {
  const get = (id) => items.find((x) => x.id === id);
  const movies = items.filter((x) => x.category === "movies");
  const game =
      get("signal-garden") || items.find((x) => x.category === "games"),
    album = get("still-rooms") || items.find((x) => x.category === "music");
  if (!movies.length || !game || !album) {
    root.innerHTML =
      '<div class="page-intro"><h1>Your next good find.</h1><p>Explore the growing collection.</p></div>' +
      section(
        "On the shelves",
        "",
        "/recently-added.html",
        items,
        "mixed-grid",
      );
    return;
  }
  root.innerHTML = `<div class="home-intro"><div><h1>Your next good find.</h1><p>Films to get lost in. Games to stay up for. Books and music to keep.</p></div><span class="edition">THE INDEPENDENT COLLECTION <span aria-hidden="true">/</span> VOL. 01</span></div><div class="feature-heading">Featured this week</div><div class="feature-grid">${feature(movies[0])}<div class="side-features"><article class="side-feature games"><div><p class="eyebrow">PRESS PLAY</p><h3>${e(game.title)}</h3><p>A little pattern. One more round.</p><a class="text-link" href="${detailUrl(game)}">Find your rhythm <span aria-hidden="true">→</span></a></div><img src="${e(game.cover)}" alt="Signal Garden artwork" width="230" height="190"></article><article class="side-feature music"><div><p class="eyebrow">ON REPEAT</p><h3>${e(album.title)}</h3><p>A soundtrack for slowing down.</p><a class="text-link" href="${detailUrl(album)}">Give it a listen <span aria-hidden="true">→</span></a></div><img src="${e(album.cover)}" alt="Still Rooms artwork" width="230" height="190"></article></div></div><div class="principle-strip"><div><span>Free to explore</span><span>Clear sources & licences</span><span>No account needed</span></div><a href="/about.html#demo">Meet the demo collection <span aria-hidden="true">↗</span></a></div>${section("Fresh on the shelves", "A bit of everything", "/recently-added.html", [movies[1], game, items.find((x) => x.category === "books"), album, movies[2], items.filter((x) => x.category === "books")[1]].filter(Boolean), "mixed-grid")}${section("Movies worth a quiet evening", "", "/movies.html", movies)}<div class="home-lower">${section("Something to play", "", "/games.html", items.filter((x) => x.category === "games").slice(0, 2), "games-grid")}${section("From the library", "", "/books.html", items.filter((x) => x.category === "books").slice(0, 2), "books-row")}</div><div class="editorial-strip"><div><p class="eyebrow">TAKE THE SCENIC ROUTE</p><h2>A good find doesn’t always need a plan.</h2><p>Let chance pick something from the collection.</p></div><button class="button primary" data-random>⤨ Surprise me</button></div>${section(
    "Now listening",
    "Turn it up. Or wind it down.",
    "/music.html",
    items.filter((x) => x.category === "music"),
    "catalogue-grid music",
  )}<section class="shelf-section"><div class="section-heading"><h2>Notes from the curator</h2><a href="/about.html">About this collection →</a></div><div id="curator-picks" class="curator-grid"></div></section><section class="shelf-section"><div class="section-heading"><h2>Find your corner</h2></div><div class="category-links"><a href="/movies.html">Movies <span>↗</span></a><a href="/games.html">Games <span>↗</span></a><a href="/music.html">Music <span>↗</span></a><a href="/books.html">Books <span>↗</span></a></div></section><section class="shelf-section"><div class="section-heading"><h2>Around the common room</h2></div><div class="discussion-empty"><p>Every title has room for a conversation. Leave a thought, ask a question, pass on a good find.</p><a class="text-link" href="${detailUrl(movies[0])}#comments">Join a discussion →</a></div></section>`;
  try {
    const response = await fetch("/data/picks.json");
    if (!response.ok) throw Error();
    const picks = await response.json();
    root.querySelector("#curator-picks").innerHTML = picks
      .filter((p) => get(p.id))
      .map((p) => {
        const item = get(p.id);
        return `<a class="curator-pick" href="${detailUrl(item)}"><img src="${e(item.cover)}" alt="" loading="lazy" width="62" height="90"><div><h3>${e(item.title)}</h3><p>“${e(p.note)}”</p></div></a>`;
      })
      .join("");
  } catch {
    root.querySelector("#curator-picks").textContent =
      "Curator notes are unavailable just now.";
  }
}
