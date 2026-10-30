/**
 * Sons (générés avec Web Audio, aucun fichier à charger) et vibrations.
 * Le choix « son coupé » est mémorisé sur l'appareil.
 */
const MUTE_KEY = 'perugrosMuted';

let ctx = null;
let muted = (() => {
    try {
        return localStorage.getItem(MUTE_KEY) === '1';
    } catch {
        return false;
    }
})();

export function isMuted() {
    return muted;
}

export function setMuted(value) {
    muted = value;
    try {
        localStorage.setItem(MUTE_KEY, value ? '1' : '0');
    } catch {
        // ignoré
    }
}

// iOS n'autorise l'audio qu'après une interaction : on débloque au premier toucher
function unlock() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!ctx) ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
}
['touchstart', 'pointerdown', 'keydown'].forEach(evt =>
    window.addEventListener(evt, unlock, { passive: true })
);

function tone(freq, start, duration, { type = 'sine', volume = 0.18, slideTo } = {}) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t0 = ctx.currentTime + start;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
}

const SOUNDS = {
    turn: () => { tone(660, 0, 0.15); tone(880, 0.13, 0.22); },
    liar: () => { tone(220, 0, 0.35, { type: 'sawtooth', volume: 0.12, slideTo: 110 }); tone(165, 0.3, 0.5, { type: 'sawtooth', volume: 0.12, slideTo: 80 }); },
    calza: () => { tone(523, 0, 0.18, { type: 'triangle' }); tone(659, 0.15, 0.18, { type: 'triangle' }); tone(784, 0.3, 0.3, { type: 'triangle' }); },
    tick: () => tone(1200, 0, 0.06, { type: 'square', volume: 0.06 }),
    success: () => { tone(523, 0, 0.15); tone(784, 0.12, 0.3); },
    fail: () => { tone(330, 0, 0.2, { type: 'triangle' }); tone(247, 0.18, 0.4, { type: 'triangle' }); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.14, 0.3, { type: 'triangle' })),
    lose: () => [392, 330, 262].forEach((f, i) => tone(f, i * 0.2, 0.35, { type: 'triangle' }))
};

const VIBRATIONS = {
    turn: [120, 60, 120],
    liar: [300],
    calza: [80, 40, 80, 40, 80],
    tick: [15],
    success: [60],
    fail: [200],
    win: [100, 50, 100, 50, 300],
    lose: [400]
};

/** Joue le son et la vibration associés à un évènement du jeu. */
export function feedback(name) {
    if (muted) return;
    try {
        if (ctx && ctx.state === 'running') SOUNDS[name]?.();
    } catch {
        // ignoré
    }
    // Android uniquement (iOS ne supporte pas l'API Vibration)
    navigator.vibrate?.(VIBRATIONS[name] || 0);
}
