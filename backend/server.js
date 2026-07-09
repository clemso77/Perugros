const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const path = require('path');
const Game = require('./Game');
const Group = require('./Group');
const Player = require('./Player');
const { SESSION_CONFIG, SOCKET_EVENTS, GAME_CONFIG } = require('./constants');
const { validatePlayer, validateGroup, validateBetData, validateDiceRoll, safeSaveSession } = require('./utils');

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
const disconnectWaitGroup = new Map(); // Map<playerId, timeoutId>
const DEFAULT_DICE_COLOR = '#ffffff';

function parsePlayerName(rawName) {
    if (typeof rawName !== 'string') return null;
    const trimmedName = rawName.trim();
    return trimmedName || null;
}

/**
 * Find a player in a group by stable playerId
 */
function findPlayerInGroup(group, playerId) {
    if (!group) return null;
    return group.players.find(p => p.id === playerId) || null;
}

/**
 * Cancel the disconnect timer for a player
 */
function cancelDisconnectTimer(playerId) {
    const timer = disconnectWaitGroup.get(playerId);
    if (timer) {
        clearTimeout(timer);
        disconnectWaitGroup.delete(playerId);
    }
}

/**
 * Schedule a disconnect timeout for a player.
 * Captures the current socket.id to verify the player hasn't reconnected before removing.
 */
function scheduleDisconnect(playerId, socketId, callback) {
    const timeoutId = setTimeout(() => {
        disconnectWaitGroup.delete(playerId);
        // Verify socket hasn't changed before calling callback
        callback(playerId, socketId);
    }, GAME_CONFIG.DISCONNECT_TIMEOUT_MS);
    disconnectWaitGroup.set(playerId, timeoutId);
}

/**
 * Restore client state after reconnection during active game
 */
function restoreClientState(joueur, group, game) {
    if (!joueur || !joueur.socket) return;
    
    joueur.socket.emit(SOCKET_EVENTS.LOGGED_IN, { nom: joueur.nom, color: joueur.couleur });
    joueur.socket.emit(SOCKET_EVENTS.PARTIE_JOIN, { group: group.id });
    joueur.socket.emit(SOCKET_EVENTS.PLAYER_COUNT, { count: group.players.length });
    joueur.socket.emit(SOCKET_EVENTS.PLAYER_NAMES, { names: group.players.map(p => p.nom) });
    
    if (group.chef?.id === joueur.id) {
        joueur.socket.emit(SOCKET_EVENTS.CHEF, true);
    }
    
    if (game) {
        joueur.socket.emit(SOCKET_EVENTS.GAME_STARTED);
        joueur.socket.emit(SOCKET_EVENTS.PLAYER_TURN, { 
            nextPlayerName: game.groupe.chef.nom, 
            diceCount: game.diceCount, 
            diceValue: game.diceValue 
        });
        joueur.socket.emit(SOCKET_EVENTS.CLEAR_DICE);
        
        // Re-display already rolled dice
        for (const de of joueur.des) {
            joueur.socket.emit(SOCKET_EVENTS.SHOW_DICE, { value: de, color: joueur.couleur });
        }
        
        // If player hasn't finished rolling, allow them to roll remaining dice
        if (!joueur.finishedLaunching) {
            joueur.socket.emit(SOCKET_EVENTS.ROLL_DICE, joueur.nbDes - joueur.des.length);
        }
        
        // If all players finished rolling, player can bet
        if (game.groupe.players.every(p => p.finishedLaunching)) {
            joueur.socket.emit(SOCKET_EVENTS.COULD_BET, { value: true });
        }
    }
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
            type: SOCKET_EVENTS.ERROR,
            message: `${playerName} s'est deconnecté.`
        });
    };

    // Handle reconnection: restore player from session if playerId exists
    if (socketSession?.playerId) {
        const group = groups.get(socketSession.group);
        const existingPlayer = findPlayerInGroup(group, socketSession.playerId);

        if (existingPlayer) {
            // Player reconnected: cancel pending disconnect and restore socket
            cancelDisconnectTimer(socketSession.playerId);
            
            // Verify socket change
            const wasDisconnected = existingPlayer.socket.id !== socket.id;
            existingPlayer.attachSocket(socket);
            
            joueur = existingPlayer;

            // Restore client UI state
            socket.emit(SOCKET_EVENTS.LOGGED_IN, { nom: existingPlayer.nom, color: existingPlayer.couleur });
            group.joinPartie(existingPlayer);
            
            const game = games.get(group.id);
            if (game) {
                restoreClientState(existingPlayer, group, game);
            }
        } else {
            // Session playerId exists but player not found in group: invalidate group in session
            const restoredName = parsePlayerName(socketSession.nom);
            if (!restoredName) {
                console.warn('Skipping session restore: invalid player name in session');
                socket.emit(SOCKET_EVENTS.ERROR, { message: 'Session invalide, veuillez vous reconnecter.' });
                return;
            }
            joueur = new Player(restoredName, socket, GAME_CONFIG.INITIAL_DICE_COUNT, null, socketSession.couleur || DEFAULT_DICE_COLOR, socketSession.playerId);
            socketSession.group = null;
            safeSaveSession(socketSession);
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
        const hadNotFinishedLaunching = game ? !joueur.finishedLaunching : false;
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
            } else if (hadNotFinishedLaunching && currentGroup.players.length > 0 &&
                       currentGroup.players.every(p => p.finishedLaunching)) {
                // The disconnecting player was blocking the betting phase
                currentGroup.broadcast({ type: SOCKET_EVENTS.COULD_BET, value: true });
            }
        }

        if (notifyQuitter) {
            socket.emit(SOCKET_EVENTS.PARTIE_QUIT);
        }
    };

    socket.on(SOCKET_EVENTS.LOGIN, handleEvent((data) => {
        const safeName = parsePlayerName(data?.nom);
        if (!safeName) {
            socket.emit(SOCKET_EVENTS.ERROR, { message: 'Nom invalide' });
            return;
        }
        joueur = new Player(safeName, socket, GAME_CONFIG.INITIAL_DICE_COUNT, null, DEFAULT_DICE_COLOR);
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
            socket.emit(SOCKET_EVENTS.ERROR, { message: 'Une partie est déjà en cours' });
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

            // Race condition fix: capture socket.id at disconnect time
            // Only remove player if socket.id matches when timer fires
            const disconnectedSocketId = socket.id;
            const playerId = joueur.id;

            scheduleDisconnect(playerId, disconnectedSocketId, (pId, sId) => {
                const player = findPlayerInGroup(groups.get(joueur.group), pId);
                if (player && player.socket.id === sId) {
                    // Socket hasn't changed: player truly disconnected
                    leaveCurrentGroup({ disconnected: true });
                }
            });
        });
    }));

    socket.on(SOCKET_EVENTS.QUIT_GROUPE, handleEvent(() => {
        if (!validatePlayer(joueur, socket)) return;
        // Cancel pending disconnect timer with stable playerId
        cancelDisconnectTimer(joueur.id);
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
