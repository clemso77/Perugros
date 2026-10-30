const { SOCKET_EVENTS, GAME_CONFIG } = require('./constants');

/**
 * Un joueur existe indépendamment de sa connexion : son socket peut changer
 * (reconnexion, rechargement de page, app mobile en arrière-plan) sans perdre
 * son groupe ni sa partie. Il est identifié par un id persistant côté client.
 */
class Player {
    constructor(id, nom, couleur = '#ffffff') {
        this.id = id;
        this.nom = nom;
        this.couleur = couleur;
        this.group = null;
        this.socket = null;
        this.disconnectTimer = null;
        this.reset();
    }

    get connected() {
        return !!this.socket?.connected;
    }

    attachSocket(socket) {
        const previous = this.socket;
        this.socket = socket;
        this.clearDisconnectTimer();
        // L'ancien socket est peut-être encore ouvert (le serveur ne l'a pas encore
        // détecté comme mort) : on le ferme pour éviter les doublons.
        if (previous && previous !== socket && previous.connected) {
            previous.disconnect(true);
        }
    }

    clearDisconnectTimer() {
        if (this.disconnectTimer) {
            clearTimeout(this.disconnectTimer);
            this.disconnectTimer = null;
        }
    }

    emit(event, data) {
        if (this.socket) {
            this.socket.emit(event, data);
        }
    }

    /** kind : 'info' | 'success' | 'warning' | 'error' | 'join' | 'leave' */
    notify(message, kind = 'info') {
        this.emit(SOCKET_EVENTS.NOTIFY, { message, kind });
    }

    addDice(result) {
        this.des.push(result);
    }

    clearDice() {
        this.des = [];
        this.finishedLaunching = false;
    }

    reset() {
        this.des = [];
        this.nbDes = GAME_CONFIG.INITIAL_DICE_COUNT;
        this.finishedLaunching = false;
    }

    win() {
        this.emit(SOCKET_EVENTS.AFFICHAGE, { name: this.nom, lose: false });
        let i = 0;
        const id = setInterval(() => {
            if (i >= 100) {
                clearInterval(id);
                return;
            }
            i++;
            const color = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
            const value = Math.floor(Math.random() * 6) + 1;
            this.emit(SOCKET_EVENTS.SHOW_DICE, { value, color });
        }, 100);
    }

    toPublic() {
        return { nom: this.nom, connected: this.connected, couleur: this.couleur };
    }
}

module.exports = Player;
