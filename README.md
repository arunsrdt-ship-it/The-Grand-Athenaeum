# Frontend

Visitors can browse and read public books. The owner can unlock private books and upload controls with the backend owner token. The token is kept in page memory and cleared when owner access is locked.

Uploaded book PDFs open in an in-app PDF.js reader with page navigation, zoom, and document-wide text search. PDF delivery is proxied through the backend so the browser does not receive Cloudinary's temporary URL.

## Reader protection limits

A browser reader cannot guarantee that displayed content will not be copied or captured. To render a PDF, the browser receives its data. A reader may still save or inspect that data, take screenshots, record the screen, use browser tools or extensions, or photograph the display. Disabling text selection, context menus, and common copy shortcuts only deters casual copying; it cannot prevent determined capture. The watermark is visible in the reader but is not tamper-proof, and it does not identify a particular reader.

For this library, the selected approach is access control plus practical deterrence: keep PDFs in private storage, enforce public/private permissions on the backend for both catalog and PDF requests, stream files through the backend, and show a watermark and basic copy deterrents for private books. This helps protect private books from unauthorized visitors and discourages casual copying, but it is not DRM and should not be treated as screenshot-proof.

If a book needs stronger publisher-grade controls, use a DRM-capable reader or delivery service with individual user licenses and revocable access. The current shared owner token and visible watermark do not provide per-reader licensing or reliable attribution.

This folder contains the complete React, Three.js, Vite, Tailwind, and PostCSS application. API reads and PDF uploads are defined in `src/services/libraryApi.js` with Redux Toolkit Query and registered in `src/app/store.js`.

The original standalone HTML source is kept under `reference/` for reference; the running application is the React app in `src/`.

Install dependencies with `npm install` from this folder, then run `npm run dev`. The Vite configuration proxies `/api` to the Express service in `../backend`.
