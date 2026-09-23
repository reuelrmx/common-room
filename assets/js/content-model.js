// Normalize optional fields once so catalogue pages never depend on demo metadata.
export function normalizeItem(raw, category) {
  const item = {
    ...raw,
    category,
    title: raw.title || raw.id,
    description: raw.description || "",
    dateAdded: raw.dateAdded || "",
    genres: Array.isArray(raw.genres) ? raw.genres : [],
    cover: raw.cover || "/assets/images/fallback.svg",
    formats: Array.isArray(raw.formats) ? raw.formats : [],
    collections: [],
  };
  item.backdrop = raw.backdrop || item.cover;
  item.backdropSmall = raw.backdropSmall || item.backdrop;
  if (category === "music") {
    item.releaseType =
      raw.releaseType || (raw.tracks?.length > 1 ? "album" : "single");
    const tracks =
      Array.isArray(raw.tracks) && raw.tracks.length
        ? raw.tracks
        : raw.streamUrl
          ? [
              {
                title: raw.title,
                streamUrl: raw.streamUrl,
                downloadUrl: raw.downloadUrl,
              },
            ]
          : [];
    item.tracks = tracks.map((track) => ({
      ...track,
      title: track.title || item.title,
      artist: track.artist || item.artist,
      url: track.streamUrl || track.url || "",
      // Legacy `url` records used a single address for listening and downloading.
      downloadUrl: track.downloadUrl || track.url || "",
      format: track.format || item.format || "",
    }));
  }
  item.available =
    raw.available ??
    Boolean(
      item.streamUrl ||
      item.browserUrl ||
      item.downloadUrl ||
      item.formats.length ||
      item.tracks?.length,
    );
  return item;
}
export function attachCollections(items, collections) {
  for (const item of items) {
    item.collections = collections.filter(
      (group) =>
        group.category === item.category &&
        group.members?.some((member) => member.id === item.id),
    );
  }
  return items;
}
export function typeLabel(item) {
  if (item.category === "music")
    return item.releaseType === "single" ? "Single" : "Album";
  if (item.category === "games") return "Game";
  if (item.kind === "episode") return "Episode";
  if (item.collections?.length)
    return item.category === "books" ? "Book" : "Film";
  return item.category === "books" ? "Standalone book" : "Standalone film";
}
export function typeFilters(item) {
  if (item.category === "music") return [item.releaseType];
  if (item.category === "games") return ["game"];
  return [
    ...new Set([
      ...(item.collections?.length ? [] : ["standalone"]),
      ...(item.kind === "episode" ? ["episode"] : []),
      ...(item.collections || []).map((group) => group.type),
    ]),
  ];
}
export const collectionUrl = (group) =>
  `/${group.category}.html?collection=${encodeURIComponent(group.id)}`;
export function orderedMembers(group, items) {
  return [...group.members]
    .sort(
      (a, b) =>
        (a.season || 0) - (b.season || 0) ||
        (a.episode || a.position || 0) - (b.episode || b.position || 0),
    )
    .map((member) => ({
      ...member,
      item: items.find(
        (item) => item.id === member.id && item.category === group.category,
      ),
    }))
    .filter((member) => member.item);
}
export function memberLabel(member) {
  return member.season
    ? `Season ${member.season} · Episode ${member.episode}`
    : `Part ${member.position}`;
}
export function hasLicenceDetails(item) {
  return !!(
    item.license &&
    item.licenseUrl &&
    item.sourceName &&
    item.sourceUrl &&
    item.license !== "Demo metadata"
  );
}
