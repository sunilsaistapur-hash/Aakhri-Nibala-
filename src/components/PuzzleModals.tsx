import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FLOOR_NAMES, ROOMS } from '../data/buildingLayout';
import { INVENTORY_ITEMS, LORE_NOTES } from '../data/loreAndItems';
import { MISSIONS } from '../data/missions';
import {
  FloorId,
  GraphicsQuality,
  InventoryItemId,
  PuzzleType,
} from '../types/game';

interface PuzzleModalsProps {
  activePuzzle: PuzzleType | null;
  puzzleContext?: string;
  activeLoreId: string | null;
  liftModalOpen: boolean;
  inventoryOpen: boolean;
  mapOpen: boolean;
  pauseOpen: boolean;
  caughtOpen: boolean;
  caughtReason?: 'caught' | 'wrong_answers';
  suspicionLevel?: number;
  wrongDialogueCount?: number;

  currentMission: number;
  playerLocation: { floor: FloorId; x: number; z: number };
  inventory: InventoryItemId[];
  collectedLore: string[];
  powerRestored: boolean;
  playTimeSeconds: number;

  quality: GraphicsQuality;
  volume: number;
  mobileControls: boolean;

  onClosePuzzle: () => void;
  onSolvePuzzle: (puzzle: PuzzleType, payload?: string) => void;
  onPlayPenSound?: () => void;
  onSpeakQuestion?: (questionText: string) => void;
  onSpeakDialogueExchange?: (playerText: string, chudailReply: string) => void;
  onCloseLore: () => void;
  onOpenLoreFromBag: (loreId: string) => void;
  onCloseLift: () => void;
  onSelectLiftFloor: (fl: FloorId) => void;
  onCloseInventory: () => void;
  onCloseMap: () => void;
  onResumePause: () => void;
  onSaveSlot: (slotId: 'slot1' | 'slot2') => void;
  onChangeQuality: (q: GraphicsQuality) => void;
  onChangeVolume: (v: number) => void;
  onChangeMobileControls: (enabled: boolean) => void;
  onReturnToMenu: () => void;
  onReloadCheckpoint: () => void;
  onRestartGame: () => void;
}

const KEYPAD_CONFIG: Record<
  string,
  { title: string; subtitle: string; code: string; hint: string }
> = {
  keypad_kavita: {
    title: 'कविता के कमरे का ताला',
    subtitle: 'तीसरी मंजिल · वेट्रेस कविता का कक्ष',
    code: '1998',
    hint: 'संकेत: रमेश यादव की डायरी में हादसे का साल दर्ज है।',
  },
  keypad_owner_safe: {
    title: 'मालिक की सुरक्षित तिजोरी',
    subtitle: 'तीसरी मंजिल · महेंद्र प्रताप का कार्यालय',
    code: '1145',
    hint: 'संकेत: कमरा नंबर 13 की दीवार घड़ी जिस समय पर रुकी थी।',
  },
  keypad_room13_secret: {
    title: 'कमरा नंबर 13 का गुप्त कक्ष',
    subtitle: 'दूसरी मंजिल · अलमारी के पीछे गुप्त दरवाजा',
    code: '2407',
    hint: 'संकेत: महेंद्र प्रताप के पत्र में मीरा के जन्मदिन की तारीख (24 जुलाई)।',
  },
};

const WIRE_DEFS = [
  { id: 'red', label: 'लाल तार (मुख्य लाइन)', color: '#dc2626' },
  { id: 'blue', label: 'नीला तार (जनरेटर अर्थ)', color: '#2563eb' },
  { id: 'yellow', label: 'पीला तार (लिफ्ट सप्लाई)', color: '#ca8a04' },
  { id: 'green', label: 'हरा तार (आपातकालीन निकास)', color: '#16a34a' },
];
const RIGHT_WIRE_ORDER = ['yellow', 'red', 'green', 'blue'];

interface ChudailQuestionDef {
  question: string;
  choices: {
    text: string;
    suspicionDelta: number;
    reply: string;
    isScary: boolean;
    isWrong: boolean;
  }[];
}

const CHUDAIL_QUESTIONS: Record<string, ChudailQuestionDef> = {
  Q1: {
    question: 'आप बार-बार अपने कमरे से बाहर क्यों आ रहे हैं सर? क्या कमरा पसंद नहीं आया?',
    choices: [
      {
        text: 'नहीं, बस ऐसे ही बाहर टहलने और हवा खाने आया था।',
        suspicionDelta: 5,
        reply: 'अच्छा... रात में इस हॉल की हवा थोड़ी ठंडी रहती है। ज्यादा दूर मत जाइएगा सर।',
        isScary: false,
        isWrong: false,
      },
      {
        text: 'कमरे में थोड़ा घुटन लग रहा था, पानी ढूँढ़ने नीचे आया था।',
        suspicionDelta: 3,
        reply: 'समझ गई सर... पानी मिल जाएगा, पर ऊपर अपने कमरे में जल्दी लौट जाइएगा।',
        isScary: false,
        isWrong: false,
      },
      {
        text: 'मुझे लगता है यहाँ कुछ गड़बड़ है, मैं हर जगह जाँच कर रहा हूँ!',
        suspicionDelta: 38,
        reply: 'गड़बड़? यहाँ कोई गड़बड़ नहीं है सर... वरना मेहमान कभी चैन से सो नहीं पाते!',
        isScary: true,
        isWrong: true,
      },
    ],
  },
  Q2: {
    question: 'आप इतनी रात को नीचे आकर क्या ढूँढ़ रहे हैं? पूरा रेस्टोरेंट तो बंद पड़ा है।',
    choices: [
      {
        text: 'मेरा मोबाइल नेटवर्क नहीं पकड़ रहा, बस सिग्नल देख रहा था।',
        suspicionDelta: 4,
        reply: 'तूफान में यहाँ कोई नेटवर्क नहीं आता सर... चुपचाप सुबह तक इंतजार करिए।',
        isScary: false,
        isWrong: false,
      },
      {
        text: 'यहाँ की पुरानी सजावट और कमरे देखने की आदत है बस।',
        suspicionDelta: 34,
        reply: 'पुरानी चीजें देखना अच्छा नहीं होता सर... कुछ राज दफन ही अच्छे रहते हैं।',
        isScary: true,
        isWrong: true,
      },
      {
        text: 'तबीयत थोड़ी भारी लग रही थी, बस रिसेप्शन पर समय देखने आया था।',
        suspicionDelta: 5,
        reply: 'ठीक है सर... पर हर बंद दरवाजे के पास रुकने की जरूरत नहीं है।',
        isScary: false,
        isWrong: false,
      },
    ],
  },
  Q3: {
    question: 'काफी देर हो गई आप कमरा नंबर 13 में वापस नहीं गए... क्या कोई खास बात है?',
    choices: [
      {
        text: 'नींद नहीं आ रही थी, अभी थोड़ी देर में ऊपर सोने जा रहा हूँ।',
        suspicionDelta: 4,
        reply: 'जाकर सो जाइए सर... रात अभी बहुत बाकी है और मैं यहीं खड़ी हूँ।',
        isScary: false,
        isWrong: false,
      },
      {
        text: 'मुझे खाने की पुरानी रसीद और रजिस्टर के बारे में पूछना था।',
        suspicionDelta: 35,
        reply: 'खाने से इतना लगाव ठीक नहीं सर... आपका असली निवाला तो अभी बाकी है!',
        isScary: true,
        isWrong: true,
      },
      {
        text: 'बाहर बारिश रुकी या नहीं, बस बाहर जाने का रास्ता देख रहा था।',
        suspicionDelta: 40,
        reply: 'बाहर जाने की इतनी जल्दी क्यों है? यहाँ से कोई इतनी आसानी से नहीं जाता!',
        isScary: true,
        isWrong: true,
      },
    ],
  },
  Q4: {
    question: 'आप बार-बार रसोई और पुराने कमरों की तरफ क्या कर रहे हैं सर? मेरी नजर आप पर ही है...',
    choices: [
      {
        text: 'अरे मैं रास्ता भूल गया था, अब सीधे ऊपर अपने कमरे में जा रहा हूँ।',
        suspicionDelta: 5,
        reply: 'अच्छा... रास्ता न भूलिएगा सर। ऊपर का रास्ता दाईं ओर की सीढ़ी से है।',
        isScary: false,
        isWrong: false,
      },
      {
        text: 'मुझे गर्म पानी चाहिए था, इसलिए गलती से उधर मुड़ गया।',
        suspicionDelta: 8,
        reply: 'गर्म पानी सुबह मिलेगा सर... अभी काउंटर के सामने से ज्यादा मत घूमिए।',
        isScary: false,
        isWrong: false,
      },
      {
        text: 'मैं इस भूतिया रेस्टोरेंट का सच समझ चुका हूँ, मुझे कोई नहीं रोक सकता!',
        suspicionDelta: 50,
        reply: 'इतना समझ गए हैं तो जान लीजिए... यहाँ का हर दरवाजा मेरी मर्जी से खुलता है!',
        isScary: true,
        isWrong: true,
      },
    ],
  },
  Q14: {
    question: 'सर, आप इतनी रात में बार-बार नीचे क्यों आ रहे हैं? क्या आपको नींद नहीं आ रही?',
    choices: [
      {
        text: 'कमरे में बहुत गर्मी लग रही थी, इसलिए थोड़ी खुली हवा खाने नीचे आ गया।',
        suspicionDelta: 3,
        reply: 'अच्छा सर, अब जाकर आराम कर लीजिए। रात के समय इधर-उधर घूमना ठीक नहीं है।',
        isScary: false,
        isWrong: false,
      },
      {
        text: 'मुझे बहुत प्यास लगी थी, सोचा नीचे से थोड़ा पानी ले लूँ।',
        suspicionDelta: 5,
        reply: 'पानी तो रूम में भी है सर... अपने कमरे में जाकर सो जाइए।',
        isScary: false,
        isWrong: false,
      },
      {
        text: 'मुझे लगता है इस रेस्टोरेंट में कुछ गड़बड़ है, मैं सब कुछ ढूँढ रहा हूँ!',
        suspicionDelta: 42,
        reply: 'गड़बड़ ढूँढने की कोशिश मत करिए सर... यहाँ से कोई वापस नहीं गया!',
        isScary: true,
        isWrong: true,
      },
    ],
  },
  Q21: {
    question: 'सर, आप आज कुछ ज्यादा ही परेशान लग रहे हैं... क्या बात है? सब ठीक तो है?',
    choices: [
      {
        text: 'हाँ, बस कल रात नींद ठीक से नहीं आई, इसलिए थोड़ा सिर भारी लग रहा है।',
        suspicionDelta: 3,
        reply: 'अच्छा सर, अब थोड़ी देर में आपका पूरा आराम हो जाएगा...',
        isScary: false,
        isWrong: false,
      },
      {
        text: 'कुछ नहीं, बस सुबह के काम की चिंता हो रही है, मैं बिल्कुल ठीक हूँ।',
        suspicionDelta: 5,
        reply: 'चिंता मत करिए सर... यहाँ कोई चिंता नहीं रहती।',
        isScary: false,
        isWrong: false,
      },
      {
        text: 'मुझे पता चल चुका है कि तुम एक चुड़ैल हो! मैं अब यहाँ से भाग रहा हूँ!',
        suspicionDelta: 55,
        reply: 'हाहाहा... अगर पता चल ही गया है, तो याद रखिए आप यहाँ से जिंदा नहीं जा सकते!',
        isScary: true,
        isWrong: true,
      },
    ],
  },
  Q_FINAL: {
    question: 'आप इतनी तेजी से मुख्य दरवाजे की तरफ क्यों जा रहे हैं? आपकी जेब में वह पीतल की चाबी कैसी चमक रही है?!',
    choices: [
      {
        text: 'गाड़ी में मेरी जरूरी दवाई छूट गई है, बस एक मिनट में लेकर आता हूँ!',
        suspicionDelta: 12,
        reply: 'अच्छा... जल्दी जाइएगा और तुरंत लौट आइएगा, वरना मैं खुद बाहर आऊँगी!',
        isScary: true,
        isWrong: false,
      },
      {
        text: 'बाहर तेज बारिश में गाड़ी की खिड़की खुली रह गई, बंद करके लौट रहा हूँ।',
        suspicionDelta: 10,
        reply: 'अगर आप वापस नहीं लौटे... तो मैं आपको कहीं भी ढूँढ़ लूँगी!',
        isScary: true,
        isWrong: false,
      },
      {
        text: 'मेरे हाथ में असली चाबी है! तुम अब मुझे यहाँ नहीं रोक सकती!',
        suspicionDelta: 65,
        reply: 'आप यहाँ से नहीं जा सकते! आपका आखिरी निवाला अभी पूरा नहीं हुआ है!',
        isScary: true,
        isWrong: true,
      },
    ],
  },
};

const VESSEL_ITEMS = [
  { id: 'ghada', label: 'तांबे का घड़ा', hint: 'पहला स्थान' },
  { id: 'tawa', label: 'काला लोहे का तवा', hint: 'चौथा स्थान' },
  { id: 'thali', label: 'पीतल की बड़ी थाली', hint: 'तीसरा स्थान' },
  { id: 'masala', label: 'पीतल का मसाला डिब्बा', hint: 'दूसरा स्थान' },
];
const RIGHT_VESSEL_ORDER = ['ghada', 'masala', 'thali', 'tawa'];

export const PuzzleModals: React.FC<PuzzleModalsProps> = ({
  activePuzzle,
  puzzleContext,
  activeLoreId,
  liftModalOpen,
  inventoryOpen,
  mapOpen,
  pauseOpen,
  caughtOpen,
  caughtReason = 'caught',
  suspicionLevel = 0,
  wrongDialogueCount = 0,
  currentMission,
  playerLocation,
  inventory,
  collectedLore,
  powerRestored,
  quality,
  volume,
  mobileControls,
  onClosePuzzle,
  onSolvePuzzle,
  onPlayPenSound,
  onSpeakQuestion,
  onSpeakDialogueExchange,
  onCloseLore,
  onOpenLoreFromBag,
  onCloseLift,
  onSelectLiftFloor,
  onCloseInventory,
  onCloseMap,
  onResumePause,
  onSaveSlot,
  onChangeQuality,
  onChangeVolume,
  onChangeMobileControls,
  onReturnToMenu,
  onReloadCheckpoint,
  onRestartGame,
}) => {
  const [regName, setRegName] = useState('आरव कुमार');
  const [isWritingReg, setIsWritingReg] = useState(false);
  const [writeProgress, setWriteProgress] = useState(0);
  const [foodOpened, setFoodOpened] = useState(false);
  const [keypadVal, setKeypadVal] = useState('');
  const [keypadErr, setKeypadErr] = useState('');
  const [selectedWire, setSelectedWire] = useState<string | null>(null);
  const [connectedWires, setConnectedWires] = useState<string[]>([]);
  const [genStep, setGenStep] = useState(0);
  const [gateHits, setGateHits] = useState(0);
  const [lorePage, setLorePage] = useState(0);
  const [bagTab, setBagTab] = useState<'items' | 'lore'>('items');
  const [mapFloor, setMapFloor] = useState<FloorId>(playerLocation.floor);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState('');
  const [nightmareStep, setNightmareStep] = useState(0);
  const [dialogueChoice, setDialogueChoice] = useState<{
    choiceIndex: number;
    playerText: string;
    suspicionDelta: number;
    reply: string;
    isScary: boolean;
    isWrong: boolean;
  } | null>(null);
  const [jumpscareBurst, setJumpscareBurst] = useState(false);
  const [restartCountdown, setRestartCountdown] = useState(4);
  const [vesselSeq, setVesselSeq] = useState<string[]>([]);
  const [vesselErr, setVesselErr] = useState('');
  const [almirahDials, setAlmirahDials] = useState<[number, number, number]>([0, 0, 0]);
  const [almirahErr, setAlmirahErr] = useState('');
  const [boxLevers, setBoxLevers] = useState<[boolean, boolean, boolean, boolean]>([
    false,
    false,
    false,
    false,
  ]);

  const onSolveRef = useRef(onSolvePuzzle);
  const onPenSoundRef = useRef(onPlayPenSound);
  const onSpeakQuestionRef = useRef(onSpeakQuestion);
  const onSpeakExchangeRef = useRef(onSpeakDialogueExchange);
  const onRestartGameRef = useRef(onRestartGame);
  useEffect(() => {
    onSolveRef.current = onSolvePuzzle;
    onPenSoundRef.current = onPlayPenSound;
    onSpeakQuestionRef.current = onSpeakQuestion;
    onSpeakExchangeRef.current = onSpeakDialogueExchange;
    onRestartGameRef.current = onRestartGame;
  }, [onSolvePuzzle, onPlayPenSound, onSpeakQuestion, onSpeakDialogueExchange, onRestartGame]);

  useEffect(() => {
    if (activePuzzle !== 'register') {
      setIsWritingReg(false);
      setWriteProgress(0);
    }
    if (activePuzzle !== 'nightmare_sleep') {
      setNightmareStep(0);
    }
    if (activePuzzle !== 'chudail_dialogue') {
      setDialogueChoice(null);
    } else {
      const qId = puzzleContext && CHUDAIL_QUESTIONS[puzzleContext] ? puzzleContext : 'Q1';
      const qDef = CHUDAIL_QUESTIONS[qId];
      if (qDef) {
        onSpeakQuestionRef.current?.(qDef.question);
      }
    }
    if (activePuzzle !== 'kitchen_vessels') {
      setVesselSeq([]);
      setVesselErr('');
    }
    if (activePuzzle !== 'kitchen_almirah') {
      setAlmirahDials([0, 0, 0]);
      setAlmirahErr('');
    }
    if (activePuzzle !== 'main_door_key_box') {
      setBoxLevers([false, false, false, false]);
    }
  }, [activePuzzle, puzzleContext]);

  useEffect(() => {
    if (!isWritingReg) return;
    onPenSoundRef.current?.();
    let rafId = 0;
    let doneTimer = 0;
    const durationMs = 1850;
    const startMs = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - startMs) / durationMs);
      setWriteProgress(p);
      if (p < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        doneTimer = window.setTimeout(() => {
          setIsWritingReg(false);
          setWriteProgress(0);
          onSolveRef.current('register', regName.trim() || 'आरव कुमार');
        }, 420);
      }
    };
    rafId = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(doneTimer);
    };
  }, [isWritingReg, regName]);

  useEffect(() => {
    if (mapOpen) {
      setMapFloor(playerLocation.floor);
      setSelectedRoomId(null);
    }
  }, [mapOpen, playerLocation.floor]);

  useEffect(() => {
    if (pauseOpen) setSaveNotice('');
  }, [pauseOpen]);

  useEffect(() => {
    setLorePage(0);
  }, [activeLoreId]);

  // Terrifying full-screen Jump-Scare burst + Automatic Restart countdown when killed!
  useEffect(() => {
    if (!caughtOpen) {
      setJumpscareBurst(false);
      setRestartCountdown(4);
      return;
    }
    setJumpscareBurst(true);
    setRestartCountdown(4);
    const burstTimer = window.setTimeout(() => {
      setJumpscareBurst(false);
    }, 1250);
    const tickTimer = window.setInterval(() => {
      setRestartCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(tickTimer);
          onRestartGameRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      window.clearTimeout(burstTimer);
      window.clearInterval(tickTimer);
    };
  }, [caughtOpen]);

  const floorRooms = useMemo(
    () => ROOMS.filter((r) => r.floor === mapFloor),
    [mapFloor]
  );

  // 1. CAUGHT / JUMP-SCARE KILL MODAL
  if (caughtOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-black text-zinc-100 flex items-center justify-center p-4 select-none overflow-hidden">
        {/* Blood-crimson strobing scare backdrop */}
        <div
          aria-hidden="true"
          className={`fixed inset-0 pointer-events-none ${
            jumpscareBurst
              ? 'bg-red-700/65 animate-jumpscare-strobe'
              : 'bg-gradient-to-b from-red-950/60 via-black/95 to-red-950/70'
          }`}
        />

        {jumpscareBurst ? (
          <div className="relative z-10 w-full h-full flex items-center justify-center overflow-hidden">
            <div className="w-full h-full max-w-2xl flex items-center justify-center animate-jumpscare-shake">
              <img
                src="/assets/aistudio/file_00000000f7fc82119210b918dbfab209_7b28c7b7.png"
                alt="काउंटर वाली चुड़ैल का डरावना हमला"
                referrerPolicy="no-referrer"
                className="w-[88vh] h-[88vh] max-w-none object-cover object-[50%_14%] rounded-full shadow-[0_0_120px_rgba(220,38,38,0.95)] animate-jumpscare-lunge"
              />
            </div>
            <div className="fixed inset-x-0 bottom-8 text-center px-4 pointer-events-none">
              <p className="font-display-hindi text-4xl sm:text-6xl text-red-500 drop-shadow-[0_4px_20px_rgba(0,0,0,1)]">
                आखिरी निवाला!!
              </p>
            </div>
          </div>
        ) : (
          <div className="relative z-10 max-w-md w-full bg-zinc-950/95 border-2 border-red-800/90 rounded-xl p-5 sm:p-6 text-center space-y-4 shadow-[0_0_60px_rgba(185,28,28,0.55)]">
            <div className="w-32 h-36 mx-auto rounded-lg overflow-hidden border-2 border-red-700 bg-black animate-jumpscare-shake">
              <img
                src="/assets/aistudio/file_00000000f7fc82119210b918dbfab209_7b28c7b7.png"
                alt="काउंटर वाली चुड़ैल"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-[50%_14%] contrast-125"
              />
            </div>
            <p className="text-xs text-red-400 font-bold tracking-wide">
              {caughtReason === 'wrong_answers'
                ? 'चुड़ैल का शक 100% हो गया · बार-बार गलत जवाब!'
                : 'काउंटर वाली चुड़ैल ने हमला कर दिया'}
            </p>
            <h2 className="font-display-hindi text-3xl sm:text-4xl text-red-500">
              चुड़ैल ने आपको मार डाला!
            </h2>
            <p className="text-sm text-zinc-200 leading-relaxed">
              {caughtReason === 'wrong_answers'
                ? '“झूठ बोलते हो!! बार-बार गलत जवाब देकर मुझे बेवकूफ समझते हो? अब तुम मेरे आखिरी निवाले हो!”'
                : '“आप कहीं नहीं जा सकते साहब... आपका आखिरी निवाला अभी बाकी है।”'}
            </p>
            <div className="bg-red-950/60 border border-red-800/80 rounded-lg px-4 py-2.5 text-sm text-amber-200 font-semibold">
              गेम {restartCountdown} सेकंड में फिर से शुरू हो रहा है...
            </div>
            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                onClick={onRestartGame}
                className="min-h-[46px] px-6 py-2.5 bg-red-800 hover:bg-red-700 text-white font-bold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                अभी गेम रीस्टार्ट करें
              </button>
              <button
                type="button"
                onClick={onReloadCheckpoint}
                className="min-h-[42px] px-5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                अंतिम चेकपॉइंट से खेलें
              </button>
              <button
                type="button"
                onClick={onReturnToMenu}
                className="min-h-[40px] px-5 py-2 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                मुख्य मेन्यू पर लौटें
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. PAUSE MENU
  if (pauseOpen) {
    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/92 text-zinc-100 flex items-center justify-center p-4 overflow-y-auto hindi-scroll select-none">
        <div className="max-w-lg w-full bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="font-display-hindi text-2xl text-amber-200">खेल रुका हुआ है</h2>
            <button
              type="button"
              onClick={onResumePause}
              className="min-h-[42px] px-4 py-2 bg-amber-700 hover:bg-amber-600 text-zinc-950 font-bold text-sm rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              खेल जारी रखें
            </button>
          </div>

          {/* Save Slots */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-200">खेल सहेजें</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onSaveSlot('slot1');
                  setSaveNotice('स्थान 1 में सहेजा गया!');
                }}
                className="min-h-[44px] px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                स्थान 1 में सहेजें
              </button>
              <button
                type="button"
                onClick={() => {
                  onSaveSlot('slot2');
                  setSaveNotice('स्थान 2 में सहेजा गया!');
                }}
                className="min-h-[44px] px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                स्थान 2 में सहेजें
              </button>
            </div>
            {saveNotice && <p className="text-xs text-emerald-400">{saveNotice}</p>}
          </div>

          {/* Graphics Quality */}
          <div>
            <p className="text-sm font-medium text-zinc-200 mb-2">ग्राफिक्स गुणवत्ता</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'low', label: 'कम' },
                { id: 'medium', label: 'मध्यम' },
                { id: 'high', label: 'उच्च' },
              ] as { id: GraphicsQuality; label: string }[]).map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onChangeQuality(q.id)}
                  className={`min-h-[42px] px-3 py-2 text-sm rounded-lg border whitespace-nowrap shrink-0 cursor-pointer ${
                    quality === q.id
                      ? 'bg-amber-700 border-amber-500 text-zinc-950 font-bold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Volume */}
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-zinc-200">आवाज</span>
              <span className="text-amber-300 tabular-nums">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => onChangeVolume(Number(e.target.value) / 100)}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Mobile Touch Controls */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-sm text-zinc-200">मोबाइल टच बटन</span>
            <button
              type="button"
              onClick={() => onChangeMobileControls(!mobileControls)}
              className={`min-h-[42px] px-4 py-2 text-sm font-semibold rounded-lg border whitespace-nowrap shrink-0 cursor-pointer ${
                mobileControls
                  ? 'bg-amber-700 border-amber-500 text-zinc-950'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-300'
              }`}
            >
              {mobileControls ? 'चालू' : 'बंद'}
            </button>
          </div>

          <div className="border-t border-zinc-800 pt-4 flex justify-between gap-3">
            <button
              type="button"
              onClick={onReturnToMenu}
              className="min-h-[44px] px-4 py-2 bg-zinc-900 hover:bg-red-900/60 border border-zinc-800 text-zinc-300 text-sm rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              मुख्य मेन्यू पर लौटें
            </button>
            <button
              type="button"
              onClick={onResumePause}
              className="min-h-[44px] px-5 py-2 bg-amber-700 hover:bg-amber-600 text-zinc-950 font-bold text-sm rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              वापस खेल में लौटें
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. INTERACTIVE 6-FLOOR MAP & ALL 25 MISSIONS MODAL
  if (mapOpen) {
    const selectedRoom = ROOMS.find((r) => r.id === selectedRoomId) || floorRooms[0];
    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/94 text-zinc-100 flex items-center justify-center p-3 sm:p-6 select-none">
        <div className="max-w-6xl w-full h-[90vh] bg-zinc-950 border border-zinc-800 rounded-xl p-4 sm:p-6 flex flex-col gap-4 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3 shrink-0">
            <div>
              <h2 className="font-display-hindi text-2xl text-amber-200">
                शाही निवाला · इमारत का नक्शा व {MISSIONS.length} मिशन
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                वर्तमान स्थान: {FLOOR_NAMES[playerLocation.floor]} · किसी भी कमरे पर क्लिक करके जानकारी देखें
              </p>
            </div>
            <button
              type="button"
              onClick={onCloseMap}
              className="min-h-[44px] px-5 py-2 bg-amber-700 hover:bg-amber-600 text-zinc-950 font-bold text-sm rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              नक्शा बंद करें
            </button>
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
            {/* Left: Floor Selector + SVG Blueprint */}
            <div className="lg:col-span-7 flex flex-col gap-3 min-h-0">
              <div className="flex flex-wrap gap-1.5 shrink-0">
                {(['4', '3', '2', '1', 'G', 'B1'] as FloorId[]).map((fl) => (
                  <button
                    key={fl}
                    type="button"
                    onClick={() => {
                      setMapFloor(fl);
                      setSelectedRoomId(null);
                    }}
                    className={`min-h-[40px] px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border whitespace-nowrap shrink-0 cursor-pointer ${
                      mapFloor === fl
                        ? 'bg-amber-700 border-amber-500 text-zinc-950 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    {fl === 'B1'
                      ? 'तहखाना'
                      : fl === 'G'
                      ? 'भूतल'
                      : `${fl}री मंजिल`.replace('1री', '1ली').replace('2री', '2री')}
                  </button>
                ))}
              </div>

              {/* Architectural Schematic SVG */}
              <div className="flex-1 min-h-[240px] bg-zinc-900/75 border border-zinc-800 rounded-lg p-3 flex flex-col items-center justify-center relative overflow-hidden">
                <svg viewBox="-24 -40 48 84" className="w-full h-full max-h-[380px]">
                  {floorRooms.map((r) => {
                    const isSelected = selectedRoom?.id === r.id;
                    const w = r.x2 - r.x1;
                    const h = r.z2 - r.z1;
                    return (
                      <g
                        key={r.id}
                        onClick={() => setSelectedRoomId(r.id)}
                        className="cursor-pointer"
                      >
                        <rect
                          x={r.x1}
                          y={r.z1}
                          width={w}
                          height={h}
                          fill={isSelected ? '#78350f' : r.isOutdoor ? '#111827' : '#27272a'}
                          stroke={isSelected ? '#fbbf24' : '#52525b'}
                          strokeWidth={isSelected ? 0.55 : 0.3}
                        />
                        <text
                          x={r.x1 + w / 2}
                          y={r.z1 + h / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#e4e4e7"
                          fontSize={Math.min(1.8, Math.max(0.95, w * 0.14))}
                        >
                          {r.shortLabel}
                        </text>
                      </g>
                    );
                  })}

                  {/* Player live position indicator when viewing current floor */}
                  {playerLocation.floor === mapFloor && (
                    <g>
                      <circle
                        cx={playerLocation.x}
                        cy={playerLocation.z}
                        r={1.15}
                        fill="#ef4444"
                        stroke="#fef08a"
                        strokeWidth={0.35}
                      />
                      <text
                        x={playerLocation.x}
                        y={playerLocation.z - 1.8}
                        textAnchor="middle"
                        fill="#fef08a"
                        fontSize={1.35}
                        fontWeight="bold"
                      >
                        आरव
                      </text>
                    </g>
                  )}
                </svg>
              </div>

              {selectedRoom && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 shrink-0">
                  <p className="text-sm font-semibold text-amber-200">{selectedRoom.name}</p>
                  <p className="text-xs text-zinc-300 mt-1">{selectedRoom.usefulHint}</p>
                </div>
              )}
            </div>

            {/* Right: All 25 Missions List */}
            <div className="lg:col-span-5 flex flex-col min-h-0 bg-zinc-900/60 border border-zinc-800 rounded-lg p-3">
              <p className="text-sm font-semibold text-amber-200 mb-2 shrink-0">
                सभी {MISSIONS.length} कहानी मिशन ({Math.min(MISSIONS.length, currentMission)} / {MISSIONS.length})
              </p>
              <div className="flex-1 overflow-y-auto hindi-scroll space-y-2 pr-1">
                {MISSIONS.map((m) => {
                  const done = m.id < currentMission;
                  const active = m.id === currentMission;
                  return (
                    <div
                      key={m.id}
                      className={`p-2.5 rounded-lg border text-xs ${
                        active
                          ? 'bg-amber-950/60 border-amber-600/80 text-zinc-100'
                          : done
                          ? 'bg-zinc-900/80 border-zinc-800/80 text-zinc-400'
                          : 'bg-zinc-950/60 border-zinc-900 text-zinc-500'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold tabular-nums">
                          {m.id}. {m.title}
                        </span>
                        <span
                          className={
                            active
                              ? 'text-amber-300 font-semibold shrink-0'
                              : done
                              ? 'text-emerald-400 shrink-0'
                              : 'text-zinc-600 shrink-0'
                          }
                        >
                          {done ? 'पूर्ण' : active ? 'वर्तमान' : 'शेष'}
                        </span>
                      </div>
                      {(active || done) && (
                        <p className="mt-1 text-zinc-300 leading-relaxed">{m.objective}</p>
                      )}
                      {active && (
                        <p className="mt-1 text-amber-300/90">संकेत: {m.hint}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. INVENTORY & LORE BAG
  if (inventoryOpen) {
    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/92 text-zinc-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-3xl w-full max-h-[86vh] bg-zinc-950 border border-zinc-800 rounded-xl p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="font-display-hindi text-2xl text-amber-200">
              आरव का थैला और दस्तावेज
            </h2>
            <button
              type="button"
              onClick={onCloseInventory}
              className="min-h-[42px] px-4 py-2 bg-amber-700 hover:bg-amber-600 text-zinc-950 font-bold text-sm rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              बंद करें
            </button>
          </div>

          <div className="flex gap-2 bg-zinc-900 p-1 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setBagTab('items')}
              className={`min-h-[40px] px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                bagTab === 'items'
                  ? 'bg-amber-700 text-zinc-950 font-bold'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              वस्तुएँ ({inventory.length})
            </button>
            <button
              type="button"
              onClick={() => setBagTab('lore')}
              className={`min-h-[40px] px-4 py-1.5 text-sm font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer ${
                bagTab === 'lore'
                  ? 'bg-amber-700 text-zinc-950 font-bold'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              डायरियाँ व सुराग ({collectedLore.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto hindi-scroll space-y-2.5 pr-1">
            {bagTab === 'items' && (
              <>
                {inventory.length === 0 ? (
                  <p className="text-center text-zinc-400 py-10 text-sm">
                    अभी थैले में कोई चाबी या सामान नहीं है।
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {inventory.map((itemId) => {
                      const it = INVENTORY_ITEMS[itemId];
                      if (!it) return null;
                      return (
                        <div
                          key={itemId}
                          className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-lg space-y-1.5"
                        >
                          <p className="text-sm font-semibold text-amber-200">{it.name}</p>
                          <p className="text-xs text-zinc-400">{it.subtitle}</p>
                          <p className="text-xs text-zinc-300 leading-relaxed">{it.description}</p>
                          {it.loreId && (
                            <button
                              type="button"
                              onClick={() => {
                                setLorePage(0);
                                onOpenLoreFromBag(it.loreId!);
                              }}
                              className="mt-2 px-3 py-1.5 bg-zinc-800 hover:bg-amber-700 hover:text-zinc-950 text-amber-300 text-xs font-medium rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              पूरी लिखावट पढ़ें
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {bagTab === 'lore' && (
              <>
                {collectedLore.length === 0 ? (
                  <p className="text-center text-zinc-400 py-10 text-sm">
                    अभी तक कोई डायरी, चिट्ठी या पुराना दस्तावेज नहीं मिला है।
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {collectedLore.map((lid) => {
                      const note = LORE_NOTES[lid];
                      if (!note) return null;
                      return (
                        <div
                          key={lid}
                          className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between gap-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-amber-200">{note.title}</p>
                            <p className="text-xs text-zinc-400 mt-0.5">
                              {note.author} · {note.locationLabel}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setLorePage(0);
                              onOpenLoreFromBag(lid);
                            }}
                            className="min-h-[40px] px-4 py-2 bg-amber-700 hover:bg-amber-600 text-zinc-950 font-semibold text-xs rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            पढ़ें
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 5. LORE NOTE READER
  if (activeLoreId && LORE_NOTES[activeLoreId]) {
    const note = LORE_NOTES[activeLoreId];
    const safePage = Math.min(lorePage, note.pages.length - 1);
    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/92 flex items-center justify-center p-4 select-none">
        <div className="max-w-xl w-full bg-[#efe4ca] text-zinc-900 border-2 border-amber-900/50 rounded-xl p-6 shadow-2xl space-y-4">
          <div className="border-b border-amber-900/25 pb-3">
            <p className="text-xs text-amber-900 font-medium">
              {note.locationLabel} · {note.author}
            </p>
            <h2 className="font-display-hindi text-2xl text-zinc-950 mt-1">{note.title}</h2>
          </div>

          <p className="text-base leading-relaxed text-zinc-900 min-h-[120px]">
            {note.pages[safePage]}
          </p>

          {note.clueHighlight && (
            <div className="border border-red-900/35 bg-red-950/10 rounded-lg p-3 text-sm text-red-950 font-medium">
              जरूरी सुराग: {note.clueHighlight}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-amber-900/20">
            <div className="flex items-center gap-2">
              {note.pages.length > 1 && (
                <>
                  <button
                    type="button"
                    disabled={safePage === 0}
                    onClick={() => setLorePage((p) => Math.max(0, p - 1))}
                    className="min-h-[40px] px-3 py-1.5 bg-amber-950/15 disabled:opacity-40 text-zinc-900 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    पिछला पन्ना
                  </button>
                  <span className="text-xs text-zinc-700 tabular-nums">
                    {safePage + 1} / {note.pages.length}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= note.pages.length - 1}
                    onClick={() => setLorePage((p) => Math.min(note.pages.length - 1, p + 1))}
                    className="min-h-[40px] px-3 py-1.5 bg-amber-950/15 disabled:opacity-40 text-zinc-900 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    अगला पन्ना
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setLorePage(0);
                onCloseLore();
              }}
              className="min-h-[42px] px-5 py-2 bg-zinc-900 hover:bg-zinc-800 text-amber-100 font-semibold text-sm rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              पढ़कर बंद करें
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 6. LIFT FLOOR SELECTOR
  if (liftModalOpen) {
    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/90 text-zinc-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-sm w-full bg-zinc-950 border border-amber-700/60 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="font-display-hindi text-2xl text-amber-200">लिफ्ट नियंत्रण पैनल</h2>
            <button
              type="button"
              onClick={onCloseLift}
              className="px-3 py-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-md cursor-pointer"
            >
              बंद करें
            </button>
          </div>

          <p className="text-xs text-zinc-400">
            स्थिति: {powerRestored ? 'बिजली चालू' : 'बिजली बंद है'} · वर्तमान: {FLOOR_NAMES[playerLocation.floor]}
          </p>

          <div className="flex flex-col gap-2">
            {([
              { id: '3', label: 'तीसरी मंजिल (कर्मचारी व मालिक कक्ष)' },
              { id: '2', label: 'दूसरी मंजिल (कमरा नं. 11–20)' },
              { id: '1', label: 'पहली मंजिल (कमरा नं. 1–10)' },
              { id: 'G', label: 'भूतल (लॉबी व रसोई)' },
              { id: 'B1', label: 'तहखाना (बेसमेंट व बिजली कक्ष)' },
            ] as { id: FloorId; label: string }[]).map((fl) => (
              <button
                key={fl.id}
                type="button"
                onClick={() => {
                  onSelectLiftFloor(fl.id);
                  onCloseLift();
                }}
                className={`min-h-[46px] px-4 py-2 text-left text-sm font-medium rounded-lg border transition-colors cursor-pointer ${
                  playerLocation.floor === fl.id
                    ? 'bg-amber-700 border-amber-500 text-zinc-950 font-bold'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {fl.label}
              </button>
            ))}
          </div>

          <p className="text-xs text-zinc-500">
            नोट: चौथी मंजिल व खुली छत पर जाने के लिए तीसरी मंजिल से पूर्वी सीढ़ी चढ़ें।
          </p>
        </div>
      </div>
    );
  }

  // 7. INTERACTIVE STORY PUZZLES
  if (!activePuzzle) return null;

  if (activePuzzle === 'register') {
    const finalName = regName.trim() || 'आरव कुमार';
    const nibBobY = isWritingReg ? Math.sin(writeProgress * 36) * 3 : 0;
    const inkDone = writeProgress >= 0.99;

    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/90 flex items-center justify-center p-4 select-none">
        <div className="max-w-lg w-full bg-[#f4ebd4] text-zinc-900 border-2 border-red-950/40 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3.5 bg-zinc-950 text-zinc-100 border border-red-900/60 rounded-lg p-3">
            <div className="w-16 h-20 rounded-md overflow-hidden border border-red-800/70 shrink-0 bg-black">
              <img
                src="/assets/aistudio/file_00000000f7fc82119210b918dbfab209_7b28c7b7.png"
                alt="कविता (काउंटर पर खड़ी महिला)"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-[50%_14%]"
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-red-400">कविता (रिसेप्शन काउंटर)</p>
              <p className="text-xs sm:text-sm text-zinc-200 mt-1 leading-relaxed">
                “अपना नाम लिखिए साहब... रजिस्टर पर नाम लिखते ही मैं अपने हाथ से कमरा नंबर 13 की चाबी दूँगी।”
              </p>
            </div>
          </div>

          <h2 className="font-display-hindi text-2xl text-red-950 border-b border-red-900/20 pb-2">
            शाही निवाला रेस्टोरेंट — मेहमान रजिस्टर
          </h2>

          {/* Aged Ruled Register Book Page with Live Fountain Pen Handwriting */}
          <div className="rounded-lg border-2 border-amber-900/35 bg-[#fbf4df] overflow-hidden shadow-inner">
            <div className="grid grid-cols-12 bg-red-950/10 border-b border-red-900/20 px-3 py-1.5 text-[11px] font-bold text-red-950">
              <span className="col-span-3">कमरा नं.</span>
              <span className="col-span-6">मेहमान का नाम (हस्ताक्षर)</span>
              <span className="col-span-3 text-right">स्थिति</span>
            </div>

            <div className="divide-y divide-sky-900/15 text-xs text-zinc-700">
              <div className="grid grid-cols-12 px-3 py-2 items-center">
                <span className="col-span-3 font-medium">कमरा नं. 4</span>
                <span className="col-span-6 italic text-zinc-600">सुरेंद्र नाथ</span>
                <span className="col-span-3 text-right text-zinc-500">खाली</span>
              </div>
              <div className="grid grid-cols-12 px-3 py-2 items-center">
                <span className="col-span-3 font-medium">कमरा नं. 9</span>
                <span className="col-span-6 italic text-zinc-600">शंकर मिस्त्री</span>
                <span className="col-span-3 text-right text-zinc-500">खाली</span>
              </div>

              {/* Active Line where Aarav's Pen Writes Live onto the Register! */}
              <div className="grid grid-cols-12 px-3 py-3 items-center bg-amber-100/55 relative min-h-[54px]">
                <span className="col-span-3 font-bold text-red-900">कमरा नं. 13</span>
                <div className="col-span-6 relative pr-2">
                  <div className="border-b border-dashed border-sky-900/50 pb-1 min-h-[28px] relative flex items-center">
                    {!isWritingReg && writeProgress === 0 ? (
                      <span className="text-zinc-500 italic text-xs">
                        {finalName} (लिखने के लिए नीचे बटन दबाएँ)
                      </span>
                    ) : (
                      <span
                        className="font-display-hindi text-lg sm:text-xl text-[#1e3a8a] whitespace-nowrap inline-block tracking-wide"
                        style={{
                          clipPath: `inset(0 ${(1 - writeProgress) * 100}% 0 0)`,
                        }}
                      >
                        {finalName}
                      </span>
                    )}

                    {/* Animated Fountain Pen Nib Moving Across Page as Ink Appears */}
                    {isWritingReg && !inkDone && (
                      <div
                        className="pointer-events-none absolute bottom-1 z-20"
                        style={{
                          left: `${Math.min(92, writeProgress * 90)}%`,
                          transform: `translate(-2px, ${nibBobY}px)`,
                        }}
                      >
                        <svg viewBox="0 0 64 64" className="w-9 h-9 drop-shadow">
                          <path
                            d="M14 54 L22 36 L48 10 L55 17 L29 43 Z"
                            fill="#6e1118"
                            stroke="#d4af37"
                            strokeWidth="2"
                          />
                          <path
                            d="M11 57 L16 44 L21 49 Z"
                            fill="#d4af37"
                          />
                          <circle cx="11" cy="57" r="2.2" fill="#1e3a8a" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
                <span className="col-span-3 text-right text-[11px] font-semibold">
                  {inkDone ? (
                    <span className="text-emerald-800">✓ दर्ज हुआ</span>
                  ) : isWritingReg ? (
                    <span className="text-amber-800">लिख रहे हैं...</span>
                  ) : (
                    <span className="text-red-900">आज आरक्षित</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-zinc-800 mb-1.5">
              अपना नाम दर्ज करें:
            </label>
            <input
              type="text"
              disabled={isWritingReg}
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white disabled:bg-zinc-100 border border-zinc-400 rounded-lg text-zinc-950 font-semibold focus:outline-none focus:border-red-800"
            />
            <p className="text-xs text-zinc-600 mt-1">
              {inkDone
                ? 'रजिस्टर में नाम लिखा जा चुका है — कविता अपने हाथ से चाबी दे रही हैं!'
                : 'कमरा आवंटन: कमरा नंबर 13 (दूसरी मंजिल)'}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={isWritingReg}
              onClick={onClosePuzzle}
              className="min-h-[44px] px-4 py-2 bg-zinc-300 hover:bg-zinc-400 disabled:opacity-45 text-zinc-900 font-medium text-sm rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              बाद में लिखें
            </button>
            <button
              type="button"
              disabled={isWritingReg}
              onClick={() => {
                setWriteProgress(0);
                setIsWritingReg(true);
              }}
              className="min-h-[44px] px-5 py-2 bg-red-900 hover:bg-red-800 disabled:bg-emerald-800 text-white font-semibold text-sm rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              {inkDone
                ? '✓ नाम लिखा गया!'
                : isWritingReg
                ? 'रजिस्टर पर नाम लिख रहे हैं...'
                : 'कलम से रजिस्टर में नाम लिखें'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activePuzzle === 'food_inspect') {
    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/92 text-zinc-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-xl p-6 text-center space-y-5">
          <h2 className="font-display-hindi text-2xl text-amber-200">
            कमरा नं. 13 · रात का खाना
          </h2>

          {/* Atmospheric Top-down Tray SVG (No Blood/Gore) */}
          <div className="flex justify-center py-2">
            <svg viewBox="0 0 220 220" className="w-44 h-44">
              <circle cx="110" cy="110" r="95" fill="#71717a" stroke="#d4d4d8" strokeWidth="4" />
              <circle cx="110" cy="110" r="78" fill="#27272a" />
              {!foodOpened ? (
                <g>
                  <circle cx="110" cy="110" r="70" fill="#a1a1aa" stroke="#e4e4e7" strokeWidth="3" />
                  <circle cx="110" cy="110" r="14" fill="#d97706" />
                </g>
              ) : (
                <g>
                  <ellipse cx="110" cy="114" rx="46" ry="30" fill="#1e1316" stroke="#3f272b" strokeWidth="2" />
                  <ellipse cx="102" cy="108" rx="22" ry="12" fill="#2d1c1f" />
                  <circle cx="132" cy="124" r="9" fill="#24211b" />
                </g>
              )}
            </svg>
          </div>

          {!foodOpened ? (
            <>
              <p className="text-sm text-zinc-300 leading-relaxed">
                कविता द्वारा रखी गई चाँदी की ढक्कन वाली थाली से अजीब ठंडी गंध आ रही है।
              </p>
              <button
                type="button"
                onClick={() => setFoodOpened(true)}
                className="w-full min-h-[48px] px-5 py-3 bg-amber-700 hover:bg-amber-600 text-zinc-950 font-bold text-base rounded-lg cursor-pointer"
              >
                थाली का ढक्कन उठाएँ
              </button>
            </>
          ) : (
            <>
              <p className="text-base font-medium text-red-300 leading-relaxed">
                “यह कैसा खाना है? मेरे खाने में पता नहीं कैसे मांस चला गया! मैं यह बिल्कुल नहीं खा सकता!”
              </p>
              <p className="text-xs text-zinc-400">
                कमरा नंबर 13 का दरवाजा खुला है — अभी नीचे रिसेप्शन काउंटर पर जाकर शिकायत करनी होगी।
              </p>
              <button
                type="button"
                onClick={() => {
                  setFoodOpened(false);
                  onSolvePuzzle('food_inspect');
                }}
                className="w-full min-h-[48px] px-5 py-3 bg-red-900 hover:bg-red-800 text-white font-semibold text-base rounded-lg cursor-pointer"
              >
                थाली छोड़कर नीचे शिकायत करने जाएँ
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (activePuzzle === 'nightmare_sleep') {
    const mode = puzzleContext || 'sleep_rest';

    if (mode === 'nightmare') {
      return (
        <div className="fixed inset-0 z-50 bg-black text-zinc-100 flex items-center justify-center p-4 select-none">
          <div className="max-w-lg w-full bg-zinc-950 border border-red-900/70 rounded-xl p-6 text-center space-y-5 shadow-2xl">
            {nightmareStep === 0 && (
              <>
                <p className="text-xs text-amber-400 font-semibold">कमरा नं. 13 · देर रात का विश्राम</p>
                <h2 className="font-display-hindi text-3xl text-amber-200">
                  पलंग पर आराम करना
                </h2>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                  काउंटर वाली लड़की के माफी माँगने के बाद आप थोड़ा निश्चिंत होकर कमरा नंबर 13 में लौट आए हैं। थकान बहुत है — पलंग पर लेटते ही आपकी पलकें भारी होने लगती हैं...
                </p>
                <button
                  type="button"
                  onClick={() => setNightmareStep(1)}
                  className="w-full min-h-[48px] px-5 py-3 bg-amber-700 hover:bg-amber-600 text-zinc-950 font-bold text-base rounded-lg cursor-pointer"
                >
                  आँखें बंद करें (सो जाएँ)
                </button>
              </>
            )}

            {nightmareStep === 1 && (
              <>
                <p className="text-xs text-red-400 font-semibold">डरावना सपना · रात का अंधेरा</p>
                <div className="w-36 h-44 mx-auto rounded-lg overflow-hidden border-2 border-red-800/80 bg-black relative">
                  <img
                    src="/assets/aistudio/file_00000000f7fc82119210b918dbfab209_7b28c7b7.png"
                    alt="सपने में काउंटर वाली लड़की की परछाई"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-[50%_14%] brightness-75 contrast-125"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle at 50% 35%, transparent 30%, rgba(0,0,0,0.92) 95%)',
                    }}
                  />
                </div>
                <h2 className="font-display-hindi text-3xl text-red-500">
                  भयानक छाया का साया!
                </h2>
                <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                  सपने में कमरे की सारी रोशनी अचानक बुझ जाती है... बिल्कुल पास खड़ी वही काउंटर वाली लड़की ठंडी परछाई बनकर आपकी ओर बढ़ रही है! भयानक डर से आपकी साँसें रुकने लगती हैं!
                </p>
                <button
                  type="button"
                  onClick={() => setNightmareStep(2)}
                  className="w-full min-h-[50px] px-5 py-3 bg-red-800 hover:bg-red-700 text-white font-bold text-base rounded-lg cursor-pointer"
                >
                  डरकर अचानक नींद से जागें!
                </button>
              </>
            )}

            {nightmareStep === 2 && (
              <>
                <p className="text-xs text-amber-400 font-semibold">कमरा नं. 13 · नींद खुल गई</p>
                <h2 className="font-display-hindi text-3xl text-amber-200">
                  सच्चाई का एहसास
                </h2>
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-left space-y-2 text-sm sm:text-base text-zinc-100 leading-relaxed">
                  <p className="text-xs text-amber-300 font-semibold">आरव कुमार:</p>
                  <p>
                    “अरे! मुझे यह कैसा डरावना सपना आया! मेरे को यह रेस्टोरेंट कुछ ठीक नहीं लग रहा... पहले मेरे को यहाँ खाने में मांस मिला और अब यह सपना मुझे परेशान कर रहा है। नहीं-नहीं, मेरे को यहाँ से निकलना ही होगा — बस इस काउंटर वाली लड़की को पता नहीं चलना चाहिए कि मैं यहाँ से भागने की कोशिश कर रहा हूँ।”
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNightmareStep(0);
                    onSolvePuzzle('nightmare_sleep', 'nightmare');
                  }}
                  className="w-full min-h-[48px] px-5 py-3 bg-amber-700 hover:bg-amber-600 text-zinc-950 font-bold text-base rounded-lg cursor-pointer"
                >
                  सावधान हो जाएँ (कमरे में उठें)
                </button>
              </>
            )}
          </div>
        </div>
      );
    }

    if (mode === 'hunger_nap') {
      return (
        <div className="fixed inset-0 z-40 bg-zinc-950/94 text-zinc-100 flex items-center justify-center p-4 select-none">
          <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-xl p-6 text-center space-y-5">
            <p className="text-xs text-amber-400 font-semibold">कमरा नं. 13 · विश्राम</p>
            <h2 className="font-display-hindi text-2xl text-amber-200">
              थोड़ी देर की झपकी
            </h2>
            <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
              लड़की के वापस जाने के बाद आप कुछ देर पलंग पर आंखें बंद कर लेते हैं। समय बीतने के साथ पेट में तेज भूख महसूस होती है — नीचे जाकर सामान्य व्यवहार बनाए रखना ही सबसे सही उपाय है।
            </p>
            <button
              type="button"
              onClick={() => onSolvePuzzle('nightmare_sleep', 'hunger_nap')}
              className="w-full min-h-[48px] px-5 py-3 bg-amber-700 hover:bg-amber-600 text-zinc-950 font-bold text-base rounded-lg cursor-pointer"
            >
              उठें (भूख लगने का बहाना लेकर नीचे जाएँ)
            </button>
          </div>
        </div>
      );
    }

    // Standard sleep_rest mode anytime during escape mission
    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/92 text-zinc-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-xl p-6 text-center space-y-5">
          <p className="text-xs text-amber-400 font-semibold">कमरा नं. 13 · पलंग पर आराम</p>
          <h2 className="font-display-hindi text-2xl text-amber-200">
            क्या आप कुछ देर सोना चाहते हैं?
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            कमरे में आकर कुछ देर आराम करने से आपकी ताकत पूरी हो जाएगी, रात का समय आगे बढ़ेगा और काउंटर वाली चुड़ैल का शक भी शांत होगा।
          </p>
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => onSolvePuzzle('nightmare_sleep', 'sleep_rest')}
              className="w-full min-h-[48px] px-5 py-3 bg-amber-700 hover:bg-amber-600 text-zinc-950 font-bold text-base rounded-lg cursor-pointer"
            >
              हाँ, 45 मिनट सोएँ और आराम करें
            </button>
            <button
              type="button"
              onClick={onClosePuzzle}
              className="w-full min-h-[44px] px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm rounded-lg cursor-pointer"
            >
              अभी नहीं (कमरे में लौटें)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activePuzzle === 'chudail_dialogue') {
    const qId = puzzleContext && CHUDAIL_QUESTIONS[puzzleContext] ? puzzleContext : 'Q1';
    const qDef = CHUDAIL_QUESTIONS[qId];
    const projectedSuspicion = Math.min(
      100,
      suspicionLevel + (dialogueChoice ? dialogueChoice.suspicionDelta : 0)
    );
    const projectedWrongs =
      wrongDialogueCount + (dialogueChoice?.isWrong ? 1 : 0);
    const willBeKilled =
      Boolean(dialogueChoice) &&
      (projectedSuspicion >= 100 || (Boolean(dialogueChoice?.isWrong) && projectedWrongs >= 3));

    const submitDialogueResult = (choice: NonNullable<typeof dialogueChoice>) => {
      const payload = JSON.stringify({
        questionId: qId,
        choiceIndex: choice.choiceIndex,
        suspicionDelta: choice.suspicionDelta,
        replyText: choice.reply,
        isScary: choice.isScary,
        isWrong: choice.isWrong,
      });
      setDialogueChoice(null);
      onSolvePuzzle('chudail_dialogue', payload);
    };

    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/94 text-zinc-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-lg w-full bg-zinc-950 border border-red-900/75 rounded-xl p-5 sm:p-6 space-y-4 shadow-2xl">
          {/* Chudail Suspicion Gauge */}
          <div className="bg-zinc-900/95 border border-zinc-800 rounded-lg px-3.5 py-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-red-400">
                काउंटर वाली चुड़ैल का शक: {projectedSuspicion}%
              </span>
              <span className="text-zinc-400 tabular-nums">
                गलत जवाब: <strong className={projectedWrongs >= 2 ? 'text-red-400' : 'text-amber-300'}>{projectedWrongs} / 3</strong>
              </span>
            </div>
            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  projectedSuspicion >= 70
                    ? 'bg-red-600'
                    : projectedSuspicion >= 35
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${projectedSuspicion}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3.5 bg-zinc-900/90 border border-red-900/50 rounded-lg p-3">
            <div className="w-16 h-20 rounded-md overflow-hidden border border-red-800/80 shrink-0 bg-black">
              <img
                src="/assets/aistudio/file_00000000f7fc82119210b918dbfab209_7b28c7b7.png"
                alt="काउंटर वाली लड़की (कविता)"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-[50%_14%]"
              />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-red-400">
                काउंटर वाली लड़की (कविता) · रिसेप्शन काउंटर
              </p>
              <p className="text-xs sm:text-sm text-zinc-100 mt-1 leading-snug font-medium">
                “{dialogueChoice ? dialogueChoice.reply : qDef.question}”
              </p>
            </div>
          </div>

          {!dialogueChoice ? (
            <div className="space-y-2">
              <p className="text-[11px] text-amber-300/90 font-medium">
                सावधानी से सही जवाब चुनें — बार-बार गलत जवाब दिया तो चुड़ैल का शक बढ़कर वह आपको मार डालेगी:
              </p>
              {qDef.choices.map((c, idx) => (
                <button
                  key={c.text}
                  type="button"
                  onClick={() => {
                    const nextSusp = Math.min(100, suspicionLevel + c.suspicionDelta);
                    const nextWrongs = wrongDialogueCount + (c.isWrong ? 1 : 0);
                    const lethal = nextSusp >= 100 || (c.isWrong && nextWrongs >= 3);
                    const chosen = {
                      choiceIndex: idx,
                      playerText: c.text,
                      suspicionDelta: c.suspicionDelta,
                      reply: c.reply,
                      isScary: c.isScary,
                      isWrong: c.isWrong,
                    };
                    if (lethal) {
                      submitDialogueResult(chosen);
                      return;
                    }
                    onSpeakExchangeRef.current?.(c.text, c.reply);
                    setDialogueChoice(chosen);
                  }}
                  className="w-full min-h-[42px] px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-amber-500/80 text-left text-xs sm:text-[13px] text-zinc-100 rounded-lg transition-colors cursor-pointer leading-snug"
                >
                  <span className="text-amber-300 font-bold mr-2">{idx + 1}.</span>
                  {c.text}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-lg px-3 py-2 text-[11px] sm:text-xs text-amber-200/95">
                <span className="font-semibold text-amber-300">आरव कुमार: </span>
                “{dialogueChoice.playerText}”
              </div>
              <p className={`text-xs font-medium ${dialogueChoice.isWrong || dialogueChoice.isScary ? 'text-red-400' : 'text-zinc-400'}`}>
                {willBeKilled
                  ? 'खतरा: चुड़ैल का शक 100% हो चुका है! वह आप पर झपटने वाली है!'
                  : dialogueChoice.isWrong
                  ? `गलत जवाब! चुड़ैल का शक +${dialogueChoice.suspicionDelta}% बढ़ गया है (${projectedSuspicion}%) — एक-दो बार और गलत चुना तो वह आपको मार डालेगी!`
                  : dialogueChoice.isScary
                  ? 'चेतावनी: उसकी निगाहें आपकी ओर और सख्त हो गई हैं... वह कुछ भाँप रही है।'
                  : 'उसने आपकी बात मान ली लगती है — वह फिर से काउंटर पर नजरें टिकाकर देख रही है।'}
              </p>
              <button
                type="button"
                onClick={() => submitDialogueResult(dialogueChoice)}
                className="w-full min-h-[48px] px-5 py-3 bg-amber-700 hover:bg-amber-600 text-zinc-950 font-bold text-base rounded-lg cursor-pointer"
              >
                आगे बढ़ें
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activePuzzle === 'telephone') {
    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/92 text-zinc-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-5">
          <div className="border-b border-zinc-800 pb-3">
            <p className="text-xs text-red-400 font-semibold">पुराना काला टेलीफोन · अज्ञात कॉल</p>
            <h2 className="font-display-hindi text-2xl text-amber-200 mt-1">
              घबराई हुई अज्ञात आवाज
            </h2>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2.5 text-sm sm:text-base text-zinc-100 leading-relaxed">
            <p>“मेरी बात ध्यान से सुनो... यहाँ से जल्दी भाग जाओ। यह रेस्टोरेंट सुरक्षित नहीं है।”</p>
            <p className="text-zinc-300 text-sm">
              “रात के बाद यह वेट्रेस किसी मेहमान को बाहर नहीं निकलने देती... पहले बाथरूम से सिटकनी की पिन ढूँढ़कर दरवाजा खोलो और चुपचाप रिसेप्शन तक जाओ!”
            </p>
          </div>

          <button
            type="button"
            onClick={() => onSolvePuzzle('telephone')}
            className="w-full min-h-[48px] px-5 py-3 bg-amber-700 hover:bg-amber-600 text-zinc-950 font-bold text-base rounded-lg cursor-pointer"
          >
            फोन रखें और बचने का रास्ता खोजें
          </button>
        </div>
      </div>
    );
  }

  if (
    activePuzzle === 'keypad_kavita' ||
    activePuzzle === 'keypad_owner_safe' ||
    activePuzzle === 'keypad_room13_secret'
  ) {
    const cfg = KEYPAD_CONFIG[activePuzzle];
    const pressDigit = (d: string) => {
      setKeypadErr('');
      setKeypadVal((prev) => (prev.length < 4 ? prev + d : prev));
    };
    const submitPin = () => {
      if (keypadVal === cfg.code) {
        setKeypadVal('');
        setKeypadErr('');
        onSolvePuzzle(activePuzzle, puzzleContext);
      } else {
        setKeypadErr('गलत कोड — कृपया डायरियों में लिखा सही पासवर्ड जाँचें।');
      }
    };

    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/92 text-zinc-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-sm w-full bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display-hindi text-2xl text-amber-200">{cfg.title}</h2>
              <p className="text-xs text-zinc-400 mt-0.5">{cfg.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setKeypadVal('');
                setKeypadErr('');
                onClosePuzzle();
              }}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-xs rounded-md cursor-pointer"
            >
              रद्द करें
            </button>
          </div>

          <p className="text-xs text-amber-300/90 bg-zinc-900 border border-zinc-800 rounded-lg p-2.5">
            {cfg.hint}
          </p>

          <div className="bg-black border border-zinc-700 rounded-lg py-3 text-center text-2xl font-mono tracking-[0.45em] text-amber-300 tabular-nums">
            {keypadVal.padEnd(4, '•')}
          </div>

          {keypadErr && <p className="text-xs text-red-400 text-center">{keypadErr}</p>}

          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => pressDigit(d)}
                className="min-h-[48px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-lg font-bold rounded-lg tabular-nums cursor-pointer"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setKeypadVal('');
                setKeypadErr('');
              }}
              className="min-h-[48px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-300 rounded-lg cursor-pointer"
            >
              साफ करें
            </button>
            <button
              type="button"
              onClick={() => pressDigit('0')}
              className="min-h-[48px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-lg font-bold rounded-lg tabular-nums cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={submitPin}
              className="min-h-[48px] bg-amber-700 hover:bg-amber-600 text-zinc-950 text-sm font-bold rounded-lg cursor-pointer"
            >
              खोलें
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activePuzzle === 'wiring') {
    const allDone = connectedWires.length === WIRE_DEFS.length;
    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/92 text-zinc-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-lg w-full bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h2 className="font-display-hindi text-2xl text-amber-200">
                बिजली नियंत्रण कक्ष — तार जोड़ने की पहेली
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                बाएँ और दाएँ ओर एक ही रंग के दोनों सिरों को क्रम से जोड़ें
              </p>
            </div>
            <button
              type="button"
              onClick={onClosePuzzle}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-xs rounded-md cursor-pointer"
            >
              बंद करें
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Left Sources */}
            <div className="space-y-2.5">
              {WIRE_DEFS.map((w) => {
                const done = connectedWires.includes(w.id);
                const sel = selectedWire === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    disabled={done}
                    onClick={() => setSelectedWire(w.id)}
                    className={`w-full min-h-[46px] px-3 py-2 rounded-lg border text-left text-xs sm:text-sm font-medium flex items-center justify-between cursor-pointer ${
                      done
                        ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                        : sel
                        ? 'bg-zinc-800 border-amber-400 text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    <span>{w.label}</span>
                    <span
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: w.color }}
                    />
                  </button>
                );
              })}
            </div>

            {/* Right Scrambled Targets */}
            <div className="space-y-2.5">
              {RIGHT_WIRE_ORDER.map((rid) => {
                const w = WIRE_DEFS.find((d) => d.id === rid)!;
                const done = connectedWires.includes(rid);
                return (
                  <button
                    key={rid}
                    type="button"
                    disabled={done}
                    onClick={() => {
                      if (selectedWire === rid) {
                        setConnectedWires((prev) => [...prev, rid]);
                        setSelectedWire(null);
                      } else {
                        setSelectedWire(null);
                      }
                    }}
                    className={`w-full min-h-[46px] px-3 py-2 rounded-lg border text-right text-xs sm:text-sm font-medium flex items-center justify-between cursor-pointer ${
                      done
                        ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full shrink-0"
                      style={{ backgroundColor: w.color }}
                    />
                    <span>{done ? 'जुड़ गया' : 'संपर्क बिंदु'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {allDone && (
            <button
              type="button"
              onClick={() => {
                setConnectedWires([]);
                setSelectedWire(null);
                onSolvePuzzle('wiring');
              }}
              className="w-full min-h-[48px] bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-base rounded-lg cursor-pointer"
            >
              पैनल लॉक करें और जनरेटर पर जाएँ
            </button>
          )}
        </div>
      </div>
    );
  }

  if (activePuzzle === 'generator') {
    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/92 text-zinc-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h2 className="font-display-hindi text-2xl text-amber-200">
              डीजल जनरेटर चालू करें
            </h2>
            <button
              type="button"
              onClick={onClosePuzzle}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-xs rounded-md cursor-pointer"
            >
              रद्द करें
            </button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <p className="text-xs text-zinc-400">वोल्टेज मीटर</p>
            <p className="text-3xl font-bold text-amber-300 mt-1 tabular-nums">
              {genStep >= 3 ? '240 वोल्ट · चालू' : genStep === 2 ? 'ईंधन तैयार' : '0 वोल्ट'}
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              disabled={genStep >= 1}
              onClick={() => setGenStep(1)}
              className={`min-h-[48px] px-4 py-2.5 rounded-lg border text-sm font-semibold cursor-pointer ${
                genStep >= 1
                  ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-100'
              }`}
            >
              {genStep >= 1 ? '1. ईंधन वाल्व खुल चुका है' : '1. ईंधन वाल्व खोलें'}
            </button>

            <button
              type="button"
              disabled={genStep !== 1}
              onClick={() => setGenStep(2)}
              className={`min-h-[48px] px-4 py-2.5 rounded-lg border text-sm font-semibold cursor-pointer disabled:opacity-50 ${
                genStep >= 2
                  ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-100'
              }`}
            >
              {genStep >= 2 ? '2. चोक लीवर तैयार है' : '2. चोक लीवर खींचें'}
            </button>

            <button
              type="button"
              disabled={genStep !== 2}
              onClick={() => {
                setGenStep(3);
                window.setTimeout(() => {
                  setGenStep(0);
                  onSolvePuzzle('generator');
                }, 700);
              }}
              className="min-h-[48px] px-4 py-2.5 bg-amber-700 hover:bg-amber-600 disabled:opacity-45 text-zinc-950 font-bold text-sm rounded-lg cursor-pointer"
            >
              3. मुख्य स्टार्ट बटन दबाएँ
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activePuzzle === 'final_gate') {
    const hasCrowbar = puzzleContext === 'has_crowbar';
    const requiredHits = hasCrowbar ? 2 : 5;
    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/92 text-zinc-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-zinc-950 border border-red-800/80 rounded-xl p-6 text-center space-y-5">
          <h2 className="font-display-hindi text-3xl text-red-400">
            पीछे का अंतिम लोहे का गेट
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            {hasCrowbar
              ? 'कविता ठीक पीछे आ रही है! अपनी लोहे की भारी छड़ से गेट की जंजीर तोड़ो!'
              : 'गेट पर जंग लगी जंजीर बँधी है! पूरी ताकत से प्रहार करके कुंडी तोड़ो!'}
          </p>

          <div className="w-full h-3 bg-zinc-900 border border-zinc-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${Math.min(100, (gateHits / requiredHits) * 100)}%` }}
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => {
                const next = gateHits + 1;
                if (next >= requiredHits) {
                  setGateHits(0);
                  onSolvePuzzle('final_gate');
                } else {
                  setGateHits(next);
                }
              }}
              className="min-h-[54px] px-6 py-3 bg-red-800 hover:bg-red-700 text-white font-bold text-base rounded-lg cursor-pointer"
            >
              {hasCrowbar
                ? `लोहे की छड़ से जंजीर तोड़ें (${gateHits}/${requiredHits})`
                : `पूरी ताकत से कुंडी तोड़ें (${gateHits}/${requiredHits})`}
            </button>
            <button
              type="button"
              onClick={onClosePuzzle}
              className="min-h-[40px] px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs rounded-lg cursor-pointer"
            >
              पीछे हटें
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activePuzzle === 'kitchen_vessels') {
    const isComplete =
      vesselSeq.length === RIGHT_VESSEL_ORDER.length &&
      RIGHT_VESSEL_ORDER.every((id, idx) => vesselSeq[idx] === id);

    const handlePickVessel = (vid: string) => {
      if (isComplete) return;
      const expected = RIGHT_VESSEL_ORDER[vesselSeq.length];
      if (vid === expected) {
        const next = [...vesselSeq, vid];
        setVesselSeq(next);
        setVesselErr('');
        if (next.length === RIGHT_VESSEL_ORDER.length) {
          window.setTimeout(() => {
            setVesselSeq([]);
            onSolvePuzzle('kitchen_vessels');
          }, 550);
        }
      } else {
        setVesselSeq([]);
        setVesselErr('गलत क्रम! बर्तन फिर अपनी जगह आ गए — सही क्रम: घड़ा → मसाला डिब्बा → पीतल थाली → काला तवा।');
      }
    };

    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/92 text-zinc-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <p className="text-xs text-amber-400 font-semibold">रसोई पहेली 1 · पुरानी रसोई</p>
              <h2 className="font-display-hindi text-2xl text-amber-200 mt-0.5">
                तांबे के बर्तन व गुप्त दीवार
              </h2>
            </div>
            <button
              type="button"
              onClick={onClosePuzzle}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-xs rounded-md cursor-pointer"
            >
              रद्द करें
            </button>
          </div>

          <p className="text-xs text-amber-300/90 bg-zinc-900 border border-zinc-800 rounded-lg p-3 leading-relaxed">
            संकेत: मालिक की ऑफिस दराज के नोट के अनुसार चारों बर्तनों को सही क्रम में दबाएँ —{' '}
            <span className="font-bold text-amber-200">
              तांबे का घड़ा → मसाला डिब्बा → पीतल की थाली → काला तवा
            </span>
          </p>

          <div className="grid grid-cols-2 gap-3">
            {VESSEL_ITEMS.map((v) => {
              const stepIdx = vesselSeq.indexOf(v.id);
              const done = stepIdx >= 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={done}
                  onClick={() => handlePickVessel(v.id)}
                  className={`min-h-[64px] p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                    done
                      ? 'bg-emerald-950/70 border-emerald-600 text-emerald-200'
                      : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-100'
                  }`}
                >
                  <p className="text-sm font-semibold">{v.label}</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {done ? `सही क्रम (${stepIdx + 1}/4)` : v.hint}
                  </p>
                </button>
              );
            })}
          </div>

          {vesselErr && <p className="text-xs text-red-400 text-center">{vesselErr}</p>}
          {isComplete && (
            <p className="text-sm text-emerald-400 text-center font-semibold">
              दीवार के पीछे गुप्त दरवाजा खिसक कर खुल रहा है...
            </p>
          )}
        </div>
      </div>
    );
  }

  if (activePuzzle === 'kitchen_almirah') {
    const cycleDial = (idx: 0 | 1 | 2, delta: number) => {
      setAlmirahErr('');
      setAlmirahDials((prev) => {
        const copy: [number, number, number] = [...prev] as [number, number, number];
        copy[idx] = (copy[idx] + delta + 10) % 10;
        return copy;
      });
    };

    const tryUnlockAlmirah = () => {
      if (almirahDials[0] === 1 && almirahDials[1] === 3 && almirahDials[2] === 8) {
        setAlmirahErr('');
        onSolvePuzzle('kitchen_almirah');
      } else {
        setAlmirahErr('गलत अंक! अलमारी पर उकेरे निशानों को ध्यान से देखें (सही संयोजन: 1 - 3 - 8)।');
      }
    };

    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/92 text-zinc-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <p className="text-xs text-amber-400 font-semibold">रसोई पहेली 2 · गुप्त कमरा</p>
              <h2 className="font-display-hindi text-2xl text-amber-200 mt-0.5">
                बंद लोहे की अलमारी का ताला
              </h2>
            </div>
            <button
              type="button"
              onClick={onClosePuzzle}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-xs rounded-md cursor-pointer"
            >
              रद्द करें
            </button>
          </div>

          <p className="text-xs text-amber-300/90 bg-zinc-900 border border-zinc-800 rounded-lg p-3 leading-relaxed">
            अलमारी की लोहे की प्लेट पर खुरचकर लिखा संकेत:{' '}
            <span className="font-bold text-amber-200">
              “पहला कक्ष (1) · तीन पहेलियाँ (3) · आठवाँ ताला (8)” — तीनों चक्र घुमाकर कोड 1-3-8 मिलाएँ।
            </span>
          </p>

          <div className="grid grid-cols-3 gap-3">
            {([0, 1, 2] as const).map((idx) => (
              <div
                key={idx}
                className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 flex flex-col items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => cycleDial(idx, 1)}
                  className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-sm font-bold cursor-pointer"
                >
                  ▲
                </button>
                <span className="text-3xl font-mono font-bold text-amber-300 tabular-nums">
                  {almirahDials[idx]}
                </span>
                <button
                  type="button"
                  onClick={() => cycleDial(idx, -1)}
                  className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-sm font-bold cursor-pointer"
                >
                  ▼
                </button>
              </div>
            ))}
          </div>

          {almirahErr && <p className="text-xs text-red-400 text-center">{almirahErr}</p>}

          <button
            type="button"
            onClick={tryUnlockAlmirah}
            className="w-full min-h-[48px] bg-amber-700 hover:bg-amber-600 text-zinc-950 font-bold text-base rounded-lg cursor-pointer"
          >
            अलमारी का भारी ताला खोलें
          </button>
        </div>
      </div>
    );
  }

  if (activePuzzle === 'main_door_key_box') {
    const allUnlocked = boxLevers.every(Boolean);
    const leverNames = ['मुख्य पीतल कुंडी', 'भीतरी स्प्रिंग पिन', 'सुरक्षा लॉक पिन', 'मास्टर चाबी सिटकनी'];

    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/92 text-zinc-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-zinc-950 border border-amber-700/70 rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <p className="text-xs text-amber-400 font-semibold">रसोई पहेली 3 · अंतिम बक्सा</p>
              <h2 className="font-display-hindi text-2xl text-amber-200 mt-0.5">
                मेन डोर की असली चाबी का बक्सा
              </h2>
            </div>
            <button
              type="button"
              onClick={onClosePuzzle}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-xs rounded-md cursor-pointer"
            >
              रद्द करें
            </button>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">
            अलमारी के भीतर रखे पीतल के बक्से पर चारों सुरक्षा लीवर बंद हैं। बक्सा खोलने के लिए सभी चारों लीवर चालू (हरे) करें:
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            {leverNames.map((nm, i) => {
              const on = boxLevers[i];
              return (
                <button
                  key={nm}
                  type="button"
                  onClick={() =>
                    setBoxLevers((prev) => {
                      const next: [boolean, boolean, boolean, boolean] = [...prev] as [
                        boolean,
                        boolean,
                        boolean,
                        boolean
                      ];
                      next[i] = !next[i];
                      return next;
                    })
                  }
                  className={`min-h-[56px] px-3 py-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                    on
                      ? 'bg-emerald-950/75 border-emerald-500 text-emerald-200'
                      : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
                  }`}
                >
                  <p className="text-xs font-semibold">{nm}</p>
                  <p className={`text-[11px] mt-1 ${on ? 'text-emerald-400' : 'text-red-400'}`}>
                    {on ? 'खुला (चालू)' : 'बंद (दबाएँ)'}
                  </p>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={!allUnlocked}
            onClick={() => {
              setBoxLevers([false, false, false, false]);
              onSolvePuzzle('main_door_key_box');
            }}
            className="w-full min-h-[50px] bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-zinc-950 font-bold text-base rounded-lg cursor-pointer"
          >
            {allUnlocked ? '✓ मेन डोर की असली चाबी उठाएँ' : 'पहले चारों लीवर चालू करें'}
          </button>
        </div>
      </div>
    );
  }

  if (activePuzzle === 'library_puzzle') {
    const BOOKS = [
      { id: 'b1', title: 'शाही निवाला (इतिहास)', number: '1' },
      { id: 'b2', title: '1998 की डायरी', number: '2' },
      { id: 'b3', title: 'कमरा 13 का रहस्य', number: '3' },
      { id: 'b4', title: 'अंतिम मेहमान सूची', number: '4' },
    ];
    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/92 text-zinc-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-zinc-950 border border-amber-700/70 rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <p className="text-xs text-amber-400 font-semibold">मिशन 5 · पुरानी लाइब्रेरी</p>
              <h2 className="font-display-hindi text-2xl text-amber-200 mt-0.5">किताबों का क्रम</h2>
            </div>
            <button type="button" onClick={onClosePuzzle} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-xs rounded-md cursor-pointer">
              रद्द करें
            </button>
          </div>
          <p className="text-xs text-zinc-300">
            लाइब्रेरी की पुरानी अलमारी में चारों किताबों को सही कालक्रम (1 से 4) में दबाएँ ताकि गुप्त दराज खुल सके:
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {BOOKS.map((b) => (
              <div key={b.id} className="p-3 bg-zinc-900 border border-amber-900/60 rounded-lg text-center">
                <span className="text-xs font-bold text-amber-400">किताब {b.number}</span>
                <p className="text-sm text-zinc-200 mt-1">{b.title}</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onSolvePuzzle('library_puzzle')}
            className="w-full min-h-[48px] bg-amber-700 hover:bg-amber-600 text-zinc-950 font-bold rounded-lg cursor-pointer"
          >
            किताबें सही क्रम में लगाएँ व गुप्त दराज खोलें
          </button>
        </div>
      </div>
    );
  }

  if (activePuzzle === 'secret_symbols_wall') {
    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/92 text-zinc-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-zinc-950 border border-amber-700/70 rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <p className="text-xs text-amber-400 font-semibold">मिशन 7 · गुप्त कमरा</p>
              <h2 className="font-display-hindi text-2xl text-amber-200 mt-0.5">दीवार पर तीन प्रतीक</h2>
            </div>
            <button type="button" onClick={onClosePuzzle} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-xs rounded-md cursor-pointer">
              रद्द करें
            </button>
          </div>
          <p className="text-xs text-zinc-300">
            मीरा की डायरी के अनुसार दीवार के तीनों प्रतीकों को क्रम से दबाएँ — त्रिशूल ➜ सूर्य ➜ सर्प:
          </p>
          <div className="grid grid-cols-3 gap-2.5 text-center">
            {['🔱 त्रिशूल (1)', '☀️ सूर्य (2)', '🐍 सर्प (3)'].map((sym) => (
              <div key={sym} className="p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-amber-300 text-sm font-semibold">
                {sym}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onSolvePuzzle('secret_symbols_wall')}
            className="w-full min-h-[48px] bg-amber-700 hover:bg-amber-600 text-zinc-950 font-bold rounded-lg cursor-pointer"
          >
            प्रतीक दबाएँ (बेसमेंट सीढ़ियाँ खोलें)
          </button>
        </div>
      </div>
    );
  }

  if (activePuzzle === 'godown_box') {
    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/92 text-zinc-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-zinc-950 border border-amber-700/70 rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <p className="text-xs text-amber-400 font-semibold">मिशन 10 · पुराना गोदाम</p>
              <h2 className="font-display-hindi text-2xl text-amber-200 mt-0.5">लकड़ी के बक्से का कोड</h2>
            </div>
            <button type="button" onClick={onClosePuzzle} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-xs rounded-md cursor-pointer">
              रद्द करें
            </button>
          </div>
          <p className="text-xs text-zinc-300">
            सुरंग के अंत में गोदाम में रखे बक्से पर 3 अंकों का कोड डायल करें — <span className="text-amber-300 font-bold">3 - 5 - 8</span>:
          </p>
          <div className="flex justify-center gap-4 text-3xl font-mono font-bold text-amber-400">
            <span className="p-3 bg-zinc-900 border border-zinc-700 rounded-lg">3</span>
            <span className="p-3 bg-zinc-900 border border-zinc-700 rounded-lg">5</span>
            <span className="p-3 bg-zinc-900 border border-zinc-700 rounded-lg">8</span>
          </div>
          <button
            type="button"
            onClick={() => onSolvePuzzle('godown_box')}
            className="w-full min-h-[48px] bg-amber-700 hover:bg-amber-600 text-zinc-950 font-bold rounded-lg cursor-pointer"
          >
            कोड 358 डालें व छोटी चाबी निकालें
          </button>
        </div>
      </div>
    );
  }

  if (activePuzzle === 'cabinet_lock') {
    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/92 text-zinc-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-zinc-950 border border-amber-700/70 rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <p className="text-xs text-amber-400 font-semibold">मिशन 12 · सुरक्षा कैबिनेट</p>
              <h2 className="font-display-hindi text-2xl text-amber-200 mt-0.5">मेन डोर की चाबी निकालें</h2>
            </div>
            <button type="button" onClick={onClosePuzzle} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-xs rounded-md cursor-pointer">
              रद्द करें
            </button>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            सीसीटीवी रिकॉर्डिंग में दिखाए अनुसार छोटी चाबी लगाकर कैबिनेट खोलें। अंदर सुनहरी पीतल की <span className="text-amber-300 font-semibold">मेन डोर की चाबी</span> रखी है।
          </p>
          <button
            type="button"
            onClick={() => onSolvePuzzle('cabinet_lock')}
            className="w-full min-h-[48px] bg-amber-700 hover:bg-amber-600 text-zinc-950 font-bold rounded-lg cursor-pointer"
          >
            कैबिनेट खोलें और मेन डोर की चाबी लें
          </button>
        </div>
      </div>
    );
  }

  if (activePuzzle === 'electronic_keypad') {
    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/92 text-zinc-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-zinc-950 border border-amber-700/70 rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <p className="text-xs text-amber-400 font-semibold">मिशन 13 · इलेक्ट्रॉनिक लॉक</p>
              <h2 className="font-display-hindi text-2xl text-amber-200 mt-0.5">इलेक्ट्रॉनिक कोड डालें</h2>
            </div>
            <button type="button" onClick={onClosePuzzle} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-xs rounded-md cursor-pointer">
              रद्द करें
            </button>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            तीनों दस्तावेजों से मिले नंबरों से इलेक्ट्रॉनिक लॉक का कोड पहचानें: <span className="text-amber-300 font-bold font-mono">9274</span>
          </p>
          <div className="flex justify-center gap-3 text-3xl font-mono font-bold text-amber-400">
            {['9', '2', '7', '4'].map((d, idx) => (
              <span key={idx} className="p-3 bg-zinc-900 border border-amber-700/80 rounded-lg">
                {d}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onSolvePuzzle('electronic_keypad')}
            className="w-full min-h-[48px] bg-emerald-700 hover:bg-emerald-600 text-zinc-100 font-bold rounded-lg cursor-pointer"
          >
            कोड 9274 दर्ज करें (इलेक्ट्रॉनिक लॉक निष्क्रिय)
          </button>
        </div>
      </div>
    );
  }

  if (activePuzzle === 'service_corridor_symbols') {
    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/92 text-zinc-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-zinc-950 border border-amber-700/70 rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <p className="text-xs text-amber-400 font-semibold">मिशन 15 · दूसरा गुप्त रास्ता</p>
              <h2 className="font-display-hindi text-2xl text-amber-200 mt-0.5">सर्विस कॉरिडोर (4 प्रतीक)</h2>
            </div>
            <button type="button" onClick={onClosePuzzle} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-xs rounded-md cursor-pointer">
              रद्द करें
            </button>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            सुरंग के भारी लोहे के दरवाजे पर चार प्रतीक अंकित हैं — चक्र, पद्म, शंख और गदा:
          </p>
          <div className="grid grid-cols-2 gap-2.5 text-center text-xs">
            <div className="p-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-amber-300">☸️ सुदर्शन चक्र</div>
            <div className="p-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-amber-300">🪷 श्वेत पद्म</div>
            <div className="p-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-amber-300">🐚 दक्षिणावर्ती शंख</div>
            <div className="p-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-amber-300">⚡ कौमोदकी गदा</div>
          </div>
          <button
            type="button"
            onClick={() => onSolvePuzzle('service_corridor_symbols')}
            className="w-full min-h-[48px] bg-amber-700 hover:bg-amber-600 text-zinc-950 font-bold rounded-lg cursor-pointer"
          >
            चारों प्रतीक मिलाकर भारी दरवाजा खोलें
          </button>
        </div>
      </div>
    );
  }

  if (activePuzzle === 'alarm_computer') {
    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/92 text-zinc-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-zinc-950 border border-red-700/70 rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <p className="text-xs text-red-400 font-semibold">मिशन 18 · अलार्म कंट्रोल रूम</p>
              <h2 className="font-display-hindi text-2xl text-red-300 mt-0.5">इमरजेंसी अलार्म सक्रिय करें</h2>
            </div>
            <button type="button" onClick={onClosePuzzle} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-xs rounded-md cursor-pointer">
              रद्द करें
            </button>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            कंट्रोल रूम के पुराने कंप्यूटर में पासवर्ड <span className="font-mono text-red-400 font-bold">SHAHI1998</span> डालें ताकि लाल इमरजेंसी लाइटें व अलार्म चालू हो जाएँ:
          </p>
          <div className="p-3 bg-black border border-red-800 rounded font-mono text-sm text-red-400 text-center">
            PASSWORD: [ SHAHI1998 ] · SYSTEM READY
          </div>
          <button
            type="button"
            onClick={() => onSolvePuzzle('alarm_computer')}
            className="w-full min-h-[48px] bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg cursor-pointer"
          >
            अलार्म सिस्टम चालू करें (लाल इमरजेंसी लाइटें)
          </button>
        </div>
      </div>
    );
  }

  if (activePuzzle === 'manager_drawer') {
    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/92 text-zinc-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-zinc-950 border border-amber-700/70 rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <p className="text-xs text-amber-400 font-semibold">मिशन 19 · पुराने मैनेजर का कमरा</p>
              <h2 className="font-display-hindi text-2xl text-amber-200 mt-0.5">गुप्त दराज की पहेली</h2>
            </div>
            <button type="button" onClick={onClosePuzzle} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-xs rounded-md cursor-pointer">
              रद्द करें
            </button>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            मैनेजर की नक्काशीदार लकड़ी की मेज के गुप्त खांचे में छुपी इमरजेंसी निकास की मुख्य मास्टर चाबी निकालें:
          </p>
          <button
            type="button"
            onClick={() => onSolvePuzzle('manager_drawer')}
            className="w-full min-h-[48px] bg-amber-700 hover:bg-amber-600 text-zinc-950 font-bold rounded-lg cursor-pointer"
          >
            दराज खोलें व इमरजेंसी निकास की मुख्य चाबी लें
          </button>
        </div>
      </div>
    );
  }

  if (activePuzzle === 'escape_prep_modal') {
    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/92 text-zinc-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-zinc-950 border border-amber-700/70 rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <p className="text-xs text-amber-400 font-semibold">मिशन 20 · अंतिम तैयारी</p>
              <h2 className="font-display-hindi text-2xl text-amber-200 mt-0.5">Escape रास्ते का चुनाव</h2>
            </div>
            <button type="button" onClick={onClosePuzzle} className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-xs rounded-md cursor-pointer">
              रद्द करें
            </button>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">
            आपके थैले में आवश्यक चाबियाँ मौजूद हैं। आप मुख्य दरवाजे या आपातकालीन निकास से भाग सकते हैं:
          </p>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onSolvePuzzle('escape_prep_modal', 'main_door')}
              className="w-full p-3 bg-amber-900/40 hover:bg-amber-900/70 border border-amber-600 text-left rounded-lg cursor-pointer"
            >
              <p className="text-sm font-bold text-amber-200">1. मुख्य प्रवेश द्वार (Main Door Escape)</p>
              <p className="text-xs text-zinc-300 mt-0.5">मेन डोर की असली चाबी व इलेक्ट्रॉनिक कोड तैयार है</p>
            </button>
            <button
              type="button"
              onClick={() => onSolvePuzzle('escape_prep_modal', 'emergency_exit')}
              className="w-full p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-left rounded-lg cursor-pointer"
            >
              <p className="text-sm font-bold text-zinc-200">2. आपातकालीन निकास (Emergency Exit)</p>
              <p className="text-xs text-zinc-400 mt-0.5">मास्टर चाबी व अलार्म सिस्टम चालू है</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activePuzzle === 'car_start') {
    return (
      <div className="fixed inset-0 z-40 bg-zinc-950/92 text-zinc-100 flex items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-zinc-950 border border-emerald-700/70 rounded-xl p-6 space-y-5 text-center">
          <h2 className="font-display-hindi text-3xl text-emerald-400">आरव की कार स्टार्ट करें</h2>
          <p className="text-sm text-zinc-300 leading-relaxed">
            आप रेस्टोरेंट से बाहर सड़क पर आ चुके हैं! कार की चाबी घुमाएँ और पूरी ताकत से इंजन स्टार्ट करें!
          </p>
          <div className="p-3 bg-zinc-900 border border-zinc-700 rounded text-xs text-amber-300">
            कार बैटरी: चालू · ईंधन: पर्याप्त · इग्निशन: तैयार
          </div>
          <button
            type="button"
            onClick={() => onSolvePuzzle('car_start')}
            className="w-full min-h-[52px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base rounded-lg cursor-pointer"
          >
            🚗 कार स्टार्ट करें व भागें!
          </button>
        </div>
      </div>
    );
  }

  return null;
};

