import { useEffect, useRef, useState } from 'react';
import { createArenaScene } from '../../arena/createArenaScene.js';
import { CHAPTERS, OPENING_CITY_SCENES } from '../../arena/storyEngine.js';

export default function ArenaExperience({
  active,
  flyoverOnly = false,
  playIntroSeq = false,
  onIntroSeqDone = () => {},
  characterProfile,
  remotePlayers,
  lastAction,
  onReturnToLibrary,
  onPose,
}) {
  const containerRef = useRef(null);
  const arenaRef = useRef(null);
  const miniMapCanvasRef = useRef(null);
  const fullMapCanvasRef = useRef(null);
  const toastTimerRef = useRef(null);
  const callbacksRef = useRef({});

  const [hud, setHud] = useState({
    currentTime: 'sunset',
    chapterTitle: 'Chapter 1: Arrival at Ocean Drive',
    objectiveText: 'Speak with Elena Vance outside the Athenaeum steps',
    distanceMeters: 0,
    timerLabel: null,
    timerSeconds: null,
    wantedStars: 0,
    playerHp: 100,
    knockdowns: 0,
    cash: 400,
    rep: 50,
    clues: [],
    trophiesCount: 0,
    chapterIndex: 0,
    completed: false,
    playerName: 'Julian Vance',
    inCar: false,
    carName: '',
    carIsPolice: false,
    carKmh: 0,
    carGear: 'N',
    carNitro: 100,
    cameraLabel: '1st Person',
    contextPrompt: null,
    contextActionType: null,
  });

  const [toast, setToast] = useState('');
  const [hoverInfo, setHoverInfo] = useState(null);
  const [selectedLandmark, setSelectedLandmark] = useState(null);
  const [dialogueState, setDialogueState] = useState(null);
  const [cipherState, setCipherState] = useState(null);
  const [cipherDigits, setCipherDigits] = useState(['0', '0', '0']);
  const [journalOpen, setJournalOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [quality, setQuality] = useState('high');
  const [bloomEnabled, setBloomEnabled] = useState(true);
  const [gradeEnabled, setGradeEnabled] = useState(true);
  const [shadowsEnabled, setShadowsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [sensitivity, setSensitivity] = useState(1.0);

  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(''), 3600);
  }

  callbacksRef.current = {
    onReturnToLibrary,
    onPose,
    showToast,
  };

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const arena = createArenaScene({
      container: containerRef.current,
      onHudUpdate: setHud,
      onToast: (msg) => callbacksRef.current.showToast(msg),
      onReturnToLibrary: () => callbacksRef.current.onReturnToLibrary(),
      onPose: (pose) => callbacksRef.current.onPose(pose),
      onHover: setHoverInfo,
      onLandmarkSelect: setSelectedLandmark,
      onDialogue: (lines, onChoice, onDone) => {
        setDialogueState({ lines, index: 0, replyText: null, onChoice, onDone });
      },
      onCipher: (step, onResult) => {
        setCipherDigits(['0', '0', '0']);
        setCipherState({ step, onResult });
      },
    });
    arenaRef.current = arena;

    return () => {
      arena.dispose();
      arenaRef.current = null;
      window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!arenaRef.current) return;
    arenaRef.current.setActive(active);
    arenaRef.current.setFlyover(Boolean(active && flyoverOnly));
  }, [active, flyoverOnly]);

  useEffect(() => {
    if (!active || flyoverOnly || !playIntroSeq) return;
    setDialogueState({
      lines: OPENING_CITY_SCENES,
      index: 0,
      replyText: null,
      isOpening: true,
      autoDriveOnDone: false,
      onChoice: (choice) => {
        arenaRef.current?.applyChoiceEffects(choice);
        return Boolean(choice.autoDrive);
      },
      onDone: (autoDrive) => {
        arenaRef.current?.setCutsceneShot(null);
        arenaRef.current?.advanceOpeningBriefing();
        if (autoDrive) arenaRef.current?.enterNearestCarNow();
        onIntroSeqDone();
      },
    });
  }, [active, flyoverOnly, playIntroSeq]);

  useEffect(() => {
    if (!dialogueState?.lines?.[dialogueState.index]?.cameraShot) return;
    arenaRef.current?.setCutsceneShot(dialogueState.lines[dialogueState.index].cameraShot);
  }, [dialogueState?.index, dialogueState?.isOpening]);

  useEffect(() => {
    if (!arenaRef.current || !characterProfile) return;
    arenaRef.current.applyCharacterProfile(characterProfile);
  }, [characterProfile]);

  useEffect(() => {
    arenaRef.current?.setRemotePlayers(remotePlayers || []);
  }, [remotePlayers]);

  useEffect(() => {
    if (!lastAction || lastAction.zone !== 'town') return;
    arenaRef.current?.showPlayerAction(lastAction.fromId, lastAction.action);
  }, [lastAction]);

  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setInterval(() => {
      if (miniMapCanvasRef.current) arenaRef.current?.drawMapCanvas(miniMapCanvasRef.current, false);
      if (mapOpen && fullMapCanvasRef.current) arenaRef.current?.drawMapCanvas(fullMapCanvasRef.current, true);
    }, 90);
    return () => window.clearInterval(timer);
  }, [active, mapOpen]);

  useEffect(() => {
    if (!active) return undefined;
    function onKey(e) {
      if (e.target instanceof HTMLElement && (e.target.isContentEditable || e.target.closest('input, textarea, select'))) return;
      const k = e.key.toLowerCase();
      if (k === 'm' && !e.repeat) {
        e.preventDefault();
        setMapOpen((v) => !v);
      } else if (k === 'j' && !e.repeat) {
        e.preventDefault();
        setJournalOpen((v) => !v);
      } else if (k === 'escape') {
        setMapOpen(false);
        setJournalOpen(false);
        setSettingsOpen(false);
        setSelectedLandmark(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  useEffect(() => {
    arenaRef.current?.setInputEnabled(active && !dialogueState && !cipherState && !journalOpen && !mapOpen && !settingsOpen);
  }, [active, dialogueState, cipherState, journalOpen, mapOpen, settingsOpen]);

  function setTouchMove(dir, isDown, event) {
    event?.preventDefault();
    if (isDown && event) event.currentTarget.setPointerCapture?.(event.pointerId);
    arenaRef.current?.setMovement(dir, isDown);
  }

  function advanceDialogue() {
    if (!dialogueState) return;
    const nextIdx = dialogueState.index + 1;
    if (nextIdx >= dialogueState.lines.length) {
      const doneFn = dialogueState.onDone;
      const autoDrive = Boolean(dialogueState.autoDriveOnDone);
      setDialogueState(null);
      arenaRef.current?.setCutsceneShot(null);
      doneFn?.(autoDrive);
    } else {
      setDialogueState({ ...dialogueState, index: nextIdx, replyText: null });
    }
  }

  function skipCutscene() {
    if (!dialogueState) return;
    const doneFn = dialogueState.onDone;
    setDialogueState(null);
    arenaRef.current?.setCutsceneShot(null);
    doneFn?.(false);
  }

  function chooseDialogueOption(choice) {
    if (!dialogueState) return;
    const autoDrive = Boolean(dialogueState.onChoice?.(choice));
    setDialogueState({ ...dialogueState, replyText: choice.reply, autoDriveOnDone: autoDrive });
  }

  function submitCipher() {
    if (!cipherState) return;
    const guess = cipherDigits.join('');
    if (guess === cipherState.step.code) {
      const fn = cipherState.onResult;
      setCipherState(null);
      showToast('Sovereign Codex Recovered! 3-Star Escape Active!');
      fn(true);
    } else {
      showToast('Wrong cipher code! Check the clue hint (1 - 8 - 4).');
    }
  }

  const currentLine = dialogueState ? dialogueState.lines[dialogueState.index] : null;

  return (
    <section
      className={`fixed inset-0 z-[80] overflow-hidden bg-[#0e0b16] ${active ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      aria-label="Leonida Bay Story Arena"
      aria-hidden={!active}
      inert={!active}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />

      {active && !flyoverOnly && (
        <>
      {hoverInfo && !dialogueState && (
        <div
          className="pointer-events-none fixed z-30 rounded-xl border border-amber-200/25 bg-[#0c0c18]/90 px-3 py-1.5 text-xs text-white shadow-xl backdrop-blur-md"
          style={{ left: Math.min(hoverInfo.x + 14, window.innerWidth - 210), top: Math.max(hoverInfo.y - 12, 16) }}
        >
          <div className="text-sm font-semibold text-amber-100">{hoverInfo.title}</div>
          <div className="text-[10px] uppercase tracking-wider text-cyan-300/90">{hoverInfo.cat}</div>
        </div>
      )}

      {/* Top HUD */}
      <header className="pointer-events-none fixed left-0 right-0 top-0 z-20 flex flex-wrap items-start justify-between gap-2.5 p-3 sm:p-4">
        {/* Left: Active Story Mission + Return */}
        <div className="pointer-events-auto flex max-w-[340px] flex-col gap-2">
          <div className="rounded-2xl border border-amber-200/25 bg-[#0c0c18]/85 px-3.5 py-2.5 text-white shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  {hud.playerName} • Story Mode
                </div>
                <h2 className="mt-0.5 text-sm font-bold leading-tight text-white sm:text-base">{hud.chapterTitle}</h2>
              </div>
              <button
                type="button"
                onClick={() => setJournalOpen(true)}
                className="shrink-0 rounded-lg border border-cyan-300/40 bg-cyan-500/20 px-2.5 py-1 text-[11px] font-semibold text-cyan-100 hover:bg-cyan-500/35"
              >
                Journal [J]
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/10 pt-2 text-xs">
              <span className="leading-snug text-amber-100/95">{hud.objectiveText}</span>
              {hud.distanceMeters !== null && (
                <span className="shrink-0 rounded-md bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                  {hud.distanceMeters}m
                </span>
              )}
            </div>
            {hud.timerLabel && (
              <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold text-rose-300">
                <span>{hud.timerLabel}</span>
                <span>{hud.timerSeconds}s</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onReturnToLibrary}
            className="self-start rounded-xl border border-amber-200/30 bg-[#14101c]/85 px-3 py-1.5 text-xs font-semibold text-amber-100 shadow-lg backdrop-blur-md hover:border-amber-200/60"
          >
            ← Return to Library
          </button>
        </div>

        {/* Right: Stats, Weather, Actions */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            <div className="flex items-center gap-3 rounded-xl border border-amber-200/25 bg-[#0c0c18]/85 px-3 py-1.5 text-xs text-white shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-1.5" title="Health">
                <span className="text-[10px] font-bold text-rose-300">HP</span>
                <div className="h-2 w-14 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full bg-gradient-to-r from-rose-500 to-emerald-400 transition-all" style={{ width: `${hud.playerHp ?? 100}%` }} />
                </div>
              </div>
              <span className={`text-sm tracking-widest ${hud.wantedStars > 0 ? 'animate-pulse text-rose-400' : 'text-white/25'}`}>
                {'★'.repeat(hud.wantedStars) + '☆'.repeat(3 - hud.wantedStars)}
              </span>
              <span className="font-bold text-emerald-300">${hud.cash}</span>
              <span className="hidden font-semibold text-cyan-300 sm:inline">{hud.rep} Rep</span>
              <span className="hidden font-semibold text-amber-300 md:inline">🌴 {hud.trophiesCount}/12</span>
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-amber-200/25 bg-[#0c0c18]/85 p-1 backdrop-blur-md">
              {[
                ['sunset', 'Sunset'],
                ['neonNight', 'Night'],
                ['tropicalNoon', 'Noon'],
                ['stormDusk', 'Storm'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => arenaRef.current?.setPreset(id)}
                  className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
                    hud.currentTime === id ? 'border border-amber-300/40 bg-amber-500/30 text-amber-100' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => arenaRef.current?.toggleNearestCar()}
              className="rounded-xl border border-cyan-300/40 bg-[#0c0c18]/85 px-3 py-2 text-xs font-semibold text-cyan-100 shadow-lg backdrop-blur-md hover:bg-cyan-900/50"
            >
              {hud.inCar ? 'Exit Car [E]' : 'Drive Car [E]'}
            </button>

            <button
              type="button"
              onClick={() => arenaRef.current?.cycleCameraMode()}
              className="rounded-xl border border-amber-200/25 bg-[#0c0c18]/85 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-md hover:bg-white/10"
            >
              {hud.cameraLabel}
            </button>

            <button
              type="button"
              onClick={() => setMapOpen(true)}
              className="rounded-xl border border-amber-200/25 bg-[#0c0c18]/85 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-md hover:bg-white/10"
            >
              Map [M]
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="rounded-xl border border-amber-200/25 bg-[#0c0c18]/85 px-3 py-2 text-xs font-medium text-white shadow-lg backdrop-blur-md hover:bg-white/10"
            >
              Settings
            </button>
          </div>
        </div>
      </header>

      {toast && (
        <div className="pointer-events-none fixed left-1/2 top-28 z-40 -translate-x-1/2">
          <div className="rounded-full border border-cyan-300/45 bg-[#0c0c18]/90 px-5 py-2 text-xs font-semibold text-cyan-200 shadow-2xl backdrop-blur-md sm:text-sm">
            {toast}
          </div>
        </div>
      )}

      {/* GPS Corner Radar */}
      <button
        type="button"
        onClick={() => setMapOpen(true)}
        title="Click to open Full Street Atlas (M)"
        className="pointer-events-auto fixed bottom-12 right-3 z-20 flex flex-col items-center gap-1 rounded-2xl border border-amber-200/25 bg-[#0c0c18]/85 p-2 shadow-2xl backdrop-blur-md sm:right-5"
      >
        <canvas ref={miniMapCanvasRef} width={176} height={176} className="block h-[126px] w-[126px] rounded-xl sm:h-[158px] sm:w-[158px]" />
        <div className="flex w-full items-center justify-between px-1 text-[10px] text-cyan-200/85">
          <span className="font-semibold uppercase tracking-wider">GPS Radar</span>
          <span>[M] Atlas</span>
        </div>
      </button>

      {/* Speedometer & Nitro HUD */}
      {hud.inCar && (
        <div className="pointer-events-auto fixed bottom-12 left-3 z-20 min-w-[250px] rounded-2xl border border-amber-200/25 bg-[#0c0c18]/88 px-4 py-3 text-white shadow-2xl backdrop-blur-md sm:left-5">
          <div className="mb-2 flex items-center justify-between gap-4 border-b border-white/15 pb-2">
            <div>
              <div className="text-sm font-bold leading-none text-white sm:text-base">{hud.carName}</div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-cyan-300/80">Shift = Nitro • Space = Drift</div>
            </div>
            <div className="text-right">
              <span className="text-3xl font-extrabold leading-none text-amber-200">{hud.carKmh}</span>
              <span className="ml-0.5 text-[10px] text-amber-300/80">km/h</span>
            </div>
          </div>
          <div className="mb-2.5">
            <div className="mb-1 flex justify-between text-[10px] text-cyan-200/85">
              <span>NITRO BOOST</span>
              <span>{hud.carNitro}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-400 transition-all duration-75" style={{ width: `${hud.carNitro}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-1.5 text-[11px]">
            <span className="rounded-md border border-amber-300/30 bg-amber-500/20 px-2 py-0.5 font-bold">{hud.carGear}</span>
            <button type="button" onClick={() => arenaRef.current?.toggleCarLights()} className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 hover:bg-white/15">Lights [L]</button>
            {hud.carIsPolice && (
              <button type="button" onClick={() => arenaRef.current?.toggleCarSiren()} className="rounded-lg border border-blue-300/40 bg-blue-600/30 px-2 py-1 hover:bg-blue-600/50">Siren [Y]</button>
            )}
            <button type="button" onClick={() => arenaRef.current?.playHorn()} className="rounded-lg border border-white/15 bg-white/5 px-2 py-1 hover:bg-white/15">Horn [H]</button>
            <button type="button" onClick={() => arenaRef.current?.toggleNearestCar()} className="rounded-lg border border-rose-300/40 bg-rose-700/50 px-2 py-1 hover:bg-rose-600/70">Exit [E]</button>
          </div>
        </div>
      )}

      {/* Context Action Prompt */}
      {hud.contextPrompt && !dialogueState && (
        <button
          type="button"
          onClick={() => arenaRef.current?.triggerContextAction()}
          className="fixed bottom-20 left-1/2 z-30 -translate-x-1/2 rounded-xl border border-cyan-300/45 bg-slate-950/90 px-4 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur-md"
        >
          {hud.contextPrompt}
        </button>
      )}

      {/* Mobile Touch Controls */}
      {!hud.inCar ? (
        <div className="fixed bottom-16 left-4 z-20 grid grid-cols-3 gap-1 md:hidden">
          <span />
          <button type="button" className="h-11 w-11 touch-none rounded-xl border border-white/20 bg-[#0c0c18]/85 text-lg text-white" onPointerDown={(e) => setTouchMove('forward', true, e)} onPointerUp={(e) => setTouchMove('forward', false, e)} onPointerCancel={(e) => setTouchMove('forward', false, e)}>↑</button>
          <span />
          <button type="button" className="h-11 w-11 touch-none rounded-xl border border-white/20 bg-[#0c0c18]/85 text-lg text-white" onPointerDown={(e) => setTouchMove('left', true, e)} onPointerUp={(e) => setTouchMove('left', false, e)} onPointerCancel={(e) => setTouchMove('left', false, e)}>←</button>
          <button type="button" className="h-11 w-11 touch-none rounded-xl border border-white/20 bg-[#0c0c18]/85 text-lg text-white" onPointerDown={(e) => setTouchMove('backward', true, e)} onPointerUp={(e) => setTouchMove('backward', false, e)} onPointerCancel={(e) => setTouchMove('backward', false, e)}>↓</button>
          <button type="button" className="h-11 w-11 touch-none rounded-xl border border-white/20 bg-[#0c0c18]/85 text-lg text-white" onPointerDown={(e) => setTouchMove('right', true, e)} onPointerUp={(e) => setTouchMove('right', false, e)} onPointerCancel={(e) => setTouchMove('right', false, e)}>→</button>
        </div>
      ) : (
        <div className="pointer-events-none fixed bottom-48 left-3 right-3 z-20 flex items-end justify-between md:hidden">
          <div className="pointer-events-auto flex gap-2">
            <button type="button" className="h-12 w-14 touch-none rounded-xl border border-white/20 bg-[#0c0c18]/85 text-lg font-bold text-white" onPointerDown={(e) => setTouchMove('left', true, e)} onPointerUp={(e) => setTouchMove('left', false, e)}>◀</button>
            <button type="button" className="h-12 w-14 touch-none rounded-xl border border-white/20 bg-[#0c0c18]/85 text-lg font-bold text-white" onPointerDown={(e) => setTouchMove('right', true, e)} onPointerUp={(e) => setTouchMove('right', false, e)}>▶</button>
          </div>
          <div className="pointer-events-auto flex gap-2">
            <button type="button" className="h-12 touch-none rounded-xl border border-rose-300/35 bg-[#0c0c18]/85 px-4 text-xs font-semibold text-rose-200" onPointerDown={(e) => setTouchMove('backward', true, e)} onPointerUp={(e) => setTouchMove('backward', false, e)}>Brake</button>
            <button type="button" className="h-12 touch-none rounded-xl border border-emerald-300/35 bg-[#0c0c18]/85 px-4 text-xs font-semibold text-emerald-200" onPointerDown={(e) => setTouchMove('forward', true, e)} onPointerUp={(e) => setTouchMove('forward', false, e)}>Gas</button>
          </div>
        </div>
      )}

      {/* Story Cutscene Dialogue Overlay */}
      {dialogueState && currentLine && (
        <div className="fixed inset-0 z-40 flex flex-col justify-between bg-black/25">
          <div className="h-12 w-full bg-black/95" />
          <div className="mx-auto mb-6 mt-auto w-[min(94vw,44rem)] rounded-2xl border border-cyan-300/45 bg-[#0c0c18]/95 p-5 text-white shadow-2xl backdrop-blur-md">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                {currentLine.sceneTag && (
                  <div className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">
                    {currentLine.sceneTag}
                  </div>
                )}
                <span className="text-base font-bold text-amber-200">{currentLine.speaker}</span>
                {currentLine.role && <span className="ml-2 text-[11px] uppercase tracking-wider text-cyan-300/80">{currentLine.role}</span>}
              </div>
              {dialogueState.isOpening ? (
                <button
                  type="button"
                  onClick={skipCutscene}
                  className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/80 hover:bg-white/20"
                >
                  Skip Intro →
                </button>
              ) : (
                <span className="text-[10px] uppercase tracking-widest text-white/50">Story Scene</span>
              )}
            </div>
            <p className="mb-4 text-sm leading-relaxed text-white/95 sm:text-base">
              {dialogueState.replyText || currentLine.text}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              {currentLine.choices && !dialogueState.replyText ? (
                currentLine.choices.map((ch, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => chooseDialogueOption(ch)}
                    className="rounded-xl border border-cyan-300/45 bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500/35"
                  >
                    {ch.label}
                  </button>
                ))
              ) : (
                <button
                  type="button"
                  onClick={advanceDialogue}
                  className="rounded-xl bg-cyan-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
                >
                  {dialogueState.index + 1 < dialogueState.lines.length ? 'Next →' : 'Continue Mission ✓'}
                </button>
              )}
            </div>
          </div>
          <div className="h-12 w-full bg-black/95" />
        </div>
      )}

      {/* Cipher Vault Puzzle Modal */}
      {cipherState && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-cyan-300/45 bg-[#0c0c18]/95 p-6 text-center text-white shadow-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Apex Vault Security</div>
            <h2 className="mt-1 font-display text-3xl font-bold text-white">Sovereign Cipher Lock</h2>
            <p className="mt-2 text-xs text-amber-200/85">{cipherState.step.hint}</p>
            <div className="my-5 flex items-center justify-center gap-3">
              {cipherDigits.map((val, idx) => (
                <input
                  key={idx}
                  type="number"
                  min={0}
                  max={9}
                  value={val}
                  onChange={(e) => {
                    const next = [...cipherDigits];
                    next[idx] = e.target.value.slice(-1) || '0';
                    setCipherDigits(next);
                  }}
                  className="h-16 w-14 rounded-xl border border-cyan-300/40 bg-black/50 text-center text-2xl font-bold text-white"
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { const fn = cipherState.onResult; setCipherState(null); fn(false); }}
                className="flex-1 rounded-xl bg-white/10 py-2.5 text-xs font-semibold hover:bg-white/20"
              >
                Back
              </button>
              <button
                type="button"
                onClick={submitCipher}
                className="flex-1 rounded-xl bg-cyan-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400"
              >
                Unlock Vault
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Story Journal & Chapter Select Modal */}
      {journalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6">
          <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-amber-200/25 bg-[#0c0c18]/95 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/15 px-5 py-4">
              <div>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">Chronicles of Leonida Bay</h2>
                <p className="mt-1 text-xs text-cyan-200/80">
                  Protagonist: {hud.playerName} • Clues Collected: {hud.clues.length}
                </p>
              </div>
              <button type="button" onClick={() => setJournalOpen(false)} className="rounded-xl bg-white/10 px-3 py-1.5 text-white hover:bg-white/20">✕</button>
            </div>
            {hud.clues.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-b border-white/10 bg-black/30 px-5 py-2.5 text-[11px]">
                <span className="font-semibold text-amber-300">Clues:</span>
                {hud.clues.map((c, idx) => (
                  <span key={idx} className="rounded-full border border-cyan-300/30 bg-cyan-500/15 px-2.5 py-0.5 text-cyan-100">{c}</span>
                ))}
              </div>
            )}
            <div className="vintage-scroll flex-1 space-y-2.5 overflow-y-auto p-4">
              {CHAPTERS.map((ch, idx) => {
                const done = hud.completed || idx < hud.chapterIndex;
                const current = !hud.completed && idx === hud.chapterIndex;
                return (
                  <div key={ch.id} className={`rounded-2xl border p-3.5 ${current ? 'border-cyan-300/50 bg-cyan-500/15' : done ? 'border-emerald-300/30 bg-emerald-500/10' : 'border-white/10 bg-white/5'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-bold text-white">{ch.title}</div>
                        <div className="mt-0.5 text-[11px] text-white/75">{ch.summary}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { arenaRef.current?.jumpToChapter(idx); setJournalOpen(false); }}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold ${current ? 'bg-cyan-500 text-slate-950' : 'bg-white/15 text-white hover:bg-white/25'}`}
                      >
                        {current ? 'Active' : done ? 'Replay' : 'Play'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between border-t border-white/15 px-5 py-3 text-xs">
              <span className="text-white/70">Collect 12 Neon Palm Trophies around Leonida for bonus cash!</span>
              <button
                type="button"
                onClick={() => arenaRef.current?.resetCampaign()}
                className="rounded-lg bg-rose-800/60 px-3 py-1.5 font-semibold text-rose-100 hover:bg-rose-700/80"
              >
                Reset Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Street Atlas Modal */}
      {mapOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-amber-200/25 bg-[#0c0c18]/95 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/15 px-5 py-4">
              <div>
                <h2 className="font-display text-2xl font-bold sm:text-3xl">Leonida Bay Street Atlas</h2>
                <p className="mt-1 text-xs text-cyan-200/80">Click any landmark or vehicle icon to fast-travel immediately</p>
              </div>
              <button type="button" onClick={() => setMapOpen(false)} className="rounded-xl bg-white/10 px-3 py-1.5 text-white hover:bg-white/20">✕</button>
            </div>
            <div className="flex flex-1 items-center justify-center overflow-hidden bg-black/35 p-4">
              <canvas
                ref={fullMapCanvasRef}
                width={680}
                height={680}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const nx = (e.clientX - rect.left) / rect.width;
                  const ny = (e.clientY - rect.top) / rect.height;
                  if (arenaRef.current?.handleMapClick(nx, ny, e.currentTarget.width, e.currentTarget.height)) {
                    setMapOpen(false);
                  }
                }}
                className="aspect-square w-full max-w-[520px] cursor-pointer rounded-2xl border border-cyan-300/35 bg-[#141724]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Landmark Inspection Card */}
      {selectedLandmark && (
        <section className="fixed bottom-16 left-3 right-3 z-30 max-h-[65vh] overflow-y-auto rounded-2xl border border-amber-200/25 bg-[#0c0c18]/92 p-5 text-white shadow-2xl backdrop-blur-md sm:bottom-auto sm:left-auto sm:right-5 sm:top-24 sm:w-[340px]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-block rounded-full border border-cyan-300/30 bg-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-cyan-200">
                {selectedLandmark.category}
              </span>
              <h2 className="mt-1 font-display text-2xl font-bold leading-tight text-white">{selectedLandmark.name}</h2>
            </div>
            <button type="button" onClick={() => setSelectedLandmark(null)} className="rounded-xl bg-white/10 px-2.5 py-1 text-white hover:bg-white/20">✕</button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-white/85 sm:text-sm">{selectedLandmark.desc}</p>
        </section>
      )}

      {/* Graphics & Controls Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6">
          <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-amber-200/25 bg-[#0c0c18]/95 p-5 text-white shadow-2xl sm:p-6">
            <div className="mb-4 flex items-center justify-between border-b border-white/15 pb-3">
              <div>
                <h2 className="font-display text-2xl font-bold leading-none">Graphics &amp; Controls</h2>
                <p className="mt-1 text-xs text-cyan-200/75">Tune shaders, driving sensitivity &amp; keybinds</p>
              </div>
              <button type="button" onClick={() => setSettingsOpen(false)} className="rounded-xl bg-white/10 px-3 py-1.5 text-white hover:bg-white/20">✕</button>
            </div>
            <div className="space-y-4 text-xs">
              <div>
                <div className="mb-1.5 text-[11px] uppercase tracking-wider text-cyan-300/90">Graphics Preset</div>
                <div className="grid grid-cols-3 gap-2">
                  {['balanced', 'high', 'ultra'].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        setQuality(q);
                        setBloomEnabled(q !== 'balanced');
                        setGradeEnabled(q !== 'balanced');
                        arenaRef.current?.setQuality(q);
                      }}
                      className={`rounded-xl border py-2 capitalize ${quality === q ? 'border-cyan-300/60 bg-cyan-500/25 font-bold' : 'border-white/15 bg-white/5'}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                  <span>Cinematic Bloom</span>
                  <input type="checkbox" checked={bloomEnabled} onChange={(e) => { setBloomEnabled(e.target.checked); arenaRef.current?.setBloom(e.target.checked); }} className="h-4 w-4 accent-cyan-400" />
                </label>
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                  <span>Vice Color Grade</span>
                  <input type="checkbox" checked={gradeEnabled} onChange={(e) => { setGradeEnabled(e.target.checked); arenaRef.current?.setGrade(e.target.checked); }} className="h-4 w-4 accent-cyan-400" />
                </label>
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                  <span>Soft Shadows</span>
                  <input type="checkbox" checked={shadowsEnabled} onChange={(e) => { setShadowsEnabled(e.target.checked); arenaRef.current?.setShadows(e.target.checked); }} className="h-4 w-4 accent-cyan-400" />
                </label>
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                  <span>Engine &amp; Siren Audio</span>
                  <input type="checkbox" checked={soundEnabled} onChange={(e) => { setSoundEnabled(e.target.checked); arenaRef.current?.setSound(e.target.checked); }} className="h-4 w-4 accent-cyan-400" />
                </label>
              </div>
              <div>
                <div className="mb-1 flex justify-between">
                  <span className="uppercase tracking-wider text-cyan-300/90">Look Sensitivity</span>
                  <span>{sensitivity.toFixed(1)}×</span>
                </div>
                <input
                  type="range"
                  min={0.4}
                  max={2.2}
                  step={0.1}
                  value={sensitivity}
                  onChange={(e) => { const v = Number(e.target.value); setSensitivity(v); arenaRef.current?.setSensitivity(v); }}
                  className="w-full accent-cyan-400"
                />
              </div>
              <div className="space-y-1.5 rounded-2xl border border-white/10 bg-black/35 p-3.5 text-[11px] text-white/85">
                <div className="font-bold text-amber-200">Controls</div>
                <div className="grid grid-cols-2 gap-1.5">
                  <div><kbd className="text-cyan-300">WASD</kbd> Walk / Drive</div>
                  <div><kbd className="text-cyan-300">Shift</kbd> Sprint / Nitro</div>
                  <div><kbd className="text-cyan-300">Space</kbd> Jump / Drift</div>
                  <div><kbd className="text-cyan-300">E</kbd> Enter Car / Door</div>
                  <div><kbd className="text-cyan-300">V / C</kbd> Camera View</div>
                  <div><kbd className="text-cyan-300">M / J</kbd> Atlas / Story</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Control Hints */}
      <footer className="pointer-events-none fixed bottom-3 left-1/2 z-20 flex w-full max-w-3xl -translate-x-1/2 justify-center px-3">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border border-white/15 bg-[#0c0c18]/85 px-4 py-1.5 text-[11px] text-white/85 backdrop-blur-md">
          <span><strong className="text-cyan-300">WASD</strong> Move / Drive</span>
          <span className="hidden opacity-30 sm:inline">•</span>
          <span className="hidden sm:inline"><strong className="text-cyan-300">Shift</strong> Sprint / Nitro</span>
          <span className="hidden opacity-30 sm:inline">•</span>
          <span><strong className="text-cyan-300">E</strong> Car / Door</span>
          <span className="hidden opacity-30 sm:inline">•</span>
          <span><strong className="text-cyan-300">J</strong> Story</span>
          <span className="hidden opacity-30 sm:inline">•</span>
          <span><strong className="text-cyan-300">M</strong> Map</span>
        </div>
      </footer>
        </>
      )}
    </section>
  );
}
