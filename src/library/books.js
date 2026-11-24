// Replace these fields with your own books. Cover files belong in public/covers
// and can be referenced with a path such as /covers/my-book.jpg.
const SHELF_PLACEMENTS = [
  { type: 'shelf', wall: 'west', unit: 0, level: 2, position: 14 },
  { type: 'shelf', wall: 'west', unit: 0, level: 3, position: 8 },
  { type: 'shelf', wall: 'west', unit: 1, level: 2, position: 12 },
  { type: 'shelf', wall: 'west', unit: 1, level: 1, position: 18 },
  { type: 'desk', position: 0 },
  { type: 'desk', position: 1 },
  { type: 'shelf', wall: 'east', unit: 0, level: 2, position: 10 },
  { type: 'shelf', wall: 'east', unit: 0, level: 3, position: 16 },
  { type: 'shelf', wall: 'east', unit: 1, level: 2, position: 15 },
  { type: 'shelf', wall: 'east', unit: 1, level: 1, position: 9 },
  { type: 'shelf', wall: 'north', unit: 0, level: 2, position: 12 },
  { type: 'shelf', wall: 'north', unit: 1, level: 2, position: 11 },
];

const PLACEHOLDER_COLORS = [
  '#1b2d48', '#1f4030', '#5c1f24', '#4a3525', '#6b2c2c', '#233b4d',
  '#7a4b1e', '#3d1e2b', '#273d2c', '#1c353d', '#4f3b26', '#2c1f3d',
];

export const CURATED_BOOKS = SHELF_PLACEMENTS.map((placement, index) => {
  const number = String(index + 1).padStart(2, '0');

  return {
    id: `my-book-${number}`,
    title: `Your Book Title ${number}`,
    author: 'Add author name',
    year: 'Year',
    category: 'Add category',
    coverImage: '',
    color: PLACEHOLDER_COLORS[index],
    accent: '#e2bd6b',
    placement,
    synopsis: 'Add a short description of your book here.',
    excerpt: ['Add a short excerpt or reading note for this book here.'],
  };
});

const WALL_LABELS = {
  west: 'West Shelves',
  east: 'East Shelves',
  north: 'North Alcove',
};

export function getBookLocation(book) {
  if (book.placement?.type === 'desk') return 'Reading Desk';
  return WALL_LABELS[book.placement?.wall] ?? 'Library';
}
