import {
  escapeHTML as e,
  formatTime,
  readStore,
  saveStore,
  toast,
} from "../utils.js";
import { mediaUrl } from "../catalogue.js";
const audio = new Audio();
audio.preload = "metadata";
let album = null,
  index = 0,
  items = [],
  dock,
  restoreTime = 0,
  lastSave = 0;
export function initAudio(catalogue) {
  items = catalogue;
  dock = document.querySelector("#audio-dock");
  dock.className = "audio-dock";
  dock.innerHTML =
    '<div class="audio-track"></div><div class="audio-controls"><button data-audio="prev" aria-label="Previous track">Ⅰ‹</button><button class="play-toggle" data-audio="play" aria-label="Play">▷</button><button data-audio="next" aria-label="Next track">›Ⅰ</button></div><div class="audio-progress"><span class="elapsed">0:00</span><input aria-label="Track position" type="range" min="0" max="100" value="0" step="0.1"><span class="total">0:00</span></div><input class="audio-volume" aria-label="Volume" type="range" min="0" max="1" step="0.01" value="0.7"><div class="equalizer" aria-hidden="true"><i></i><i></i><i></i></div><button class="audio-close" data-audio="close" aria-label="Close player">×</button>';
  audio.volume = 0.7;
  dock.addEventListener("click", (event) => {
    const action = event.target.closest("[data-audio]")?.dataset.audio;
    if (action === "play") audio.paused ? play() : audio.pause();
    if (action === "next")
      selectTrack(album, (index + 1) % album.tracks.length);
    if (action === "prev")
      selectTrack(
        album,
        (index - 1 + album.tracks.length) % album.tracks.length,
      );
    if (action === "close") {
      audio.pause();
      dock.hidden = true;
      saveStore("commonroom:audio", null, sessionStorage);
    }
  });
  dock
    .querySelector(".audio-progress input")
    .addEventListener("input", (event) => {
      if (Number.isFinite(audio.duration))
        audio.currentTime = Number(event.target.value);
    });
  dock.querySelector(".audio-volume").addEventListener("input", (event) => {
    audio.volume = Number(event.target.value);
    persist();
  });
  audio.addEventListener("loadedmetadata", () => {
    if (restoreTime) {
      audio.currentTime = Math.min(restoreTime, audio.duration || restoreTime);
      restoreTime = 0;
    }
    dock.querySelector(".total").textContent = formatTime(audio.duration);
    dock.querySelector(".audio-progress input").max = audio.duration || 100;
  });
  audio.addEventListener("timeupdate", () => {
    dock.querySelector(".elapsed").textContent = formatTime(audio.currentTime);
    dock.querySelector(".audio-progress input").value = audio.currentTime;
    if (Date.now() - lastSave > 1500) {
      persist();
      lastSave = Date.now();
    }
  });
  for (const name of ["play", "pause", "ended"])
    audio.addEventListener(name, () => {
      const playing = !audio.paused && !audio.ended;
      dock.classList.toggle("playing", playing);
      const button = dock.querySelector('[data-audio="play"]');
      button.textContent = playing ? "Ⅱ" : "▷";
      button.setAttribute("aria-label", playing ? "Pause" : "Play");
      persist();
    });
  audio.addEventListener("ended", () => {
    if (album?.tracks.length > 1)
      selectTrack(album, (index + 1) % album.tracks.length);
  });
  audio.addEventListener("error", () => {
    dock.classList.remove("playing");
    toast("This audio file could not be played. Try its download link.");
  });
  window.addEventListener("pagehide", persist);
  const state = readStore("commonroom:audio", null, sessionStorage);
  const previous = items.find((x) => x.id === state?.id && x.tracks?.length);
  if (previous) {
    restoreTime = Number(state.time) || 0;
    audio.volume = Math.min(1, Math.max(0, Number(state.volume) || 0.7));
    dock.querySelector(".audio-volume").value = audio.volume;
    selectTrack(
      previous,
      Math.min(state.index || 0, previous.tracks.length - 1),
      false,
    );
  }
}
function persist() {
  if (album && !dock.hidden)
    saveStore(
      "commonroom:audio",
      { id: album.id, index, time: audio.currentTime, volume: audio.volume },
      sessionStorage,
    );
}
async function play() {
  try {
    await audio.play();
  } catch {
    toast("Playback is unavailable. Press play to try again.");
  }
}
export function selectTrack(item, trackIndex = 0, start = true) {
  if (!item?.tracks?.[trackIndex]) return;
  album = item;
  index = trackIndex;
  const track = item.tracks[index];
  audio.src = mediaUrl(track.url);
  dock.hidden = false;
  dock.querySelector(".audio-track").innerHTML =
    `<img src="${e(item.cover)}" alt="" width="46" height="46"><div><strong>${e(track.title)}</strong><small>${e(item.artist)}</small></div>`;
  dock.querySelector(".elapsed").textContent = "0:00";
  dock.querySelector(".audio-progress input").value = 0;
  if (start) {
    restoreTime = 0;
    play();
  }
}
