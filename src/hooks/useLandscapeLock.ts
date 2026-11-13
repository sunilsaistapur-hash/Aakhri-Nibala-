import { useEffect, useState } from 'react';

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: 'landscape' | 'landscape-primary') => Promise<void>;
};

function isCurrentlyPortrait(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerHeight > window.innerWidth;
}

async function tryLockHardwareLandscape(): Promise<void> {
  if (typeof screen === 'undefined' || !screen.orientation) return;
  const orientation = screen.orientation as LockableScreenOrientation;
  if (typeof orientation.lock !== 'function') return;
  try {
    await orientation.lock('landscape');
  } catch {
    try {
      await orientation.lock('landscape-primary');
    } catch {
      // Browser/iframe disallows hardware orientation lock; CSS 90deg landscape lock handles it seamlessly
    }
  }
}

export function useLandscapeLock() {
  const [isPortraitViewport, setIsPortraitViewport] = useState<boolean>(() => isCurrentlyPortrait());

  useEffect(() => {
    const syncViewport = () => {
      setIsPortraitViewport(isCurrentlyPortrait());
    };

    const handleUserGesture = () => {
      void tryLockHardwareLandscape();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void tryLockHardwareLandscape();
        syncViewport();
      }
    };

    syncViewport();
    void tryLockHardwareLandscape();

    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', syncViewport);
    window.visualViewport?.addEventListener('resize', syncViewport);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pointerdown', handleUserGesture, { passive: true });
    window.addEventListener('keydown', handleUserGesture, { passive: true });

    return () => {
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('orientationchange', syncViewport);
      window.visualViewport?.removeEventListener('resize', syncViewport);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pointerdown', handleUserGesture);
      window.removeEventListener('keydown', handleUserGesture);
    };
  }, []);

  return { isPortraitViewport };
}
