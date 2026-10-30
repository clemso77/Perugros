const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

const KEY_FILE = path.join(__dirname, '.vapid.json');

// Clés VAPID : variables d'environnement en priorité, sinon générées une fois et gardées
// dans .vapid.json (les changer invaliderait tous les abonnements existants).
function loadKeys() {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
    }
    try {
        return JSON.parse(fs.readFileSync(KEY_FILE, 'utf8'));
    } catch {
        const keys = webpush.generateVAPIDKeys();
        try {
            fs.writeFileSync(KEY_FILE, JSON.stringify(keys, null, 2));
        } catch (err) {
            console.warn('Impossible de sauvegarder les clés VAPID :', err.message);
        }
        return keys;
    }
}

const keys = loadKeys();
webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@perugros.app', keys.publicKey, keys.privateKey);

function isValidSubscription(sub) {
    return typeof sub?.endpoint === 'string' && /^https:\/\//.test(sub.endpoint)
        && typeof sub.keys?.p256dh === 'string' && typeof sub.keys?.auth === 'string';
}

/** Envoie une notification au téléphone du joueur s'il s'y est abonné. */
async function sendPush(player, payload) {
    if (!player.pushSubscription) return;
    try {
        await webpush.sendNotification(player.pushSubscription, JSON.stringify(payload), { TTL: 120, urgency: 'high' });
    } catch (err) {
        // Abonnement expiré ou révoqué : on l'oublie
        if (err.statusCode === 404 || err.statusCode === 410) {
            player.pushSubscription = null;
        } else {
            console.warn('Échec de la notification push :', err.statusCode || err.message);
        }
    }
}

module.exports = { publicKey: keys.publicKey, sendPush, isValidSubscription };
