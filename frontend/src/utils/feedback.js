/**
 * Sons (synthétisés avec Web Audio, aucun fichier à charger) et vibrations.
 * Le choix « son coupé » est mémorisé sur l'appareil.
 *
 * Mobile :
 * - iOS / Android n'autorisent l'audio qu'après un geste de l'utilisateur. Le contexte audio
 *   est créé et réveillé à chaque toucher (touchend / click : touchstart ne suffit pas sur iOS).
 * - iOS suspend l'audio quand l'app passe en arrière-plan : on le relance au retour.
 * - Sur iPhone, le mode silencieux coupe ces sons.
 */
const MUTE_KEY = 'perugrosMuted';

let ctx = null;
let master = null;
let noiseBuffer = null;
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

function createContext() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    const context = new AudioCtx();
    // Chaîne de sortie : volume général + compresseur pour un son plein sans saturer
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 4;
    master = context.createGain();
    master.gain.value = 0.9;
    master.connect(compressor).connect(context.destination);

    // Bruit blanc réutilisé pour les chocs de dés
    noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return context;
}

/** À appeler pendant un geste utilisateur : crée et réveille le contexte audio. */
export function unlockAudio() {
    try {
        if (!ctx) ctx = createContext();
        if (!ctx) return;
        if (ctx.state !== 'running') ctx.resume();
        // Un son vide joué pendant le geste finit de débloquer l'audio sur les anciens iOS
        const source = ctx.createBufferSource();
        source.buffer = ctx.createBuffer(1, 1, 22050);
        source.connect(ctx.destination);
        source.start(0);
    } catch {
        // ignoré
    }
}

['touchend', 'click', 'keydown'].forEach(evt =>
    window.addEventListener(evt, unlockAudio, { passive: true, capture: true })
);
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ctx && ctx.state !== 'running') {
        ctx.resume().catch(() => {});
    }
});

/* ── Briques sonores ── */

function voice({ freq, start = 0, duration = 0.3, type = 'sine', gain = 0.25, attack = 0.005, slideTo, filter }) {
    const t0 = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    let node = osc;
    if (filter) {
        const f = ctx.createBiquadFilter();
        f.type = filter.type || 'lowpass';
        f.frequency.value = filter.freq;
        f.Q.value = filter.Q ?? 1;
        node = node.connect(f);
    }
    node.connect(amp).connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
}

function noise({ start = 0, duration = 0.05, gain = 0.3, type = 'bandpass', freq = 2500, Q = 2 }) {
    const t0 = ctx.currentTime + start;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = Q;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(f).connect(amp).connect(master);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + duration + 0.02);
}

// Note de marimba / cloche : fondamentale + harmonique aiguë qui s'éteint vite
function bell(freq, start, duration = 0.5, gain = 0.22) {
    voice({ freq, start, duration, gain, attack: 0.004 });
    voice({ freq: freq * 4, start, duration: duration * 0.25, gain: gain * 0.35, attack: 0.002 });
    voice({ freq: freq * 2.01, start, duration: duration * 0.5, gain: gain * 0.2, attack: 0.003 });
}

// Choc d'un dé sur la table
function clack(start, pitch = 1, gain = 0.35) {
    noise({ start, duration: 0.035, gain, freq: 2600 * pitch, Q: 3 });
    voice({ freq: 700 * pitch * (0.9 + Math.random() * 0.2), start, duration: 0.06, type: 'triangle', gain: gain * 0.5, attack: 0.001 });
}

const SOUNDS = {
    // Lancer : cliquetis des dés qui roulent puis se posent
    roll: () => {
        let t = 0;
        for (let i = 0; i < 12; i++) {
            clack(t, 0.8 + Math.random() * 0.5, 0.25 + Math.random() * 0.15);
            t += 0.03 + Math.random() * 0.06 + i * 0.008;
        }
        voice({ freq: 140, start: t, duration: 0.12, gain: 0.3, slideTo: 90 });
        voice({ freq: 120, start: t + 0.09, duration: 0.1, gain: 0.2, slideTo: 80 });
    },
    // Son de dé révélé : de plus en plus aigu à chaque dé compté
    tick: ({ step = 1 } = {}) => {
        const pitch = Math.min(1 + (step - 1) * 0.08, 2);
        clack(0, pitch, 0.4);
        bell(523 * pitch, 0.01, 0.25, 0.12);
    },
    // Quelqu'un vient de parier
    bet: () => {
        voice({ freq: 620, duration: 0.09, gain: 0.18, slideTo: 380 });
        clack(0.02, 1, 0.2);
    },
    // À vous de jouer
    turn: () => {
        bell(784, 0, 0.45);
        bell(1047, 0.13, 0.6);
    },
    // Joueur qui rejoint le salon
    join: () => {
        bell(659, 0, 0.25, 0.14);
        bell(880, 0.08, 0.35, 0.14);
    },
    // « Menteur ! » : coup sourd + accord dissonant
    liar: () => {
        voice({ freq: 95, duration: 0.7, gain: 0.6, slideTo: 40, attack: 0.002 });
        noise({ duration: 0.4, gain: 0.25, type: 'lowpass', freq: 600, Q: 0.7 });
        [220, 233, 330].forEach(f =>
            voice({ freq: f, start: 0.05, duration: 0.8, type: 'sawtooth', gain: 0.09, attack: 0.02, filter: { freq: 1400 } })
        );
    },
    // « Calza ! » : arpège brillant
    calza: () => {
        [523, 659, 784, 1047, 1319].forEach((f, i) => bell(f, i * 0.07, 0.5, 0.16));
    },
    success: () => {
        bell(659, 0, 0.4);
        bell(988, 0.12, 0.7);
    },
    fail: () => {
        [[392, 370], [349, 330], [311, 220]].forEach(([from, to], i) =>
            voice({ freq: from, slideTo: to, start: i * 0.28, duration: i === 2 ? 0.7 : 0.26, type: 'sawtooth', gain: 0.12, attack: 0.02, filter: { freq: 900 } })
        );
    },
    win: () => {
        [523, 659, 784, 1047].forEach((f, i) => bell(f, i * 0.12, 0.4, 0.18));
        [523, 659, 784, 1047].forEach(f => bell(f, 0.55, 1.4, 0.1));
        for (let i = 0; i < 6; i++) bell(1568 + Math.random() * 800, 0.6 + i * 0.09, 0.3, 0.05);
    },
    lose: () => {
        [440, 349, 294, 220].forEach((f, i) =>
            voice({ freq: f, start: i * 0.3, duration: i === 3 ? 1.2 : 0.35, type: 'triangle', gain: 0.22, attack: 0.02 })
        );
    }
};

const VIBRATIONS = {
    roll: [30, 30, 30],
    turn: [120, 60, 120],
    liar: [300],
    calza: [80, 40, 80, 40, 80],
    tick: [15],
    bet: [10],
    join: [20],
    success: [60],
    fail: [200],
    win: [100, 50, 100, 50, 300],
    lose: [400]
};

/** Joue le son et la vibration associés à un évènement du jeu. */
export function feedback(name, options) {
    if (muted) return;
    try {
        if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {});
        if (ctx) SOUNDS[name]?.(options);
    } catch {
        // ignoré
    }
    // Android uniquement (iOS ne supporte pas l'API Vibration)
    try {
        navigator.vibrate?.(VIBRATIONS[name] || 0);
    } catch {
        // ignoré
    }
}
