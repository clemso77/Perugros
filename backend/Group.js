const { players } = require("./Player");

class Group {
    constructor(id, player) {
        this.id = id;
        this.players = [];
        this.gameStarted = false;
        this.turnIndex = 0;
        this.chef =player;
    }

    static createPartie(joueur) {
        const newGroup = new Group(joueur.getSession().userId, joueur);
        newGroup.players.push(joueur);
        joueur.group=newGroup.id;
        joueur.getSession().group = newGroup.id; 
        joueur.getSession().save();
        joueur.socket.emit('partieJoin', { group: joueur.getSession().userId, nom: joueur.nom});
        newGroup.broadcast({ type: 'playerCount', count: 1 });
        joueur.socket.emit('chef');
        return newGroup;
    }

    joinPartie(joueur) {
        if(this.players.findIndex(player => player.id === joueur.id) == -1){
            this.players.push(joueur);
        }
        joueur.getSession().group = this.id;
        joueur.group=this.id;
        joueur.getSession().save();
        joueur.socket.emit('partieJoin', { group: this.id});
        this.broadcast({ type: 'playerCount', count: this.players.length });
        if(this.chef.id === joueur.id){
            this.chef.socket.emit('chef');
        }
    }

    handleDisconnect(joueur, groups) {
        const index = this.players.findIndex(player => player.socket.id === joueur.socket.id);
        if (index !== -1) {
            // Supprimez le joueur du tableau
            this.players.splice(index, 1);
            this.broadcast({ type: 'playerCount', count: this.players.length });
            // Si le groupe n'a plus de joueurs, le supprimer
            if (this.players.length === 0) {
                groups.delete(this.id);
                return;
            }
            if(this.chef.id == joueur.id){
                //on change de proprio
                this.players[0].socket.emit('chef');
                this.chef=this.players[0];
            }
        }
    }
    

    isPlayerTurn(userId) {
        return this.players[this.turnIndex]?.request.session.userId === userId;
    }

    nextTurn() {
        this.turnIndex = (this.turnIndex + 1) % this.players.length;
        this.broadcast({ type: 'playerTurn', nextPlayerId: this.players[this.turnIndex].request.session.userId });
    }

    broadcast(message) {
        this.players.forEach(player => player.socket.emit(message.type, message));
    }
}

module.exports = Group;
