import { mediaUrl } from "../catalogue.js";
import { readStore, saveStore } from "../utils.js";
export async function openReader(root, item, format) {
  if (root.childElementCount) {
    root.hidden = !root.hidden;
    return;
  }
  root.hidden = false;
  if (format.label === "PDF") {
    const iframe = document.createElement("iframe");
    iframe.title = `Read ${item.title} as PDF`;
    iframe.src = mediaUrl(format.url);
    iframe.style.width = "100%";
    iframe.style.height = "650px";
    root.append(iframe);
    const p = document.createElement("p");
    p.textContent =
      "If your browser cannot display the PDF, use the download link above.";
    root.append(p);
    return;
  }
  root.className = "reader";
  root.innerHTML =
    '<div class="reader-controls"><button data-reader="smaller" aria-label="Smaller text">A−</button><button data-reader="larger" aria-label="Larger text">A+</button><button data-reader="theme">Dark paper</button><button data-reader="width">Wider text</button></div><progress aria-label="Reading progress" value="0" max="100"></progress><div class="reader-text" tabindex="0" aria-label="Book text">Opening the book…</div>';
  const text = root.querySelector(".reader-text"),
    progress = root.querySelector("progress"),
    key = `commonroom:reader:${item.id}`;
  const stored = readStore(key, {});
  let size = Math.max(14, Math.min(28, stored.size || 18)),
    wide = !!stored.wide,
    dark = !!stored.dark;
  const apply = () => {
    text.style.fontSize = `${size}px`;
    text.style.maxWidth = wide ? "100%" : "620px";
    root.classList.toggle("dark", dark);
    root.querySelector('[data-reader="theme"]').textContent = dark
      ? "Light paper"
      : "Dark paper";
    root.querySelector('[data-reader="width"]').textContent = wide
      ? "Narrower text"
      : "Wider text";
  };
  const persist = () =>
    saveStore(key, { size, wide, dark, position: text.scrollTop });
  apply();
  try {
    const response = await fetch(mediaUrl(format.url));
    if (!response.ok) throw Error();
    text.textContent = await response.text();
    requestAnimationFrame(() => {
      text.scrollTop = stored.position || 0;
      updateProgress();
    });
  } catch {
    text.textContent =
      "This book could not be loaded. Please try its download link.";
  }
  function updateProgress() {
    const max = text.scrollHeight - text.clientHeight;
    progress.value = max > 0 ? (text.scrollTop / max) * 100 : 100;
  }
  text.addEventListener(
    "scroll",
    () => {
      updateProgress();
      persist();
    },
    { passive: true },
  );
  root.addEventListener("click", (event) => {
    const action = event.target.closest("[data-reader]")?.dataset.reader;
    if (action === "smaller") size = Math.max(14, size - 2);
    if (action === "larger") size = Math.min(28, size + 2);
    if (action === "theme") dark = !dark;
    if (action === "width") wide = !wide;
    apply();
    updateProgress();
    persist();
  });
}
