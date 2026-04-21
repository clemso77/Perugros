const { SOCKET_EVENTS, DICE_CONFIG, GAME_CONFIG } = require('./constants');

async function sleep(number) {
    return new Promise(resolve => setTimeout(resolve, number));
}

class Game {
    constructor(groupe) {
        this.groupe = groupe;
        this.timer = null;
        this.diceCount = 0;
        this.diceValue = 0;
    }

    rollDice(player, result) {
        player.addDice(result);
        if(player.nbDes === player.des.length){
            player.finishedLaunching = true;
            if(this.groupe.players.every(p => p.finishedLaunching)){
                this.groupe.broadcast({type: SOCKET_EVENTS.COULD_BET, value: true});
                this.groupe.broadcast({type: SOCKET_EVENTS.MESSAGE, message: null})
            }
        }
    }

    start() {
        this.groupe.broadcast({ type: SOCKET_EVENTS.GAME_STARTED })
        this.groupe.chef.socket.emit(SOCKET_EVENTS.CHEF, true);
        this.groupe.broadcast({type: SOCKET_EVENTS.MESSAGE, message: "En attente du résultat des dés"})
        this.groupe.players.forEach(player => player.socket.emit(SOCKET_EVENTS.ROLL_DICE, player.nbDes));
        this.nextTurn(null, null);
    }

    nextTurn(diceCount, diceValue) {
        if (!this.groupe.players.length) {
            return;
        }
        this.diceCount = diceCount;
        this.diceValue = diceValue;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        if (this.groupe.players.length === 1) {
            const winner = this.groupe.players[0];
            winner.reset();
            winner.win();
            setTimeout(() => {
                winner.socket.emit(SOCKET_EVENTS.GAME_ENDED);
            }, GAME_CONFIG.ROUND_END_DELAY_MS);
            return;
        }
        let p = this.groupe.chef;
        this.groupe.turnIndex ++;
        this.groupe.chef = this.groupe.players[(this.groupe.turnIndex) % this.groupe.players.length];
        p.socket.emit(SOCKET_EVENTS.CHEF, false);
        this.groupe.chef.socket.emit(SOCKET_EVENTS.CHEF, true);
        this.groupe.broadcast({ type: SOCKET_EVENTS.PLAYER_TURN, nextPlayerName: this.groupe.chef.nom, diceCount: diceCount, diceValue: diceValue })
        //this.timer=setTimeout(() => {  this.nextTurn();}, 15000);
    }

    bet(dC, dV) {
        if (isPossibleToBet({ count: this.diceCount, value: this.diceValue }, { count: dC, value: dV })) {
            this.nextTurn(dC, dV);
        } else {
            this.groupe.chef.socket.emit(SOCKET_EVENTS.ERROR, { message: "Erreur dans le parie" });
        }
    }

    refreshPlayer(player) {
        player.socket.emit(SOCKET_EVENTS.LOADING, true);
        player.socket.emit(SOCKET_EVENTS.GAME_STARTED);
        player.socket.emit(SOCKET_EVENTS.PLAYER_TURN, { nextPlayerName: this.groupe.chef.nom, diceCount: this.diceCount, diceValue: this.diceValue })
        // Send player's current dice when they reconnect
        //timeout to wait initialization on client side
        setTimeout(() => {
            player.socket.emit(SOCKET_EVENTS.LOADING, false);
            player.socket.emit(SOCKET_EVENTS.CLEAR_DICE);
            if(!player.finishedLaunching){
                player.socket.emit(SOCKET_EVENTS.ROLL_DICE, player.nbDes - player.des.length);
            }
            // Si il peux bet
            if(this.groupe.players.every(p => p.finishedLaunching)){
                player.socket.emit(SOCKET_EVENTS.COULD_BET, {value: true});
            }
            setTimeout(() => {
                for (const de of player.des) {
                    player.socket.emit(SOCKET_EVENTS.SHOW_DICE, { value: de, color: player.couleur });
                }
            }, 500)
        }, 2000);
    }

    async liar() {
        // On affiche la denonciation
        this.groupe.players.forEach(player => {
            player.socket.emit(SOCKET_EVENTS.CLEAR_DICE);
            player.socket.emit(SOCKET_EVENTS.LIAR_DECLARED, { challenger: this.groupe.chef.nom, diceCount: this.diceCount, diceValue: this.diceValue  });
            player.socket.emit( SOCKET_EVENTS.PLAYER_TURN, {nextPlayerName: null, diceCount: null, diceValue: null })
            player.socket.emit(SOCKET_EVENTS.COULD_BET, {value: false});
        });
        await sleep(4000);
        const nb = await revealMatchingDiceSlowly.call(this);
        this.groupe.broadcast({type: SOCKET_EVENTS.LIAR_EVALUATED, challenger: this.groupe.chef.nom, diceCount: this.diceCount, diceValue: this.diceValue, success: nb < this.diceCount, total: nb });
        await sleep(5000);
        if(nb<this.diceCount){
            // le joueur gagne
            let previousIndex = this.groupe.turnIndex;
            previousIndex = (previousIndex - 1 + this.groupe.players.length) % this.groupe.players.length;
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
        if(this.groupe.players.length<=1){
            // FIN de partie
            return;
        }
        this.groupe.players.forEach(player => {
            player.socket.emit(SOCKET_EVENTS.CLEAR_DICE);
            player.socket.emit(SOCKET_EVENTS.ROLL_DICE, player.nbDes);
            player.socket.emit(SOCKET_EVENTS.MESSAGE, {message: "En attend du résultat des dés"})
        });
        this.groupe.turnIndex= (this.groupe.turnIndex - 1 + this.groupe.players.length) % this.groupe.players.length;
        this.nextTurn(null, null);
    }

    playerLose(player) {
        this.groupe.broadcast({ type: SOCKET_EVENTS.AFFICHAGE, name: player.nom, lose: true });
        this.groupe.players = this.groupe.players.filter( p => p !== player );
        setTimeout(() => {
            player.socket.emit(SOCKET_EVENTS.GAME_ENDED);
        }, GAME_CONFIG.ROUND_END_DELAY_MS)
        player.reset();
        this.groupe.broadcast({ type: SOCKET_EVENTS.ERROR, message: player.nom + " a perdu !" });
        if(this.groupe.players.length===1){
            let p = this.groupe.players[0];
            p.reset();
            p.win();
            setTimeout(() => {
                p.socket.emit(SOCKET_EVENTS.GAME_ENDED);
            }, GAME_CONFIG.GAME_END_DELAY_MS);

        }
    }

    removePlayer(player) {
        const wasCurrentPlayer = this.groupe.chef?.id === player.id;
        this.groupe.removePlayer(player.id);
        if (this.groupe.players.length <= 1) {
            this.nextTurn(this.diceCount, this.diceValue);
            return;
        }
        if (wasCurrentPlayer) {
            this.nextTurn(this.diceCount, this.diceValue);
        }
    }
}

module.exports = Game;

function isPossibleToBet(current, bet) {
    // First bet of the round - any bet except PERUDO_VALUE (1) is allowed
    if (current.count == null || current.value == null) {
        return bet.value !== DICE_CONFIG.PERUDO_VALUE;
    }
    
    // Betting on perudos (value 1)
    if (bet.value === DICE_CONFIG.PERUDO_VALUE) {
        // Can bet more perudos
        if (current.count < bet.count) {
            return true;
        } else {
            // Switching from regular dice to perudos
            if (current.value !== DICE_CONFIG.PERUDO_VALUE) {
                // Need at least half the count (rounded down) when switching to perudos
                if (Math.floor(current.count / 2) <= bet.count) {
                    return true;
                }
            }
        }
    } else {
        // Switching from perudos to regular dice
        if (current.value === DICE_CONFIG.PERUDO_VALUE) {
            // Need at least double the count + 1 when switching from perudos
            if ((current.count * 2 + 1) <= bet.count) {
                return true;
            }
        }
        // Betting more dice of same or higher value
        else if (current.count < bet.count) {
            return true;
        } else {
            // Betting same count but higher value
            if (current.value < bet.value && current.count === bet.count) {
                return true;
            }
        }
    }
    return false;
}


async function revealMatchingDiceSlowly() {
    let nb = 0;
    for (const p of this.groupe.players) {
        for (const de of p.des) {
            if (de === this.diceValue || de === DICE_CONFIG.PERUDO_VALUE) {
                // broadcast à tous
                for (const player of this.groupe.players) {
                    player.socket.emit(SOCKET_EVENTS.SHOW_DICE, { value: de, color: p.couleur });
                }

                nb++;
                await sleep(1500); // suspense entre chaque dé révélé
            }
        }
        p.clearDice();
        p.finishedLaunching =false;
    }

    return nb;
}
