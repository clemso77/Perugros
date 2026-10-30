import io from 'socket.io-client';

const ID_KEY = 'perugrosPlayerId';
const NAME_KEY = 'perugrosNom';
const COLOR_KEY = 'perugrosCouleur';
const ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

// localStorage / sessionStorage peuvent être indisponibles (navigation privée Safari, etc.)
function makeStorage(getStore) {
    return {
        get(key) {
            try {
                return getStore().getItem(key);
            } catch {
                return null;
            }
        },
        set(key, value) {
            try {
                if (value == null) getStore().removeItem(key);
                else getStore().setItem(key, value);
            } catch {
                // ignoré
            }
        }
    };
}

// localStorage : partagé par tous les onglets, survit à la fermeture de l'app
const device = makeStorage(() => window.localStorage);
// sessionStorage : propre à l'onglet, survit au rechargement de la page
const tab = makeStorage(() => window.sessionStorage);

function randomId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    // randomUUID n'existe pas hors HTTPS (ex : test sur l'IP locale depuis un téléphone)
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

// Chaque onglet ouvert répond s'il utilise déjà un identifiant donné
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('perugros') : null;
let playerId = null;
let playerName = null;

channel?.addEventListener('message', ({ data }) => {
    if (data?.type === 'who' && playerId && data.id === playerId) {
        channel.postMessage({ type: 'mine', id: data.id });
    }
});

function isUsedByAnotherTab(id) {
    if (!channel) return Promise.resolve(false);
    return new Promise(resolve => {
        const onMessage = ({ data }) => {
            if (data?.type === 'mine' && data.id === id) finish(true);
        };
        const finish = (used) => {
            channel.removeEventListener('message', onMessage);
            clearTimeout(timer);
            resolve(used);
        };
        const timer = setTimeout(() => finish(false), 200);
        channel.addEventListener('message', onMessage);
        channel.postMessage({ type: 'who', id });
    });
}

/**
 * Détermine l'identité de cet onglet.
 * - même onglet rechargé, ou app rouverte : on reprend l'identifiant sauvegardé (reconnexion)
 * - second onglet ouvert en parallèle : nouvel identifiant, donc un joueur distinct
 *   (sinon les deux onglets se volent la connexion et le chef n'est plus notifié)
 */
async function resolveIdentity() {
    const tabId = tab.get(ID_KEY);
    const deviceId = device.get(ID_KEY);
    let id = ID_PATTERN.test(tabId || '') ? tabId : deviceId;
    let nom = tab.get(NAME_KEY) || (id && id === deviceId ? device.get(NAME_KEY) : null);

    if (!ID_PATTERN.test(id || '') || await isUsedByAnotherTab(id)) {
        id = randomId();
        nom = null;
    }
    playerId = id;
    playerName = nom;
    tab.set(ID_KEY, id);
    device.set(ID_KEY, id);
    return { hasName: !!nom };
}

export function rememberPlayer({ playerId: id, nom, color }) {
    if (id) {
        playerId = id;
        tab.set(ID_KEY, id);
        device.set(ID_KEY, id);
    }
    if (nom) {
        playerName = nom;
        tab.set(NAME_KEY, nom);
        device.set(NAME_KEY, nom);
    }
    if (color) device.set(COLOR_KEY, color);
}

/** Le serveur n'a pas pu nous reconnecter : le nom mémorisé est oublié et redemandé. */
export function forgetName() {
    playerName = null;
    tab.set(NAME_KEY, null);
    device.set(NAME_KEY, null);
}

export function rememberColor(color) {
    device.set(COLOR_KEY, color);
}

export function getRememberedColor() {
    return device.get(COLOR_KEY);
}

export const socket = io({
    withCredentials: true,
    // Fonction : réévaluée à chaque tentative de (re)connexion
    auth: (cb) => cb({
        playerId,
        nom: playerName,
        couleur: device.get(COLOR_KEY)
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

let identity = null;

/** Résout l'identité de l'onglet puis se connecte. Renvoie { hasName }. */
export function startSocket() {
    if (!identity) {
        identity = resolveIdentity();
    }
    return identity.then((result) => {
        if (!socket.connected) socket.connect();
        return result;
    });
}

// Au retour au premier plan (app mobile en arrière-plan, écran verrouillé, réseau
// revenu), on se reconnecte immédiatement au lieu d'attendre le prochain essai.
function reconnectNow() {
    if (document.visibilityState === 'visible' && identity && !socket.connected) {
        identity.then(() => socket.connect());
    }
}
document.addEventListener('visibilitychange', reconnectNow);
window.addEventListener('pageshow', reconnectNow);
window.addEventListener('online', reconnectNow);
window.addEventListener('focus', reconnectNow);
