const { SOCKET_EVENTS, DICE_CONFIG, GAME_CONFIG } = require('./constants');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Une partie de Perudo dans un groupe.
 * - this.players : joueurs encore en vie (les éliminés restent dans le groupe en spectateurs)
 * - phase : 'rolling' (lancer des dés) -> 'betting' (paris) -> 'reveal' (menteur) -> ...
 * Les joueurs sont référencés par objet et non par index, pour rester cohérent
 * quand quelqu'un quitte la partie en cours de route.
 */
class Game {
    constructor(groupe, { onEnd } = {}) {
        this.groupe = groupe;
        this.players = [...groupe.players];
        this.onEnd = onEnd;
        this.phase = 'rolling';
        this.current = null;
        this.lastBettor = null;
        this.diceCount = null;
        this.diceValue = null;
        this.ended = false;
    }

    get totalDice() {
        return this.players.reduce((sum, p) => sum + p.nbDes, 0);
    }

    isAlive(player) {
        return this.players.includes(player);
    }

    nextAfter(player) {
        const idx = this.players.indexOf(player);
        return this.players[(idx + 1) % this.players.length];
    }

    start() {
        this.players.forEach(p => p.reset());
        this.groupe.broadcast({ type: SOCKET_EVENTS.GAME_STARTED });
        // Le premier à parier est le joueur qui suit le chef du groupe
        const ownerIndex = this.players.indexOf(this.groupe.owner);
        this.startRound(this.players[(ownerIndex + 1) % this.players.length]);
    }

    startRound(starter) {
        this.phase = 'rolling';
        this.diceCount = null;
        this.diceValue = null;
        this.lastBettor = null;
        this.groupe.broadcast({ type: SOCKET_EVENTS.CLEAR_DICE });
        this.players.forEach(p => {
            p.clearDice();
            p.emit(SOCKET_EVENTS.COULD_BET, { value: false });
            p.emit(SOCKET_EVENTS.ROLL_DICE, p.nbDes);
        });
        this.groupe.broadcast({ type: SOCKET_EVENTS.MESSAGE, message: "En attente du résultat des dés" });
        this.setTurn(starter);
        this.groupe.broadcastPlayers(this);
    }

    setTurn(player) {
        this.current = player;
        this.groupe.players.forEach(p => p.emit(SOCKET_EVENTS.CHEF, p === player));
        this.groupe.broadcast({
            type: SOCKET_EVENTS.PLAYER_TURN,
            nextPlayerName: player.nom,
            lastBettor: this.lastBettor?.nom ?? null,
            diceCount: this.diceCount,
            diceValue: this.diceValue
        });
    }

    rollDice(player, value) {
        if (this.phase !== 'rolling' || !this.isAlive(player)) return;
        if (player.des.length >= player.nbDes) return;
        player.addDice(value);
        if (player.des.length === player.nbDes) {
            player.finishedLaunching = true;
        }
        this.checkAllRolled();
    }

    checkAllRolled() {
        if (this.phase !== 'rolling') return;
        if (this.players.every(p => p.finishedLaunching)) {
            this.phase = 'betting';
            this.players.forEach(p => p.emit(SOCKET_EVENTS.COULD_BET, { value: true }));
            this.groupe.broadcast({ type: SOCKET_EVENTS.MESSAGE, message: null });
        }
    }

    bet(player, diceCount, diceValue) {
        if (this.phase !== 'betting') {
            player.emit(SOCKET_EVENTS.ERROR, { message: "Attendez la fin du lancer" });
            return;
        }
        if (player !== this.current) {
            player.emit(SOCKET_EVENTS.ERROR, { message: "Ce n'est pas votre tour" });
            return;
        }
        if (diceCount > this.totalDice) {
            player.emit(SOCKET_EVENTS.ERROR, { message: `Il n'y a que ${this.totalDice} dés en jeu` });
            return;
        }
        if (!isPossibleToBet({ count: this.diceCount, value: this.diceValue }, { count: diceCount, value: diceValue })) {
            player.emit(SOCKET_EVENTS.ERROR, { message: "Erreur, pari non autorisé" });
            return;
        }
        this.diceCount = diceCount;
        this.diceValue = diceValue;
        this.lastBettor = player;
        this.setTurn(this.nextAfter(player));
    }

    async liar(challenger) {
        if (this.phase !== 'betting' || challenger !== this.current) return;
        if (!this.lastBettor || this.diceValue == null) return;

        this.phase = 'reveal';
        const bettor = this.lastBettor;
        const diceCount = this.diceCount;
        const diceValue = this.diceValue;

        this.groupe.players.forEach(p => {
            p.emit(SOCKET_EVENTS.CLEAR_DICE);
            p.emit(SOCKET_EVENTS.LIAR_DECLARED, { challenger: challenger.nom, diceCount, diceValue });
            p.emit(SOCKET_EVENTS.PLAYER_TURN, { nextPlayerName: null, diceCount: null, diceValue: null });
            p.emit(SOCKET_EVENTS.COULD_BET, { value: false });
        });
        await sleep(4000);
        if (this.ended) return;

        const nb = await this.revealMatchingDice(diceValue);
        if (this.ended) return;

        const success = nb < diceCount;
        this.groupe.broadcast({
            type: SOCKET_EVENTS.LIAR_EVALUATED,
            challenger: challenger.nom, diceCount, diceValue, success, total: nb
        });
        await sleep(5000);
        if (this.ended) return;

        // Le perdant du défi perd un dé, le gagnant commence la manche suivante
        const loser = success ? bettor : challenger;
        let starter = success ? challenger : bettor;
        if (this.isAlive(loser)) {
            loser.nbDes--;
            if (loser.nbDes <= 0) {
                this.eliminate(loser);
            }
        }
        if (this.ended) return;
        if (!this.isAlive(starter)) {
            starter = this.players[0];
        }
        this.startRound(starter);
    }

    async revealMatchingDice(diceValue) {
        let nb = 0;
        for (const p of [...this.players]) {
            for (const de of p.des) {
                if (de === diceValue || de === DICE_CONFIG.PERUDO_VALUE) {
                    this.groupe.broadcast({ type: SOCKET_EVENTS.SHOW_DICE, value: de, color: p.couleur });
                    nb++;
                    await sleep(1500); // suspense entre chaque dé révélé
                    if (this.ended) return nb;
                }
            }
        }
        return nb;
    }

    eliminate(player) {
        this.players = this.players.filter(p => p !== player);
        player.reset();
        player.emit(SOCKET_EVENTS.COULD_BET, { value: false });
        player.emit(SOCKET_EVENTS.CHEF, false);
        this.groupe.broadcast({ type: SOCKET_EVENTS.AFFICHAGE, name: player.nom, lose: true });
        player.notify("Vous êtes éliminé… vous pouvez suivre la fin de la partie", 'warning');
        this.groupe.notify(`${player.nom} est éliminé`, 'leave', player);
        if (this.players.length <= 1) {
            this.finish(this.players[0]);
        } else {
            this.groupe.broadcastPlayers(this);
        }
    }

    finish(winner) {
        if (this.ended) return;
        this.ended = true;
        this.phase = 'ended';
        if (winner) {
            winner.reset();
            winner.win();
            this.groupe.players
                .filter(p => p !== winner)
                .forEach(p => p.notify(`${winner.nom} remporte la partie ! 🏆`, 'success'));
        }
        setTimeout(() => this.onEnd?.(this), winner ? GAME_CONFIG.GAME_END_DELAY_MS : 0);
    }

    /** Un joueur quitte définitivement la partie (départ volontaire ou délai de reconnexion dépassé). */
    removePlayer(player) {
        if (!this.isAlive(player) || this.ended) return;
        const wasCurrent = this.current === player;
        const next = wasCurrent ? this.nextAfter(player) : null;
        this.players = this.players.filter(p => p !== player);
        if (this.lastBettor === player) {
            this.lastBettor = null;
            this.diceCount = null;
            this.diceValue = null;
        }
        if (this.players.length <= 1) {
            this.finish(this.players[0]);
            return;
        }
        this.checkAllRolled();
        if (this.phase !== 'reveal') {
            this.setTurn(wasCurrent ? next : this.current);
        }
    }

    /** Renvoie à un joueur (re)connecté l'état de ses dés. */
    syncDice(player) {
        player.emit(SOCKET_EVENTS.CLEAR_DICE);
        if (this.ended || this.phase === 'reveal' || !this.isAlive(player)) return;
        if (this.phase === 'rolling' && !player.finishedLaunching) {
            player.emit(SOCKET_EVENTS.ROLL_DICE, player.nbDes - player.des.length);
        }
        for (const de of player.des) {
            player.emit(SOCKET_EVENTS.SHOW_DICE, { value: de, color: player.couleur });
        }
    }

    stateFor(player) {
        const alive = this.isAlive(player);
        const revealing = this.phase === 'reveal' || this.ended;
        return {
            phase: this.phase,
            alive,
            lastBettor: revealing ? null : this.lastBettor?.nom ?? null,
            currentPlayer: revealing ? null : this.current?.nom ?? null,
            myTurn: alive && !revealing && this.current === player,
            couldBet: alive && this.phase === 'betting',
            diceCount: this.diceCount,
            diceValue: this.diceValue,
            totalDice: this.totalDice
        };
    }
}

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
                if ((Math.floor(current.count / 2) + 1) <= bet.count) {
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

module.exports = Game;
module.exports.isPossibleToBet = isPossibleToBet;
