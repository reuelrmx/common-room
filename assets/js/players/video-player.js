import { mediaUrl } from "../catalogue.js";
export function initVideo(root, item) {
  const video = root.querySelector("video");
  if (!video) return;
  if (
    new URL(mediaUrl(item.streamUrl)).origin !== location.origin ||
    (item.subtitles || []).some(
      (sub) => new URL(mediaUrl(sub.src)).origin !== location.origin,
    )
  )
    video.crossOrigin = "anonymous";
  video.src = mediaUrl(item.streamUrl);
  for (const sub of item.subtitles || []) {
    const track = document.createElement("track");
    track.kind = "subtitles";
    track.src = mediaUrl(sub.src);
    track.srclang = sub.language;
    track.label = sub.label;
    video.append(track);
  }
  video.addEventListener("error", () => {
    root.querySelector(".media-status").textContent =
      "This video could not be played. Check your connection or try the download.";
  });
}
