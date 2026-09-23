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
      ...(item.genres || []),
    ]
      .join(" ")
      .toLowerCase();
    return (
      (!q || q.split(/\s+/).every((word) => haystack.includes(word))) &&
      (!state.category || item.category === state.category) &&
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
    state.sort === "title"
      ? a.title.localeCompare(b.title)
      : state.sort === "year"
        ? b.year - a.year
        : a.dateAdded === b.dateAdded
          ? a.title.localeCompare(b.title)
          : String(b.dateAdded).localeCompare(String(a.dateAdded)),
  );
}
