const { SOCKET_EVENTS, DEFAULT_OPTIONS } = require('./constants');

/**
 * Un groupe (salon) regroupe des joueurs. Il survit à la fin d'une partie :
 * tout le monde revient dans le salon et le chef peut relancer.
 */
class Group {
    constructor(id, owner) {
        this.id = id;
        this.players = [];
        this.owner = owner;
        this.options = { ...DEFAULT_OPTIONS };
    }

    setOptions(options) {
        for (const key of Object.keys(DEFAULT_OPTIONS)) {
            if (typeof options?.[key] === 'boolean') this.options[key] = options[key];
        }
        this.broadcast({ type: SOCKET_EVENTS.OPTIONS, options: this.options });
    }

    static generateId(existingGroups) {
        let id;
        do {
            id = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
        } while (existingGroups.has(id));
        return id;
    }

    static normalizeId(id) {
        return typeof id === 'string' ? id.trim().toLowerCase() : '';
    }

    has(player) {
        return this.players.includes(player);
    }

    isNameTaken(player) {
        return this.players.some(p => p !== player && p.nom.toLowerCase() === player.nom.toLowerCase());
    }

    addPlayer(player) {
        if (!this.has(player)) {
            this.players.push(player);
        }
        player.group = this.id;
        if (!this.owner) {
            this.owner = player;
        }
    }

    removePlayer(player) {
        if (!this.has(player)) return false;
        this.players = this.players.filter(p => p !== player);
        if (this.owner === player) {
            this.owner = this.players[0] ?? null;
        }
        return true;
    }

    broadcast(message) {
        this.players.forEach(player => player.emit(message.type, message));
    }

    /** Notification affichée chez tous les joueurs du groupe (sauf `except`). */
    notify(message, kind = 'info', except = null) {
        this.players
            .filter(p => p !== except)
            .forEach(p => p.notify(message, kind));
    }

    broadcastPlayers(game) {
        const list = this.players.map(p => ({
            ...p.toPublic(),
            owner: p === this.owner,
            alive: game ? game.players.includes(p) : true,
            nbDes: game && game.players.includes(p) ? p.nbDes : null
        }));
        this.broadcast({ type: SOCKET_EVENTS.PLAYER_LIST, players: list });
        this.broadcast({ type: SOCKET_EVENTS.PLAYER_COUNT, count: this.players.length });
        this.broadcast({ type: SOCKET_EVENTS.PLAYER_NAMES, names: this.players.map(p => p.nom) });
        return list;
    }
}

module.exports = Group;
