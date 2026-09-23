import { config } from "./config.js";
import {
  escapeHTML as e,
  readStore,
  saveStore,
  toast,
  safeUrl,
} from "./utils.js";
export const categories = ["movies", "games", "books", "music"];
export const singular = {
  movies: "Movie",
  games: "Game",
  books: "Book",
  music: "Album",
};
const detailPages = {
  movies: "movie",
  games: "game",
  books: "book",
  music: "album",
};
let promise;
export const loadCatalogue = () =>
  (promise ??= Promise.all(
    categories.map(async (category) => {
      const response = await fetch(`/data/${category}.json`);
      if (!response.ok)
        throw Error(
          `The ${category} shelf could not be loaded. Please try again.`,
        );
      const items = await response.json();
      if (!Array.isArray(items))
        throw Error("The catalogue format could not be read.");
      return items.map((item) => ({ ...item, category }));
    }),
  ).then((groups) => groups.flat()));
export const detailUrl = (item) =>
  `/${detailPages[item.category]}.html?id=${encodeURIComponent(item.id)}`;
export const mediaUrl = (value) => {
  if (!value) return "";
  return safeUrl(
    config.mediaBaseUrl && value.startsWith("/media/")
      ? config.mediaBaseUrl.replace(/\/$/, "") + value
      : value,
  );
};
export const savedIds = () => readStore("commonroom:saved", []);
export function toggleSaved(id) {
  const ids = savedIds();
  const saved = ids.includes(id);
  const next = saved ? ids.filter((x) => x !== id) : [...ids, id];
  if (!saveStore("commonroom:saved", next)) {
    toast("Browser storage is unavailable. This title could not be saved.");
    return saved;
  }
  document.querySelectorAll("[data-save]").forEach((btn) => {
    if (btn.dataset.save === id) {
      btn.setAttribute("aria-pressed", String(!saved));
      btn.textContent = saved ? "+" : "✓";
    }
  });
  toast(
    saved
      ? "Removed from your library."
      : "Saved to your library in this browser.",
  );
  document.dispatchEvent(new Event("librarychange"));
  return !saved;
}
export function card(item) {
  if (!item) return "";
  const saved = savedIds().includes(item.id);
  const creator = item.author || item.artist || item.developer || item.year;
  return `<article class="card ${e(item.category)}"><a class="art" href="${detailUrl(item)}"><img src="${e(item.thumbnail || item.cover || "/assets/images/fallback.svg")}" srcset="${e(item.thumbnail || item.cover)} 280w, ${e(item.cover)} 600w" sizes="(max-width: 760px) 45vw, 220px" alt="${e(item.title)} — demo artwork" loading="lazy" width="360" height="540"></a><button class="save-button" data-save="${e(item.id)}" aria-label="Save ${e(item.title)}" aria-pressed="${saved}">${saved ? "✓" : "+"}</button><div class="card-info"><h3><a href="${detailUrl(item)}">${e(item.title)}</a></h3><div class="meta">${e(creator)} <span aria-hidden="true">·</span> ${e(item.genres?.[0] || "Uncategorised")}</div><div class="card-type">${singular[item.category]} <span aria-hidden="true">/</span> ${item.available ? "Original demo" : "Demo preview"}</div></div></article>`;
}
export function bindCatalogueActions() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-save]");
    if (button) toggleSaved(button.dataset.save);
  });
}
export function findRandom(items, category) {
  const matching = items.filter((x) => !category || x.category === category);
  const real = matching.filter((x) => x.available && !x.demo);
  const available = matching.filter((x) => x.available);
  const pool = real.length ? real : available.length ? available : matching;
  return pool[Math.floor(Math.random() * pool.length)];
}
