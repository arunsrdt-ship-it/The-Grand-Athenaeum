import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { CURATED_BOOKS, getBookLocation } from './library/books.js';
import { createLibraryScene } from './library/createLibraryScene.js';
import { useMultiplayer } from './multiplayer/useMultiplayer.js';
import PdfReader from './features/reader/PdfReader.jsx';
import {
  libraryApi,
  setLibraryOwnerToken,
  useGetBooksQuery,
  useUploadBookMutation,
  useGetCurrentReaderQuery,
  useGetReaderBookmarksQuery,
  useRegisterReaderMutation,
  useLoginReaderMutation,
  useLogoutReaderMutation,
  useSaveReaderBookmarkMutation,
  useRemoveReaderBookmarkMutation,
} from './services/libraryApi.js';

const VIEWPOINTS = [
  ['grandHall', 'Grand Hall'],
  ['readingDesk', 'Reading Desk'],
  ['westShelves', 'West Shelves'],
  ['eastShelves', 'East Shelves'],
  ['upperGallery', 'Upper Gallery'],
];

const READER_PREFERENCES_KEY = 'athenaeum-reader-preferences-v1';
const DEFAULT_READER_PREFERENCES = {
  theme: 'paper',
  layout: 'auto',
  fontSize: 19,
  fontFamily: 'serif',
  lineHeight: 1.75,
  pdfZoom: 1,
};

const READER_THEMES = {
  paper: {
    background: '#eee7d9',
    panel: '#f7f2e8',
    paper: '#fbf8f1',
    ink: '#2d261e',
    muted: '#746957',
    border: 'rgba(93, 72, 42, 0.18)',
  },
  sepia: {
    background: '#d8cbb4',
    panel: '#e6dac3',
    paper: '#f0e4cc',
    ink: '#342719',
    muted: '#79664c',
    border: 'rgba(82, 57, 28, 0.24)',
  },
  night: {
    background: '#17191c',
    panel: '#22252a',
    paper: '#26292e',
    ink: '#e7e0d4',
    muted: '#aaa293',
    border: 'rgba(223, 210, 185, 0.16)',
  },
};

function loadReaderPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(READER_PREFERENCES_KEY) || '{}') || {};
    return {
      ...DEFAULT_READER_PREFERENCES,
      ...saved,
      theme: READER_THEMES[saved.theme] ? saved.theme : DEFAULT_READER_PREFERENCES.theme,
      layout: ['auto', 'single', 'spread'].includes(saved.layout) ? saved.layout : DEFAULT_READER_PREFERENCES.layout,
      fontSize: Number.isFinite(saved.fontSize) ? Math.min(28, Math.max(16, saved.fontSize)) : DEFAULT_READER_PREFERENCES.fontSize,
      fontFamily: saved.fontFamily === 'sans' ? 'sans' : 'serif',
      lineHeight: [1.55, 1.75, 1.95].includes(saved.lineHeight) ? saved.lineHeight : DEFAULT_READER_PREFERENCES.lineHeight,
      pdfZoom: Number.isFinite(saved.pdfZoom) ? Math.min(2, Math.max(0.5, saved.pdfZoom)) : DEFAULT_READER_PREFERENCES.pdfZoom,
    };
  } catch {
    return { ...DEFAULT_READER_PREFERENCES };
  }
}

function loadBookmarkedIds() {
  try {
    const saved = JSON.parse(localStorage.getItem('athenaeum-bookmarks-v1') || '[]');
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
}

function getBookBookmarkKey(book, index) {
  const shelfSlot = Number.isInteger(book.shelfSlot) ? book.shelfSlot : index;
  return `my-book-${String(shelfSlot + 1).padStart(2, '0')}`;
}

function ReaderAccountDialog({ open, user, busy, error, onClose, onSubmit, onLogout }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!open) return;
    setEmail(user?.email ?? '');
    setPassword('');
  }, [open, user]);

  if (!open) return null;

  function submit(event) {
    event.preventDefault();
    onSubmit({ mode, email, password });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } }}>
      <section className="vintage-panel w-full max-w-md rounded-2xl border border-gold-400/40 p-5 shadow-2xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby="reader-account-title">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-[10px] uppercase tracking-[0.24em] text-gold-400">Your Athenaeum account</p>
            <h2 id="reader-account-title" className="mt-1 font-display text-xl text-parchment-50">{user ? 'Saved books' : mode === 'login' ? 'Welcome back' : 'Create an account'}</h2>
          </div>
          <button className="vintage-btn grid min-h-10 min-w-10 place-items-center rounded-lg text-lg" type="button" onClick={onClose} aria-label="Close account dialog">×</button>
        </div>

        {user ? (
          <div className="space-y-4">
            <p className="text-sm text-parchment-100">Signed in as <span className="font-semibold text-gold-200">{user.email}</span></p>
            <p className="text-xs leading-relaxed text-parchment-200/70">Your bookmarks sync to this account when you sign in on another device.</p>
            {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-950/30 px-3 py-2 text-xs text-red-200">{error}</p>}
            <div className="flex justify-end gap-2">
              <button className="vintage-btn min-h-11 rounded-lg px-4 font-display text-xs" type="button" onClick={onClose}>Done</button>
              <button className="vintage-btn min-h-11 rounded-lg px-4 font-display text-xs" type="button" onClick={onLogout} disabled={busy}>{busy ? 'Signing out…' : 'Sign out'}</button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-2" role="group" aria-label="Account action">
              {['login', 'register'].map((value) => (
                <button key={value} className={`min-h-10 rounded-lg border px-3 font-display text-xs uppercase tracking-wider ${mode === value ? 'border-gold-400/60 bg-gold-500/15 text-gold-100' : 'border-gold-500/20 text-parchment-200/70'}`} type="button" onClick={() => setMode(value)} aria-pressed={mode === value}>
                  {value === 'login' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>
            <form className="space-y-3" onSubmit={submit}>
              <label className="block space-y-1 text-xs text-parchment-200/85">
                <span>Email</span>
                <input className="min-h-11 w-full rounded-lg border border-gold-500/30 bg-espresso-950/70 px-3 text-sm text-parchment-50" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label className="block space-y-1 text-xs text-parchment-200/85">
                <span>Password</span>
                <input className="min-h-11 w-full rounded-lg border border-gold-500/30 bg-espresso-950/70 px-3 text-sm text-parchment-50" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'register' ? 8 : undefined} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} />
                {mode === 'register' && <span className="block text-[11px] text-parchment-200/60">Use at least 8 characters.</span>}
              </label>
              {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-950/30 px-3 py-2 text-xs text-red-200">{error}</p>}
              <button className="vintage-btn min-h-11 w-full rounded-lg px-4 font-display text-xs uppercase tracking-wider disabled:opacity-60" type="submit" disabled={busy}>
                {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

function ReaderSettings({ open, preferences, onChange, isPdf }) {
  if (!open) return null;

  const choiceClass = (selected) => `min-h-10 rounded-lg border px-3 text-xs transition ${selected ? 'border-amber-700 bg-amber-800/10 font-semibold' : 'border-current/15 hover:bg-amber-800/5'}`;

  return (
    <aside className="reader-settings-panel absolute right-4 top-[4.25rem] z-30 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border p-4 shadow-xl" aria-label="Reading settings">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xs uppercase tracking-[0.18em]">Reading settings</h2>
        <span className="text-[10px] opacity-65">Saved on this device</span>
      </div>

      <div className="mb-4">
        <div className="mb-2 text-xs font-semibold">Reading theme</div>
        <div className="grid grid-cols-3 gap-2">
          {[
            ['paper', 'Paper', '#f7f2e8'],
            ['sepia', 'Sepia', '#d8c5a5'],
            ['night', 'Night', '#22252a'],
          ].map(([value, label, swatch]) => (
            <button key={value} className={choiceClass(preferences.theme === value)} type="button" onClick={() => onChange('theme', value)} aria-pressed={preferences.theme === value}>
              <span className="mr-1.5 inline-block h-3 w-3 rounded-full border border-black/20 align-[-2px]" style={{ background: swatch }} />{label}
            </button>
          ))}
        </div>
      </div>

      {isPdf ? (
        <div>
          <div className="mb-2 text-xs font-semibold">Page layout</div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['auto', 'Auto'],
              ['single', 'One page'],
              ['spread', 'Two pages'],
            ].map(([value, label]) => (
              <button key={value} className={choiceClass(preferences.layout === value)} type="button" onClick={() => onChange('layout', value)} aria-pressed={preferences.layout === value}>{label}</button>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-relaxed opacity-70">PDFs keep their original layout. Page tone, spread, and zoom can still be adjusted.</p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold"><span>Text size</span><span>{preferences.fontSize}px</span></div>
            <div className="flex items-center gap-2">
              <button className={choiceClass(false)} type="button" onClick={() => onChange('fontSize', Math.max(16, preferences.fontSize - 1))} aria-label="Decrease text size">A−</button>
              <input className="reader-range min-w-0 flex-1" type="range" min="16" max="28" step="1" value={preferences.fontSize} onChange={(event) => onChange('fontSize', Number(event.target.value))} aria-label="Text size" />
              <button className={choiceClass(false)} type="button" onClick={() => onChange('fontSize', Math.min(28, preferences.fontSize + 1))} aria-label="Increase text size">A+</button>
            </div>
          </div>
          <div className="mb-4">
            <div className="mb-2 text-xs font-semibold">Typeface</div>
            <div className="grid grid-cols-2 gap-2">
              <button className={choiceClass(preferences.fontFamily === 'serif')} type="button" onClick={() => onChange('fontFamily', 'serif')}>Serif</button>
              <button className={choiceClass(preferences.fontFamily === 'sans')} type="button" onClick={() => onChange('fontFamily', 'sans')}>Sans serif</button>
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-semibold">Line spacing</div>
            <div className="grid grid-cols-3 gap-2">
              {[[1.55, 'Compact'], [1.75, 'Relaxed'], [1.95, 'Open']].map(([value, label]) => (
                <button key={value} className={choiceClass(preferences.lineHeight === value)} type="button" onClick={() => onChange('lineHeight', value)}>{label}</button>
              ))}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}

function BookCover({ book, className = '' }) {
  const fallbackStyle = {
    background: `linear-gradient(145deg, ${book.color}, #110c09 145%)`,
    borderColor: book.accent,
  };

  return (
    <div className={`relative isolate flex shrink-0 items-center justify-center overflow-hidden rounded-sm border shadow-lg ${className}`} style={fallbackStyle}>
      <div className="pointer-events-none absolute inset-1 flex flex-col items-center justify-center border border-white/30 px-1 text-center">
        <span className="font-display text-[8px] uppercase tracking-[0.16em] text-parchment-200">{book.category}</span>
        <span className="mt-1 line-clamp-3 font-serif text-[10px] leading-tight text-parchment-50">{book.title}</span>
        <span className="mt-1 text-[8px] italic text-parchment-200/80">{book.author}</span>
      </div>
      {book.coverImage && (
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src={book.coverImage}
          alt={`Cover of ${book.title}`}
          loading="lazy"
          onError={(event) => event.currentTarget.remove()}
        />
      )}
    </div>
  );
}

export default function App() {
  const dispatch = useDispatch();
  const immersiveRootRef = useRef(null);
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const townIframeRef = useRef(null);
  const hasEnteredTownRef = useRef(false);
  const townLeavingRef = useRef(false);
  const townLeaveTimerRef = useRef(null);
  const tooltipRef = useRef(null);
  const toastTimerRef = useRef(null);
  const introTimerRef = useRef(null);
  const bookmarkMigrationUserRef = useRef(null);
  const callbacksRef = useRef({});
  const multiplayer = useMultiplayer();

  const [introOpen, setIntroOpen] = useState(true);
  const [introVisible, setIntroVisible] = useState(true);
  const [townOpen, setTownOpen] = useState(false);
  const [townLeaving, setTownLeaving] = useState(false);
  const [townReady, setTownReady] = useState(false);
  const [townEntryPending, setTownEntryPending] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [roomNameDraft, setRoomNameDraft] = useState(multiplayer.identity.name);
  const [chatDraft, setChatDraft] = useState('');
  const [mood, setMood] = useState('midnight');
  const [highlighted, setHighlighted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [activeBookIndex, setActiveBookIndex] = useState(null);
  const [activeView, setActiveView] = useState('grandHall');
  const [discoveredIds, setDiscoveredIds] = useState(() => new Set());
  const [localBookmarkedIds, setLocalBookmarkedIds] = useState(loadBookmarkedIds);
  const [readerPreferences, setReaderPreferences] = useState(loadReaderPreferences);
  const [readerSettingsOpen, setReaderSettingsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [journeyState, setJourneyState] = useState({
    phase: 'explore',
    prompt: 'Explore the shelves, or turn around to find the door to Vieux Quartier.',
    bookTitle: '',
  });
  const [toast, setToast] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileHelpOpen, setMobileHelpOpen] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [ownerAccessOpen, setOwnerAccessOpen] = useState(false);
  const [isOwnerMode, setIsOwnerMode] = useState(false);
  const [ownerQueryVersion, setOwnerQueryVersion] = useState(0);
  const [ownerToken, setOwnerToken] = useState('');
  const [uploadTargetIndex, setUploadTargetIndex] = useState('0');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadAuthor, setUploadAuthor] = useState('');
  const [uploadCategory, setUploadCategory] = useState('My Books');
  const [uploadYear, setUploadYear] = useState('');
  const [uploadVisibility, setUploadVisibility] = useState('public');
  const [uploadError, setUploadError] = useState('');
  const booksAccessKey = isOwnerMode ? 'owner-' + ownerQueryVersion : 'public';
  const { data: savedBooks = [], isError: hasStorageError, isFetching: isFetchingBooks } = useGetBooksQuery(booksAccessKey);
  const { data: readerUser = null } = useGetCurrentReaderQuery();
  const { data: serverBookmarks = [], isFetching: isFetchingReaderBookmarks } = useGetReaderBookmarksQuery(undefined, { skip: !readerUser });
  const isOwnerVerified = isOwnerMode && !isFetchingBooks && !hasStorageError;
  const [uploadBook, { isLoading: isUploading }, resetUpload] = useUploadBookMutation({ fixedCacheKey: 'library-upload' });
  const [registerReader, { isLoading: isRegistering }] = useRegisterReaderMutation();
  const [loginReader, { isLoading: isLoggingIn }] = useLoginReaderMutation();
  const [logoutReader, { isLoading: isLoggingOut }] = useLogoutReaderMutation();
  const [saveReaderBookmark] = useSaveReaderBookmarkMutation();
  const [removeReaderBookmark] = useRemoveReaderBookmarkMutation();
  const [accountError, setAccountError] = useState('');
  const accountBusy = isRegistering || isLoggingIn || isLoggingOut;
  const serverBookmarkedIds = useMemo(() => new Set(serverBookmarks.map(({ bookKey }) => bookKey)), [serverBookmarks]);
  const bookmarkedIds = useMemo(() => readerUser
    ? new Set([...serverBookmarkedIds, ...localBookmarkedIds])
    : localBookmarkedIds, [readerUser, serverBookmarkedIds, localBookmarkedIds]);

  const libraryBooks = useMemo(() => {
    const booksByShelfSlot = new Map(savedBooks.map((book) => [book.shelfSlot, book]));
    return CURATED_BOOKS.map((book, index) => ({ ...book, ...booksByShelfSlot.get(index) }));
  }, [savedBooks]);
  const storageError = hasStorageError
    ? isOwnerMode
      ? 'Owner access could not be verified. Check the token and backend configuration.'
      : 'Book storage is unavailable. Start and configure the backend to load saved PDFs.'
    : '';

  const announce = useCallback((message) => {
    setToast(message);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(''), 2400);
  }, []);

  callbacksRef.current = {
    getBookData(index) {
      return libraryBooks[index];
    },
    onRead(index) {
      const book = libraryBooks[index];
      if (!book) return;
      setActiveBookIndex(index);
      setReaderSettingsOpen(false);
      setDiscoveredIds((previous) => new Set(previous).add(book.id));
    },
    onHover: setHoveredItem,
    onToast: announce,
    onJourneyState: setJourneyState,
    onViewChange: setActiveView,
    onMoodChange: setMood,
    onEnterTown() {
      setCatalogOpen(false);
      if (townReady) setTownOpen(true);
      else setTownEntryPending(true);
    },
    onPose(pose) {
      if (!townOpen) multiplayer.sendPose('library', pose);
    },
    onPointerMove(x, y) {
      if (!tooltipRef.current) return;
      tooltipRef.current.style.left = `${x}px`;
      tooltipRef.current.style.top = `${y}px`;
    },
  };

  useEffect(() => {
    if (!canvasRef.current) return undefined;

    const scene = createLibraryScene({
      container: canvasRef.current,
      getBookData: (index) => callbacksRef.current.getBookData(index),
      onRead: (index) => callbacksRef.current.onRead(index),
      onHover: (item) => callbacksRef.current.onHover(item),
      onToast: (message) => callbacksRef.current.onToast(message),
      onPointerMove: (x, y) => callbacksRef.current.onPointerMove(x, y),
      onJourneyState: (journey) => callbacksRef.current.onJourneyState(journey),
      onViewChange: (viewName) => callbacksRef.current.onViewChange(viewName),
      onMoodChange: (nextMood) => callbacksRef.current.onMoodChange(nextMood),
      onEnterTown: () => callbacksRef.current.onEnterTown(),
      onPose: (pose) => callbacksRef.current.onPose(pose),
    });
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
      window.clearTimeout(toastTimerRef.current);
      window.clearTimeout(introTimerRef.current);
      window.clearTimeout(townLeaveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setInputEnabled(!introOpen && activeBookIndex === null && !catalogOpen && !townOpen);
  }, [introOpen, activeBookIndex, catalogOpen, townOpen]);

  useEffect(() => {
    if (!townReady || !townEntryPending) return;
    setTownOpen(true);
    setTownEntryPending(false);
  }, [townReady, townEntryPending]);

  useEffect(() => {
    function handleTownMessage(event) {
      if (event.origin !== window.location.origin || event.source !== townIframeRef.current?.contentWindow) return;
      if (event.data?.type === 'vieux-quartier-ready') setTownReady(true);
      if (event.data?.type === 'return-to-library') returnToLibrary();
      if (event.data?.type === 'town-pose' && townOpen) multiplayer.sendPose('town', event.data.pose);
    }

    window.addEventListener('message', handleTownMessage);
    return () => window.removeEventListener('message', handleTownMessage);
  }, [townOpen, multiplayer.sendPose]);

  useEffect(() => {
    if (!townReady) return;
    townIframeRef.current?.contentWindow?.postMessage({ type: 'town-active', active: townOpen }, window.location.origin);
    const pose = townOpen
      ? { x: -30.2, z: 0, yaw: -Math.PI / 2, pitch: 0, moving: false }
      : sceneRef.current?.getPose();
    if (pose) multiplayer.sendPose(townOpen ? 'town' : 'library', pose);
    if (townOpen) {
      hasEnteredTownRef.current = true;
      townIframeRef.current?.focus();
    } else if (hasEnteredTownRef.current) {
      canvasRef.current?.querySelector('canvas')?.focus();
    }
  }, [townOpen, townReady, multiplayer.sendPose]);

  useEffect(() => {
    const libraryPlayers = multiplayer.players.filter((player) => player.zone === 'library');
    const townPlayers = multiplayer.players.filter((player) => player.zone === 'town');
    sceneRef.current?.setRemotePlayers(libraryPlayers);
    if (townReady) {
      townIframeRef.current?.contentWindow?.postMessage({ type: 'multiplayer-players', players: townPlayers }, window.location.origin);
    }
  }, [multiplayer.players, townReady]);

  useEffect(() => {
    if (!multiplayer.lastAction) return;
    const { fromId, action, zone } = multiplayer.lastAction;
    if (zone === 'town') {
      townIframeRef.current?.contentWindow?.postMessage({ type: 'multiplayer-action', action: multiplayer.lastAction }, window.location.origin);
    } else {
      sceneRef.current?.showPlayerAction(fromId, action);
    }
  }, [multiplayer.lastAction]);

  useEffect(() => {
    try {
      localStorage.setItem(READER_PREFERENCES_KEY, JSON.stringify(readerPreferences));
    } catch {
      // Keep reading settings usable when browser storage is unavailable.
    }
  }, [readerPreferences]);

  useEffect(() => {
    try {
      localStorage.setItem('athenaeum-bookmarks-v1', JSON.stringify([...localBookmarkedIds]));
    } catch {
      // Bookmarks remain available for the current session if storage is unavailable.
    }
  }, [localBookmarkedIds]);

  useEffect(() => {
    if (!readerUser) {
      bookmarkMigrationUserRef.current = null;
      return;
    }
    if (isFetchingReaderBookmarks || bookmarkMigrationUserRef.current === readerUser.id) return;

    const pendingBookmarks = [...localBookmarkedIds].filter((bookKey) => !serverBookmarkedIds.has(bookKey));
    bookmarkMigrationUserRef.current = readerUser.id;
    if (pendingBookmarks.length === 0) return;

    (async () => {
      const savedKeys = [];
      try {
        for (const bookKey of pendingBookmarks) {
          await saveReaderBookmark(bookKey).unwrap();
          savedKeys.push(bookKey);
        }
        setLocalBookmarkedIds((previous) => {
          const next = new Set(previous);
          savedKeys.forEach((bookKey) => next.delete(bookKey));
          return next;
        });
        announce('Your device bookmarks are now saved to your account');
      } catch {
        setLocalBookmarkedIds((previous) => {
          const next = new Set(previous);
          savedKeys.forEach((bookKey) => next.delete(bookKey));
          return next;
        });
        announce('Some device bookmarks could not sync. They are still saved on this device.');
      }
    })();
  }, [readerUser, isFetchingReaderBookmarks, localBookmarkedIds, serverBookmarkedIds, saveReaderBookmark, announce]);

  useEffect(() => {
    function syncFullscreenState() {
      setIsFullscreen(document.fullscreenElement === immersiveRootRef.current);
    }

    document.addEventListener('fullscreenchange', syncFullscreenState);
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState);
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select'))) return;

      if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        toggleFullscreen();
        return;
      }

      if (/^[1-5]$/.test(event.key) && activeBookIndex === null && !catalogOpen && !introOpen) {
        changeView(VIEWPOINTS[Number(event.key) - 1][0]);
        return;
      }

      if (event.key === 'Escape') {
        if (accountOpen) setAccountOpen(false);
        else if (activeBookIndex !== null && readerSettingsOpen) setReaderSettingsOpen(false);
        else if (activeBookIndex !== null) closeBook();
        else if (catalogOpen) setCatalogOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeBookIndex, accountOpen, catalogOpen, introOpen, readerSettingsOpen]);

  function enterLibrary() {
    setIntroVisible(false);
    introTimerRef.current = window.setTimeout(() => setIntroOpen(false), 700);
  }

  function returnToLibrary() {
    if (townLeavingRef.current) return;
    townLeavingRef.current = true;
    sceneRef.current?.closeTownDoor();
    setTownLeaving(true);
    townLeaveTimerRef.current = window.setTimeout(() => {
      setTownOpen(false);
      setTownLeaving(false);
      townLeavingRef.current = false;
    }, 520);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => announce('Could not exit fullscreen mode'));
      return;
    }

    const requestFullscreen = immersiveRootRef.current?.requestFullscreen;
    if (!requestFullscreen) {
      announce('Fullscreen mode is not available in this browser');
      return;
    }

    requestFullscreen.call(immersiveRootRef.current, { navigationUI: 'hide' })
      .catch(() => announce('Could not enter fullscreen mode'));
  }

  function switchMood() {
    const nextMood = mood === 'midnight' ? 'afternoon' : 'midnight';
    setMood(nextMood);
    sceneRef.current?.setLightingMood(nextMood);
    announce(nextMood === 'midnight' ? 'Switched to Candlelit Midnight' : 'Switched to Golden Afternoon');
  }

  function toggleHighlights() {
    const nextValue = !highlighted;
    setHighlighted(nextValue);
    sceneRef.current?.setHighlights(nextValue);
    announce(nextValue ? `Highlighting all ${libraryBooks.length} Curated Tomes` : 'Tome Highlights Hidden');
  }

  function toggleAudio() {
    const nextValue = !audioEnabled;
    setAudioEnabled(nextValue);
    sceneRef.current?.setAudioEnabled(nextValue);
  }

  function zoomScene(factor) {
    sceneRef.current?.zoom(factor);
  }

  function updateReaderPreference(name, value) {
    setReaderPreferences((previous) => ({ ...previous, [name]: value }));
  }

  function closeBook() {
    setReaderSettingsOpen(false);
    setActiveBookIndex(null);
    sceneRef.current?.closeBook();
  }

  async function submitReaderAccount({ mode, email, password }) {
    setAccountError('');
    try {
      const response = mode === 'register'
        ? await registerReader({ email, password }).unwrap()
        : await loginReader({ email, password }).unwrap();
      if (response?.user) {
        dispatch(libraryApi.util.updateQueryData('getCurrentReader', undefined, () => response.user));
      }
      setAccountOpen(false);
      announce(mode === 'register' ? 'Account created — you are signed in' : 'You are signed in');
    } catch (error) {
      setAccountError(error?.data?.error || 'The account request could not be completed.');
    }
  }

  async function signOutReader() {
    setAccountError('');
    try {
      await logoutReader().unwrap();
      announce('You are signed out');
    } catch (error) {
      setAccountError(error?.data?.error || 'Could not sign out. Try again.');
    }
  }

  function visitBook(index) {
    setCatalogOpen(false);
    sceneRef.current?.visitBook(index);
  }

  function moveBook(offset) {
    if (activeBookIndex === null) return;
    const nextIndex = (activeBookIndex + offset + libraryBooks.length) % libraryBooks.length;
    setActiveBookIndex(null);
    sceneRef.current?.closeBook();
    sceneRef.current?.visitBook(nextIndex);
  }

  function setWalkInput(direction, active, event) {
    event.preventDefault();
    event.stopPropagation();
    if (active && event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    sceneRef.current?.setMovementInput(direction, active);
  }

  function handlePdfSelection(event) {
    const file = event.currentTarget.files?.[0] ?? null;
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Choose a PDF file.');
      setUploadFile(null);
      event.currentTarget.value = '';
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setUploadError('PDFs must be 100 MB or smaller.');
      setUploadFile(null);
      event.currentTarget.value = '';
      return;
    }

    setUploadError('');
    setUploadFile(file);
    setUploadTitle(file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '));
  }

  function unlockOwnerAccess(event) {
    event.preventDefault();
    const token = ownerToken.trim();
    if (!token) {
      setUploadError('Enter the owner access token.');
      return;
    }

    setUploadError('');
    setLibraryOwnerToken(token);
    setOwnerQueryVersion((version) => version + 1);
    setIsOwnerMode(true);
    setOwnerAccessOpen(false);
  }

  function lockOwnerAccess() {
    setLibraryOwnerToken('');
    setOwnerToken('');
    setUploadError('');
    setIsOwnerMode(false);
    setOwnerAccessOpen(false);
    setUploadOpen(false);
    setActiveBookIndex(null);
    sceneRef.current?.closeBook();
    dispatch(libraryApi.util.resetApiState());
  }

  async function attachPdfToBook(event) {
    event.preventDefault();
    if (!isOwnerVerified) {
      setUploadError(isOwnerMode ? 'Owner access was not verified. Lock and check the owner token.' : 'Unlock owner access before uploading a PDF.');
      if (!isOwnerMode) setOwnerAccessOpen(true);
      return;
    }
    if (!uploadFile) {
      setUploadError('Choose a PDF file before adding this book.');
      return;
    }

    const targetIndex = Number(uploadTargetIndex);
    const targetBook = libraryBooks[targetIndex];
    if (!targetBook) return;

    const bookTitle = uploadTitle.trim();
    if (!bookTitle) {
      setUploadError('Enter a book title.');
      return;
    }

    setUploadError('');
    try {
      const { book: savedBook } = await uploadBook({
        file: uploadFile,
        title: bookTitle,
        author: uploadAuthor.trim(),
        category: uploadCategory.trim(),
        year: uploadYear.trim(),
        shelfSlot: targetIndex,
        visibility: uploadVisibility,
      }).unwrap();
      setUploadFile(null);
      setUploadTitle('');
      setUploadAuthor('');
      setUploadCategory('My Books');
      setUploadYear('');
      setUploadVisibility('public');
      setUploadError('');
      setUploadOpen(false);
      announce(`Saved ${savedBook.title} to the library`);
    } catch (error) {
      setUploadError(error?.data?.error || error.message || 'The PDF could not be saved.');
    } finally {
      resetUpload();
    }
  }

  async function toggleBookmark() {
    if (activeBookIndex === null) return;
    const book = libraryBooks[activeBookIndex];
    const bookmarkKey = getBookBookmarkKey(book, activeBookIndex);
    const keysToRemove = [...new Set([bookmarkKey, book.id])].filter((key) => bookmarkedIds.has(key));
    const wasBookmarked = keysToRemove.length > 0;
    try {
      if (readerUser) {
        if (wasBookmarked) {
          await Promise.all(keysToRemove.map((key) => removeReaderBookmark(key).unwrap()));
          setLocalBookmarkedIds((previous) => {
            const next = new Set(previous);
            keysToRemove.forEach((key) => next.delete(key));
            return next;
          });
        }
        else await saveReaderBookmark(bookmarkKey).unwrap();
      } else {
        setLocalBookmarkedIds((previous) => {
          const next = new Set(previous);
          if (wasBookmarked) keysToRemove.forEach((key) => next.delete(key));
          else next.add(bookmarkKey);
          return next;
        });
      }
      if (wasBookmarked) announce('Removed from Bookmarks');
      else announce(readerUser ? `Bookmarked “${book.title}”` : 'Saved on this device. Sign in to sync it across devices.');
    } catch (error) {
      announce(error?.data?.error || 'The bookmark could not be saved.');
    }
  }

  function changeView(viewName) {
    setActiveView(viewName);
    if (activeBookIndex !== null) {
      setActiveBookIndex(null);
      sceneRef.current?.closeBook();
    }
    sceneRef.current?.goToView(viewName);
  }

  const activeBook = activeBookIndex === null ? null : libraryBooks[activeBookIndex];
  const bookmarkedBookCount = libraryBooks.reduce((count, book, index) => (
    count + (bookmarkedIds.has(getBookBookmarkKey(book, index)) || bookmarkedIds.has(book.id) ? 1 : 0)
  ), 0);
  const isBookmarked = activeBook
    ? bookmarkedIds.has(getBookBookmarkKey(activeBook, activeBookIndex)) || bookmarkedIds.has(activeBook.id)
    : false;
  const readerTheme = READER_THEMES[readerPreferences.theme] ?? READER_THEMES.paper;
  const isJourneyInMotion = ['approaching', 'fetching', 'walkingToDesk', 'placing', 'settling', 'returningToBook'].includes(journeyState.phase);

  return (
    <main ref={immersiveRootRef} className="library-app-shell relative w-screen overflow-hidden bg-espresso-950 text-parchment-100">
      <div id="canvas-container" ref={canvasRef} aria-label="Interactive 3D Vintage Library" />

      <div className="mobile-zoom-controls pointer-events-auto fixed top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2 md:hidden" aria-label="3D zoom controls">
        <button className="vintage-btn min-h-11 min-w-11 cursor-pointer rounded-xl font-display text-xl text-gold-200" onClick={() => zoomScene(0.82)} aria-label="Zoom in">+</button>
        <button className="vintage-btn min-h-11 min-w-11 cursor-pointer rounded-xl font-display text-xl text-gold-200" onClick={() => zoomScene(1.22)} aria-label="Zoom out">−</button>
      </div>

      {!introOpen && activeBookIndex === null && !catalogOpen && (
        <>
          <div className="pointer-events-none fixed left-1/2 top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
            <span className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-parchment-100/70" />
            <span className="absolute left-0 top-1/2 h-px w-4 -translate-y-1/2 bg-parchment-100/70" />
            <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-300" />
          </div>
          <div className="pointer-events-none fixed bottom-44 left-1/2 z-10 max-w-[min(86vw,32rem)] -translate-x-1/2 text-center sm:bottom-24">
            <div className="vintage-panel rounded-xl px-4 py-2 text-xs text-parchment-100/90 sm:text-sm">
              {journeyState.prompt}
              {journeyState.bookTitle && <span className="mt-0.5 block font-display text-[10px] uppercase tracking-wider text-gold-300">{journeyState.bookTitle}</span>}
            </div>
          </div>
        </>
      )}

      {!introOpen && activeBookIndex === null && !catalogOpen && !isJourneyInMotion && (
        <div className="mobile-game-controls pointer-events-auto fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] left-3 z-20 grid grid-cols-3 gap-1 md:hidden" aria-label="Movement controls">
          <span />
          <button className="vintage-btn min-h-11 min-w-11 touch-none select-none rounded-xl font-display text-lg" aria-label="Walk forward" onPointerDown={(event) => setWalkInput('forward', true, event)} onPointerUp={(event) => setWalkInput('forward', false, event)} onPointerCancel={(event) => setWalkInput('forward', false, event)} onLostPointerCapture={(event) => sceneRef.current?.setMovementInput('forward', false)}>↑</button>
          <span />
          <button className="vintage-btn min-h-11 min-w-11 touch-none select-none rounded-xl font-display text-lg" aria-label="Walk left" onPointerDown={(event) => setWalkInput('left', true, event)} onPointerUp={(event) => setWalkInput('left', false, event)} onPointerCancel={(event) => setWalkInput('left', false, event)} onLostPointerCapture={(event) => sceneRef.current?.setMovementInput('left', false)}>←</button>
          <button className="vintage-btn min-h-11 min-w-11 touch-none select-none rounded-xl font-display text-lg" aria-label="Walk backward" onPointerDown={(event) => setWalkInput('backward', true, event)} onPointerUp={(event) => setWalkInput('backward', false, event)} onPointerCancel={(event) => setWalkInput('backward', false, event)} onLostPointerCapture={(event) => sceneRef.current?.setMovementInput('backward', false)}>↓</button>
          <button className="vintage-btn min-h-11 min-w-11 touch-none select-none rounded-xl font-display text-lg" aria-label="Walk right" onPointerDown={(event) => setWalkInput('right', true, event)} onPointerUp={(event) => setWalkInput('right', false, event)} onPointerCancel={(event) => setWalkInput('right', false, event)} onLostPointerCapture={(event) => sceneRef.current?.setMovementInput('right', false)}>→</button>
        </div>
      )}
      {!introOpen && activeBookIndex === null && !catalogOpen && !isJourneyInMotion && (
        <button className="mobile-interact-control vintage-btn pointer-events-auto fixed bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] right-3 z-20 min-h-14 min-w-20 rounded-2xl px-3 font-display text-xs uppercase tracking-wider md:hidden" onClick={() => sceneRef.current?.interact()}>
          {journeyState.phase === 'carrying' ? 'Place Book' : 'Interact'}
          <span className="mt-0.5 block text-[9px] text-gold-200/70">Books / door / objects</span>
        </button>
      )}

      {!introOpen && mobileHelpOpen && (
        <div className="mobile-touch-hint pointer-events-auto fixed left-3 right-3 z-20 md:hidden">
          <div className="vintage-panel flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-xs text-parchment-200/90">
            <span>Drag to look <span className="mx-1 text-gold-500">·</span> Use the pad to walk <span className="mx-1 text-gold-500">·</span> Tap objects or Interact nearby</span>
            <button className="vintage-btn min-h-11 min-w-11 shrink-0 cursor-pointer rounded-lg text-lg" onClick={() => setMobileHelpOpen(false)} aria-label="Dismiss touch tips">×</button>
          </div>
        </div>
      )}

      {!introOpen && (
        <div className="pointer-events-none fixed bottom-5 left-4 z-10 hidden xl:block">
          <div className="vintage-panel rounded-xl px-3.5 py-2.5 text-xs text-parchment-200/80">
            <div className="mb-1 font-display uppercase tracking-[0.16em] text-gold-300">Explore the Library</div>
            <div><kbd className="text-gold-200">W A S D</kbd> walk <span className="mx-1 text-gold-500">·</span> <kbd className="text-gold-200">Drag</kbd> look <span className="mx-1 text-gold-500">·</span> <kbd className="text-gold-200">Scroll</kbd> zoom</div>
            <div className="mt-0.5"><kbd className="text-gold-200">E</kbd> interact with books, the town door, or room objects <span className="mx-1 text-gold-500">·</span> <kbd className="text-gold-200">F</kbd> fullscreen</div>
          </div>
        </div>
      )}

      <div
        id="hover-tooltip"
        ref={tooltipRef}
        className={`fade-hidden ${hoveredItem ? '' : 'opacity-0'}`}
        aria-hidden="true"
      >
        <div className="vintage-panel max-w-xs rounded-lg px-3.5 py-2 text-center">
          <div className="font-display text-[10px] uppercase tracking-[0.2em] text-gold-400">
            {hoveredItem?.kicker}
          </div>
          <div className="mt-0.5 font-serif text-sm font-semibold leading-tight text-parchment-50 md:text-base">
            {hoveredItem?.title}
          </div>
          <div className="mt-0.5 text-xs italic text-parchment-200/80">{hoveredItem?.sub}</div>
        </div>
      </div>

      <div className={`pointer-events-none fixed left-1/2 top-20 z-50 -translate-x-1/2 transition-all duration-300 ${toast ? '' : 'fade-hidden'}`}>
        <div className="vintage-panel flex items-center gap-2 rounded-full px-4 py-2 font-display text-sm tracking-wider text-gold-300">
          <span className="text-gold-400">✦</span>
          <span>{toast}</span>
        </div>
      </div>

      {introOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-espresso-950/85 p-4 backdrop-blur-md transition-opacity duration-700 ${introVisible ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
          <section className="vintage-panel relative max-h-[92dvh] w-full max-w-xl overflow-y-auto overscroll-contain rounded-2xl p-5 text-center sm:p-10">
            <span className="absolute left-3 top-3 h-6 w-6 rounded-tl border-l-2 border-t-2 border-gold-500/60" />
            <span className="absolute right-3 top-3 h-6 w-6 rounded-tr border-r-2 border-t-2 border-gold-500/60" />
            <span className="absolute bottom-3 left-3 h-6 w-6 rounded-bl border-b-2 border-l-2 border-gold-500/60" />
            <span className="absolute bottom-3 right-3 h-6 w-6 rounded-br border-b-2 border-r-2 border-gold-500/60" />

            <div className="mb-2 font-display text-xs uppercase tracking-[0.35em] text-gold-400">Est. MDCCCLXXXIV</div>
            <h1 className="mb-3 font-display text-3xl tracking-wide text-parchment-50 sm:text-4xl md:text-5xl">
              The Grand Athenaeum
            </h1>
            <div className="mb-5 flex items-center justify-center gap-3">
              <span className="h-px w-12 bg-gradient-to-r from-transparent to-gold-500" />
              <span className="text-sm text-gold-400">❖</span>
              <span className="h-px w-12 bg-gradient-to-l from-transparent to-gold-500" />
            </div>
            <p className="mb-6 font-body text-base leading-relaxed text-parchment-200/90 sm:text-lg">
              Step into a first-person library. Walk the mahogany aisles, pull a volume from the shelf, carry it to the reading table, and settle in with its pages.
            </p>

            <div className="mb-7 grid grid-cols-1 gap-2.5 text-left text-xs text-parchment-200/80 sm:grid-cols-3">
              <div className="rounded-lg border border-gold-500/20 bg-espresso-900/70 p-3">
                <div className="mb-0.5 font-display text-gold-300">Walk the Stacks</div>
                Use WASD and drag to look. On phones, use the movement pad.
              </div>
              <div className="rounded-lg border border-gold-500/20 bg-espresso-900/70 p-3">
              <div className="mb-0.5 font-display text-gold-300">{libraryBooks.length} Curated Tomes</div>
                Press E near a volume, then carry it to the reading table.
              </div>
              <div className="rounded-lg border border-gold-500/20 bg-espresso-900/70 p-3">
                <div className="mb-0.5 font-display text-gold-300">Beyond the Door</div>
                Turn around and press E at the carved door to enter Vieux Quartier. Click the lamp or chandelier to change the light.
              </div>
            </div>

            <button className="vintage-btn min-h-12 cursor-pointer rounded-xl px-8 py-3.5 font-display text-sm uppercase tracking-[0.2em] sm:text-base" onClick={enterLibrary}>
              Step Inside the Athenaeum
            </button>
          </section>
        </div>
      )}

      <header className="library-top-hud pointer-events-none fixed left-0 right-0 z-20 flex flex-wrap items-center justify-between gap-2 p-3 transition-opacity duration-500 sm:p-4">
        <div className="pointer-events-auto flex items-center gap-2 sm:gap-3">
          <div className="vintage-panel flex items-center gap-3 rounded-xl px-3.5 py-2">
            <div>
              <div className="font-display text-xs leading-none tracking-[0.18em] text-gold-300 sm:text-sm">THE ATHENAEUM</div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-parchment-200/75">
                <span>Books Discovered:</span>
                <span className="font-display font-semibold text-gold-300">{discoveredIds.size} / {libraryBooks.length}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button className="vintage-btn flex min-h-11 min-w-11 cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 font-display text-xs tracking-wider" onClick={switchMood} title="Switch Lighting Atmosphere">
            <span>{mood === 'midnight' ? '🌙' : '☀️'}</span>
            <span className="hidden sm:inline">{mood === 'midnight' ? 'Candlelit Midnight' : 'Golden Afternoon'}</span>
          </button>
          <button className={`vintage-btn flex min-h-11 min-w-11 cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 font-display text-xs tracking-wider ${highlighted ? 'active' : ''}`} onClick={toggleHighlights} title="Highlight Interactive Curated Books">
            <span>✦</span>
            <span className="hidden md:inline">Highlight Tomes</span>
          </button>
          <button className={`vintage-btn flex min-h-11 min-w-11 cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 font-display text-xs tracking-wider ${audioEnabled ? 'active' : ''}`} onClick={toggleAudio} title="Toggle Cozy Rain &amp; Hearth Audio">
            <span>{audioEnabled ? '🔊' : '🔇'}</span>
            <span className="hidden md:inline">{audioEnabled ? 'Ambience On' : 'Ambience Off'}</span>
          </button>
          <button className="vintage-btn flex min-h-11 min-w-11 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 font-display text-xs tracking-wider" onClick={() => setCatalogOpen((open) => !open)} title="Open Library Catalog">
            <span>📖</span><span>Catalog</span>
          </button>
          <button className="vintage-btn flex min-h-11 min-w-11 cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 font-display text-xs tracking-wider" onClick={() => { setAccountError(''); setAccountOpen(true); }} title={readerUser ? `Signed in as ${readerUser.email}` : 'Sign in to sync bookmarks'}>
            <span aria-hidden="true">◎</span><span>{readerUser ? 'Account' : 'Sign in'}</span>
          </button>
          <button
            className="vintage-btn hidden min-h-11 min-w-11 cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 font-display text-xs tracking-wider lg:flex"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            aria-label={isFullscreen ? 'Exit fullscreen mode' : 'Enter fullscreen mode'}
            aria-pressed={isFullscreen}
          >
            <span aria-hidden="true">⛶</span>
            <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>
        </div>
      </header>

      <nav className="library-bottom-hud pointer-events-auto fixed left-1/2 z-20 max-w-[95vw] -translate-x-1/2 transition-opacity duration-500" aria-label="Library viewpoints">
        <div className="vintage-panel vintage-scroll flex items-center gap-1 overflow-x-auto rounded-2xl px-2 py-1.5 sm:gap-1.5">
          {VIEWPOINTS.map(([viewName, label]) => (
            <button
              key={viewName}
              className={`vintage-btn min-h-11 cursor-pointer whitespace-nowrap rounded-xl px-3 py-1.5 font-display text-[11px] tracking-wider sm:text-xs ${activeView === viewName ? 'active' : ''}`}
              onClick={() => changeView(viewName)}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <aside className={`pointer-events-auto fixed right-0 top-0 z-30 h-full w-full max-w-sm transform transition-transform duration-300 ease-out ${catalogOpen ? 'translate-x-0' : 'translate-x-full'}`} aria-hidden={!catalogOpen} inert={!catalogOpen}>
        <div className="vintage-panel flex h-full flex-col rounded-none border-l border-gold-500/40 sm:rounded-l-2xl">
          <div className="flex items-center justify-between border-b border-gold-500/25 p-4 sm:p-5">
            <div>
              <div className="font-display text-[10px] uppercase tracking-[0.25em] text-gold-400">Curated Archives</div>
              <h2 className="font-display text-xl tracking-wide text-parchment-50">Library Catalog</h2>
            </div>
            <button className="vintage-btn flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg text-lg" onClick={() => setCatalogOpen(false)} aria-label="Close Catalog">×</button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gold-500/20 bg-espresso-950/50 px-4 py-2.5 text-xs text-parchment-200/80">
            <span>Choose a volume for a guided shelf visit</span>
            <button className="vintage-btn min-h-11 cursor-pointer rounded-lg px-3 font-display text-xs" onClick={() => isOwnerMode ? lockOwnerAccess() : setOwnerAccessOpen((open) => !open)} aria-expanded={ownerAccessOpen || isOwnerMode}>
              {isOwnerMode ? 'Lock Owner Access' : 'Owner Access'}
            </button>
            <button className="vintage-btn min-h-11 cursor-pointer rounded-lg px-3 font-display text-xs" onClick={() => setUploadOpen((open) => !open)} aria-expanded={uploadOpen}>
              {uploadOpen ? 'Close Upload' : 'Upload PDF'}
            </button>
            <span className="font-display text-gold-300">★ {bookmarkedBookCount} Saved</span>
          </div>
          <div className="vintage-scroll flex-1 space-y-2.5 overflow-y-auto p-3 sm:p-4">
            {ownerAccessOpen && !isOwnerMode && (
              <form className="vintage-panel space-y-3 rounded-xl p-4" onSubmit={unlockOwnerAccess}>
                <div>
                  <h3 className="font-display text-sm uppercase tracking-[0.16em] text-gold-300">Owner access</h3>
                  <p className="mt-1 text-xs leading-relaxed text-parchment-200/75">Visitors can read public books. The owner token unlocks private PDFs and book uploads. Access lasts only until this page is closed or locked.</p>
                </div>
                <label className="block space-y-1 text-xs text-parchment-200/85">
                  <span>Owner access token</span>
                  <input className="min-h-11 w-full rounded-lg border border-gold-500/30 bg-espresso-950/70 px-3 text-sm text-parchment-50" type="password" autoComplete="off" value={ownerToken} onChange={(event) => setOwnerToken(event.target.value)} required />
                  <span className="block text-[11px] text-parchment-200/60">Enter the ADMIN_UPLOAD_TOKEN configured on the backend. It stays in memory for this page session.</span>
                </label>
                {uploadError && <p role="alert" className="text-xs text-red-300">{uploadError}</p>}
                <button className="vintage-btn min-h-11 w-full cursor-pointer rounded-lg px-4 font-display text-xs uppercase tracking-wider" type="submit">Unlock Owner Access</button>
              </form>
            )}
            {isOwnerMode && (
              <p className={storageError ? 'rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-200' : 'rounded-lg border border-emerald-500/25 px-3 py-2 text-xs text-emerald-200'} role="status">
                {isFetchingBooks ? 'Verifying owner access…' : storageError || 'Owner access is active. Private books and uploads are available.'}
              </p>
            )}
            {uploadOpen && (
              <form className="vintage-panel space-y-3 rounded-xl p-4" onSubmit={attachPdfToBook}>
                <div>
                  <h3 className="font-display text-sm uppercase tracking-[0.16em] text-gold-300">Add a book PDF</h3>
                  <p className="mt-1 text-xs leading-relaxed text-parchment-200/75">PDFs are stored as private Cloudinary files; public or owner-only reading access is enforced by the backend.</p>
                </div>
                {!isOwnerMode && (
                  <div className="rounded-lg border border-amber-500/25 bg-amber-950/30 p-3 text-xs text-amber-100">
                    <p>Only the owner can upload books.</p>
                    <button className="mt-2 min-h-11 rounded-lg border border-gold-500/30 px-3 font-display text-xs" type="button" onClick={() => setOwnerAccessOpen(true)}>Unlock Owner Access</button>
                  </div>
                )}
                <label className="block space-y-1 text-xs text-parchment-200/85">
                  <span>PDF file</span>
                  <input className="block min-h-11 w-full cursor-pointer rounded-lg border border-gold-500/30 bg-espresso-950/70 p-2 text-xs file:mr-3 file:rounded file:border-0 file:bg-gold-500/20 file:px-3 file:py-1.5 file:text-parchment-100" type="file" accept="application/pdf,.pdf" onChange={handlePdfSelection} required />
                  <span className="block text-[11px] text-parchment-200/60">PDF files up to 100 MB</span>
                </label>
                <label className="block space-y-1 text-xs text-parchment-200/85">
                  <span>Book title</span>
                  <input className="min-h-11 w-full rounded-lg border border-gold-500/30 bg-espresso-950/70 px-3 text-sm text-parchment-50" value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} required />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block space-y-1 text-xs text-parchment-200/85">
                    <span>Author</span>
                    <input className="min-h-11 w-full rounded-lg border border-gold-500/30 bg-espresso-950/70 px-3 text-sm text-parchment-50" value={uploadAuthor} onChange={(event) => setUploadAuthor(event.target.value)} placeholder="Author name" />
                  </label>
                  <label className="block space-y-1 text-xs text-parchment-200/85">
                    <span>Year</span>
                    <input className="min-h-11 w-full rounded-lg border border-gold-500/30 bg-espresso-950/70 px-3 text-sm text-parchment-50" value={uploadYear} onChange={(event) => setUploadYear(event.target.value)} placeholder="Year" />
                  </label>
                </div>
                <label className="block space-y-1 text-xs text-parchment-200/85">
                  <span>Category</span>
                  <input className="min-h-11 w-full rounded-lg border border-gold-500/30 bg-espresso-950/70 px-3 text-sm text-parchment-50" value={uploadCategory} onChange={(event) => setUploadCategory(event.target.value)} />
                </label>
                <label className="block space-y-1 text-xs text-parchment-200/85">
                  <span>Shelf slot</span>
                  <select className="min-h-11 w-full rounded-lg border border-gold-500/30 bg-espresso-950 px-3 text-sm text-parchment-50" value={uploadTargetIndex} onChange={(event) => setUploadTargetIndex(event.target.value)}>
                    {libraryBooks.map((book, index) => <option key={book.id} value={index}>Volume {index + 1}: {book.title}{book.pdfName ? ' (replace attached PDF)' : ''}</option>)}
                  </select>
                </label>
                <label className="block space-y-1 text-xs text-parchment-200/85">
                  <span>Reading access</span>
                  <select className="min-h-11 w-full rounded-lg border border-gold-500/30 bg-espresso-950 px-3 text-sm text-parchment-50" value={uploadVisibility} onChange={(event) => setUploadVisibility(event.target.value)}>
                    <option value="public">Public — any visitor can read</option>
                    <option value="private">Private — owner token required</option>
                  </select>
                  <span className="block text-[11px] text-parchment-200/60">The backend enforces this setting for both the catalog and PDF file.</span>
                </label>
                {(uploadError || storageError) && <p role="alert" className="text-xs text-red-300">{uploadError || storageError}</p>}
                <button className="vintage-btn min-h-11 w-full cursor-pointer rounded-lg px-4 font-display text-xs uppercase tracking-wider disabled:cursor-wait disabled:opacity-60" type="submit" disabled={isUploading || !isOwnerVerified}>
                  {isUploading ? 'Saving PDF…' : 'Save PDF to Shelf Slot'}
                </button>
              </form>
            )}

            {libraryBooks.map((book, index) => {
              const wasDiscovered = discoveredIds.has(book.id);
              const wasBookmarked = bookmarkedIds.has(getBookBookmarkKey(book, index)) || bookmarkedIds.has(book.id);
              return (
                <button
                  key={book.id}
                  className="flex w-full cursor-pointer items-start gap-3 rounded-xl border border-gold-500/20 bg-espresso-900/75 p-3 text-left transition hover:border-gold-400/60 hover:bg-espresso-800/90"
                  onClick={() => visitBook(index)}
                >
                  <BookCover book={book} className="h-16 w-12" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-display text-[10px] uppercase tracking-widest text-gold-400/90">{getBookLocation(book)}</span>
                      <span className="text-xs">
                        {book.visibility === 'private' && <span className="mr-1 font-display text-[10px] text-amber-300" title="Only the owner can read this book">PRIVATE</span>}
                        {book.pdfName && <span className="mr-1 font-display text-[10px] text-sky-300" title={`PDF attached: ${book.pdfName}`}>PDF</span>}
                        {wasBookmarked && <span className="text-gold-300" title="Bookmarked">★</span>}
                        {wasDiscovered && <span className="ml-1 font-display text-[10px] text-emerald-400">READ</span>}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate font-serif text-sm font-medium text-parchment-50 sm:text-base">{book.title}</span>
                    <span className="block truncate text-xs italic text-parchment-200/70">{book.author} ({book.year})</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <ReaderAccountDialog
        open={accountOpen}
        user={readerUser}
        busy={accountBusy}
        error={accountError}
        onClose={() => setAccountOpen(false)}
        onSubmit={submitReaderAccount}
        onLogout={signOutReader}
      />

      <section
        className={`reader-experience fixed inset-0 z-40 flex flex-col overflow-hidden transition-opacity duration-200 ${activeBook ? 'opacity-100' : 'pointer-events-none invisible opacity-0'}`}
        style={{
          background: readerTheme.background,
          color: readerTheme.ink,
          '--reader-background': readerTheme.background,
          '--reader-panel': readerTheme.panel,
          '--reader-paper': readerTheme.paper,
          '--reader-ink': readerTheme.ink,
          '--reader-muted': readerTheme.muted,
          '--reader-border': readerTheme.border,
        }}
        data-reader-theme={readerPreferences.theme}
        aria-hidden={!activeBook}
        inert={!activeBook}
        aria-label={activeBook ? `Reading ${activeBook.title}` : 'Reading view'}
      >
        <header className="reader-topbar relative z-20 flex min-h-[4.25rem] shrink-0 items-center gap-2 border-b px-2.5 sm:gap-4 sm:px-6">
          <button className="reader-header-button flex min-h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-xs sm:text-sm" type="button" onClick={closeBook} aria-label="Return to library">
            <span aria-hidden="true" className="text-lg">←</span><span className="hidden sm:inline">Library</span>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-serif text-sm font-semibold sm:text-lg">{activeBook?.title}</h1>
            <p className="truncate text-[10px] sm:text-xs" style={{ color: readerTheme.muted }}>
              {activeBook?.author} <span className="px-1">·</span> {activeBook?.category} <span className="px-1">·</span> {activeBook?.year}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button className="reader-header-button flex min-h-10 items-center gap-2 rounded-lg border px-2.5 text-xs sm:px-3" type="button" onClick={() => { setAccountError(''); setAccountOpen(true); }} aria-label={readerUser ? `Account: ${readerUser.email}` : 'Sign in to sync bookmarks'}>
              <span aria-hidden="true">◎</span><span className="hidden sm:inline">{readerUser ? 'Account' : 'Sign in'}</span>
            </button>
            <button className="reader-header-button grid min-h-10 min-w-10 place-items-center rounded-lg border px-2 text-lg sm:flex sm:gap-2 sm:px-3 sm:text-xs" type="button" onClick={toggleBookmark} aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark this book'} aria-pressed={isBookmarked}>
              <span aria-hidden="true">{isBookmarked ? '★' : '☆'}</span><span className="hidden sm:inline">{isBookmarked ? 'Saved' : 'Save'}</span>
            </button>
            <button className="reader-header-button flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs sm:text-sm" type="button" onClick={() => setReaderSettingsOpen((open) => !open)} aria-expanded={readerSettingsOpen} aria-label="Reading settings">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 2.9-.2-.1a1.7 1.7 0 0 0-1.9.3l-.1.1h-3.4l-.1-.2a1.7 1.7 0 0 0-1.5-1.1 1.7 1.7 0 0 0-1.6.8l-.1.2-3.3-1.7.1-.2a1.7 1.7 0 0 0-.2-1.9l-.1-.1v-3.4l.2-.1a1.7 1.7 0 0 0 1.1-1.5 1.7 1.7 0 0 0-.8-1.6l-.2-.1 1.7-3.3.2.1a1.7 1.7 0 0 0 1.9-.2l.1-.1h3.4l.1.2a1.7 1.7 0 0 0 1.5 1.1 1.7 1.7 0 0 0 1.6-.8l.1-.2 3.3 1.7-.1.2a1.7 1.7 0 0 0 .2 1.9l.1.1v3.4l-.2.1a1.7 1.7 0 0 0-.4 1.4Z" />
              </svg>
              <span className="hidden sm:inline">Aa</span>
            </button>
          </div>
        </header>

        <ReaderSettings
          open={readerSettingsOpen}
          preferences={readerPreferences}
          onChange={updateReaderPreference}
          isPdf={Boolean(activeBook?.pdfUrl)}
        />

        {activeBook?.pdfUrl ? (
          <div className="flex min-h-0 flex-1">
            <PdfReader key={activeBook.id} book={activeBook} preferences={readerPreferences} onPreferenceChange={updateReaderPreference} />
          </div>
        ) : (
          <>
            <main className="reader-text-stage min-h-0 flex-1 overflow-y-auto px-3 py-6 sm:px-8 sm:py-10">
              <article
                className="reader-text-page mx-auto min-h-full w-full max-w-[72ch] px-6 py-8 shadow-sm sm:px-14 sm:py-14"
                style={{
                  background: readerTheme.paper,
                  color: readerTheme.ink,
                  fontSize: `${readerPreferences.fontSize}px`,
                  lineHeight: readerPreferences.lineHeight,
                  fontFamily: readerPreferences.fontFamily === 'sans' ? 'system-ui, sans-serif' : 'Georgia, "Times New Roman", serif',
                }}
              >
                <p className="mb-8 text-center font-display text-[10px] uppercase tracking-[0.24em]" style={{ color: readerTheme.muted }}>
                  {activeBook && getBookLocation(activeBook)} <span className="px-1">·</span> Volume {activeBookIndex + 1}
                </p>
                <h2 className="mb-3 text-center font-serif font-semibold leading-tight" style={{ fontSize: `${Math.max(30, readerPreferences.fontSize * 1.8)}px` }}>{activeBook?.title}</h2>
                <p className="mb-8 text-center italic" style={{ color: readerTheme.muted }}>by {activeBook?.author}</p>
                <div className="mx-auto mb-8 h-px max-w-24" style={{ background: readerTheme.border }} />
                {activeBook?.synopsis && <p className="mb-8 italic" style={{ color: readerTheme.muted }}>{activeBook.synopsis}</p>}
                <div className="space-y-6">
                  {activeBook?.excerpt?.map((paragraph, index) => <p key={`${activeBook.id}-${index}`}>{paragraph}</p>)}
                </div>
              </article>
            </main>
            <footer className="reader-topbar flex shrink-0 items-center justify-between gap-2 border-t px-3 py-2 sm:px-8">
              <button className="reader-header-button min-h-10 rounded-lg border px-3 text-xs" type="button" onClick={() => moveBook(-1)}>← Previous volume</button>
              <span className="hidden text-xs sm:inline" style={{ color: readerTheme.muted }}>Volume {activeBookIndex + 1} of {libraryBooks.length}</span>
              <button className="reader-header-button min-h-10 rounded-lg border px-3 text-xs" type="button" onClick={() => moveBook(1)}>Next volume →</button>
            </footer>
          </>
        )}
      </section>

      <section
        className={`fixed inset-0 z-[80] overflow-hidden bg-[#1c1612] ${townOpen ? (townLeaving ? 'town-leaving' : 'town-arrival') : 'pointer-events-none opacity-0'}`}
        aria-label="Vieux Quartier town exploration"
        aria-hidden={!townOpen}
        inert={!townOpen}
      >
          <iframe
            ref={townIframeRef}
            className="absolute inset-0 h-full w-full border-0"
            src="/vieux-quartier.html"
            title="Vieux Quartier interactive 3D town"
            allow="fullscreen"
            tabIndex={-1}
          />
          <button
            className="fixed left-4 top-[calc(env(safe-area-inset-top)+6.25rem)] z-[90] flex min-h-11 items-center gap-2 rounded-xl border border-[#ddb978]/45 bg-[#211910]/90 px-4 font-display text-xs tracking-wider text-[#fff0d4] shadow-lg backdrop-blur-md transition hover:border-[#f6d79b] hover:bg-[#3a2818]"
            type="button"
            onClick={returnToLibrary}
            aria-label="Return to the library"
          >
            <span aria-hidden="true" className="text-base">←</span> Return to Library
          </button>
      </section>

      <button
        className="fixed right-4 top-[calc(env(safe-area-inset-top)+5.25rem)] z-[110] flex min-h-11 items-center gap-2 rounded-xl border border-[#ddb978]/45 bg-[#211910]/90 px-3.5 font-display text-xs tracking-wider text-[#fff0d4] shadow-lg backdrop-blur-md transition hover:border-[#f6d79b] hover:bg-[#3a2818]"
        type="button"
        onClick={() => setRoomOpen((open) => !open)}
        aria-expanded={roomOpen}
        aria-controls="multiplayer-room-panel"
      >
        <span className={`h-2 w-2 rounded-full ${multiplayer.status === 'connected' ? 'bg-emerald-400' : multiplayer.status === 'offline' ? 'bg-red-400' : 'bg-amber-300 animate-pulse'}`} />
        Room <span className="text-gold-300">{multiplayer.players.length + (multiplayer.status === 'connected' ? 1 : 0)}</span>
      </button>

      {roomOpen && (
        <aside
          id="multiplayer-room-panel"
          className="fixed right-4 top-[calc(env(safe-area-inset-top)+8.75rem)] z-[110] flex max-h-[min(70vh,40rem)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#ddb978]/40 bg-[#211910]/[0.97] text-[#fff0d4] shadow-2xl backdrop-blur-xl"
          aria-label="Multiplayer room"
        >
          <header className="flex items-center justify-between border-b border-[#ddb978]/20 px-4 py-3">
            <div>
              <div className="font-display text-[10px] uppercase tracking-[0.22em] text-[#ddb978]">Shared world</div>
              <h2 className="font-display text-base">The Athenaeum Room</h2>
            </div>
            <button className="min-h-10 min-w-10 rounded-lg border border-[#ddb978]/30 text-lg" type="button" onClick={() => setRoomOpen(false)} aria-label="Close room">×</button>
          </header>

          <form
            className="flex gap-2 border-b border-[#ddb978]/20 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              multiplayer.rename(roomNameDraft);
            }}
          >
            <label className="sr-only" htmlFor="room-display-name">Display name</label>
            <input
              id="room-display-name"
              className="min-h-10 min-w-0 flex-1 rounded-lg border border-[#ddb978]/25 bg-black/25 px-3 text-sm outline-none focus:border-[#ddb978]"
              value={roomNameDraft}
              maxLength={24}
              onChange={(event) => setRoomNameDraft(event.target.value)}
              placeholder="Your display name"
            />
            <button className="min-h-10 rounded-lg border border-[#ddb978]/40 px-3 font-display text-[10px] uppercase tracking-wider" type="submit">Save</button>
          </form>

          <div className="border-b border-[#ddb978]/20 px-4 py-3">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-display uppercase tracking-wider text-[#ddb978]">Here now</span>
              <span className="text-[#e9d5b6]/70">{multiplayer.status === 'connected' ? 'Connected' : multiplayer.status === 'offline' ? 'Offline' : 'Connecting…'}</span>
            </div>
            <ul className="vintage-scroll max-h-28 space-y-1 overflow-y-auto">
              <li className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-2 text-xs">
                <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{multiplayer.identity.name} <span className="text-[#e9d5b6]/45">(you)</span></span>
                <span className="text-[10px] text-[#ddb978]/75">{townOpen ? 'Town' : 'Library'}</span>
              </li>
              {multiplayer.players.map((player) => (
                <li key={player.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-2 text-xs">
                  <span className="min-w-0 truncate">{player.name}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-[#ddb978]/75">{player.zone === 'town' ? 'Town' : 'Library'}</span>
                  {player.zone === (townOpen ? 'town' : 'library') && (
                    <button className="min-h-8 shrink-0 rounded-md border border-[#ddb978]/30 px-2 text-[10px] hover:bg-[#ddb978]/15" type="button" onClick={() => multiplayer.wave(player.id)} aria-label={`Wave to ${player.name}`}>👋 Wave</button>
                  )}
                </li>
              ))}
            </ul>
            {!multiplayer.players.length && multiplayer.status === 'connected' && <p className="mt-2 text-[11px] text-[#e9d5b6]/55">You are first in the room. Others will appear here as they join.</p>}
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-3">
            <div className="mb-2 font-display text-[10px] uppercase tracking-wider text-[#ddb978]">Room chat</div>
            <div className="vintage-scroll min-h-20 flex-1 space-y-2 overflow-y-auto rounded-lg border border-[#ddb978]/15 bg-black/15 p-2">
              {multiplayer.messages.length ? multiplayer.messages.map((message) => (
                <div key={message.id} className="text-xs leading-relaxed">
                  <span className={`font-semibold ${message.playerId === multiplayer.identity.id ? 'text-[#f4c96a]' : 'text-[#dcb88a]'}`}>{message.name}: </span>
                  <span className={message.action ? 'italic text-[#e9d5b6]/65' : 'text-[#fff0d4]/90'}>{message.text}</span>
                </div>
              )) : <p className="py-2 text-center text-xs text-[#e9d5b6]/45">Say hello to the room.</p>}
            </div>
            <form
              className="mt-2 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!chatDraft.trim()) return;
                multiplayer.sendChat(chatDraft.trim());
                setChatDraft('');
              }}
            >
              <label className="sr-only" htmlFor="room-chat-message">Message</label>
              <input
                id="room-chat-message"
                className="min-h-10 min-w-0 flex-1 rounded-lg border border-[#ddb978]/25 bg-black/25 px-3 text-sm outline-none focus:border-[#ddb978]"
                value={chatDraft}
                maxLength={180}
                onChange={(event) => setChatDraft(event.target.value)}
                placeholder="Write a message…"
              />
              <button className="min-h-10 rounded-lg border border-[#ddb978]/40 px-3 font-display text-[10px] uppercase tracking-wider" type="submit">Send</button>
            </form>
            {multiplayer.error && <p role="status" className="mt-2 text-[11px] text-amber-200">{multiplayer.error}</p>}
            {multiplayer.status === 'offline' && <p className="mt-2 text-[11px] text-red-200/80">The room server is unavailable. Start the backend to join multiplayer.</p>}
          </div>
        </aside>
      )}
    </main>
  );
}
