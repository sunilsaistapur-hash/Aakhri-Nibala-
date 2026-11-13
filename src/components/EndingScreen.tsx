import React, { useEffect, useState } from 'react';

interface EndingScreenProps {
  playTimeSeconds: number;
  onReturnToMenu: () => void;
}

function formatHindiTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins} मिनट ${secs} सेकंड`;
}

export const EndingScreen: React.FC<EndingScreenProps> = ({
  playTimeSeconds,
  onReturnToMenu,
}) => {
  const [fadeToBlack, setFadeToBlack] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFadeToBlack(true);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, []);

  if (!fadeToBlack) {
    return (
      <div className="fixed inset-0 z-40 pointer-events-none flex flex-col justify-between p-5 sm:p-8 select-none">
        {/* Top subtle dawn observation cue */}
        <div className="max-w-lg mx-auto w-full bg-zinc-950/90 border border-amber-700/40 rounded-lg px-4 py-3 text-center">
          <p className="text-xs text-amber-300/90">सुबह की पहली रोशनी · चौथी मंजिल की ऊपरी खिड़की</p>
          <p className="text-sm text-zinc-100 mt-1">
            बारिश रुक चुकी है... पर ऊपर खिड़की में कविता खड़ी धीरे-धीरे मुस्कुरा रही है।
          </p>
        </div>

        {/* Bottom mobile phone incoming SMS notification */}
        <div className="max-w-sm w-full mx-auto bg-zinc-950 border border-zinc-700 rounded-xl p-4 shadow-2xl">
          <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-zinc-800 pb-2 mb-2.5">
            <span>आरव का मोबाइल फोन</span>
            <span className="text-amber-400">नया संदेश · अभी</span>
          </div>
          <p className="text-xs text-zinc-400 mb-1">प्रेषक: अज्ञात नंबर</p>
          <p className="text-lg font-bold text-red-400 leading-snug">
            “आपका अगला खाना तैयार है...”
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black text-zinc-100 flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-lg w-full space-y-6">
        <h1 className="font-display-hindi text-5xl sm:text-6xl text-red-500 tracking-wide">
          आखिरी निवाला
        </h1>

        <div className="space-y-3 py-4 border-y border-zinc-900">
          <p className="text-xl sm:text-2xl font-medium text-zinc-100">
            आप रेस्टोरेंट से बच निकले।
          </p>
          <p className="text-base sm:text-lg text-amber-200/90">
            लेकिन क्या आप सच में अकेले बाहर आए हैं?
          </p>
          <p className="font-display-hindi text-3xl text-zinc-300 pt-2">
            समाप्त।
          </p>
        </div>

        <div className="text-sm text-zinc-400 tabular-nums">
          <span>कुल समय: {formatHindiTime(playTimeSeconds)}</span>
          <span className="mx-2" aria-hidden="true">·</span>
          <span>सभी 26 मिशन पूर्ण</span>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onReturnToMenu}
            className="min-h-[48px] px-7 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 font-semibold text-base rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            मुख्य मेन्यू पर लौटें
          </button>
        </div>
      </div>
    </div>
  );
};
