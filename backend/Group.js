
const { SOCKET_EVENTS } = require('./constants');

class Group {
    constructor(id, player) {
        this.id = id;
        this.players = [];
        this.gameStarted = false;
        this.turnIndex = 0;
        this.chef =player;
    }

    static createPartie(joueur) {
        const newGroup = new Group(joueur.getSession().userId.substring(0, 5), joueur);
        newGroup.players.push(joueur);
        joueur.group=newGroup.id;
        joueur.getSession().group = newGroup.id; 
        joueur.getSession().save(() => {
            joueur.socket.emit(SOCKET_EVENTS.PARTIE_JOIN, { group: newGroup.id, nom: joueur.nom});
            newGroup.broadcast({ type: SOCKET_EVENTS.PLAYER_COUNT, count: 1 });
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
        if(this.chef.id === joueur.id){
            this.chef.socket.emit(SOCKET_EVENTS.CHEF, true);
        }
    }

    handleDisconnect(joueur, groups) {
        this.players.filter(player => player.id === joueur.id);
        this.broadcast({ type: SOCKET_EVENTS.PLAYER_COUNT, count: this.players.length });
        // Si le groupe n'a plus de joueurs, le supprimer
        if (this.players.length === 0) {
            groups.delete(this.id);
        }else{
            // sinon on met a jour le chef
            this.chef = this.players[0]
        }
    }
    

    isPlayerTurn(userId) {
        return this.players[this.turnIndex]?.request.session.userId === userId;
    }

    previousPlayer() {
        return this.players[(this.turnIndex-1)%this.players.length];
    }

    broadcast(message) {
        this.players.forEach(player => player.socket.emit(message.type, message));
    }
}

module.exports = Group;
