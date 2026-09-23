import { card, detailUrl } from "../catalogue.js";
import { typeLabel } from "../content-model.js";
import { escapeHTML as e } from "../utils.js";
export function feature(item, compact = false) {
  if (!item) return "";
  return `<article class="main-feature ${compact ? "catalogue-feature" : ""}"><img src="${e(item.backdrop)}" srcset="${e(item.backdropSmall)} 640w, ${e(item.backdrop)} 1280w" sizes="(max-width: 760px) 100vw, 65vw" alt="" fetchpriority="high" width="1600" height="900"><div class="feature-copy"><span class="eyebrow">IN THE SPOTLIGHT · ${e(typeLabel(item))}${item.demo ? " · ORIGINAL DEMO" : ""}</span><h2>${e(item.title)}</h2><div class="meta">${e([item.artist || item.author || item.developer, item.year, ...item.genres].filter(Boolean).join(" · "))}</div><p>${e(item.description)}</p><a class="button primary" href="${detailUrl(item)}">${item.category === "music" ? "Listen & details" : item.category === "games" ? "Play & details" : "View details"} ↗</a></div></article>`;
}
function shelf(title, category, items, style) {
  return `<section class="shelf-section"><div class="section-heading"><h2>${e(title)}</h2><a href="/${category}.html">Browse all →</a></div>${items.length ? `<div class="${style}">${items.map(card).join("")}</div>` : `<div class="empty"><p>No ${category === "music" ? "music releases" : category} added yet.</p></div>`}</section>`;
}
export async function renderHome(root, items) {
  const music = items.filter((item) => item.category === "music");
  const featured =
    items.find((item) => item.featured && !item.demo) ||
    items.find((item) => !item.demo) ||
    items[0];
  root.innerHTML = `<div class="home-intro"><div><h1>Your next good find.</h1><p>Films, games, books, and music. Make a little room.</p></div><span class="edition">THE INDEPENDENT COLLECTION</span></div>${feature(featured)}<div class="principle-strip"><div><span>Free to explore</span><span>Sources & licences on each title</span><span>No account needed</span></div><a href="/about.html">About the collection ↗</a></div>${shelf(
    "Singles",
    "music",
    music.filter((item) => item.releaseType === "single"),
    "catalogue-grid music",
  )}${shelf(
    "Albums",
    "music",
    music.filter((item) => item.releaseType === "album"),
    "catalogue-grid music",
  )}${shelf("Movies & series", "movies", items.filter((item) => item.category === "movies").slice(0, 6), "poster-grid")}<div class="home-lower">${shelf(
    "Something to play",
    "games",
    items.filter((item) => item.category === "games"),
    "games-grid",
  )}${shelf("From the library", "books", items.filter((item) => item.category === "books").slice(0, 4), "books-row")}</div>${items.length ? '<div class="editorial-strip"><div><h2>Leave a little room for chance.</h2><p>Pick something from the collection.</p></div><button class="button primary" data-random>Surprise me</button></div>' : ""}<section class="shelf-section"><div class="section-heading"><h2>Find your corner</h2></div><div class="category-links"><a href="/movies.html">Movies ↗</a><a href="/games.html">Games ↗</a><a href="/music.html">Music ↗</a><a href="/books.html">Books ↗</a></div></section>`;
}
