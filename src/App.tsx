import { useCallback, useEffect, useRef, useState } from 'react';
import { EndingScreen } from './components/EndingScreen';
import { GameHUD } from './components/GameHUD';
import { MainMenu } from './components/MainMenu';
import { MobileInstallGate, OfflineIndicator } from './components/PWAInstallUI';
import { PuzzleModals } from './components/PuzzleModals';
import { HorrorAudioEngine } from './engine/audioEngine';
import { GameEngine } from './engine/GameEngine';
import { useLandscapeLock } from './hooks/useLandscapeLock';
import { usePWAInstall } from './hooks/usePWAInstall';
import {
  FloorId,
  GraphicsQuality,
  HUDState,
  InventoryItemId,
  PuzzleType,
  SaveSlotData,
} from './types/game';

const SETTINGS_KEY = 'aakhiri_niwala_settings_v1';
const SAVES_KEY = 'aakhiri_niwala_saves_v1';

interface SavedSettings {
  quality: GraphicsQuality;
  volume: number;
  mobileControls: boolean;
}

const DEFAULT_HUD: HUDState = {
  currentMission: 1,
  floor: 'G',
  roomName: 'मुख्य प्रवेश द्वार और बारिश वाली सड़क',
  timeLabel: 'दिन 1 · रात 11:45',
  dayNumber: 1,
  stamina: 100,
  battery: 100,
  flashlightOn: true,
  isCrouching: false,
  isHiding: false,
  hideLabel: '',
  isPeepholeActive: false,
  isCutsceneActive: false,
  eyelidClose: 0,
  nearbyPrompt: 'दरवाजे के पास लगी पुरानी घंटी बजाएँ',
  secondaryPrompt: null,
  subtitle: null,
  kavitaThreatLevel: 0,
  kavitaState: 'waiting_lobby',
  suspicionLevel: 0,
  wrongDialogueCount: 0,
  powerRestored: false,
  playTimeSeconds: 0,
  cctvActiveCamera: null,
  playerX: 1.12,
  playerZ: 20.15,
};

function loadSettings(): SavedSettings {
  const isTouchDefault =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SavedSettings>;
      return {
        quality: parsed.quality || 'medium',
        volume: typeof parsed.volume === 'number' ? parsed.volume : 0.65,
        mobileControls:
          typeof parsed.mobileControls === 'boolean'
            ? parsed.mobileControls
            : isTouchDefault,
      };
    }
  } catch {
    // ignore storage read issues
  }
  return { quality: 'medium', volume: 0.65, mobileControls: isTouchDefault };
}

function loadSaves(): Record<string, SaveSlotData> {
  try {
    const raw = localStorage.getItem(SAVES_KEY);
    if (raw) {
      return JSON.parse(raw) as Record<string, SaveSlotData>;
    }
  } catch {
    // ignore storage read issues
  }
  return {};
}

export default function App() {
  const initialSettings = useRef<SavedSettings>(loadSettings());
  const audioRef = useRef<HorrorAudioEngine | null>(null);
  if (!audioRef.current) {
    audioRef.current = new HorrorAudioEngine();
    audioRef.current.setVolume(initialSettings.current.volume);
  }

  const { isInstalled, isDevPreview } = usePWAInstall();
  const { isPortraitViewport } = useLandscapeLock();
  const isWebLocked = !isDevPreview && !isInstalled;

  const [screen, setScreen] = useState<'menu' | 'playing'>('playing');
  const [sessionNonce, setSessionNonce] = useState(0);
  const [quality, setQuality] = useState<GraphicsQuality>(initialSettings.current.quality);
  const [volume, setVolume] = useState<number>(initialSettings.current.volume);
  const [mobileControls, setMobileControls] = useState<boolean>(
    initialSettings.current.mobileControls
  );
  const [saves, setSaves] = useState<Record<string, SaveSlotData>>(() => loadSaves());

  const [hud, setHud] = useState<HUDState>(DEFAULT_HUD);
  const [inventory, setInventory] = useState<InventoryItemId[]>([]);
  const [collectedLore, setCollectedLore] = useState<string[]>([]);
  const [activePuzzle, setActivePuzzle] = useState<PuzzleType | null>(null);
  const [puzzleContext, setPuzzleContext] = useState<string | undefined>(undefined);
  const [activeLoreId, setActiveLoreId] = useState<string | null>(null);
  const [liftModalOpen, setLiftModalOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [caughtOpen, setCaughtOpen] = useState(false);
  const [caughtReason, setCaughtReason] = useState<'caught' | 'wrong_answers'>('caught');
  const [endingPlayTime, setEndingPlayTime] = useState<number | null>(null);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const pendingSaveRef = useRef<SaveSlotData | null>(null);

  const persistSettings = useCallback(
    (next: SavedSettings) => {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
    },
    []
  );

  const persistSave = useCallback((slotData: SaveSlotData) => {
    setSaves((prev) => {
      const updated = { ...prev, [slotData.slotId]: slotData };
      try {
        localStorage.setItem(SAVES_KEY, JSON.stringify(updated));
      } catch {
        // ignore storage quota errors
      }
      return updated;
    });
  }, []);

  const handleDeleteSave = useCallback((slotId: string) => {
    setSaves((prev) => {
      const next = { ...prev };
      delete next[slotId];
      try {
        localStorage.setItem(SAVES_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const handleChangeQuality = useCallback(
    (q: GraphicsQuality) => {
      setQuality(q);
      engineRef.current?.applyQualitySettings(q);
      persistSettings({ quality: q, volume, mobileControls });
    },
    [volume, mobileControls, persistSettings]
  );

  const handleChangeVolume = useCallback(
    (v: number) => {
      setVolume(v);
      audioRef.current?.setVolume(v);
      persistSettings({ quality, volume: v, mobileControls });
    },
    [quality, mobileControls, persistSettings]
  );

  const handleChangeMobileControls = useCallback(
    (enabled: boolean) => {
      setMobileControls(enabled);
      persistSettings({ quality, volume, mobileControls: enabled });
    },
    [quality, volume, persistSettings]
  );

  const resetUiOverlays = useCallback(() => {
    setActivePuzzle(null);
    setPuzzleContext(undefined);
    setActiveLoreId(null);
    setLiftModalOpen(false);
    setInventoryOpen(false);
    setMapOpen(false);
    setPauseOpen(false);
    setCaughtOpen(false);
    setCaughtReason('caught');
    setEndingPlayTime(null);
  }, []);

  const handleStartNewGame = useCallback(() => {
    audioRef.current?.init();
    pendingSaveRef.current = null;
    setHud(DEFAULT_HUD);
    setInventory([]);
    setCollectedLore([]);
    resetUiOverlays();
    setScreen('playing');
    setSessionNonce((n) => n + 1);
  }, [resetUiOverlays]);

  const handleLoadSave = useCallback(
    (save: SaveSlotData) => {
      audioRef.current?.init();
      pendingSaveRef.current = save;
      resetUiOverlays();
      setScreen('playing');
      setSessionNonce((n) => n + 1);
    },
    [resetUiOverlays]
  );

  // Sync engine pause whenever any modal is active (except live CCTV 3D camera!)
  useEffect(() => {
    if (!engineRef.current) return;
    const anyModal =
      activePuzzle !== null ||
      activeLoreId !== null ||
      liftModalOpen ||
      inventoryOpen ||
      mapOpen ||
      pauseOpen ||
      caughtOpen;
    engineRef.current.setPaused(anyModal);
  }, [
    activePuzzle,
    activeLoreId,
    liftModalOpen,
    inventoryOpen,
    mapOpen,
    pauseOpen,
    caughtOpen,
  ]);

  // Isolated Three.js WebGL GameEngine Lifecycle
  useEffect(() => {
    if (isWebLocked || screen !== 'playing' || !canvasMountRef.current || !audioRef.current) {
      return;
    }

    const container = canvasMountRef.current;
    const engine = new GameEngine(
      container,
      {
        onHudUpdate: (nextHud) => setHud(nextHud),
        onInventoryChange: (items) => setInventory(items),
        onLoreCollected: (lore) => setCollectedLore(lore),
        onOpenPuzzle: (puzzle, ctx) => {
          if (puzzle === 'cctv_system') {
            engine.setCctvCamera(0);
            return;
          }
          setActivePuzzle(puzzle);
          setPuzzleContext(ctx);
        },
        onOpenLoreModal: (loreId) => setActiveLoreId(loreId),
        onOpenLiftModal: () => setLiftModalOpen(true),
        onMissionComplete: () => {
          // Tracked live via HUD currentMission
        },
        onSaveCheckpoint: (snap) => persistSave(snap),
        onPlayerCaught: (reason) => {
          setCaughtReason(reason === 'wrong_answers' ? 'wrong_answers' : 'caught');
          setCaughtOpen(true);
        },
        onEscapeEnding: (secs) => setEndingPlayTime(secs),
        onPauseRequest: () => {
          setInventoryOpen(false);
          setMapOpen(false);
          setLiftModalOpen(false);
          setActiveLoreId(null);
          setPauseOpen((prev) => !prev);
        },
        onToggleInventory: () => {
          setMapOpen(false);
          setLiftModalOpen(false);
          setPauseOpen(false);
          setInventoryOpen((prev) => !prev);
        },
        onToggleMap: () => {
          setInventoryOpen(false);
          setLiftModalOpen(false);
          setPauseOpen(false);
          setMapOpen((prev) => !prev);
        },
      },
      audioRef.current,
      quality,
      pendingSaveRef.current
    );

    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWebLocked, screen, sessionNonce]);

  useEffect(() => {
    audioRef.current?.prefetchSpeech(
      'player',
      'इतनी तेज बारिश और तूफान... रात बहुत हो चुकी है, किसी तरह घर पहुँचना होगा!'
    );
    audioRef.current?.prefetchSpeech(
      'player',
      'अरे! इंजन को क्या हुआ? गाड़ी अचानक बंद क्यों हो गई?! स्टार्ट ही नहीं हो रही!'
    );
    audioRef.current?.prefetchSpeech(
      'player',
      'मोबाइल में भी नेटवर्क नहीं है! सामने "शाही निवाला रेस्टोरेंट" का बोर्ड दिख रहा है... वहीं जाकर मदद माँगता हूँ।'
    );
    return () => {
      audioRef.current?.dispose();
    };
  }, []);

  const playerLocation = {
    floor: hud.floor,
    x: hud.playerX,
    z: hud.playerZ,
  };

  if (isWebLocked) {
    return (
      <>
        <MobileInstallGate />
        <OfflineIndicator />
      </>
    );
  }

  const landscapeStageClass = isPortraitViewport
    ? 'fixed top-0 left-full w-[100dvh] h-[100dvw] origin-top-left rotate-90 bg-black overflow-hidden'
    : 'relative w-full h-full bg-black overflow-hidden';

  if (screen === 'menu') {
    return (
      <div className={landscapeStageClass}>
        <MainMenu
          saves={saves}
          quality={quality}
          volume={volume}
          mobileControls={mobileControls}
          audio={audioRef.current}
          onChangeQuality={handleChangeQuality}
          onChangeVolume={handleChangeVolume}
          onChangeMobileControls={handleChangeMobileControls}
          onStartNewGame={handleStartNewGame}
          onLoadSave={handleLoadSave}
          onDeleteSave={handleDeleteSave}
        />
        <OfflineIndicator />
      </div>
    );
  }

  return (
    <div className={landscapeStageClass}>
      {/* Dedicated WebGL Canvas Container */}
      <div ref={canvasMountRef} className="absolute inset-0" />

      {/* Live HUD Overlay (hidden during final black fade) */}
      {endingPlayTime === null && (
        <GameHUD
          hud={hud}
          mobileControls={mobileControls}
          forceLandscapeRotated={isPortraitViewport}
          onAction={(act) => engineRef.current?.triggerMobileAction(act)}
          onTouchMove={(x, y, s) => engineRef.current?.setTouchMovement(x, y, s)}
          onTouchLook={(dx, dy) => engineRef.current?.addTouchLookDelta(dx, dy)}
          onSelectCctvCam={(idx) => engineRef.current?.setCctvCamera(idx)}
          onCloseCctv={() => engineRef.current?.completeExternalPuzzle('cctv_system')}
          onOpenInventory={() => setInventoryOpen(true)}
          onOpenMap={() => setMapOpen(true)}
          onOpenPause={() => setPauseOpen(true)}
        />
      )}

      {/* Interactive Story Puzzles, Map, Bag, Lore, Lift, Pause, Caught */}
      <PuzzleModals
        activePuzzle={activePuzzle}
        puzzleContext={puzzleContext}
        activeLoreId={activeLoreId}
        liftModalOpen={liftModalOpen}
        inventoryOpen={inventoryOpen}
        mapOpen={mapOpen}
        pauseOpen={pauseOpen}
        caughtOpen={caughtOpen}
        caughtReason={caughtReason}
        suspicionLevel={hud.suspicionLevel}
        wrongDialogueCount={hud.wrongDialogueCount}
        currentMission={hud.currentMission}
        playerLocation={playerLocation}
        inventory={inventory}
        collectedLore={collectedLore}
        powerRestored={hud.powerRestored}
        playTimeSeconds={hud.playTimeSeconds}
        quality={quality}
        volume={volume}
        mobileControls={mobileControls}
        onClosePuzzle={() => {
          setActivePuzzle(null);
          setPuzzleContext(undefined);
        }}
        onSolvePuzzle={(puz, payload) => {
          setActivePuzzle(null);
          setPuzzleContext(undefined);
          engineRef.current?.completeExternalPuzzle(puz, payload);
        }}
        onPlayPenSound={() => audioRef.current?.playPenWrite()}
        onSpeakQuestion={(q) => engineRef.current?.speakChudailQuestion(q)}
        onSpeakDialogueExchange={(p, r) => engineRef.current?.speakDialogueExchange(p, r)}
        onCloseLore={() => setActiveLoreId(null)}
        onOpenLoreFromBag={(loreId) => {
          setInventoryOpen(false);
          setActiveLoreId(loreId);
        }}
        onCloseLift={() => setLiftModalOpen(false)}
        onSelectLiftFloor={(fl: FloorId) => engineRef.current?.moveLiftToFloor(fl)}
        onCloseInventory={() => setInventoryOpen(false)}
        onCloseMap={() => setMapOpen(false)}
        onResumePause={() => setPauseOpen(false)}
        onSaveSlot={(slotId) => {
          if (!engineRef.current) return;
          persistSave(engineRef.current.getSaveSnapshot(slotId));
        }}
        onChangeQuality={handleChangeQuality}
        onChangeVolume={handleChangeVolume}
        onChangeMobileControls={handleChangeMobileControls}
        onReturnToMenu={() => {
          resetUiOverlays();
          setScreen('menu');
        }}
        onReloadCheckpoint={() => {
          const fallback = saves.auto || saves.slot1 || saves.slot2 || null;
          if (fallback) {
            handleLoadSave(fallback);
          } else {
            handleStartNewGame();
          }
        }}
        onRestartGame={handleStartNewGame}
      />

      {/* Dawn Finale + Incoming Phone SMS + Epilogue */}
      {endingPlayTime !== null && (
        <EndingScreen
          playTimeSeconds={endingPlayTime}
          onReturnToMenu={() => {
            resetUiOverlays();
            setScreen('menu');
          }}
        />
      )}

      <OfflineIndicator />
    </div>
  );
}
