import { config } from "./config.js";
import { $, imageFallback, renderError, safeUrl } from "./utils.js";
import {
  loadCatalogue,
  bindCatalogueActions,
  findRandom,
  detailUrl,
  categories,
} from "./catalogue.js";
import { initAudio } from "./players/audio-player.js";
const page = document.body.dataset.page;
const menu = $(".menu-toggle"),
  nav = $("#navigation");
function closeMenu() {
  nav.classList.remove("open");
  menu.setAttribute("aria-expanded", "false");
}
menu.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menu.setAttribute("aria-expanded", String(open));
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
  if (
    event.key === "/" &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)
  ) {
    const input = $("#global-search");
    if (input.getClientRects().length) {
      event.preventDefault();
      input.focus();
    }
  }
});
const active = {
  movie: "movies",
  game: "games",
  book: "books",
  album: "music",
}[document.body.dataset.kind];
if (active)
  nav
    .querySelector(`a[href="/${active}.html"]`)
    ?.setAttribute("aria-current", "page");
if (config.siteUrl) {
  const canonical = document.createElement("link");
  canonical.rel = "canonical";
  const url = new URL(location.pathname, config.siteUrl);
  const id = new URLSearchParams(location.search).get("id");
  if (id) url.searchParams.set("id", id);
  canonical.href = url.href;
  document.head.append(canonical);
}
if (page === "about" && config.contactEmail) {
  const p = $("#contact-info");
  p.textContent = "For licence corrections or takedown requests, email ";
  const a = document.createElement("a");
  a.href = "mailto:" + config.contactEmail;
  a.textContent = config.contactEmail;
  p.append(a, ".");
}
bindCatalogueActions();
try {
  const items = await loadCatalogue();
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-random]");
    if (button) {
      const item = findRandom(items, categories.includes(page) ? page : active);
      if (item) location.href = detailUrl(item);
    }
  });
  initAudio(items);
  const root = $("#main");
  if (page === "home") {
    const { renderHome } = await import("./pages/home.js");
    await renderHome(root, items);
  } else if (page === "detail") {
    const { renderDetail } = await import("./pages/detail.js");
    await renderDetail(root, items);
  } else if ([...categories, "search", "library", "recent"].includes(page)) {
    const { renderBrowse } = await import("./pages/browse.js");
    renderBrowse(root, items, page);
  }
  imageFallback();
} catch (error) {
  if (!["about", "404"].includes(page))
    renderError(
      $("#main"),
      error.message ||
        "The collection could not be opened. Please reload the page.",
    );
  document.querySelectorAll("[data-random]").forEach((button) => {
    button.disabled = true;
    button.title = "The catalogue is unavailable.";
  });
}
