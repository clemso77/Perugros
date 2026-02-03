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
        origin: true,
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

io.on('connection', (socket) => {
    let joueur = null;
    const session = socket.request.session;
    if (session.userId) {
        const timer = disconnectWaitGroup.get(session.userId);
        const currentGroup = groups.get(session.group);
    
        // Vérifie si le joueur est déjà dans le groupe
        const playerIndex = currentGroup?.players.findIndex(player => player.id === session.userId);
    
        if (timer && currentGroup && playerIndex !== -1 ) {
            clearTimeout(timer); 

            joueur = currentGroup.players[playerIndex];
            joueur.socket = socket; 
            socket.emit(SOCKET_EVENTS.LOGGED_IN, { nom: session.nom, color: session.couleur });
            currentGroup.joinPartie(joueur)
            if(games.get(currentGroup.id)){
                games.get(currentGroup.id).refreshPlayer(joueur);
            }
        } else {
            // Crée un nouveau joueur si ce n'est pas le cas
            joueur = new Player(session.nom, socket, GAME_CONFIG.INITIAL_DICE_COUNT, session.group, session.couleur);
            if (currentGroup) {
                socket.emit(SOCKET_EVENTS.JOIN_PARTIE, currentGroup.id); // Émet l'événement de rejoindre la partie
            }
        }
    }
    

    socket.on(SOCKET_EVENTS.LOGIN, (data) => {
        joueur = new Player(data.nom, socket, GAME_CONFIG.INITIAL_DICE_COUNT, null, "#ffffff");
    });

    socket.on(SOCKET_EVENTS.CREATE_PARTIE, () => {
        if(!validatePlayer(joueur, socket)) return;
        
        if(groups.get(joueur.id)){
            groups.get(joueur.id).joinPartie(joueur);
        }else{
            let gr = Group.createPartie(joueur);
            groups.set(gr.id, gr);
        }
    });

    socket.on(SOCKET_EVENTS.JOIN_PARTIE, (data) => {
        if(!validatePlayer(joueur, socket)) return;
        
        if(!games.get(data)){
            let currentGroup = groups.get(data);
            if (!validateGroup(currentGroup, socket)) return;
            currentGroup.joinPartie(joueur);
        }else{
            socket.emit(SOCKET_EVENTS.ERROR, { message: "Une partie est déjà en cour" });
        }
    });

    socket.on(SOCKET_EVENTS.START_GAME, () => {
        if(!validatePlayer(joueur, socket)) return;
        
        let currentGroup = groups.get(joueur.group);
        if (!validateGroup(currentGroup, socket)) return;
        
        if(currentGroup.players.length < GAME_CONFIG.MIN_PLAYERS){
            currentGroup.broadcast({type: SOCKET_EVENTS.ERROR, message: "Vous ne pouvez pas lancer seul"})
            return;
        }
        let game = new Game(currentGroup);
        games.set(currentGroup.id, game);
        game.start();
    });

    socket.on(SOCKET_EVENTS.LIAR, () => {
        if(joueur){
            let g=games.get(joueur.group);
            if(g){
                g.liar();
            }
        }
    });

    socket.on(SOCKET_EVENTS.DICE_ROLLED, (nombre) => {
        if(!validatePlayer(joueur, socket)) return;
        if(!validateDiceRoll(nombre, socket)) return;
        
        let g = games.get(joueur.group);
        if(g){
            g.rollDice(joueur, nombre);
        }
    });


    socket.on(SOCKET_EVENTS.BET, (data) => {
        if(!validatePlayer(joueur, socket)) return;
        if(!validateBetData(data, socket)) return;
        
        let g = games.get(joueur.group);
        if(g){
            g.bet(data.diceCount, data.diceValue);
        }
    });

    socket.on(SOCKET_EVENTS.DICE_COLOR, (data) => {
        if(joueur){
            joueur.changeColor(data);
            joueur.socket.emit(SOCKET_EVENTS.COLOR_DICE_CHANGE, data);
        }
    });

    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
        if (!joueur) return;
        let s = joueur.getSession();
        console.log(s.userId + " disconnected");
        joueur.getSession().save(() => {
            const currentGroup = groups.get(joueur.group);
            if (!currentGroup) return;
            console.log("Disconnect wait group set")
            disconnectWaitGroup.set(joueur.id, setTimeout(() => {
                console.log("Disconnect wait group executed")
                currentGroup.handleDisconnect(joueur, groups);
                let game = games.get(currentGroup.id);
                game.nextTurn(game.diceCount, game.diceValue);
                if (!groups.get(currentGroup.id) && games.get(currentGroup.id)) {
                    games.delete(currentGroup.id);
                }
            }, GAME_CONFIG.DISCONNECT_TIMEOUT_MS));

        });
    });

    socket.on(SOCKET_EVENTS.QUIT_GROUPE, () => {
        console.log("Quitter le groupe");
        if (!validatePlayer(joueur, socket)) return;
        
        let currentGroup = groups.get(joueur.group);
        if (!validateGroup(currentGroup, socket)) {
            socket.emit(SOCKET_EVENTS.ERROR, {message: "Erreur vous n'êtes pas dans un groupe"});
            return;
        }
        
        currentGroup.handleDisconnect(joueur, groups);
        let game = games.get(currentGroup.id);
        game.nextTurn(game.diceCount, game.diceValue);

        socket.emit(SOCKET_EVENTS.PARTIE_QUIT);
        if(!groups.get(currentGroup.id) && games.get(currentGroup.id)){
            games.delete(currentGroup.id);
        }
    });
});

app.use(express.static(path.join(__dirname, '../frontend/build')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Serveur en ligne sur le port ${PORT}`);
});
