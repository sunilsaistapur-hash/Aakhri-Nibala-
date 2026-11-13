import React, { useCallback, useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { GraphicsQuality, SaveSlotData } from '../types/game';
import { MISSIONS } from '../data/missions';
import { HorrorAudioEngine } from '../engine/audioEngine';
import { StoryPhotoFrame } from './StoryPhotoFrame';
import { PWAInstallButton } from './PWAInstallUI';

interface MainMenuProps {
  saves: Record<string, SaveSlotData>;
  quality: GraphicsQuality;
  volume: number;
  mobileControls: boolean;
  audio: HorrorAudioEngine;
  onChangeQuality: (q: GraphicsQuality) => void;
  onChangeVolume: (v: number) => void;
  onChangeMobileControls: (enabled: boolean) => void;
  onStartNewGame: () => void;
  onLoadSave: (save: SaveSlotData) => void;
  onDeleteSave: (slotId: string) => void;
}

type MenuView = 'main' | 'continue' | 'options' | 'intro';

interface IntroBeat {
  title: string;
  badge: string;
  speaker: string;
  line: string;
  subnote: string;
  voiceType: 'narrator' | 'scary';
}

const INTRO_BEATS: IntroBeat[] = [
  {
    title: 'सुनसान भारतीय सड़क · रात 11:04',
    badge: 'कार के भीतर · तेज बारिश',
    speaker: 'आरव कुमार',
    line: 'अरे! यह रेडियो अचानक कैसे बंद हो गया?',
    subnote: 'बाहर घना अंधेरा, हवा में झूलते पेड़ और काँच पर गिरती मूसलाधार बारिश...',
    voiceType: 'narrator',
  },
  {
    title: 'शहर 18 कि.मी. · कोई बस्ती पास नहीं',
    badge: 'मोबाइल नेटवर्क: शून्य',
    speaker: 'आरव कुमार',
    line: 'मोबाइल में भी बिल्कुल नेटवर्क नहीं है... चारों ओर बस सन्नाटा है।',
    subnote: 'कॉल लगाने की कोशिश नाकाम रहती है। दूर केवल घने पेड़ों और एकाध पुराने घर की परछाई है।',
    voiceType: 'narrator',
  },
  {
    title: 'इंजन बंद · गाड़ी खराब',
    badge: 'खतरे की घंटी',
    speaker: 'आरव कुमार',
    line: 'हे भगवान! इसी सुनसान सड़क पर मेरी गाड़ी खराब होनी थी... अब मैं कहाँ जाऊँगा?',
    subnote: 'गाड़ी के बोनट से भाप निकलती है और पीली चेतावनी बत्तियाँ रात में टिमटिमाती हैं।',
    voiceType: 'narrator',
  },
  {
    title: 'सड़क किनारे पुरानी रोशनी',
    badge: 'शाही निवाला रेस्टोरेंट',
    speaker: 'आरव कुमार',
    line: 'सामने ही एक पुराना रेस्टोरेंट दिखाई दे रहा है — शाही निवाला रेस्टोरेंट। चौथी मंजिल पर रोशनी जल रही है... शायद अंदर कोई मदद मिल जाए।',
    subnote: 'साइनबोर्ड पर लिखा है: "शाही निवाला रेस्टोरेंट – खाना और रहने की व्यवस्था उपलब्ध है"।',
    voiceType: 'narrator',
  },
  {
    title: 'रिसेप्शन काउंटर के भीतर · रात 11:08',
    badge: 'डरावनी आहट',
    speaker: 'कविता (काउंटर पर खड़ी महिला)',
    line: 'आइए साहब... बाहर बहुत तेज बारिश है। अंदर आइए... आपका कमरा पहले से तैयार है।',
    subnote: 'काउंटर के पीछे धुँधली लालटेन की रोशनी में खड़ी एक अजीब, बिखरे बालों वाली औरत आपकी ओर हाथ बढ़ाकर मुस्कुरा रही है...',
    voiceType: 'scary',
  },
];

function formatHindiDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m} मि. ${s} से.`;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  saves,
  quality,
  volume,
  mobileControls,
  audio,
  onChangeQuality,
  onChangeVolume,
  onChangeMobileControls,
  onStartNewGame,
  onLoadSave,
  onDeleteSave,
}) => {
  const [view, setView] = useState<MenuView>('main');
  const [introIdx, setIntroIdx] = useState(0);

  const orderedSaves = ['auto', 'slot1', 'slot2']
    .map((k) => saves[k])
    .filter((s): s is SaveSlotData => Boolean(s));

  const speakCurrentBeat = useCallback(
    (idx: number) => {
      const beat = INTRO_BEATS[idx];
      if (!beat) return;
      if (beat.voiceType === 'scary') {
        audio.speakScaryWoman(beat.line);
      } else {
        audio.speakPlayerMale(beat.line);
      }
    },
    [audio]
  );

  useEffect(() => {
    if (view !== 'intro') {
      audio.stopSpeech();
      return;
    }

    audio.init();
    if (introIdx === 0) {
      audio.playRadioStaticFade();
    } else if (introIdx === 1) {
      audio.playSwitchClick();
    } else if (introIdx === 2) {
      audio.playCarStall();
    } else if (introIdx === 3) {
      audio.playThunder();
    } else if (introIdx === 4) {
      audio.playHorrorSting();
    }

    const speechTimer = window.setTimeout(() => {
      speakCurrentBeat(introIdx);
    }, 240);

    return () => {
      window.clearTimeout(speechTimer);
      audio.stopSpeech();
    };
  }, [view, introIdx, audio, speakCurrentBeat]);

  const handleBeginIntro = () => {
    audio.init();
    audio.stopSpeech();
    onStartNewGame();
  };

  const handleLaunchGameFromIntro = () => {
    audio.stopSpeech();
    onStartNewGame();
  };

  if (view === 'intro') {
    const beat = INTRO_BEATS[introIdx];
    const isLast = introIdx === INTRO_BEATS.length - 1;
    const isScaryBeat = beat.voiceType === 'scary';

    return (
      <div className="fixed inset-0 z-30 bg-black text-zinc-100 flex flex-col justify-between p-4 sm:p-8 select-none overflow-y-auto hindi-scroll">
        {/* Top header strip */}
        <div className="relative z-10 max-w-4xl w-full mx-auto flex items-center justify-between gap-4 border-b border-zinc-800/80 pb-3 shrink-0">
          <div className="text-xs sm:text-sm text-zinc-400 truncate">
            <span>तस्वीर और कहानी परिचय</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span className={isScaryBeat ? 'text-red-400 font-semibold' : 'text-amber-300/90'}>
              {beat.title}
            </span>
          </div>
          <button
            type="button"
            onClick={handleLaunchGameFromIntro}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-zinc-300 border border-zinc-700 hover:border-amber-600/70 hover:text-amber-200 bg-zinc-900/90 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            परिचय छोड़कर खेलें
          </button>
        </div>

        {/* Center Photo Story Scene Frame */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-3 sm:my-4 min-h-0">
          <StoryPhotoFrame sceneIndex={introIdx} />
        </div>

        {/* Bottom Spoken Dialogue Box */}
        <div
          className={`relative z-10 max-w-2xl w-full mx-auto bg-zinc-950/95 border rounded-xl p-4 sm:p-5 shrink-0 ${
            isScaryBeat ? 'border-red-800/80' : 'border-zinc-800'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400 mb-2">
            <span className={`font-semibold ${isScaryBeat ? 'text-red-400' : 'text-amber-300'}`}>
              {beat.speaker}
            </span>
            <div className="flex items-center gap-3">
              <span>{beat.badge}</span>
              <button
                type="button"
                onClick={() => speakCurrentBeat(introIdx)}
                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-md flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-300" />
                <span>आवाज दोबारा सुनें</span>
              </button>
            </div>
          </div>

          <p className={`text-base sm:text-lg font-medium leading-relaxed ${isScaryBeat ? 'text-red-100' : 'text-zinc-100'}`}>
            “{beat.line}”
          </p>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 leading-relaxed">
            {beat.subnote}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={introIdx === 0}
                onClick={() => setIntroIdx((prev) => Math.max(0, prev - 1))}
                className="min-h-[42px] px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-35 border border-zinc-700 text-zinc-200 text-xs sm:text-sm rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                पिछला दृश्य
              </button>
              <span className="text-xs text-zinc-500 tabular-nums px-1">
                भाग {introIdx + 1} / {INTRO_BEATS.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                if (isLast) {
                  handleLaunchGameFromIntro();
                } else {
                  setIntroIdx((prev) => prev + 1);
                }
              }}
              className={`min-h-[44px] px-6 py-2.5 font-bold text-sm sm:text-base rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isLast
                  ? 'bg-red-800 hover:bg-red-700 text-white'
                  : 'bg-amber-700 hover:bg-amber-600 text-zinc-950'
              }`}
            >
              {isLast ? 'रेस्टोरेंट के बाहर उतरें' : 'अगली तस्वीर देखें'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-30 bg-black text-zinc-100 flex flex-col justify-between p-6 sm:p-10 overflow-y-auto hindi-scroll select-none">
      {/* Subtle dark crimson atmosphere */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 25%, rgba(92, 16, 22, 0.24) 0%, rgba(12, 10, 12, 0.85) 55%, #000000 100%)',
        }}
      />

      {/* Top subtle epigraph */}
      <div className="relative z-10 max-w-4xl w-full mx-auto flex items-center justify-between text-xs sm:text-sm text-zinc-500 border-b border-zinc-900 pb-4">
        <span>शाही निवाला रेस्टोरेंट</span>
        <span>भारतीय हॉरर रहस्य खेल · {MISSIONS.length} अध्याय</span>
      </div>

      {/* Center Focal Block */}
      <div className="relative z-10 max-w-xl w-full mx-auto my-auto py-8">
        {view === 'main' && (
          <div className="text-center">
            <p className="text-xs sm:text-sm text-amber-400/85 tracking-wide mb-2">
              भूतिया रेस्टोरेंट
            </p>
            <h1 className="font-display-hindi text-5xl sm:text-7xl text-zinc-50 tracking-tight leading-tight">
              आखिरी निवाला
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 mt-4 leading-relaxed max-w-md mx-auto">
              रात के ग्यारह बजे सुनसान बारिश वाली सड़क पर खराब हुई गाड़ी... और सामने खुला एक पुराना रेस्टोरेंट जहाँ हर मेहमान का इंतजार हो रहा है।
            </p>

            {/* The Exact 3 Primary Menu Buttons */}
            <div className="mt-9 flex flex-col gap-3.5 max-w-sm mx-auto">
              <button
                type="button"
                onClick={handleBeginIntro}
                className="w-full min-h-[52px] px-6 py-3.5 bg-red-900 hover:bg-red-800 border border-red-700/60 text-zinc-50 font-semibold text-base sm:text-lg rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                1. नया खेल शुरू करें
              </button>

              <button
                type="button"
                onClick={() => {
                  audio.init();
                  setView('continue');
                }}
                className="w-full min-h-[52px] px-6 py-3.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 font-semibold text-base sm:text-lg rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                2. खेल जारी रखें
              </button>

              <button
                type="button"
                onClick={() => {
                  audio.init();
                  setView('options');
                }}
                className="w-full min-h-[52px] px-6 py-3.5 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-200 font-semibold text-base sm:text-lg rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                3. विकल्प
              </button>

              <PWAInstallButton />
            </div>
          </div>
        )}

        {view === 'continue' && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6">
            <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-4 mb-5">
              <h2 className="font-display-hindi text-2xl text-amber-200">
                सहेजा गया खेल चुनें
              </h2>
              <button
                type="button"
                onClick={() => setView('main')}
                className="px-4 py-2 text-sm text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                वापस जाएँ
              </button>
            </div>

            {orderedSaves.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-zinc-300 text-base">अभी कोई सहेजा गया खेल उपलब्ध नहीं है।</p>
                <p className="text-zinc-500 text-sm mt-2">
                  नया खेल शुरू करने पर हर महत्वपूर्ण चरण के बाद प्रगति अपने आप सुरक्षित हो जाएगी।
                </p>
                <button
                  type="button"
                  onClick={handleBeginIntro}
                  className="mt-6 px-6 py-3 bg-red-900 hover:bg-red-800 text-white rounded-lg font-medium whitespace-nowrap shrink-0 cursor-pointer"
                >
                  नया खेल शुरू करें
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {orderedSaves.map((slot) => {
                  const m = MISSIONS[slot.currentMission - 1];
                  const slotTitle =
                    slot.slotId === 'auto'
                      ? 'स्वतः चेकपॉइंट'
                      : slot.slotId === 'slot1'
                      ? 'सहेजा गया स्थान 1'
                      : 'सहेजा गया स्थान 2';
                  return (
                    <div
                      key={slot.slotId}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-zinc-900/90 border border-zinc-800 rounded-lg"
                    >
                      <div className="min-w-0">
                        <div className="text-xs text-amber-300 font-medium">
                          <span>{slotTitle}</span>
                          <span className="mx-2 text-zinc-600" aria-hidden="true">·</span>
                          <span className="text-zinc-400 tabular-nums">मिशन {slot.currentMission} / {MISSIONS.length}</span>
                        </div>
                        <p className="text-base font-semibold text-zinc-100 mt-1 truncate">
                          {m?.title || 'कहानी जारी'}
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5 tabular-nums">
                          समय: {formatHindiDuration(slot.playTimeSeconds || 0)} · {slot.savedAt}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            audio.init();
                            onLoadSave(slot);
                          }}
                          className="px-4 py-2.5 bg-amber-700 hover:bg-amber-600 text-zinc-950 font-semibold text-sm rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          खेलें
                        </button>
                        {slot.slotId !== 'auto' && (
                          <button
                            type="button"
                            onClick={() => onDeleteSave(slot.slotId)}
                            className="px-3 py-2.5 bg-zinc-800 hover:bg-red-900/70 text-zinc-300 text-sm rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            हटाएँ
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {view === 'options' && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <h2 className="font-display-hindi text-2xl text-amber-200">
                खेल के विकल्प और नियंत्रण
              </h2>
              <button
                type="button"
                onClick={() => setView('main')}
                className="px-4 py-2 text-sm text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                वापस जाएँ
              </button>
            </div>

            {/* Graphics Quality */}
            <div>
              <label className="block text-sm font-medium text-zinc-200 mb-2">
                ग्राफिक्स की गुणवत्ता
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'low', label: 'कम' },
                  { id: 'medium', label: 'मध्यम' },
                  { id: 'high', label: 'उच्च' },
                ] as { id: GraphicsQuality; label: string }[]).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeQuality(opt.id)}
                    className={`min-h-[44px] px-3 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      quality === opt.id
                        ? 'bg-amber-700 border-amber-500 text-zinc-950 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Volume */}
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium text-zinc-200">ध्वनि और डरावना संगीत</span>
                <span className="text-amber-300 tabular-nums">{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={(e) => onChangeVolume(Number(e.target.value) / 100)}
                className="w-full accent-amber-500 h-2 bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Mobile Controls Toggle */}
            <div className="flex items-center justify-between gap-4 py-2 border-t border-zinc-900 pt-4">
              <div>
                <p className="text-sm font-medium text-zinc-200">मोबाइल टच नियंत्रण (एंड्रॉइड / टच स्क्रीन)</p>
                <p className="text-xs text-zinc-400 mt-0.5">स्क्रीन पर जॉयस्टिक और अलग से सभी नियंत्रण बटन दिखाएँ</p>
              </div>
              <button
                type="button"
                onClick={() => onChangeMobileControls(!mobileControls)}
                className={`min-h-[44px] px-4 py-2 rounded-lg border text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                  mobileControls
                    ? 'bg-amber-700 border-amber-500 text-zinc-950'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-300'
                }`}
              >
                {mobileControls ? 'चालू' : 'बंद'}
              </button>
            </div>

            {/* Pure Hindi Control List */}
            <div className="border-t border-zinc-900 pt-4">
              <p className="text-sm font-semibold text-amber-200 mb-3">खेलने के नियंत्रण</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs sm:text-sm text-zinc-300">
                <div className="flex justify-between gap-2 border-b border-zinc-900 pb-1">
                  <span className="text-zinc-400">आगे / पीछे / बाएँ / दाएँ</span>
                  <span>डब्ल्यू · एस · ए · डी</span>
                </div>
                <div className="flex justify-between gap-2 border-b border-zinc-900 pb-1">
                  <span className="text-zinc-400">आसपास देखना / मुड़ना</span>
                  <span>माउस या तीर कुंजी</span>
                </div>
                <div className="flex justify-between gap-2 border-b border-zinc-900 pb-1">
                  <span className="text-zinc-400">दरवाजा खोलें / उठाएँ / छिपें</span>
                  <span>ई बटन या क्लिक</span>
                </div>
                <div className="flex justify-between gap-2 border-b border-zinc-900 pb-1">
                  <span className="text-zinc-400">दरवाजे के छेद से देखना</span>
                  <span>पी बटन</span>
                </div>
                <div className="flex justify-between gap-2 border-b border-zinc-900 pb-1">
                  <span className="text-zinc-400">टॉर्च चालू / बंद</span>
                  <span>एफ बटन</span>
                </div>
                <div className="flex justify-between gap-2 border-b border-zinc-900 pb-1">
                  <span className="text-zinc-400">तेज दौड़ना / झुकना / कूदना</span>
                  <span>शिफ्ट · सी · स्पेस</span>
                </div>
                <div className="flex justify-between gap-2 border-b border-zinc-900 pb-1">
                  <span className="text-zinc-400">थैला और डायरियाँ</span>
                  <span>आई या टैब बटन</span>
                </div>
                <div className="flex justify-between gap-2 border-b border-zinc-900 pb-1">
                  <span className="text-zinc-400">इमारत का नक्शा व {MISSIONS.length} मिशन</span>
                  <span>एम बटन</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Subtle footer */}
      <div className="relative z-10 max-w-4xl w-full mx-auto text-center text-xs text-zinc-600 pt-4 border-t border-zinc-900/70">
        मुख्य पात्र: आरव कुमार · वेट्रेस कविता · मालिक महेंद्र प्रताप · रसोइया रमेश यादव · मीरा
      </div>
    </div>
  );
};
