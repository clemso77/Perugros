const express = require('express');
const http = require('http');
const crypto = require('crypto');
const { Server } = require('socket.io');
const path = require('path');
const Game = require('./Game');
const Group = require('./Group');
const Player = require('./Player');
const { SOCKET_EVENTS, GAME_CONFIG } = require('./constants');
const push = require('./push');
const { validatePlayer, validateGroup, validateBetData, validateDiceRoll, sanitizeName, sanitizeColor, isValidPlayerId } = require('./utils');

const app = express();
app.set('trust proxy', 1); // obligatoire derrière Nginx HTTPS

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_ORIGIN || true,
        methods: ["GET", "POST"],
        credentials: true
    },
    // Détection plus rapide des connexions mortes (réseau mobile)
    pingInterval: 10000,
    pingTimeout: 10000
});

// Tous les joueurs connus, indexés par leur id persistant (stocké dans le localStorage du client).
// C'est ce qui permet de retrouver un joueur après une reconnexion, quelle qu'en soit la cause.
const players = new Map();
const groups = new Map();
const games = new Map();

function sendState(player) {
    const group = groups.get(player.group);
    const game = group ? games.get(group.id) : null;
    player.emit(SOCKET_EVENTS.SYNC_STATE, {
        nom: player.nom,
        color: player.couleur,
        group: group?.id ?? null,
        owner: group?.owner === player,
        options: group?.options ?? null,
        players: group ? group.players.map(p => ({
            ...p.toPublic(),
            owner: p === group.owner,
            alive: game ? game.isAlive(p) : true,
            nbDes: game && game.isAlive(p) ? p.nbDes : null
        })) : [],
        game: game ? game.stateFor(player) : null
    });
}

function login(socket, id, nom, couleur) {
    const player = new Player(id, nom, couleur);
    players.set(id, player);
    player.attachSocket(socket);
    player.emit(SOCKET_EVENTS.LOGGED_IN, { nom: player.nom, color: player.couleur, playerId: player.id });
    return player;
}

// Notification push quand c'est au tour d'un joueur dont l'app est fermée ou en arrière-plan
function onTurn(player, game) {
    if (player.connected && !player.hidden) return;
    const bet = game.diceCount != null ? ` Pari actuel : ${game.diceCount} × ${game.diceValue}` : '';
    push.sendPush(player, {
        title: "🎲 C'est votre tour !",
        body: `Partie ${game.groupe.id.toUpperCase()} —${bet || ' à vous d’ouvrir les paris.'}`,
        tag: 'perugros-turn'
    });
}

function onGameEnd(game) {
    const group = game.groupe;
    if (games.get(group.id) === game) {
        games.delete(group.id);
    }
    group.players.forEach(p => {
        p.reset();
        p.emit(SOCKET_EVENTS.CLEAR_DICE);
        p.emit(SOCKET_EVENTS.MESSAGE, { message: null });
        p.emit(SOCKET_EVENTS.GAME_ENDED);
        sendState(p);
    });
}

function leaveGroup(player, reason = 'quit') {
    const group = groups.get(player.group);
    player.group = null;
    player.reset();
    if (!group) return;

    const previousOwner = group.owner;
    games.get(group.id)?.removePlayer(player);
    group.removePlayer(player);

    if (group.players.length === 0) {
        groups.delete(group.id);
        games.delete(group.id);
        return;
    }
    group.notify(
        reason === 'timeout' ? `${player.nom} n'est pas revenu et a été retiré` : `${player.nom} a quitté la partie`,
        'leave'
    );
    if (group.owner && group.owner !== previousOwner) {
        group.owner.notify('Vous êtes maintenant le chef 👑', 'success');
    }
    group.broadcastPlayers(games.get(group.id));
    if (group.owner && !games.get(group.id)) {
        group.owner.emit(SOCKET_EVENTS.CHEF, true);
    }
}

function forgetPlayer(player) {
    leaveGroup(player, 'timeout');
    if (players.get(player.id) === player) {
        players.delete(player.id);
    }
}

io.on('connection', (socket) => {
    const auth = socket.handshake.auth || {};
    const authId = isValidPlayerId(auth.playerId) ? auth.playerId : null;

    let joueur = authId ? players.get(authId) : null;

    if (joueur) {
        // Reconnexion : le joueur existe toujours côté serveur, on lui rattache ce socket
        const wasOnline = joueur.connected;
        joueur.attachSocket(socket);
        joueur.emit(SOCKET_EVENTS.LOGGED_IN, { nom: joueur.nom, color: joueur.couleur, playerId: joueur.id });
        sendState(joueur);
        const group = groups.get(joueur.group);
        if (group) {
            if (!wasOnline) group.notify(`${joueur.nom} est de retour`, 'success', joueur);
            group.broadcastPlayers(games.get(group.id));
        }
    } else if (authId && sanitizeName(auth.nom)) {
        // Le serveur ne connaît plus ce joueur (redémarrage, délai dépassé) mais le client
        // se souvient de son nom : on le reconnecte directement sans repasser par le login.
        joueur = login(socket, authId, sanitizeName(auth.nom), sanitizeColor(auth.couleur));
        sendState(joueur);
    } else {
        // Aucun nom connu : le client doit afficher l'écran de saisie du nom
        socket.emit(SOCKET_EVENTS.NEED_LOGIN);
    }

    socket.on(SOCKET_EVENTS.LOGIN, (data) => {
        const nom = sanitizeName(data?.nom);
        if (!nom) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: "Nom invalide" });
            return;
        }
        if (joueur) {
            if (!joueur.group) joueur.nom = nom;
            joueur.emit(SOCKET_EVENTS.LOGGED_IN, { nom: joueur.nom, color: joueur.couleur, playerId: joueur.id });
            sendState(joueur);
            return;
        }
        joueur = login(socket, authId || crypto.randomUUID(), nom, sanitizeColor(data?.couleur));
        sendState(joueur);
    });

    socket.on(SOCKET_EVENTS.CREATE_PARTIE, () => {
        if (!validatePlayer(joueur, socket)) return;
        if (joueur.group) leaveGroup(joueur);

        const group = new Group(Group.generateId(groups), joueur);
        groups.set(group.id, group);
        group.addPlayer(joueur);
        joueur.emit(SOCKET_EVENTS.PARTIE_JOIN, { group: group.id, nom: joueur.nom });
        joueur.emit(SOCKET_EVENTS.CHEF, true);
        group.broadcastPlayers();
    });

    socket.on(SOCKET_EVENTS.JOIN_PARTIE, (data) => {
        if (!validatePlayer(joueur, socket)) return;
        const group = groups.get(Group.normalizeId(data));
        if (!validateGroup(group, socket)) return;
        if (group.has(joueur)) {
            sendState(joueur);
            return;
        }
        if (group.isNameTaken(joueur)) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: "Ce nom est déjà pris dans cette partie" });
            return;
        }
        const currentGame = games.get(joueur.group);
        if (currentGame?.isAlive(joueur)) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: "Quittez d'abord votre partie en cours" });
            return;
        }
        if (joueur.group) leaveGroup(joueur);

        group.addPlayer(joueur);
        const game = games.get(group.id);
        joueur.emit(SOCKET_EVENTS.PARTIE_JOIN, { group: group.id });
        if (game) {
            joueur.notify("Partie en cours : vous jouerez à la prochaine", 'info');
        }
        sendState(joueur);
        group.notify(`${joueur.nom} a rejoint la partie`, 'join', joueur);
        group.broadcastPlayers(game);
    });

    socket.on(SOCKET_EVENTS.START_GAME, () => {
        if (!validatePlayer(joueur, socket)) return;
        const group = groups.get(joueur.group);
        if (!validateGroup(group, socket)) return;
        if (group.owner !== joueur) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: "Seul le chef peut lancer la partie" });
            return;
        }
        if (games.get(group.id)) return;
        if (group.players.length < GAME_CONFIG.MIN_PLAYERS) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: "Il faut au moins 2 joueurs pour lancer" });
            return;
        }
        const game = new Game(group, { onEnd: onGameEnd, onTurn });
        games.set(group.id, game);
        game.start();
        group.notify("C'est parti ! Lancez vos dés 🎲", 'info');
    });

    socket.on(SOCKET_EVENTS.LIAR, () => {
        if (!validatePlayer(joueur, socket)) return;
        games.get(joueur.group)?.liar(joueur);
    });

    socket.on(SOCKET_EVENTS.CALZA, () => {
        if (!validatePlayer(joueur, socket)) return;
        games.get(joueur.group)?.calza(joueur);
    });

    socket.on(SOCKET_EVENTS.SET_OPTIONS, (options) => {
        if (!validatePlayer(joueur, socket)) return;
        const group = groups.get(joueur.group);
        if (!group || group.owner !== joueur || games.get(group.id)) return;
        group.setOptions(options);
    });

    socket.on(SOCKET_EVENTS.VISIBILITY, (data) => {
        if (joueur) joueur.hidden = !!data?.hidden;
    });

    socket.on(SOCKET_EVENTS.PUSH_SUBSCRIBE, (subscription) => {
        if (!joueur) return;
        joueur.pushSubscription = subscription === null ? null
            : push.isValidSubscription(subscription) ? subscription : joueur.pushSubscription;
    });

    socket.on(SOCKET_EVENTS.DICE_ROLLED, (nombre) => {
        if (!validatePlayer(joueur, socket)) return;
        if (!validateDiceRoll(nombre, socket)) return;
        games.get(joueur.group)?.rollDice(joueur, nombre);
    });

    socket.on(SOCKET_EVENTS.REQUEST_DICE, () => {
        if (!joueur) return;
        games.get(joueur.group)?.syncDice(joueur);
    });

    socket.on(SOCKET_EVENTS.BET, (data) => {
        if (!validatePlayer(joueur, socket)) return;
        if (!validateBetData(data, socket)) return;
        games.get(joueur.group)?.bet(joueur, data.diceCount, data.diceValue);
    });

    socket.on(SOCKET_EVENTS.DICE_COLOR, (data) => {
        if (!joueur) return;
        const couleur = sanitizeColor(data, null);
        if (!couleur) return;
        joueur.couleur = couleur;
        joueur.emit(SOCKET_EVENTS.COLOR_DICE_CHANGE, couleur);
        const group = groups.get(joueur.group);
        group?.broadcastPlayers(games.get(group.id));
    });

    socket.on(SOCKET_EVENTS.QUIT_GROUPE, () => {
        if (!validatePlayer(joueur, socket)) return;
        leaveGroup(joueur);
        socket.emit(SOCKET_EVENTS.PARTIE_QUIT);
        sendState(joueur);
    });

    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
        // Le joueur s'est peut-être déjà reconnecté avec un autre socket : on ne touche à rien
        if (!joueur || joueur.socket !== socket) return;

        const group = groups.get(joueur.group);
        if (group) {
            group.notify(`${joueur.nom} s'est déconnecté… on l'attend`, 'warning', joueur);
            group.broadcastPlayers(games.get(group.id));
        }

        const player = joueur;
        const delay = group ? GAME_CONFIG.DISCONNECT_TIMEOUT_MS : GAME_CONFIG.IDLE_PLAYER_TTL_MS;
        player.clearDisconnectTimer();
        player.disconnectTimer = setTimeout(() => {
            player.disconnectTimer = null;
            if (player.connected) return;
            forgetPlayer(player);
        }, delay);
    });
});

app.get('/push/key', (req, res) => {
    res.json({ publicKey: push.publicKey });
});

app.get('/health', (req, res) => {
    res.json({ ok: true, players: players.size, groups: groups.size, games: games.size });
});

app.use(express.static(path.join(__dirname, '../frontend/build'), {
    setHeaders(res, filePath) {
        // Le service worker et la page doivent toujours être revalidés pour que les mises à jour arrivent
        if (filePath.endsWith('sw.js') || filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
        } else if (filePath.includes(`${path.sep}static${path.sep}`)) {
            // Fichiers du build avec un hash dans le nom : jamais modifiés
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
    }
}));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Serveur en ligne sur le port ${PORT}`);
});
