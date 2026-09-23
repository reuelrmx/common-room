import {
  typeLabel,
  collectionUrl,
  orderedMembers,
  memberLabel,
  hasLicenceDetails,
} from "../content-model.js";
import { card, detailUrl, savedIds, mediaUrl, singular } from "../catalogue.js";
import {
  escapeHTML as e,
  safeUrl,
  toast,
  readStore,
  saveStore,
} from "../utils.js";
import { config } from "../config.js";
import { initVideo } from "../players/video-player.js";
import { selectTrack } from "../players/audio-player.js";
import { openReader } from "../players/reader.js";
import { mountComments } from "../comments.js";
export async function renderDetail(root, items) {
  const id = new URLSearchParams(location.search).get("id");
  const category = {
    movie: "movies",
    game: "games",
    book: "books",
    album: "music",
  }[document.body.dataset.kind];
  const item = items.find((x) => x.id === id && x.category === category);
  if (!item) {
    root.innerHTML =
      '<div class="empty"><p class="eyebrow">OFF THE SHELF</p><h1>This title isn’t in the collection.</h1><p>Check the address or browse for another good find.</p><a class="button primary" href="/index.html">Back to the collection</a></div>';
    document.title = "Title not found — Common Room";
    return;
  }
  document.title = `${item.title} — ${config.siteName}`;
  document.querySelector('meta[name="description"]').content = item.description;
  document.querySelector('meta[property="og:title"]').content = document.title;
  document.querySelector('meta[property="og:description"]').content =
    item.description;
  if (config.siteUrl) {
    const og = document.createElement("meta");
    og.setAttribute("property", "og:image");
    og.content = new URL(item.cover, config.siteUrl).href;
    document.head.append(og);
  }
  if (!item.demo) {
    const structured = document.createElement("script");
    structured.type = "application/ld+json";
    structured.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": {
        movies: item.kind === "episode" ? "TVEpisode" : "Movie",
        games: "VideoGame",
        books: "Book",
        music: item.releaseType === "single" ? "MusicRecording" : "MusicAlbum",
      }[category],
      name: item.title,
      description: item.description,
      image: item.cover,
      url: detailUrl(item),
      genre: item.genres,
    });
    document.head.append(structured);
  }
  saveStore(
    "commonroom:recent",
    [id, ...readStore("commonroom:recent", []).filter((x) => x !== id)].slice(
      0,
      12,
    ),
  );
  const saved = savedIds().includes(id),
    creator = item.director || item.developer || item.author || item.artist;
  let actions = "";
  if (category === "movies" && item.streamUrl)
    actions += '<a class="button primary" href="#player">▷ Watch</a>';
  if (item.browserUrl)
    actions +=
      '<button class="button primary" id="play-game">Play in browser</button>';
  if (item.tracks?.length)
    actions += `<button class="button primary" id="play-album">▷ Play ${item.releaseType === "single" ? "single" : "album"}</button>`;
  if (item.formats?.some((x) => ["TXT", "PDF"].includes(x.label)))
    actions += '<button class="button primary" id="read-book">Read</button>';
  if (item.downloadUrl && hasLicenceDetails(item))
    actions += `<a class="button" href="${e(mediaUrl(item.downloadUrl))}" download>↓ Download ${e(item.format)} · ${e(item.fileSize)}</a>`;
  if (item.trailerUrl)
    actions += `<a class="button" href="${e(safeUrl(item.trailerUrl))}">Watch trailer</a>`;
  for (const format of hasLicenceDetails(item) ? item.formats : [])
    actions += `<a class="button" href="${e(mediaUrl(format.url))}" download>↓ ${e(format.label)} · ${e(format.size || "")}</a>`;
  const metadata = Object.entries({
    Year: item.year,
    [category === "movies"
      ? "Director"
      : category === "games"
        ? "Developer"
        : category === "books"
          ? "Author"
          : "Artist"]: creator,
    Genre: item.genres.join(" / "),
    Language: item.language,
    Runtime: item.duration,
    Country: item.country,
    Platform: item.platforms?.join(", "),
    Pages: item.pageCount,
    Resolution: item.resolution,
    Format: item.format,
    Size: item.fileSize,
    Cast: item.cast?.length ? item.cast.join(", ") : null,
  }).filter(([, value]) => value);
  root.innerHTML = `<div class="breadcrumb"><a href="/${category}.html">${category === "music" ? "Music" : category[0].toUpperCase() + category.slice(1)}</a> <span aria-hidden="true">/</span> ${e(item.title)}</div><section class="detail-hero"><img class="detail-backdrop" src="${e(item.backdrop)}" alt=""><img class="detail-cover" src="${e(item.cover)}" alt="${e(item.title)} artwork" width="360" height="540"><div class="detail-copy"><p class="eyebrow">${e(typeLabel(item))}${item.demo ? " / ORIGINAL DEMO" : ""}</p><h1>${e(item.title)}</h1><p class="meta">${e(creator)} <span aria-hidden="true">·</span> ${e(item.year)} <span aria-hidden="true">·</span> ${e(item.genres.join(" / "))}</p><p>${e(item.description)}</p><span class="badge ${item.available ? "" : "demo-badge"}">${e(item.license || "Licence not provided")}</span><div class="actions">${actions}<button class="button" data-save="${e(item.id)}" aria-pressed="${saved}" aria-label="Save ${e(item.title)}">${saved ? "✓" : "+"}</button><button class="button" id="share">Share ↗</button></div><p class="demo-note">${item.demo ? "An original playable sample. Artwork is licensed separately." : !hasLicenceDetails(item) ? "Source and licence details have not been provided. Downloads are unavailable until they are documented." : ""}</p></div></section><div class="detail-body"><div><h2>About ${category === "books" ? "the book" : category === "music" ? (item.releaseType === "single" ? "the single" : "the album") : category === "games" ? "the game" : "the film"}</h2><p>${e(item.description)}</p><dl class="metadata">${metadata.map(([key, value]) => `<div><dt>${e(key)}</dt><dd>${e(value)}</dd></div>`).join("")}</dl>${item.requirements ? `<h3>System requirements</h3><p>${e(item.requirements)}</p>` : ""}${category === "movies" && item.streamUrl ? `<section id="player" class="media-panel"><h2>Watch ${e(item.title)}</h2><video controls preload="metadata" playsinline poster="${e(item.backdrop)}" aria-label="${e(item.title)}"><p>Your browser does not support HTML5 video. Use the download link.</p></video><p class="media-status" role="status">${e(item.duration || "")}${item.subtitles?.length ? " · Subtitles available" : ""}</p></section>` : ""}${item.browserUrl ? '<div id="game-panel" class="media-panel" hidden></div>' : ""}${item.screenshots?.length ? `<h3>Screenshots</h3><div class="gallery">${item.screenshots.map((src) => `<a href="${e(safeUrl(src))}"><img src="${e(safeUrl(src))}" alt="${e(item.title)} game screenshot" loading="lazy"></a>`).join("")}</div>` : ""}${item.formats?.length ? '<div id="reader" hidden></div>' : ""}${item.tracks?.length ? `<h2>${item.releaseType === "single" ? "Listen" : "Track listing"}</h2><ol class="track-list">${item.tracks.map((track, i) => `<li><button data-track="${i}" aria-label="Play ${e(track.title)}">▷</button><span class="meta">${String(i + 1).padStart(2, "0")}</span><span>${e(track.title)}</span><span class="duration">${e(track.duration)}</span>${track.downloadUrl && hasLicenceDetails(item) ? `<a href="${e(mediaUrl(track.downloadUrl))}" download aria-label="Download ${e(track.title)} as ${e(track.format)}">↓ ${e(track.format)}</a>` : ""}</li>`).join("")}</ol><p class="meta">Playback position is remembered between pages. Press play to resume after navigation.</p>` : ""}<section id="comments" class="comments"><h2>Discussion</h2><p class="comment-status">Discussion loads when you reach this section.</p></section></div><aside class="source-box"><h2>Source & Licence</h2><dl><dt>Source</dt><dd>${e(item.sourceName || "Not provided")}</dd><dt>Licence</dt><dd>${safeUrl(item.licenseUrl) ? `<a href="${e(safeUrl(item.licenseUrl))}" rel="noopener noreferrer">${e(item.license || "View licence")} ↗</a>` : e(item.license || "Not provided")}</dd><dt>Original page</dt><dd>${safeUrl(item.sourceUrl) ? `<a href="${e(safeUrl(item.sourceUrl))}" rel="noopener noreferrer">View source ↗</a>` : "Not provided"}</dd><dt>Attribution</dt><dd>${e(item.attribution || "No attribution supplied.")}</dd>${item.sha256 ? `<dt>SHA-256</dt><dd>${e(item.sha256)}</dd>` : ""}</dl><p class="meta">${hasLicenceDetails(item) ? "Refer to the linked licence for permitted uses." : "No redistribution permission is asserted by this listing."}</p><a class="text-link" href="/about.html#contact">Report a licence issue →</a></aside></div><section class="shelf-section"><div class="section-heading"><h2>Stay a little longer</h2><a href="/${category}.html">Back to ${category} →</a></div><div class="poster-grid">${items
    .filter((x) => x.category === category && x.id !== id)
    .slice(0, 6)
    .map(card)
    .join("")}</div></section>`;
  const mainColumn = root.querySelector(".detail-body > div");
  for (const group of item.collections) {
    const section = document.createElement("section");
    section.className = "collection-order";
    section.innerHTML = `<p class="eyebrow">${e(group.type)}</p><h2><a href="${collectionUrl(group)}">${e(group.title)} →</a></h2><p class="meta">${category === "books" ? "Reading order" : "Viewing order"}</p><ol>${orderedMembers(
      group,
      items,
    )
      .map(
        (member) =>
          `<li><span>${e(memberLabel(member))}</span><a href="${detailUrl(member.item)}" ${member.id === item.id ? 'aria-current="page"' : ""}>${e(member.item.title)}</a></li>`,
      )
      .join("")}</ol>`;
    mainColumn.insertBefore(section, root.querySelector("#comments"));
  }
  initVideo(root, item);
  root.querySelector("#share").addEventListener("click", async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, url: location.href });
      } else {
        await navigator.clipboard.writeText(location.href);
        toast("Link copied.");
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        const input = document.createElement("input");
        input.value = location.href;
        input.readOnly = true;
        input.setAttribute("aria-label", "Copy this link");
        root.querySelector("#share").after(input);
        input.focus();
        input.select();
        toast("Copy the selected link.");
      }
    }
  });
  root
    .querySelector("#play-album")
    ?.addEventListener("click", () => selectTrack(item));
  root
    .querySelectorAll("[data-track]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        selectTrack(item, Number(button.dataset.track)),
      ),
    );
  root.querySelector("#play-game")?.addEventListener("click", () => {
    const panel = root.querySelector("#game-panel");
    panel.hidden = false;
    if (!panel.children.length) {
      const frame = document.createElement("iframe");
      frame.src = mediaUrl(item.browserUrl);
      frame.title = item.title;
      frame.sandbox = "allow-scripts";
      frame.referrerPolicy = "no-referrer";
      panel.append(frame);
      const note = document.createElement("p");
      note.textContent =
        "Use the on-screen controls or keys 1–4. The game runs inside an isolated frame.";
      panel.append(note);
    }
    panel.scrollIntoView({ behavior: "auto", block: "center" });
    panel.querySelector("iframe").focus();
  });
  root.querySelector("#read-book")?.addEventListener("click", async () => {
    const reader = root.querySelector("#reader");
    await openReader(
      reader,
      item,
      item.formats.find((x) => x.label === "TXT") ||
        item.formats.find((x) => x.label === "PDF"),
    );
    if (!reader.hidden)
      reader.scrollIntoView({ behavior: "auto", block: "start" });
  });
  const pdf = item.formats?.find((x) => x.label === "PDF");
  if (pdf && item.formats.some((x) => x.label === "TXT")) {
    const button = document.createElement("button");
    button.className = "button";
    button.textContent = "Read PDF";
    root.querySelector("#read-book").after(button);
    button.addEventListener("click", () => {
      let pdfRoot = root.querySelector("#pdf-reader");
      if (!pdfRoot) {
        pdfRoot = document.createElement("div");
        pdfRoot.id = "pdf-reader";
        root.querySelector("#reader").after(pdfRoot);
      }
      openReader(pdfRoot, item, pdf);
    });
  }
  const comments = root.querySelector("#comments");
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((x) => x.isIntersecting)) {
          observer.disconnect();
          mountComments(comments, item);
        }
      },
      { rootMargin: "180px" },
    );
    observer.observe(comments);
  } else mountComments(comments, item);
}
