import io from 'socket.io-client';

const ID_KEY = 'perugrosPlayerId';
const NAME_KEY = 'perugrosNom';
const COLOR_KEY = 'perugrosCouleur';

// localStorage peut être indisponible (navigation privée Safari, etc.)
const storage = {
    get(key) {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    },
    set(key, value) {
        try {
            if (value == null) localStorage.removeItem(key);
            else localStorage.setItem(key, value);
        } catch {
            // ignoré
        }
    }
};

function randomId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    // randomUUID n'existe pas hors HTTPS (ex : test sur l'IP locale depuis un téléphone)
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Identifiant du joueur, généré une fois et conservé sur l'appareil.
 * C'est lui qui permet au serveur de retrouver le joueur à chaque reconnexion.
 */
export function getPlayerId() {
    let id = storage.get(ID_KEY);
    if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
        id = randomId();
        storage.set(ID_KEY, id);
    }
    return id;
}

export function rememberPlayer({ playerId, nom, color }) {
    if (playerId) storage.set(ID_KEY, playerId);
    if (nom) storage.set(NAME_KEY, nom);
    if (color) storage.set(COLOR_KEY, color);
}

export function rememberColor(color) {
    storage.set(COLOR_KEY, color);
}

export function getRememberedColor() {
    return storage.get(COLOR_KEY);
}

export const socket = io({
    withCredentials: true,
    // Fonction : réévaluée à chaque tentative de (re)connexion
    auth: (cb) => cb({
        playerId: getPlayerId(),
        nom: storage.get(NAME_KEY),
        couleur: storage.get(COLOR_KEY)
    }),
    reconnectionDelayMax: 3000,
    // Connexion lancée par App une fois ses écouteurs en place, pour ne rater
    // ni loggedIn ni syncState envoyés dès la connexion
    autoConnect: false
});

// Les actions émises hors-ligne ne sont pas rejouées à la reconnexion :
// le serveur renvoie l'état à jour (syncState) et les dés à relancer (requestDice).
socket.on('connect', () => {
    socket.sendBuffer = [];
});

let started = false;

export function startSocket() {
    started = true;
    if (!socket.connected) socket.connect();
}

// Au retour au premier plan (app mobile en arrière-plan, écran verrouillé, réseau
// revenu), on se reconnecte immédiatement au lieu d'attendre le prochain essai.
function reconnectNow() {
    if (document.visibilityState === 'visible' && started && !socket.connected) {
        socket.connect();
    }
}
document.addEventListener('visibilitychange', reconnectNow);
window.addEventListener('pageshow', reconnectNow);
window.addEventListener('online', reconnectNow);
window.addEventListener('focus', reconnectNow);
