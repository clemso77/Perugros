class Game {
    constructor(groupe) {
        this.groupe = groupe;
        this.timer = null;
        this.diceCount = 0;
        this.diceValue = 0;
    }

    rollDice(player, result) {
        player.addDice(result);
    }

    start() {
        this.groupe.broadcast({ type: "gameStarted" })
        this.groupe.chef.socket.emit('chef', true);
        this.groupe.players.forEach(player => player.socket.emit('rollDice', player.nbDes));
        this.nextTurn(null, null);
    }

    nextTurn(diceCount, diceValue) {
        console.log("next tour", diceCount, " ", diceValue)
        this.diceCount = diceCount;
        this.diceValue = diceValue;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        let p = this.groupe.chef;
        this.groupe.turnIndex ++;
        console.log("Fin : "+this.groupe.turnIndex);
        this.groupe.chef = this.groupe.players[(this.groupe.turnIndex) % this.groupe.players.length];
        p.socket.emit('chef', false);
        this.groupe.chef.socket.emit('chef', true);
        this.groupe.broadcast({ type: 'playerTurn', nextPlayerName: this.groupe.chef.nom, diceCount: diceCount, diceValue: diceValue })
        //this.timer=setTimeout(() => {  this.nextTurn();}, 15000);
    }

    bet(dC, dV) {
        if (isPossibleToBet({ count: this.diceCount, value: this.diceValue }, { count: dC, value: dV })) {
            this.nextTurn(dC, dV);
        } else {
            this.groupe.chef.socket.emit('error', { message: "Erreur dans le parie" });
        }
    }

    refreshPlayer(player) {
        player.socket.emit('gameStarted');
        player.socket.emit('playerTurn', { nextPlayerName: this.groupe.chef.nom, diceCount: this.diceCount, diceValue: this.diceValue })
    }

    liar() {
        // Si il a gagné : 
        let nb = 0;
        console.log("Au début : "+this.groupe.turnIndex);
        this.groupe.players.forEach( p => {
            p.des.forEach(de => {
                if(de === this.diceValue || de === 1){
                    nb++;
                }
            })
        })
        if(nb<this.diceCount){
            // le joueur gagne
            let previousIndex = this.groupe.turnIndex;
            previousIndex = (previousIndex -1 ) % this.groupe.players.length;
            let previousPlayer = this.groupe.players[previousIndex];
            previousPlayer.nbDes = previousPlayer.nbDes - 1;
            if (previousPlayer.nbDes === 0) {
                this.playerLose(previousPlayer);
            }
        }else{
            // Sinon il perd
            this.groupe.chef.nbDes = this.groupe.chef.nbDes -1;
            this.groupe.turnIndex = this.groupe.turnIndex-1;
            if (this.groupe.chef.nbDes === 0) {
                this.playerLose(this.groupe.chef);
            }
        }
        this.groupe.players.forEach(player => {
            player.clearDice();
            player.socket.emit('rollDice', player.nbDes);
        });
        this.groupe.turnIndex= (this.groupe.turnIndex-1) % this.groupe.players.length;
        this.nextTurn(null, null);
    }

    playerLose(player) {
        //TODO
        player.socket.emit('error', { message: "Vous avez perdu" });
        this.groupe.players.filter( p => p !== player );
        player.socket.emit('gameEnded');
        this.groupe.broadcast('error', { message: player.nom + " a perdu !" } );
        if(this.groupe.players.length===1){
            this.groupe.chef.socket.emit('error', { message: "Vous avez gagné la partie !" });
            this.groupe.chef.socket.emit('gameEnded');
        }
    }
}

module.exports = Game;

function isPossibleToBet(current, bet) {
    if (current.count == null || current.value == null) {
        return bet.value!=1;
    }
    //on parie des perudos
    if (bet.value == 1) {
        //on pari +
        if (current.count < bet.count) {
            return true;
        } else {
            //on change de pérudo à count
            if (current.value != 1) {
                //on a bien le bon multiplicateur
                if (current.count / 2 <= bet.count) {
                    return true;
                }
            }
        }
    } else {
        if (current.value == 1) {
            //on a bien le bon multplicateur
            if ((current.count * 2 + 1) <= bet.count) {
                return true;
            }
        }
        //on parie +
        else if (current.count < bet.count) {
            return true;
        } else {
            //on parie autant mais + gros
            if (current.value < bet.value && current.count == bet.count) {
                return true;
            }
        }
    }
    return false;
}