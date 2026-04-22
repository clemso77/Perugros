const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const path = require('path');
const Game = require('./Game');
const Group = require('./Group');
const Player = require('./Player');
const { SESSION_CONFIG, SOCKET_EVENTS, GAME_CONFIG } = require('./constants');
const { validatePlayer, validateGroup, validateBetData, validateDiceRoll } = require('./utils');

const sessionMiddleware = session({
    secret: SESSION_CONFIG.SECRET,
    resave: SESSION_CONFIG.RESAVE,
    saveUninitialized: SESSION_CONFIG.SAVE_UNINITIALIZED,
    cookie: SESSION_CONFIG.COOKIE
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_ORIGIN || true,
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(sessionMiddleware);

io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

const groups = new Map();
const games = new Map();
const disconnectWaitGroup = new Map();

function safeSaveSession(targetSession, callback) {
    if (!targetSession || typeof targetSession.save !== 'function') {
        if (typeof callback === 'function') callback();
        return;
    }
    targetSession.save((err) => {
        if (err) {
            console.error('Session save error:', err);
        }
        if (typeof callback === 'function') callback(err);
    });
}

io.on('connection', (socket) => {
    let joueur = null;
    const socketSession = socket.request.session;

    const handleEvent = (handler) => (...args) => {
        try {
            handler(...args);
        } catch (error) {
            console.error('Socket event error:', error);
            socket.emit(SOCKET_EVENTS.ERROR, { message: "Une erreur serveur est survenue" });
        }
    };

    const emitDisconnectMessage = (group, playerName) => {
        if (!group || !playerName || group.players.length === 0) return;
        group.broadcast({
            type: SOCKET_EVENTS.MESSAGE,
            message: `[${playerName}] has disconnected from the game.`
        });
    };

    if (socketSession?.userId) {
        const timer = disconnectWaitGroup.get(socketSession.userId);
        const currentGroup = groups.get(socketSession.group);

        const playerIndex = currentGroup?.players.findIndex((player) => player.id === socketSession.userId);

        if (currentGroup && playerIndex !== -1) {
            if (timer) {
                clearTimeout(timer);
                disconnectWaitGroup.delete(socketSession.userId);
            }

            joueur = currentGroup.players[playerIndex];
            joueur.socket = socket;
            socket.emit(SOCKET_EVENTS.LOGGED_IN, { nom: socketSession.nom, color: socketSession.couleur });
            currentGroup.joinPartie(joueur);
            if (games.get(currentGroup.id)) {
                games.get(currentGroup.id).refreshPlayer(joueur);
            }
        } else {
            if (typeof socketSession.nom !== 'string' || !socketSession.nom.trim()) {
                return;
            }
            joueur = new Player(socketSession.nom.trim(), socket, GAME_CONFIG.INITIAL_DICE_COUNT, null, socketSession.couleur || '#ffffff');
            if (currentGroup && !games.get(currentGroup.id)) {
                currentGroup.joinPartie(joueur);
            } else if (socketSession.group) {
                socketSession.group = null;
                safeSaveSession(socketSession);
            }
        }
    }

    const leaveCurrentGroup = ({ notifyQuitter = false, disconnected = false } = {}) => {
        if (!joueur) return;
        const currentGroup = groups.get(joueur.group);
        if (!currentGroup) {
            if (notifyQuitter) {
                socket.emit(SOCKET_EVENTS.PARTIE_QUIT);
            }
            return;
        }

        const game = games.get(currentGroup.id);
        const wasCurrentPlayer = game?.groupe?.chef?.id === joueur.id;
        const gameExisted = !!game;
        const departingPlayerName = joueur.nom;

        currentGroup.handleDisconnect(joueur, groups);
        const joueurSession = joueur.getSession();
        if (joueurSession) {
            joueurSession.group = null;
        }
        joueur.group = null;
        safeSaveSession(joueurSession);

        if (disconnected) {
            emitDisconnectMessage(currentGroup, departingPlayerName);
        }

        if (gameExisted) {
            if (!groups.get(currentGroup.id) || currentGroup.players.length <= 1) {
                games.delete(currentGroup.id);
            } else if (wasCurrentPlayer) {
                game.nextTurn(game.diceCount, game.diceValue);
            }
        }

        if (notifyQuitter) {
            socket.emit(SOCKET_EVENTS.PARTIE_QUIT);
        }
    };

    socket.on(SOCKET_EVENTS.LOGIN, handleEvent((data) => {
        const safeName = typeof data?.nom === 'string' ? data.nom.trim() : '';
        if (!safeName) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: 'Nom invalide' });
            return;
        }
        joueur = new Player(safeName, socket, GAME_CONFIG.INITIAL_DICE_COUNT, null, '#ffffff');
    }));

    socket.on(SOCKET_EVENTS.CREATE_PARTIE, handleEvent(() => {
        if (!validatePlayer(joueur, socket)) return;

        if (groups.get(joueur.id)) {
            groups.get(joueur.id).joinPartie(joueur);
        } else {
            const gr = Group.createPartie(joueur);
            groups.set(gr.id, gr);
        }
    }));

    socket.on(SOCKET_EVENTS.JOIN_PARTIE, handleEvent((data) => {
        if (!validatePlayer(joueur, socket)) return;

        if (!games.get(data)) {
            const currentGroup = groups.get(data);
            if (!validateGroup(currentGroup, socket)) return;
            currentGroup.joinPartie(joueur);
        } else {
            socket.emit(SOCKET_EVENTS.ERROR, { message: 'Une partie est déjà en cour' });
        }
    }));

    socket.on(SOCKET_EVENTS.START_GAME, handleEvent(() => {
        if (!validatePlayer(joueur, socket)) return;

        const currentGroup = groups.get(joueur.group);
        if (!validateGroup(currentGroup, socket)) return;

        if (currentGroup.players.length < GAME_CONFIG.MIN_PLAYERS) {
            currentGroup.broadcast({ type: SOCKET_EVENTS.ERROR, message: 'Vous ne pouvez pas lancer seul' });
            return;
        }
        const game = new Game(currentGroup);
        games.set(currentGroup.id, game);
        game.start();
    }));

    socket.on(SOCKET_EVENTS.LIAR, handleEvent(() => {
        if (joueur) {
            const g = games.get(joueur.group);
            if (g) {
                g.liar();
            }
        }
    }));

    socket.on(SOCKET_EVENTS.DICE_ROLLED, handleEvent((nombre) => {
        if (!validatePlayer(joueur, socket)) return;
        if (!validateDiceRoll(nombre, socket)) return;

        const g = games.get(joueur.group);
        if (g) {
            g.rollDice(joueur, nombre);
        }
    }));

    socket.on(SOCKET_EVENTS.BET, handleEvent((data) => {
        if (!validatePlayer(joueur, socket)) return;
        if (!validateBetData(data, socket)) return;

        const g = games.get(joueur.group);
        if (g) {
            g.bet(data.diceCount, data.diceValue);
        }
    }));

    socket.on(SOCKET_EVENTS.DICE_COLOR, handleEvent((data) => {
        if (joueur) {
            joueur.changeColor(data);
            joueur.socket.emit(SOCKET_EVENTS.COLOR_DICE_CHANGE, data);
        }
    }));

    socket.on(SOCKET_EVENTS.DISCONNECT, handleEvent(() => {
        if (!joueur) return;
        const joueurSession = joueur.getSession();
        safeSaveSession(joueurSession, () => {
            const currentGroup = groups.get(joueur.group);
            if (!currentGroup) return;

            const pendingDisconnect = disconnectWaitGroup.get(joueur.id);
            if (pendingDisconnect) {
                clearTimeout(pendingDisconnect);
            }

            disconnectWaitGroup.set(joueur.id, setTimeout(() => {
                disconnectWaitGroup.delete(joueur.id);
                leaveCurrentGroup({ disconnected: true });
            }, GAME_CONFIG.DISCONNECT_TIMEOUT_MS));
        });
    }));

    socket.on(SOCKET_EVENTS.QUIT_GROUPE, handleEvent(() => {
        if (!validatePlayer(joueur, socket)) return;
        const pendingDisconnect = disconnectWaitGroup.get(joueur.id);
        if (pendingDisconnect) {
            clearTimeout(pendingDisconnect);
            disconnectWaitGroup.delete(joueur.id);
        }
        leaveCurrentGroup({ notifyQuitter: true });
    }));
});

app.use(express.static(path.join(__dirname, '../frontend/build')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Serveur en ligne sur le port ${PORT}`);
});
