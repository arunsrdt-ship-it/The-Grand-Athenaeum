# Editing the library books

Edit the `CURATED_BOOKS` data in `books.js`. Each placeholder has a title,
author, year, category, cover image path, synopsis, excerpt, spine colors, and
placement. The app uses those fields in the catalog, reader, hover labels, and
3D room.

For a cover, add an image to `public/covers/` and set `coverImage` to a path such
as `/covers/my-book.jpg`. Leave it empty to use the generated placeholder.

Shelf placement uses `wall` (`west`, `east`, or `north`), `unit` (the shelf group
on that wall), `level` (0 is the bottom shelf), and `position` (left to right,
starting at 0). Use `{ type: 'desk', position: 0 }` to place a book on the
reading desk. Keep shelf units and levels within the room's existing layout.
