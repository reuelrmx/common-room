import assert from "node:assert/strict";
import {
  normalizeItem,
  attachCollections,
  typeLabel,
  orderedMembers,
} from "../assets/js/content-model.js";
import { filterItems } from "../assets/js/filters.js";
const single = normalizeItem(
  { id: "s", title: "Song", streamUrl: "https://example.com/song.mp3" },
  "music",
);
assert.deepEqual(single.genres, []);
assert.equal(single.releaseType, "single");
assert.equal(single.tracks[0].url, "https://example.com/song.mp3");
assert.equal(typeLabel(single), "Single");
const album = normalizeItem(
  {
    id: "a",
    title: "Album",
    releaseType: "album",
    tracks: [
      { title: "First", streamUrl: "https://example.com/1.mp3" },
      { title: "Second", url: "https://example.com/2.mp3" },
    ],
  },
  "music",
);
assert.equal(album.tracks[1].url, "https://example.com/2.mp3");
assert.equal(typeLabel(album), "Album");
const films = ["f1", "f2", "f3"].map((id) =>
  normalizeItem({ id, title: id, kind: "film" }, "movies"),
);
const groups = [
  {
    id: "trio",
    category: "movies",
    type: "trilogy",
    title: "Trio",
    members: [
      { id: "f2", position: 2 },
      { id: "f3", position: 3 },
      { id: "f1", position: 1 },
    ],
  },
  {
    id: "universe",
    category: "movies",
    type: "franchise",
    title: "Universe",
    members: [{ id: "f1", position: 1 }],
  },
];
attachCollections(films, groups);
assert.equal(films[0].collections.length, 2);
assert.deepEqual(
  filterItems(films, { collection: "trio", sort: "sequence" }).map((x) => x.id),
  ["f1", "f2", "f3"],
);
assert.equal(filterItems(films, { type: "franchise" }).length, 1);
assert.equal(filterItems(films, { type: "standalone" }).length, 0);
assert.equal(filterItems(films, { q: "universe" }).length, 1);
assert.equal(filterItems([single, album], { type: "single" }).length, 1);
assert.equal(filterItems([single, album], { q: "Second" }).length, 1);
assert.deepEqual(
  orderedMembers(groups[0], films).map((x) => x.id),
  ["f1", "f2", "f3"],
);
const episodes = attachCollections(
  ["e2", "e1"].map((id) =>
    normalizeItem({ id, title: id, kind: "episode" }, "movies"),
  ),
  [
    {
      id: "show",
      category: "movies",
      type: "series",
      members: [
        { id: "e2", position: 2, season: 2, episode: 1 },
        { id: "e1", position: 1, season: 1, episode: 3 },
      ],
    },
  ],
);
assert.deepEqual(
  filterItems(episodes, { collection: "show", sort: "sequence" }).map(
    (x) => x.id,
  ),
  ["e1", "e2"],
);
console.log(
  "Content-model assertions passed: optional fields, single/album URLs, legacy tracks, overlapping groups, collection filters/search, and sequence ordering.",
);
