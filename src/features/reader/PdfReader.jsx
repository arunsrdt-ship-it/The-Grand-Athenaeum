import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { getLibraryOwnerToken } from '../../services/libraryApi.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;

function clampPage(page, pageCount) {
  return Math.min(pageCount || 1, Math.max(1, Number(page) || 1));
}

function getSavedPage(bookId, pageCount) {
  try {
    return clampPage(localStorage.getItem(`athenaeum-progress:${bookId}`), pageCount);
  } catch {
    return 1;
  }
}

function spreadStartFor(page, pageCount, spreadSize) {
  const boundedPage = clampPage(page, pageCount);
  return Math.floor((boundedPage - 1) / spreadSize) * spreadSize + 1;
}

function isEditableTarget(target) {
  return target instanceof HTMLElement
    && (target.isContentEditable || Boolean(target.closest('input, textarea, select')));
}

function copyPageCanvas(target, source, size) {
  target.width = source.width;
  target.height = source.height;
  target.style.width = `${size.width}px`;
  target.style.height = `${size.height}px`;
  target.getContext('2d', { alpha: false }).drawImage(source, 0, 0);
}

function snapshotPageCanvas(source) {
  const snapshot = document.createElement('canvas');
  snapshot.width = source.width;
  snapshot.height = source.height;
  snapshot.getContext('2d', { alpha: false }).drawImage(source, 0, 0);
  return snapshot;
}

function PrivateWatermark({ title }) {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden" aria-hidden="true">
      <div className="-rotate-12 whitespace-nowrap border-y border-amber-950/20 bg-white/20 px-6 py-2 text-center text-amber-950/25 shadow-sm sm:px-10">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.28em] sm:text-xs">Private copy</p>
        <p className="mt-0.5 max-w-[80vw] truncate font-serif text-xs italic tracking-wide sm:text-sm">{title}</p>
      </div>
    </div>
  );
}

export default function PdfReader({ book, preferences = { theme: 'paper', layout: 'auto', pdfZoom: 1 }, onPreferenceChange = () => {} }) {
  const canvasRefs = useRef([]);
  const pageSlotRefs = useRef([]);
  const spreadRef = useRef(null);
  const renderedSlotCountRef = useRef(0);
  const turnLeafRef = useRef(null);
  const turnFrontCanvasRef = useRef(null);
  const turnBackCanvasRef = useRef(null);
  const viewportRef = useRef(null);
  const documentRef = useRef(null);
  const renderTasksRef = useRef([]);
  const turnAnimationTimeoutRef = useRef(null);
  const shouldAnimateTurnRef = useRef(false);
  const searchRunRef = useRef(0);
  const searchInputRef = useRef(null);

  const [pdfDocument, setPdfDocument] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [turnDirection, setTurnDirection] = useState('next');
  const [pageTurn, setPageTurn] = useState(null);
  const [hasRenderedPage, setHasRenderedPage] = useState(false);
  const [renderedSlotCount, setRenderedSlotCount] = useState(0);
  const [zoom, setZoom] = useState(preferences.pdfZoom ?? 1);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const pagesPerSpread = preferences.layout === 'single'
    ? 1
    : preferences.layout === 'spread'
      ? 2
      : viewportWidth >= 720 ? 2 : 1;

  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return undefined;

    const observer = new ResizeObserver(([entry]) => {
      setViewportWidth(entry.contentRect.width);
      setViewportHeight(entry.contentRect.height);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadingTask = pdfjsLib.getDocument({
      url: book.pdfUrl,
      httpHeaders: getLibraryOwnerToken()
        ? { 'X-Admin-Token': getLibraryOwnerToken() }
        : undefined,
      disableRange: true,
      disableStream: true,
    });

    setLoading(true);
    setError('');
    setPdfDocument(null);
    documentRef.current = null;
    setPageNumber(1);
    setHasRenderedPage(false);
    setRenderedSlotCount(0);
    renderedSlotCountRef.current = 0;
    setSearchResults([]);
    setSearchMessage('');

    loadingTask.promise.then((document) => {
      if (cancelled) {
        document.destroy().catch(() => {});
        return;
      }
      documentRef.current = document;
      setPdfDocument(document);
      setPageCount(document.numPages);
      setPageNumber(getSavedPage(book.id, document.numPages));
      setLoading(false);
    }).catch((loadError) => {
      if (cancelled || loadError?.name === 'AbortException') return;
      setError('This PDF could not be loaded. Check the backend and Cloudinary configuration, then try again.');
      setLoading(false);
    });

    return () => {
      cancelled = true;
      renderTasksRef.current.forEach((task) => task.cancel());
      window.clearTimeout(turnAnimationTimeoutRef.current);
      documentRef.current = null;
      searchRunRef.current += 1;
      loadingTask.destroy().catch(() => {});
    };
  }, [book.pdfUrl]);

  useEffect(() => {
    setPageNumber((current) => spreadStartFor(current, pageCount, pagesPerSpread));
  }, [pageCount, pagesPerSpread]);

  useEffect(() => {
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, preferences.pdfZoom ?? 1)));
  }, [preferences.pdfZoom]);

  useEffect(() => {
    if (!pageCount) return;
    try {
      localStorage.setItem(`athenaeum-progress:${book.id}`, String(pageNumber));
    } catch {
      // Keep the current position in memory if browser storage is unavailable.
    }
  }, [book.id, pageCount, pageNumber]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (hasRenderedPage && !searchOpen) viewportRef.current?.focus({ preventScroll: true });
  }, [hasRenderedPage, searchOpen]);

  useEffect(() => {
    if (!pdfDocument || !pageCount || !viewportWidth || !viewportHeight) return undefined;

    const pageNumbers = Array.from({ length: pagesPerSpread }, (_, index) => pageNumber + index)
      .filter((page) => page <= pageCount);
    const canvases = pageNumbers.map((_, index) => canvasRefs.current[index]);
    if (!canvases.length || canvases.some((canvas) => !canvas)) return undefined;

    let cancelled = false;
    const previousTasks = renderTasksRef.current;
    previousTasks.forEach((task) => task.cancel());
    const renderTasks = [];
    renderTasksRef.current = renderTasks;
    setRendering(true);

    async function renderSpread() {
      try {
        await Promise.all(previousTasks.map((task) => task.promise.catch(() => {})));
        if (cancelled) return;

        const pages = await Promise.all(pageNumbers.map((page) => pdfDocument.getPage(page)));
        if (cancelled) return;

        const horizontalSpace = pagesPerSpread === 2 ? 64 : 32;
        const minimumWidth = pagesPerSpread === 2 ? 360 : 240;
        const totalPageWidth = Math.max(minimumWidth, viewportWidth - horizontalSpace);
        const pageWidth = pagesPerSpread === 2 ? totalPageWidth / 2 : totalPageWidth;
        const pageHeight = Math.max(180, viewportHeight - 4);
        const fitScale = Math.min(1.75, ...pages.map((page) => {
          const baseViewport = page.getViewport({ scale: 1 });
          return Math.min(pageWidth / baseViewport.width, pageHeight / baseViewport.height);
        }));
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const bufferCanvases = [];
        const renderedSizes = [];

        await Promise.all(pages.map((page, index) => {
          if (cancelled) return Promise.resolve();
          const viewport = page.getViewport({ scale: Math.max(0.25, fitScale * zoom) });
          const canvas = document.createElement('canvas');
          bufferCanvases[index] = canvas;
          renderedSizes[index] = {
            width: Math.floor(viewport.width),
            height: Math.floor(viewport.height),
          };
          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);

          const renderTask = page.render({
            canvas,
            canvasContext: canvas.getContext('2d', { alpha: false }),
            viewport,
            transform: outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0],
          });
          renderTasks.push(renderTask);
          return renderTask.promise;
        }));

        if (!cancelled) {
          const animateTurn = shouldAnimateTurnRef.current;
          if (animateTurn && pagesPerSpread === 2 && canvases.length === 2 && renderedSlotCountRef.current === 2) {
            const turningIndex = turnDirection === 'next' ? 1 : 0;
            const backIndex = turnDirection === 'next' ? 0 : 1;
            const frontSnapshot = snapshotPageCanvas(canvases[turningIndex]);
            copyPageCanvas(canvases[turningIndex], bufferCanvases[turningIndex], renderedSizes[turningIndex]);

            const spreadBounds = spreadRef.current.getBoundingClientRect();
            const slotBounds = pageSlotRefs.current[turningIndex].getBoundingClientRect();
            setPageTurn({
              direction: turnDirection,
              frontSnapshot,
              backCanvas: bufferCanvases[backIndex],
              targetCanvases: bufferCanvases,
              renderedSizes,
              position: {
                left: slotBounds.left - spreadBounds.left,
                top: slotBounds.top - spreadBounds.top,
                width: slotBounds.width,
                height: slotBounds.height,
              },
            });
          } else {
            canvases.forEach((canvas, index) => {
              if (bufferCanvases[index]) copyPageCanvas(canvas, bufferCanvases[index], renderedSizes[index]);
            });

            if (animateTurn && spreadRef.current) {
              const spread = spreadRef.current;
              const animationClass = `reader-page-turn-${turnDirection}`;
              spread.classList.remove('reader-page-turn-next', 'reader-page-turn-previous');
              window.clearTimeout(turnAnimationTimeoutRef.current);
              void spread.offsetWidth;
              spread.classList.add(animationClass);
              turnAnimationTimeoutRef.current = window.setTimeout(() => {
                spread.classList.remove(animationClass);
              }, 440);
            }
          }

          setHasRenderedPage(true);
          setRenderedSlotCount(canvases.length);
          renderedSlotCountRef.current = canvases.length;
          setRendering(false);
          shouldAnimateTurnRef.current = false;
        }
      } catch (renderError) {
        if (cancelled || renderError?.name === 'RenderingCancelledException') return;
        renderTasks.forEach((task) => task.cancel());
        setError('This PDF page could not be rendered.');
        setRendering(false);
      } finally {
        if (renderTasksRef.current === renderTasks) renderTasksRef.current = [];
      }
    }

    renderSpread();
    return () => {
      cancelled = true;
      renderTasks.forEach((task) => task.cancel());
    };
  }, [pdfDocument, pageCount, pageNumber, pagesPerSpread, zoom, viewportWidth, viewportHeight, turnDirection]);

  useLayoutEffect(() => {
    if (!pageTurn || !turnLeafRef.current || !turnFrontCanvasRef.current || !turnBackCanvasRef.current) return undefined;

    const drawLayer = (target, source) => {
      target.width = source.width;
      target.height = source.height;
      target.getContext('2d', { alpha: false }).drawImage(source, 0, 0);
    };
    drawLayer(turnFrontCanvasRef.current, pageTurn.frontSnapshot);
    drawLayer(turnBackCanvasRef.current, pageTurn.backCanvas);

    const leaf = turnLeafRef.current;
    leaf.classList.remove('reader-turn-active');
    void leaf.offsetWidth;
    leaf.classList.add('reader-turn-active');
    window.clearTimeout(turnAnimationTimeoutRef.current);
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    turnAnimationTimeoutRef.current = window.setTimeout(() => {
      pageTurn.targetCanvases.forEach((target, index) => {
        const canvas = canvasRefs.current[index];
        if (canvas) copyPageCanvas(canvas, target, pageTurn.renderedSizes[index]);
      });
      renderedSlotCountRef.current = pageTurn.targetCanvases.length;
      setPageTurn(null);
    }, reducedMotion ? 20 : 740);

    return () => window.clearTimeout(turnAnimationTimeoutRef.current);
  }, [pageTurn]);

  function goToPage(page) {
    const nextPage = spreadStartFor(page, pageCount, pagesPerSpread);
    if (nextPage !== pageNumber) {
      setTurnDirection(nextPage > pageNumber ? 'next' : 'previous');
      shouldAnimateTurnRef.current = true;
    }
    setPageNumber(nextPage);
  }

  function turnSpread(direction) {
    goToPage(pageNumber + (direction * pagesPerSpread));
  }

  function changeZoom(value) {
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 10) / 10));
    setZoom(nextZoom);
    onPreferenceChange('pdfZoom', nextZoom);
  }

  async function searchDocument(event) {
    event.preventDefault();
    const query = searchQuery.trim();
    const document = documentRef.current;
    const runId = ++searchRunRef.current;
    setSearchResults([]);
    setSearchIndex(0);

    if (!query) {
      setSearchMessage('Enter a word or phrase to search this book.');
      return;
    }
    if (!document) return;

    setSearching(true);
    setSearchMessage('Searching all pages…');
    try {
      const normalizedQuery = query.toLocaleLowerCase();
      const matches = [];
      for (let page = 1; page <= document.numPages; page += 1) {
        if (runId !== searchRunRef.current) return;
        const content = await (await document.getPage(page)).getTextContent();
        const text = content.items.map((item) => item.str ?? '').join(' ').replace(/\s+/g, ' ').trim();
        const position = text.toLocaleLowerCase().indexOf(normalizedQuery);
        if (position >= 0) {
          const start = Math.max(0, position - 55);
          const end = Math.min(text.length, position + query.length + 95);
          matches.push({ page, snippet: `${start ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}` });
        }
      }

      if (runId !== searchRunRef.current) return;
      setSearchResults(matches);
      setSearchIndex(0);
      if (matches.length) {
        setSearchMessage(`${matches.length} page${matches.length === 1 ? '' : 's'} found`);
        goToPage(matches[0].page);
      } else {
        setSearchMessage('No matches found in this book.');
      }
    } catch {
      if (runId === searchRunRef.current) setSearchMessage('Search could not read this PDF’s text.');
    } finally {
      if (runId === searchRunRef.current) setSearching(false);
    }
  }

  function moveSearchResult(offset) {
    if (!searchResults.length) return;
    const nextIndex = (searchIndex + offset + searchResults.length) % searchResults.length;
    setSearchIndex(nextIndex);
    goToPage(searchResults[nextIndex].page);
  }

  function handleReaderKeyDown(event) {
    if (isEditableTarget(event.target)) return;
    if (event.target instanceof HTMLElement && event.target.closest('button, a')) return;

    if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      event.preventDefault();
      turnSpread(1);
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      turnSpread(-1);
      return;
    }

    if ((event.ctrlKey || event.metaKey) && ['a', 'c', 'x'].includes(event.key.toLowerCase())) event.preventDefault();
  }

  function handleReaderContextMenu(event) {
    if (!isEditableTarget(event.target)) event.preventDefault();
  }

  function focusPageViewport(event) {
    if (event.target instanceof HTMLElement && event.target.closest('button, input, textarea, select, a')) return;
    viewportRef.current?.focus({ preventScroll: true });
  }

  const activeResult = searchResults[searchIndex];
  const visiblePageNumbers = Array.from({ length: pagesPerSpread }, (_, index) => pageNumber + index)
    .filter((page) => page <= pageCount);
  const lastVisiblePage = visiblePageNumbers.at(-1) ?? pageNumber;

  return (
    <div
      data-reader-theme={preferences.theme}
      className={`pdf-reader flex h-full min-h-0 w-full min-w-0 select-none flex-col overflow-hidden ${preferences.theme === 'night' ? 'bg-[#1f2227] text-[#e5dfd4]' : preferences.theme === 'sepia' ? 'bg-[#d8cbb4] text-[#342719]' : 'bg-[#eee7d9] text-[#2d261e]'}`}
      onKeyDown={handleReaderKeyDown}
      onContextMenu={handleReaderContextMenu}
      onCopy={(event) => { if (!isEditableTarget(event.target)) event.preventDefault(); }}
      onCut={(event) => { if (!isEditableTarget(event.target)) event.preventDefault(); }}
    >
      <div className={`reader-toolbar shrink-0 border-b p-2 sm:px-4 ${preferences.theme === 'night' ? 'border-white/10 bg-white/[0.03]' : 'border-amber-900/20 bg-amber-950/[0.04]'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex shrink-0 items-center gap-1" aria-label="PDF spread navigation">
            <button className="grid h-9 w-9 place-items-center rounded-md border border-amber-900/25 text-sm hover:bg-amber-900/10 disabled:opacity-35" type="button" onClick={() => turnSpread(-1)} disabled={!pageCount || pageNumber <= 1 || rendering || Boolean(pageTurn)} aria-label="Previous spread">←</button>
            <span className="min-w-16 text-center font-display text-[11px] tabular-nums text-amber-950" aria-live="polite">
              {pageCount ? `${pageNumber}${pagesPerSpread === 2 && lastVisiblePage !== pageNumber ? `–${lastVisiblePage}` : ''} / ${pageCount}` : '— / —'}
            </span>
            <button className="grid h-9 w-9 place-items-center rounded-md border border-amber-900/25 text-sm hover:bg-amber-900/10 disabled:opacity-35" type="button" onClick={() => turnSpread(1)} disabled={!pageCount || pageNumber + pagesPerSpread > pageCount || rendering || Boolean(pageTurn)} aria-label="Next spread">→</button>
          </div>

          <div className="flex min-w-0 items-center gap-1">
            {searchOpen ? (
              <form className="flex min-w-0 items-center gap-1" onSubmit={searchDocument}>
                <label className="sr-only" htmlFor="pdf-book-search">Search this book</label>
                <input
                  ref={searchInputRef}
                  id="pdf-book-search"
                  className="min-h-9 w-32 select-text rounded-md border border-amber-900/25 bg-parchment-50/80 px-2.5 text-xs text-espresso-950 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-700/20 sm:w-48 sm:text-sm"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search book"
                />
                <button className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-amber-950 text-parchment-100 hover:bg-amber-900 disabled:opacity-60" type="submit" disabled={searching || loading || rendering || Boolean(pageTurn)} aria-label="Search this book">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <circle cx="10.8" cy="10.8" r="6.8" />
                    <path d="m16 16 4.5 4.5" />
                  </svg>
                </button>
                <button className="grid h-9 w-8 shrink-0 place-items-center rounded-md text-sm text-amber-900 hover:bg-amber-900/10" type="button" onClick={() => setSearchOpen(false)} aria-label="Close search">×</button>
              </form>
            ) : (
              <button className="grid h-9 w-9 place-items-center rounded-md border border-amber-900/25 text-amber-950 hover:bg-amber-900/10" type="button" onClick={() => setSearchOpen(true)} aria-label="Open book search">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <circle cx="10.8" cy="10.8" r="6.8" />
                  <path d="m16 16 4.5 4.5" />
                </svg>
              </button>
            )}

            <div className="flex shrink-0 items-center gap-1" aria-label="PDF zoom controls">
              <button className="grid h-9 w-9 place-items-center rounded-md border border-amber-900/25 text-sm hover:bg-amber-900/10" type="button" onClick={() => changeZoom(zoom - 0.1)} aria-label="Zoom out">−</button>
              <button className="h-9 min-w-12 rounded-md px-1 text-[10px] tabular-nums text-amber-950 hover:bg-amber-900/10" type="button" onClick={() => changeZoom(1)} aria-label="Fit page or spread to view">{Math.round(zoom * 100)}%</button>
              <button className="grid h-9 w-9 place-items-center rounded-md border border-amber-900/25 text-sm hover:bg-amber-900/10" type="button" onClick={() => changeZoom(zoom + 0.1)} aria-label="Zoom in">+</button>
            </div>
          </div>
        </div>

        {(activeResult || (searchMessage && !searchResults.length)) && (
          <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-amber-900/80" role="status" aria-live="polite">
            <span className="min-w-0 truncate">
              {activeResult ? `Match ${searchIndex + 1} of ${searchResults.length} · page ${activeResult.page}` : searchMessage}
            </span>
            {activeResult && (
              <div className="flex shrink-0 items-center gap-1">
                <button className="grid h-7 w-7 place-items-center rounded border border-amber-900/20 disabled:opacity-40" type="button" onClick={() => moveSearchResult(-1)} disabled={rendering || Boolean(pageTurn)} aria-label="Previous search result">←</button>
                <button className="grid h-7 w-7 place-items-center rounded border border-amber-900/20 disabled:opacity-40" type="button" onClick={() => moveSearchResult(1)} disabled={rendering || Boolean(pageTurn)} aria-label="Next search result">→</button>
              </div>
            )}
          </div>
        )}
        <p className="sr-only" role="status" aria-live="polite">
          {searching ? 'Searching all pages…' : rendering ? `Rendering pages ${pageNumber} to ${lastVisiblePage}…` : ''}
        </p>
      </div>

      <div
        ref={viewportRef}
        className={`pdf-reader-viewport relative min-h-0 flex-1 overflow-auto p-2 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-800/60 sm:p-4 ${preferences.theme === 'night' ? 'bg-gradient-to-b from-[#30333a] to-[#202227]' : preferences.theme === 'sepia' ? 'bg-gradient-to-b from-[#c9b898] to-[#b5a382]' : 'bg-gradient-to-b from-[#ded5c5] to-[#cec2ad]'}`}
        aria-label="PDF page viewer"
        aria-busy={loading || rendering || Boolean(pageTurn)}
        role="region"
        tabIndex={0}
        onPointerDown={focusPageViewport}
      >
        {(loading || (!hasRenderedPage && rendering)) && <p className="absolute inset-0 grid place-items-center p-6 text-center font-serif text-amber-950/75">Opening {book.pdfName || 'book'}…</p>}
        {error && <p className="absolute inset-0 grid place-items-center p-6 text-center font-serif text-red-900" role="alert">{error}</p>}
        <div ref={spreadRef} className="relative mx-auto flex w-fit items-stretch justify-center">
          {visiblePageNumbers.map((page, index) => (
            <div
              ref={(slot) => { pageSlotRefs.current[index] = slot; }}
              className={`reader-pdf-page relative shrink-0 bg-white ${!hasRenderedPage || index >= renderedSlotCount ? 'hidden' : ''} ${pagesPerSpread === 2 ? (index === 0 ? 'border-y border-l border-amber-950/10 shadow-[-6px_3px_14px_-10px_rgba(50,30,10,0.5)]' : 'border-y border-r border-amber-950/10 shadow-[6px_3px_14px_-10px_rgba(50,30,10,0.5)]') : 'border border-amber-950/10 shadow-xl'}`}
              key={`page-slot-${index}`}
            >
              <canvas
                ref={(canvas) => { canvasRefs.current[index] = canvas; }}
                className={`block bg-white ${loading || error || !hasRenderedPage ? 'invisible' : ''}`}
                aria-label={`Page ${page} of ${pageCount} in ${book.title}`}
              />
              {book.visibility === 'private' && !loading && !error && (
                <PrivateWatermark title={book.title} />
              )}
            </div>
          ))}
          {pagesPerSpread === 2 && visiblePageNumbers.length === 2 && (
            <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-5 -translate-x-1/2 bg-gradient-to-r from-transparent via-[#563b21]/20 to-transparent" aria-hidden="true" />
          )}
          {pageTurn && (
            <div
              ref={turnLeafRef}
              className={`reader-turn-leaf reader-turn-${pageTurn.direction}`}
              style={pageTurn.position}
              aria-hidden="true"
            >
              <div className="reader-turn-inner">
                <div className="reader-turn-face reader-turn-front">
                  <canvas ref={turnFrontCanvasRef} className="block h-full w-full bg-white" />
                  {book.visibility === 'private' && <PrivateWatermark title={book.title} />}
                </div>
                <div className="reader-turn-face reader-turn-back">
                  <canvas ref={turnBackCanvasRef} className="block h-full w-full bg-white" />
                  {book.visibility === 'private' && <PrivateWatermark title={book.title} />}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {pageCount > 0 && (
        <div className={`flex shrink-0 items-center gap-3 border-t px-3 py-2 sm:px-5 ${preferences.theme === 'night' ? 'border-white/10 bg-white/[0.03]' : 'border-amber-900/15 bg-amber-950/[0.025]'}`}>
          <span className="min-w-16 text-center font-display text-[10px] tabular-nums opacity-75">{Math.round(((pageNumber - 1) / Math.max(1, pageCount - 1)) * 100)}%</span>
          <input
            className="reader-range min-w-0 flex-1"
            type="range"
            min="1"
            max={pageCount}
            step={pagesPerSpread}
            value={pageNumber}
            onChange={(event) => goToPage(Number(event.target.value))}
            aria-label="Reading progress"
          />
          <span className="min-w-20 text-right font-display text-[10px] tabular-nums opacity-75">Page {pageNumber} / {pageCount}</span>
        </div>
      )}
    </div>
  );
}
