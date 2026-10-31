/** Installation de l'app sur l'écran d'accueil. */
let deferredPrompt = null;
const listeners = new Set();

// Chrome / Android : l'évènement arrive tôt, on le garde pour proposer l'installation plus tard
window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    listeners.forEach(fn => fn());
});
window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach(fn => fn());
});

export function onInstallAvailabilityChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

// Le manifeste demande le plein écran (repli : standalone) : l'app installée peut tourner dans l'un ou l'autre
const APP_DISPLAY_MODES = ['fullscreen', 'standalone', 'minimal-ui'];

export function isStandalone() {
    return window.navigator.standalone === true
        || APP_DISPLAY_MODES.some(mode => window.matchMedia?.(`(display-mode: ${mode})`).matches);
}

export function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function canPromptInstall() {
    return !!deferredPrompt;
}

export async function promptInstall() {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return outcome === 'accepted';
}
