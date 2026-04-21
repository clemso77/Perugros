
const { SOCKET_EVENTS, GAME_CONFIG} = require('./constants');

class Group {
    constructor(id, player) {
        this.id = id;
        this.players = [];
        this.gameStarted = false;
        this.turnIndex = 0;
        this.chef =player;
    }
    static guidGenerator() {
        var S4 = function() {
            return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
        };
        return (S4());
    }

    static createPartie(joueur) {
        let groupid = this.guidGenerator();
        console.log(groupid);
        const newGroup = new Group(groupid, joueur);
        newGroup.players.push(joueur);
        joueur.group=newGroup.id;
        joueur.getSession().group = newGroup.id; 
        joueur.getSession().save(() => {
            joueur.socket.emit(SOCKET_EVENTS.PARTIE_JOIN, { group: newGroup.id, nom: joueur.nom});
            newGroup.broadcast({ type: SOCKET_EVENTS.PLAYER_COUNT, count: 1 });
            newGroup.broadcast({ type: SOCKET_EVENTS.PLAYER_NAMES, names: newGroup.players.map(p => p.nom) });
            joueur.socket.emit(SOCKET_EVENTS.CHEF, true);
        });
        return newGroup;
    }

    joinPartie(joueur) {
        if(this.players.findIndex(player => player.id === joueur.id) === -1){
            this.players.push(joueur);
        }
        joueur.getSession().group = this.id;
        joueur.group=this.id;
        joueur.getSession().save();
        joueur.socket.emit(SOCKET_EVENTS.PARTIE_JOIN, { group: this.id});
        this.broadcast({ type: SOCKET_EVENTS.PLAYER_COUNT, count: this.players.length });
        this.broadcast({ type: SOCKET_EVENTS.PLAYER_NAMES, names: this.players.map(p => p.nom) });
        if(this.chef.id === joueur.id){
            this.chef.socket.emit(SOCKET_EVENTS.CHEF, true);
        }
    }

    removePlayer(playerId) {
        const existingIndex = this.players.findIndex(player => player.id === playerId);
        if (existingIndex === -1) {
            return false;
        }

        const previousChefId = this.chef?.id;
        this.players = this.players.filter(player => player.id !== playerId);

        if (this.players.length === 0) {
            this.chef = null;
            this.turnIndex = 0;
            return true;
        }

        if (previousChefId === playerId) {
            this.chef = this.players[0];
            this.turnIndex = 0;
        } else {
            this.turnIndex = Math.max(0, Math.min(this.turnIndex, this.players.length - 1));
        }

        return true;
    }

    handleDisconnect(joueur, groups) {
        joueur.reset();
        const removed = this.removePlayer(joueur.id);
        if (!removed) return;
        this.broadcast({ type: SOCKET_EVENTS.PLAYER_COUNT, count: this.players.length });
        this.broadcast({ type: SOCKET_EVENTS.PLAYER_NAMES, names: this.players.map(p => p.nom) });
        // Si le groupe n'a plus assez joueurs, le supprimer
        if (this.players.length < GAME_CONFIG.MIN_PLAYERS) {
            this.broadcast({type: SOCKET_EVENTS.PARTIE_QUIT})
            this.broadcast({type: SOCKET_EVENTS.MESSAGE, message: null});
            this.broadcast({type: SOCKET_EVENTS.ERROR, message: "La partie a été annulée car il n'y a plus assez de joueurs."})
            groups.delete(this.id);
        }
    }
    

    broadcast(message) {
        this.players.forEach(player => player.socket.emit(message.type, message));
    }
}

module.exports = Group;
