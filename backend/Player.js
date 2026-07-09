const { SOCKET_EVENTS, GAME_CONFIG} = require('./constants');
const { safeSaveSession } = require('./utils');
const crypto = require('crypto');

class Player {
    constructor(name, socket, nbDes, group, couleur, playerId = null){
        this.nom = name;
        this.group = group;
        this.nbDes = nbDes;
        this.des = [];
        this.socket = socket;
        this.finishedLaunching = false;
        this.couleur = couleur;
        
        // Stable player ID (persists across socket reconnections)
        this.id = playerId || crypto.randomUUID();
        
        // Initialize and persist session
        this.persistSession();
    }

    /**
     * Persist player session data: nom, couleur, group, playerId.
     * Called when creating a new player or updating session state.
     */
    persistSession() {
        const session = this.socket.request.session;
        session.couleur = this.couleur;
        session.nom = this.nom;
        session.group = this.group;
        session.playerId = this.id;
        safeSaveSession(session, () => {
            this.socket.emit(SOCKET_EVENTS.LOGGED_IN, {nom: this.nom, color: this.couleur});
        });
    }

    /**
     * Attach a new socket to this player without changing this.id.
     * Called when a player reconnects with a new socket.
     */
    attachSocket(newSocket) {
        this.socket = newSocket;
        // Update session reference to the new socket's session
        const session = this.socket.request.session;
        session.playerId = this.id;
        session.nom = this.nom;
        session.couleur = this.couleur;
        session.group = this.group;
        safeSaveSession(session);
    }

    getSession(){
        return this.socket.request.session;
    }

    setGroup(id){
        this.group = id;
        this.getSession().group = id;
        safeSaveSession(this.getSession());
    }

    addDice(result){
        this.des.push(result);
    }

    clearDice(){
        this.des = [];
    }

    reset() {
        this.des = [];
        this.nbDes = GAME_CONFIG.INITIAL_DICE_COUNT;
        this.finishedLaunching = false;
    }

    win(){
        this.socket.emit(SOCKET_EVENTS.AFFICHAGE, {name: this.nom, lose: false });
        let i=0;
        let id = setInterval(() => {
            if(i>=100){
                clearInterval(id);
                return;
            }
            i++;
            function ColorRandom() {
                let letters = '0123456789ABCDEF';
                let color = '#';
                for (let j = 0; j < 6; j++) {
                    color += letters[Math.floor(Math.random() * 16)];
                }
                return color;
            }

            let value = Math.floor(Math.random() * 6 + 1);
            this.socket.emit(SOCKET_EVENTS.SHOW_DICE, {value: value , color: ColorRandom()});
        }, 100);
    }

    changeColor(couleur){
        this.couleur = couleur;
        this.getSession().couleur = couleur;
        safeSaveSession(this.getSession());
    }

    getCouleur(){
        return this.couleur;
    }

    loseDice(){
        this.nbDes--;
    }
}

module.exports = Player;
