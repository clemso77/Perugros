/** Notifications push « c'est votre tour » (Android, et iOS 16.4+ une fois l'app installée). */

export function pushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function pushPermission() {
    return pushSupported() ? Notification.permission : 'unsupported';
}

function urlBase64ToUint8Array(base64) {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, c => c.charCodeAt(0));
}

/** Demande l'autorisation et abonne l'appareil. À appeler depuis un clic. */
export async function enablePush(socket) {
    if (!pushSupported()) throw new Error('unsupported');
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error(permission);
    const registration = await navigator.serviceWorker.ready;
    const { publicKey } = await (await fetch('/push/key')).json();
    // On repart d'un abonnement neuf, au cas où la clé du serveur aurait changé
    const existing = await registration.pushManager.getSubscription();
    if (existing) await existing.unsubscribe();
    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
    socket.emit('pushSubscribe', subscription.toJSON());
}

/** Renvoie l'abonnement existant au serveur (qui l'oublie s'il redémarre). */
export async function resendPushSubscription(socket) {
    if (pushPermission() !== 'granted') return false;
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) socket.emit('pushSubscribe', subscription.toJSON());
    return !!subscription;
}
