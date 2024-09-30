class Game {
    constructor(groupe) {
        this.groupe = groupe;
        this.timer = null;
        this.diceCount = 0;
        this.diceValue = 0;
    }

    rollDice(player, result) {
        player.addDice(result);
        let finLancement = true;
        for (let i = 0; i < this.groupe.players.length; i++) {
            if (this.groupe.players[i].des.length != this.groupe.players[i].nbDes) {
                finLancement = false;
                break;
            }
        }
        if (finLancement) {
            this.groupe.broadcast({ type: 'playerTurn', nextPlayerName: this.groupe.chef.nom });
            this.groupe.chef.socket.emit('chef');
            //this.timer=setTimeout(() => {    this.nextTurn();}, 15000);
        }
    }

    start() {
        this.groupe.broadcast({ type: "gameStarted" })
        this.groupe.chef.socket.emit('chef');
        this.groupe.players.forEach(player => player.socket.emit('rollDice', player.nbDes));
    }

    nextTurn(diceCount, diceValue) {
        this.diceCount = diceCount;
        this.diceValue = diceValue;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        let p = this.groupe.chef;
        const index = this.groupe.players.findIndex(player => player === p);
        this.groupe.chef = this.groupe.players[(index + 1) % this.groupe.players.length];
        p.socket.emit('chef');
        this.groupe.chef.socket.emit('chef');
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
        this.groupe.chef.loseDice();
        this.groupe.chef.socket.emit('chef');
        if (this.groupe.chef.nbDes == 0) {
            this.playerLose(this.groupe.chef);
        }
        this.groupe.players.forEach(player => {
            player.clearDice();
            player.socket.emit('rollDice', player.nbDes);
        });
        this.groupe.broadcast({ type: 'playerTurn', nextPlayerName: this.groupe.chef.nom, diceCount: null, diceValue: null })
    }

    playerLose(player) {
        //TODO
        player.socket.emit('error', { message: "Vous avez perdu" });
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