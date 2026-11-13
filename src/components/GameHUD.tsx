import React, { useRef, useState } from 'react';
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  Eye,
  Flashlight,
  Map as MapIcon,
  Pause,
  Zap,
  ZapOff,
} from 'lucide-react';
import { MISSIONS } from '../data/missions';
import { CCTV_CAMERAS } from '../engine/GameEngine';
import { FloorId, HUDState } from '../types/game';

interface GameHUDProps {
  hud: HUDState;
  mobileControls: boolean;
  forceLandscapeRotated?: boolean;
  onAction: (action: 'interact' | 'peephole' | 'flashlight' | 'crouch' | 'jump') => void;
  onTouchMove: (x: number, y: number, sprinting: boolean) => void;
  onTouchLook: (dx: number, dy: number) => void;
  onSelectCctvCam: (idx: number) => void;
  onCloseCctv: () => void;
  onOpenInventory: () => void;
  onOpenMap: () => void;
  onOpenPause: () => void;
}

const FLOOR_LABELS: Record<FloorId, string> = {
  B1: 'तहखाना',
  G: 'भूतल',
  '1': 'पहली मंजिल',
  '2': 'दूसरी मंजिल',
  '3': 'तीसरी मंजिल',
  '4': 'चौथी मंजिल व छत',
};

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  mobileControls,
  forceLandscapeRotated = false,
  onAction,
  onTouchMove,
  onTouchLook,
  onSelectCctvCam,
  onCloseCctv,
  onOpenInventory,
  onOpenMap,
  onOpenPause,
}) => {
  const [missionCollapsed, setMissionCollapsed] = useState(false);
  const [touchSprint, setTouchSprint] = useState(false);
  const [joyOffset, setJoyOffset] = useState({ x: 0, y: 0 });
  const joyPointerId = useRef<number | null>(null);
  const joyCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lookPointerId = useRef<number | null>(null);
  const lastLook = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const activeMission = MISSIONS[hud.currentMission - 1] || MISSIONS[0];

  // CCTV Live Camera Mode
  if (hud.cctvActiveCamera !== null) {
    const camInfo = CCTV_CAMERAS[hud.cctvActiveCamera] || CCTV_CAMERAS[0];
    return (
      <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 sm:p-6 select-none">
        {/* CRT Scanlines */}
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none opacity-25"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, rgba(16, 185, 129, 0.16) 0px, rgba(16, 185, 129, 0.16) 1px, transparent 1px, transparent 4px)',
          }}
        />
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none border-8 border-zinc-950/90"
        />

        {/* Top CCTV Header */}
        <div className="relative z-10 pointer-events-auto flex flex-wrap items-center justify-between gap-3 bg-zinc-950/92 border border-emerald-800/70 rounded-lg px-4 py-3">
          <div>
            <p className="text-xs text-emerald-400 font-semibold">
              शाही निवाला · सुरक्षा कैमरा निगरानी कक्ष
            </p>
            <p className="text-sm sm:text-base font-bold text-zinc-100 mt-0.5">
              {camInfo.label}
            </p>
          </div>
          <button
            type="button"
            onClick={onCloseCctv}
            className="min-h-[44px] px-5 py-2 bg-red-800 hover:bg-red-700 text-white font-semibold text-sm rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            मॉनिटर बंद करें
          </button>
        </div>

        {/* Bottom Camera Switcher */}
        <div className="relative z-10 pointer-events-auto max-w-4xl w-full mx-auto bg-zinc-950/92 border border-emerald-800/70 rounded-lg p-3">
          <p className="text-xs text-zinc-400 mb-2">
            सभी कैमरे बदलकर देखें (कविता की स्थिति पहचानें)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CCTV_CAMERAS.map((cam, idx) => (
              <button
                key={cam.label}
                type="button"
                onClick={() => onSelectCctvCam(idx)}
                className={`min-h-[44px] px-3 py-2 text-xs sm:text-sm font-medium rounded-md border text-left truncate transition-colors cursor-pointer ${
                  hud.cctvActiveCamera === idx
                    ? 'bg-emerald-800 border-emerald-500 text-white font-bold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {cam.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Peephole Aperture Mode
  if (hud.isPeepholeActive) {
    return (
      <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 select-none">
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, transparent 0%, rgba(12, 10, 8, 0.3) 22%, rgba(4, 4, 6, 0.96) 35%, #000000 100%)',
          }}
        />
        <div className="relative z-10 max-w-md mx-auto bg-zinc-950/90 border border-zinc-800 rounded-lg px-4 py-2 text-center">
          <p className="text-xs sm:text-sm text-amber-200 font-medium">
            दरवाजे के छोटे छेद से बाहर का दृश्य
          </p>
        </div>

        {hud.subtitle && (
          <div
            className={`relative z-10 max-w-md w-full mx-auto bg-zinc-950/95 border rounded-lg px-3 py-2 flex items-center gap-2.5 ${
              hud.subtitle.speaker.includes('कविता') ? 'border-red-900/80' : 'border-zinc-800 justify-center text-center'
            }`}
          >
            {hud.subtitle.speaker.includes('कविता') && (
              <div className="w-9 h-10 rounded-md overflow-hidden border border-red-800/80 shrink-0 bg-black">
                <img
                  src="/assets/aistudio/file_00000000f7fc82119210b918dbfab209_7b28c7b7.png"
                  alt="कविता"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-[50%_14%]"
                />
              </div>
            )}
            <div className={hud.subtitle.speaker.includes('कविता') ? 'text-left min-w-0' : 'text-center'}>
              <p className={`text-[10px] sm:text-[11px] font-semibold ${hud.subtitle.speaker.includes('कविता') ? 'text-red-400' : 'text-amber-300'}`}>
                {hud.subtitle.speaker}
              </p>
              <p className="text-[11px] sm:text-xs text-zinc-100 mt-0.5 leading-snug">{hud.subtitle.text}</p>
            </div>
          </div>
        )}

        <div className="relative z-10 pointer-events-auto flex justify-center">
          <button
            type="button"
            onClick={() => onAction('peephole')}
            className="min-h-[48px] px-7 py-3 bg-zinc-900 hover:bg-zinc-800 border border-amber-700/70 text-amber-200 font-semibold text-base rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            छेद से हटें
          </button>
        </div>
      </div>
    );
  }

  // Standard HUD
  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4 select-none overflow-hidden">
      {/* Smooth First-Person Eyelids during Sleep & Dream Cutscene */}
      {hud.eyelidClose > 0.01 && (
        <>
          <div
            aria-hidden="true"
            className="fixed inset-x-0 top-0 h-[53vh] bg-black pointer-events-none z-20"
            style={{
              transform: `translateY(${-(1 - hud.eyelidClose) * 100}%)`,
            }}
          />
          <div
            aria-hidden="true"
            className="fixed inset-x-0 bottom-0 h-[53vh] bg-black pointer-events-none z-20"
            style={{
              transform: `translateY(${(1 - hud.eyelidClose) * 100}%)`,
            }}
          />
        </>
      )}

      {/* Danger Vignette when Kavita approaches */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none transition-opacity duration-200 z-10"
        style={{
          opacity: hud.kavitaThreatLevel * 0.72,
          background:
            'radial-gradient(circle at 50% 50%, transparent 45%, rgba(127, 29, 29, 0.72) 100%)',
        }}
      />

      {/* Right-half Touch Look Pad for Mobile Touch Controls */}
      {mobileControls && !hud.isCutsceneActive && (
        <div
          aria-label="आसपास देखने का स्पर्श क्षेत्र"
          className="fixed top-16 bottom-36 right-0 w-1/2 pointer-events-auto touch-none"
          onPointerDown={(e) => {
            if (lookPointerId.current !== null) return;
            lookPointerId.current = e.pointerId;
            lastLook.current = { x: e.clientX, y: e.clientY };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (lookPointerId.current !== e.pointerId) return;
            const rawDx = e.clientX - lastLook.current.x;
            const rawDy = e.clientY - lastLook.current.y;
            lastLook.current = { x: e.clientX, y: e.clientY };
            const dx = forceLandscapeRotated ? rawDy : rawDx;
            const dy = forceLandscapeRotated ? -rawDx : rawDy;
            onTouchLook(dx, dy);
          }}
          onPointerUp={(e) => {
            if (lookPointerId.current === e.pointerId) {
              lookPointerId.current = null;
            }
          }}
          onPointerCancel={() => {
            lookPointerId.current = null;
          }}
        />
      )}

      {/* TOP BAR: Mission Card (Left) + Status/Buttons (Right) side-by-side just like gameplay screenshot */}
      <div className="relative z-30 flex flex-row items-start justify-between gap-2">
        {/* Left: Mission & Room Tracker */}
        <div className="pointer-events-auto max-w-[54%] sm:max-w-md bg-zinc-950/90 border border-zinc-800 rounded-lg px-2.5 py-2 sm:px-3.5 sm:py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] sm:text-[11px] text-zinc-400 truncate">
              <span className="text-amber-300 font-semibold tabular-nums">
                मिशन {hud.currentMission} / {MISSIONS.length}
              </span>
              <span className="mx-1 text-zinc-600" aria-hidden="true">·</span>
              <span className="text-zinc-200 tabular-nums">{hud.timeLabel}</span>
              <span className="mx-1 text-zinc-600" aria-hidden="true">·</span>
              <span>{FLOOR_LABELS[hud.floor]}</span>
              <span className="mx-1 text-zinc-600" aria-hidden="true">·</span>
              <span className="text-zinc-200">{hud.roomName}</span>
            </div>
            {!hud.isCutsceneActive && (
              <button
                type="button"
                aria-label={missionCollapsed ? 'मिशन विवरण दिखाएँ' : 'मिशन विवरण छिपाएँ'}
                onClick={() => setMissionCollapsed((p) => !p)}
                className="p-0.5 text-zinc-400 hover:text-zinc-100 shrink-0 cursor-pointer"
              >
                {missionCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
          {!missionCollapsed && !hud.isCutsceneActive && (
            <div className="mt-1">
              <p className="text-xs sm:text-[13px] font-semibold text-amber-100 leading-snug">
                {activeMission.title}
              </p>
              <p className="text-[10px] sm:text-[11px] text-zinc-300 mt-0.5 leading-snug">
                {activeMission.objective}
              </p>
            </div>
          )}
        </div>

        {/* Right: Stamina, Battery, Power & Action Buttons */}
        {!hud.isCutsceneActive && (
          <div className="pointer-events-auto flex flex-col items-end gap-1.5 shrink-0">
            <div className="bg-zinc-950/90 border border-zinc-800 rounded-lg px-2.5 py-1.5 flex items-center gap-2 sm:gap-2.5 text-[10px] sm:text-[11px]">
              {/* Power state with text + icon */}
              <div className="flex items-center gap-1 whitespace-nowrap shrink-0">
                {hud.powerRestored ? (
                  <Zap className="w-3 h-3 text-emerald-400" />
                ) : (
                  <ZapOff className="w-3 h-3 text-zinc-500" />
                )}
                <span className={hud.powerRestored ? 'text-emerald-300 font-medium' : 'text-zinc-400'}>
                  {hud.powerRestored ? 'बिजली चालू' : 'बिजली बंद'}
                </span>
              </div>

              <span className="text-zinc-700" aria-hidden="true">|</span>

              {/* Stamina */}
              <div className="flex items-center gap-1 whitespace-nowrap shrink-0">
                <span className="text-zinc-400">ताकत</span>
                <div className="w-10 sm:w-12 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{ width: `${hud.stamina}%` }}
                  />
                </div>
              </div>

              {/* Flashlight Battery */}
              <div className="flex items-center gap-1 whitespace-nowrap shrink-0">
                <span className="text-zinc-400">बैटरी</span>
                <span className="text-zinc-100 font-medium tabular-nums">{hud.battery}%</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenMap}
                className="min-h-[34px] sm:min-h-[38px] px-2.5 sm:px-3 py-1.5 bg-zinc-950/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-[11px] sm:text-xs font-medium rounded-lg flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <MapIcon className="w-3.5 h-3.5 text-amber-300" />
                <span>नक्शा</span>
              </button>

              <button
                type="button"
                onClick={onOpenInventory}
                className="min-h-[34px] sm:min-h-[38px] px-2.5 sm:px-3 py-1.5 bg-zinc-950/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-[11px] sm:text-xs font-medium rounded-lg flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Briefcase className="w-3.5 h-3.5 text-amber-300" />
                <span>थैला</span>
              </button>

              <button
                type="button"
                onClick={() => onAction('flashlight')}
                className={`min-h-[34px] sm:min-h-[38px] px-2.5 sm:px-3 py-1.5 border text-[11px] sm:text-xs font-medium rounded-lg flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                  hud.flashlightOn
                    ? 'bg-amber-700/90 border-amber-500 text-zinc-950 font-bold'
                    : 'bg-zinc-950/90 hover:bg-zinc-800 border-zinc-800 text-zinc-300'
                }`}
              >
                <Flashlight className="w-3.5 h-3.5" />
                <span>टॉर्च</span>
              </button>

              <button
                type="button"
                onClick={onOpenPause}
                className="min-h-[34px] sm:min-h-[38px] px-2.5 sm:px-3 py-1.5 bg-zinc-950/90 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-[11px] sm:text-xs font-medium rounded-lg flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>रोकें</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CENTER: Crosshair & Interactive Prompt */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto">
        {!hud.isCutsceneActive && !hud.isHiding && (
          <div className="w-1.5 h-1.5 rounded-full bg-amber-100/80 border border-black/50 mb-3" />
        )}

        {!hud.isCutsceneActive && hud.isHiding && (
          <div className="mb-2.5 bg-zinc-950/92 border border-zinc-800 rounded-lg px-3.5 py-1.5 text-[11px] sm:text-xs text-amber-200">
            आप छिपे हुए हैं — शांत रहें
          </div>
        )}

        {!hud.isCutsceneActive && hud.nearbyPrompt && (
          <div className="pointer-events-auto flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={() => onAction('interact')}
              className="min-h-[38px] sm:min-h-[42px] px-4 py-1.5 sm:py-2 bg-zinc-950/95 hover:bg-zinc-900 border border-amber-600/80 text-amber-100 font-semibold text-xs sm:text-sm rounded-lg shadow-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {hud.nearbyPrompt}
            </button>

            {hud.secondaryPrompt && (
              <button
                type="button"
                onClick={() => onAction('peephole')}
                className="min-h-[34px] px-3 py-1.5 bg-zinc-950/92 hover:bg-zinc-900 border border-zinc-700 text-zinc-200 text-[11px] sm:text-xs rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-amber-300" />
                <span>{hud.secondaryPrompt}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* BOTTOM AREA: Compact Subtitles + Optional Mobile Controls */}
      <div className="relative z-30 flex flex-col gap-1.5">
        {hud.subtitle && (
          <div
            className={`max-w-md sm:max-w-lg w-full mx-auto bg-zinc-950/94 border rounded-md px-3 py-1.5 sm:px-3.5 sm:py-2 flex items-center gap-2.5 ${
              hud.subtitle.speaker.includes('कविता') || hud.subtitle.speaker.includes('चुड़ैल')
                ? 'border-red-900/80'
                : 'border-zinc-800 justify-center text-center'
            }`}
          >
            {(hud.subtitle.speaker.includes('कविता') || hud.subtitle.speaker.includes('चुड़ैल')) && (
              <div className="w-8 h-9 sm:w-10 sm:h-11 rounded overflow-hidden border border-red-800/80 shrink-0 bg-black">
                <img
                  src="/assets/aistudio/file_00000000f7fc82119210b918dbfab209_7b28c7b7.png"
                  alt="कविता"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-[50%_14%]"
                />
              </div>
            )}
            <div
              className={
                hud.subtitle.speaker.includes('कविता') || hud.subtitle.speaker.includes('चुड़ैल')
                  ? 'text-left min-w-0 flex-1'
                  : 'text-center'
              }
            >
              <p
                className={`text-[10px] sm:text-[11px] font-semibold leading-tight ${
                  hud.subtitle.speaker.includes('कविता') || hud.subtitle.speaker.includes('चुड़ैल')
                    ? 'text-red-400'
                    : 'text-amber-300'
                }`}
              >
                {hud.subtitle.speaker}
              </p>
              <p className="text-[11px] sm:text-xs text-zinc-100 mt-0.5 leading-snug">
                {hud.subtitle.text}
              </p>
            </div>
          </div>
        )}

        {/* Mobile Touch Controls */}
        {mobileControls && !hud.isCutsceneActive && (
          <div className="flex items-end justify-between gap-3 pt-0.5 pb-0.5">
            {/* Left Floating Virtual Analog Joystick */}
            <div
              className="pointer-events-auto relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-zinc-950/75 border-2 border-zinc-700/80 flex items-center justify-center touch-none shrink-0"
              onPointerDown={(e) => {
                if (joyPointerId.current !== null) return;
                joyPointerId.current = e.pointerId;
                const rect = e.currentTarget.getBoundingClientRect();
                joyCenter.current = {
                  x: rect.left + rect.width / 2,
                  y: rect.top + rect.height / 2,
                };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (joyPointerId.current !== e.pointerId) return;
                const maxR = Math.max(30, e.currentTarget.clientWidth * 0.34);
                const rawDx = e.clientX - joyCenter.current.x;
                const rawDy = e.clientY - joyCenter.current.y;
                const dx = forceLandscapeRotated ? rawDy : rawDx;
                const dy = forceLandscapeRotated ? -rawDx : rawDy;
                const dist = Math.hypot(dx, dy);
                const clamp = dist > maxR ? maxR / dist : 1;
                const cx = dx * clamp;
                const cy = dy * clamp;
                setJoyOffset({ x: cx, y: cy });
                onTouchMove(cx / maxR, cy / maxR, touchSprint);
              }}
              onPointerUp={(e) => {
                if (joyPointerId.current === e.pointerId) {
                  joyPointerId.current = null;
                  setJoyOffset({ x: 0, y: 0 });
                  onTouchMove(0, 0, false);
                }
              }}
              onPointerCancel={() => {
                joyPointerId.current = null;
                setJoyOffset({ x: 0, y: 0 });
                onTouchMove(0, 0, false);
              }}
            >
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-600/85 border border-amber-300/70"
                style={{
                  transform: `translate(${joyOffset.x}px, ${joyOffset.y}px)`,
                }}
              />
            </div>

            {/* Right Touch Action Buttons Grid */}
            <div className="pointer-events-auto grid grid-cols-3 gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = !touchSprint;
                  setTouchSprint(next);
                  onTouchMove(joyOffset.x / 36, joyOffset.y / 36, next);
                }}
                className={`min-h-[38px] sm:min-h-[44px] min-w-[58px] sm:min-w-[66px] px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold rounded-lg border whitespace-nowrap shrink-0 cursor-pointer ${
                  touchSprint
                    ? 'bg-red-800 border-red-500 text-white'
                    : 'bg-zinc-950/90 border-zinc-700 text-zinc-200'
                }`}
              >
                दौड़ें
              </button>
              <button
                type="button"
                onClick={() => onAction('crouch')}
                className={`min-h-[38px] sm:min-h-[44px] min-w-[58px] sm:min-w-[66px] px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold rounded-lg border whitespace-nowrap shrink-0 cursor-pointer ${
                  hud.isCrouching
                    ? 'bg-amber-700 border-amber-500 text-zinc-950'
                    : 'bg-zinc-950/90 border-zinc-700 text-zinc-200'
                }`}
              >
                झुकें
              </button>
              <button
                type="button"
                onClick={() => onAction('jump')}
                className="min-h-[38px] sm:min-h-[44px] min-w-[58px] sm:min-w-[66px] px-2.5 sm:px-3 py-1.5 sm:py-2 bg-zinc-950/90 border border-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                कूदें
              </button>

              {hud.secondaryPrompt ? (
                <button
                  type="button"
                  onClick={() => onAction('peephole')}
                  className="min-h-[40px] sm:min-h-[46px] min-w-[58px] sm:min-w-[66px] px-2.5 sm:px-3 py-1.5 sm:py-2 bg-zinc-950/90 border border-amber-600 text-amber-200 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  झाँकें
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onAction('flashlight')}
                  className="min-h-[40px] sm:min-h-[46px] min-w-[58px] sm:min-w-[66px] px-2.5 sm:px-3 py-1.5 sm:py-2 bg-zinc-950/90 border border-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  टॉर्च
                </button>
              )}

              <button
                type="button"
                onClick={() => onAction('interact')}
                className="col-span-2 min-h-[40px] sm:min-h-[46px] px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-700 hover:bg-amber-600 border border-amber-500 text-zinc-950 font-bold text-xs sm:text-sm rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                {hud.isHiding ? 'बाहर निकलें' : 'खोलें / उठाएँ'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
