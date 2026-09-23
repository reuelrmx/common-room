import { categories, card, savedIds } from "../catalogue.js";
import { filterItems } from "../filters.js";
import { escapeHTML as e, debounce, imageFallback } from "../utils.js";
import { feature } from "./home.js";
const copy = {
  movies: [
    "Movies",
    "For the love of the moving image.",
    "Short films, distant worlds, and something for a quiet evening.",
  ],
  games: [
    "Games",
    "Just one more round.",
    "Small experiments, imagined worlds, and games made for the joy of playing.",
  ],
  books: [
    "Books",
    "A little room to read.",
    "Stories, field notes, and pages worth sitting with.",
  ],
  music: [
    "Music",
    "Something good on the speakers.",
    "Albums and small sounds for whatever kind of day it is.",
  ],
  search: [
    "Search",
    "Find your next good thing.",
    "Search titles, people, genres, and years across the collection.",
  ],
  library: [
    "My Library",
    "Your own corner of the collection.",
    "Saved in this browser only. No account, no cloud sync.",
  ],
  recent: [
    "Recently Added",
    "Fresh on the shelves.",
    "The latest additions from every corner of the collection.",
  ],
};
export function renderBrowse(root, all, page) {
  const category = categories.includes(page) ? page : "";
  const base = category ? all.filter((x) => x.category === category) : all;
  const [title, heading, description] = copy[page];
  const values = (field) =>
    [...new Set(base.flatMap((x) => x[field] || []))].sort();
  const select = (name, label, options) =>
    `<label>${label}<select name="${name}"><option value="">All ${label.toLowerCase()}</option>${options.map((value) => `<option value="${e(value)}">${e(value)}</option>`).join("")}</select></label>`;
  root.innerHTML = `<div class="page-intro"><p class="eyebrow">THE COLLECTION / ${e(title)}</p><h1>${e(heading)}</h1><p>${e(description)}</p></div>${category ? feature(base.find((x) => x.featured) || base[0], true) : ""}<details class="filter-panel" open><summary>Search & filters</summary><form class="filters" id="filters"><label>${page === "search" ? "Search everything" : "Search titles"}<input type="search" name="q" placeholder="Title, creator, genre…"></label>${!category ? select("category", "Categories", categories) : ""}${select("genre", "Genres", values("genres"))}${category === "movies" ? select("decade", "Decades", [...new Set(base.map((x) => String(Math.floor(x.year / 10) * 10)))]) : ""}${category === "games" ? select("platform", "Platforms", values("platforms")) : ""}${category === "books" ? select("creator", "Authors", values("author")) + select("format", "Formats", [...new Set(base.flatMap((x) => (x.formats || []).map((f) => f.label)))]) : ""}${category === "music" ? select("creator", "Artists", values("artist")) : ""}${select("license", "Licences", values("license"))}${category === "books" || category === "movies" ? select("language", "Languages", values("language")) : ""}<label>Availability<select name="available"><option value="">All entries</option><option value="1">Playable / readable</option></select></label><label>Sort by<select name="sort"><option value="recent">Recently added</option><option value="title">Title A–Z</option><option value="year">Newest year</option></select></label><button type="reset">Reset</button></form></details><div class="result-bar"><span id="result-count" role="status"></span><button id="view-toggle" aria-pressed="false">List view</button></div><div id="results" class="catalogue-grid ${category}"></div>`;
  const form = root.querySelector("#filters"),
    results = root.querySelector("#results"),
    toggle = root.querySelector("#view-toggle");
  let list = false;
  function restore() {
    const params = new URLSearchParams(location.search);
    for (const element of form.elements) {
      if (element.name)
        element.value =
          params.get(element.name) || (element.name === "sort" ? "recent" : "");
    }
    list = params.get("view") === "list";
    draw(false);
  }
  function draw(update = true) {
    const state = Object.fromEntries(new FormData(form));
    if (update) {
      const params = new URLSearchParams();
      Object.entries(state).forEach(([key, value]) => {
        if (value && !(key === "sort" && value === "recent"))
          params.set(key, value);
      });
      if (list) params.set("view", "list");
      history.replaceState(
        null,
        "",
        location.pathname + (params.size ? "?" + params : ""),
      );
    }
    const items = filterItems(
      page === "library" ? base.filter((x) => savedIds().includes(x.id)) : base,
      state,
    );
    results.className = `catalogue-grid ${category} ${list ? "list" : ""}`;
    results.innerHTML = items.length
      ? items.map(card).join("")
      : `<div class="empty"><h2>${page === "library" && !savedIds().length ? "Your shelf is waiting." : "No titles matched those filters."}</h2><p>${page === "library" ? "Use the + on any title to save it here." : "Try another search or reset your filters."}</p>${page === "library" ? '<a class="button" href="/index.html">Explore the collection</a>' : ""}</div>`;
    root.querySelector("#result-count").textContent =
      `${items.length} ${items.length === 1 ? "title" : "titles"}${page === "library" ? " saved in this browser" : ""}`;
    toggle.textContent = list ? "Grid view" : "List view";
    toggle.setAttribute("aria-pressed", String(list));
    imageFallback(results);
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    draw();
  });
  form.addEventListener(
    "input",
    debounce(() => draw()),
  );
  form.addEventListener("change", () => draw());
  form.addEventListener("reset", () => setTimeout(() => draw(), 0));
  toggle.addEventListener("click", () => {
    list = !list;
    draw();
  });
  window.addEventListener("popstate", restore);
  document.addEventListener("librarychange", () => {
    if (page === "library") draw(false);
  });
  restore();
}
