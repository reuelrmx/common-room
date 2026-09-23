import assert from "node:assert/strict";
import { filterItems } from "../assets/js/filters.js";
const items = [
  {
    title: "Quiet Forest",
    author: "Mira",
    year: 2026,
    genres: ["Nature"],
    category: "books",
    dateAdded: "2026-09-01",
    available: true,
    formats: [{ label: "TXT" }],
  },
  {
    title: "Loud Sea",
    director: "Ren",
    year: 1984,
    genres: ["Drama"],
    category: "movies",
    dateAdded: "2026-08-01",
    available: false,
  },
];
assert.equal(filterItems(items, { q: "mira nature 2026" }).length, 1);
assert.equal(
  filterItems(items, {
    genre: "Nature",
    category: "books",
    available: "1",
    format: "TXT",
  })[0].title,
  "Quiet Forest",
);
assert.equal(
  filterItems(items, { genre: "Nature", category: "movies" }).length,
  0,
);
assert.equal(filterItems(items, { decade: "1980" })[0].title, "Loud Sea");
assert.equal(filterItems(items, { sort: "title" })[0].title, "Loud Sea");
assert.equal(filterItems(items, { q: "not found" }).length, 0);
assert.equal(filterItems(items, { creator: "Mira" })[0].title, "Quiet Forest");
assert.equal(items[0].title, "Quiet Forest");
console.log("8 filtering/sorting assertions passed.");
