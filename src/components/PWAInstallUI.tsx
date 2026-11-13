import React, { useState } from 'react';
import { CheckCircle2, Download, Share, Smartphone, WifiOff } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

/**
 * Shown on the published website when opened inside a mobile/desktop browser
 * instead of the installed standalone mobile app.
 */
export const MobileInstallGate: React.FC = () => {
  const { isInstallable, justInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showManualSteps, setShowManualSteps] = useState(false);

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowManualSteps(true);
      }
      return;
    }
    setShowManualSteps(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto hindi-scroll select-none">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 25%, rgba(127, 29, 29, 0.32) 0%, rgba(12, 10, 12, 0.92) 55%, #000000 100%)',
        }}
      />

      <div className="relative z-10 max-w-md w-full bg-zinc-950/95 border border-red-900/70 rounded-2xl p-6 shadow-2xl text-center">
        <img
          src="/pwa-192x192.png"
          alt="आखिरी निवाला"
          className="w-20 h-20 rounded-2xl mx-auto border border-amber-600/60 shadow-lg"
        />

        <p className="mt-3 text-xs font-semibold text-amber-400 tracking-wide">
          शाही निवाला · 3D भारतीय हॉरर गेम
        </p>
        <h1 className="font-display-hindi text-3xl sm:text-4xl text-zinc-50 mt-1">
          आखिरी निवाला
        </h1>

        <div className="mt-4 bg-red-950/45 border border-red-800/70 rounded-xl px-4 py-3 text-xs sm:text-sm text-red-100 leading-relaxed">
          <div className="flex items-center justify-center gap-2 font-semibold text-red-300 mb-1">
            <Smartphone className="w-4 h-4 shrink-0" />
            <span>वेबसाइट पर गेम नहीं खेला जा सकता</span>
          </div>
          <p className="text-zinc-300 text-xs leading-relaxed">
            इस गेम को खेलने के लिए आपको इसे अपने मोबाइल में डाउनलोड और इंस्टॉल करना होगा। इंस्टॉल करने के बाद होम स्क्रीन से ऐप खोलकर खेलें।
          </p>
        </div>

        {justInstalled ? (
          <div className="mt-5 bg-emerald-950/60 border border-emerald-700/80 rounded-xl p-4 text-emerald-100 text-sm">
            <div className="flex items-center justify-center gap-2 font-bold text-emerald-300 mb-1">
              <CheckCircle2 className="w-5 h-5" />
              <span>गेम डाउनलोड / इंस्टॉल हो गया!</span>
            </div>
            <p className="text-xs text-emerald-200/90 leading-relaxed">
              अब इस ब्राउज़र को बंद करें और अपने मोबाइल की होम स्क्रीन पर बने <strong>“आखिरी निवाला”</strong> आइकन को दबाकर गेम शुरू करें।
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full min-h-[52px] px-5 py-3 bg-red-800 hover:bg-red-700 border border-red-500/70 text-white font-bold text-sm sm:text-base rounded-xl shadow-lg flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
            >
              <Download className="w-5 h-5 shrink-0" />
              <span>मोबाइल में गेम डाउनलोड व इंस्टॉल करें</span>
            </button>

            {(showManualSteps || !isInstallable) && (
              <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 text-left text-xs text-zinc-300 space-y-2 leading-relaxed">
                {isIOS ? (
                  <>
                    <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                      <Share className="w-3.5 h-3.5" />
                      <span>iPhone / iPad में इंस्टॉल करने का तरीका:</span>
                    </p>
                    <p>1. नीचे Safari बार में <strong>Share (↑)</strong> बटन दबाएँ।</p>
                    <p>2. नीचे स्क्रॉल करके <strong>“Add to Home Screen”</strong> चुनें।</p>
                    <p>3. होम स्क्रीन से <strong>आखिरीनिवाला</strong> ऐप खोलें।</p>
                  </>
                ) : isAndroid ? (
                  <>
                    <p className="font-semibold text-amber-300">
                      Android मोबाइल में इंस्टॉल करने का तरीका:
                    </p>
                    <p>1. यदि ऊपर बटन से पॉप-अप न आए, तो ब्राउज़र के ऊपर दाईं ओर <strong>⋮ (तीन बिंदु)</strong> दबाएँ।</p>
                    <p>2. <strong>“ऐप इंस्टॉल करें” (Install app)</strong> या <strong>“Add to Home screen”</strong> चुनें।</p>
                    <p>3. इंस्टॉल पूरा होने पर होम स्क्रीन से गेम खोलें।</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-amber-300">
                      मोबाइल में इंस्टॉल करें:
                    </p>
                    <p>यह गेम केवल इंस्टॉल किए गए मोबाइल ऐप के रूप में चलता है। इस लिंक को अपने फोन के Chrome या Safari में खोलें और <strong>“ऐप इंस्टॉल करें / Add to Home Screen”</strong> चुनें।</p>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="w-full min-h-[48px] px-5 py-3 bg-amber-700 hover:bg-amber-600 border border-amber-500 text-zinc-950 font-bold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>मोबाइल ऐप डाउनलोड / इंस्टॉल करें</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="w-full min-h-[46px] px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-amber-700/60 text-amber-200 font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>iPhone में गेम इंस्टॉल करें</span>
        </button>

        {showGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <div className="w-full max-w-sm rounded-xl bg-zinc-950 border border-zinc-800 p-5 shadow-2xl text-left">
              <h3 className="text-base font-bold text-amber-200">iPhone / iPad पर इंस्टॉल करें</h3>
              <p className="mt-2 text-xs text-zinc-300 leading-relaxed">
                1. Safari के नीचे <strong>Share</strong> बटन दबाएँ।<br />
                2. नीचे स्क्रॉल कर <strong>Add to Home Screen</strong> चुनें।
              </p>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="mt-4 w-full min-h-[42px] rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-medium cursor-pointer"
              >
                बंद करें
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-3 left-3 z-50 flex items-center gap-2 rounded-lg bg-amber-600/95 border border-amber-400/70 px-3 py-1.5 text-xs font-semibold text-zinc-950 shadow-lg pointer-events-none">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>ऑफ़लाइन मोड — सेव डेटा सुरक्षित है</span>
    </div>
  );
};
