import { typeFilters } from "./content-model.js";
export function filterItems(items, state = {}) {
  const q = (state.q || "").toLowerCase().trim();
  const result = items.filter((item) => {
    const haystack = [
      item.title,
      item.author,
      item.artist,
      item.developer,
      item.director,
      item.year,
      ...(item.tracks || []).map((track) => track.title),
      ...(item.collections || []).map((group) => group.title),
      ...(item.genres || []),
    ]
      .join(" ")
      .toLowerCase();
    return (
      (!q || q.split(/\s+/).every((word) => haystack.includes(word))) &&
      (!state.category || item.category === state.category) &&
      (!state.type || typeFilters(item).includes(state.type)) &&
      (!state.collection ||
        item.collections?.some((group) => group.id === state.collection)) &&
      (!state.genre || (item.genres || []).includes(state.genre)) &&
      (!state.decade ||
        Math.floor(item.year / 10) * 10 === Number(state.decade)) &&
      (!state.platform || (item.platforms || []).includes(state.platform)) &&
      (!state.language || item.language === state.language) &&
      (!state.creator ||
        [item.author, item.artist, item.developer, item.director].includes(
          state.creator,
        )) &&
      (!state.license || item.license === state.license) &&
      (!state.format ||
        (item.formats || []).some((x) => x.label === state.format) ||
        item.format === state.format) &&
      (!state.available || item.available)
    );
  });
  return result.sort((a, b) =>
    state.sort === "sequence" && state.collection
      ? sequence(a, state.collection) - sequence(b, state.collection)
      : state.sort === "title"
        ? a.title.localeCompare(b.title)
        : state.sort === "year"
          ? (Number(b.year) || 0) - (Number(a.year) || 0)
          : a.dateAdded === b.dateAdded
            ? a.title.localeCompare(b.title)
            : String(b.dateAdded).localeCompare(String(a.dateAdded)),
  );
}

function sequence(item, id) {
  const member = item.collections
    ?.find((group) => group.id === id)
    ?.members.find((member) => member.id === item.id);
  return member
    ? (member.season || 0) * 100000 + (member.episode || member.position || 0)
    : Infinity;
}
