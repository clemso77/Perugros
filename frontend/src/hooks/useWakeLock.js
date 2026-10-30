import { useEffect } from 'react';

/** Empêche l'écran de se mettre en veille tant que `active` est vrai (pendant une partie). */
export default function useWakeLock(active) {
    useEffect(() => {
        if (!active || !('wakeLock' in navigator)) return;
        let lock = null;
        let cancelled = false;

        const acquire = async () => {
            if (document.visibilityState !== 'visible' || lock) return;
            try {
                lock = await navigator.wakeLock.request('screen');
                lock.addEventListener('release', () => { lock = null; });
                if (cancelled) lock.release();
            } catch {
                // refusé (batterie faible, etc.) : rien de grave
            }
        };
        // Le verrou est relâché automatiquement quand l'app passe en arrière-plan
        const onVisibility = () => acquire();

        acquire();
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', onVisibility);
            lock?.release();
        };
    }, [active]);
}
