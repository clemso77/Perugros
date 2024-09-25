const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const path = require('path');
const Game = require('./Game');
const Group = require('./Group');
const Player = require('./Player');

const sessionMiddleware = session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
});

const app = express();
const server = http.createServer(app);
const io = new Server(server);

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
        let timer=disconnectWaitGroup.get(session.userId);
        let currentGroup = groups.get(session.group);
        if(timer && currentGroup && currentGroup.players.findIndex(player => player.id === session.userId)!=-1 ){
            clearTimeout(timer);
            const index = currentGroup.players.findIndex(player => player.id === session.userId);
            joueur=currentGroup.players[index];
            socket.emit('loggedIn', {nom: joueur.nom, color: joueur.couleur});
            joueur.socket=socket;
            joueur.socket.emit('partieJoin', { group: currentGroup.id });
            joueur.socket.emit('playerCount', {count: currentGroup.players.length});
            if(currentGroup.chef == joueur){
                joueur.socket.emit('chef');
            }
            if(games.get(currentGroup.id)){
                joueur.socket.emit('gameStarted');
                joueur.socket.emit('playerTurn', { nextPlayerName: currentGroup.chef.nom})
            }
        }else{
            joueur = new Player(session.nom, socket, 5, session.group, session.couleur);
            socket.emit('loggedIn', {nom: joueur.nom, color: joueur.couleur});
            if (currentGroup) {
                socket.emit('joinPartie', currentGroup.id);
            }
        }
    }

    socket.on('login', (data) => {
        // Initialisation du joueur
        joueur = new Player(data.nom, socket, 5, null, "#ffffff");
    });

    socket.on('createPartie', () => {
        if(!joueur || !joueur.socket){
            socket.emit("error", {message: "Erreur vous devez être connecter"});
            return;
        }
        let gr = Group.createPartie(joueur);
        groups.set(gr.id, gr);
    });

    socket.on('joinPartie', (data) => {
        if(!joueur || !joueur.socket){
            socket.emit("error", {message: "Erreur vous devez être connecter"});
            return;
        }
        if(!games.get(data)){
            let currentGroup = groups.get(data);
            if (currentGroup) {
                currentGroup.joinPartie(joueur);
            } else {
                socket.emit('error', { message: "Le groupe n'existe pas." });
            }
        }else{
            socket.emit('error', { message: "Une partie est déjà en cour" });
        }
    });

    socket.on('startGame', () => {
        let currentGroup = groups.get(joueur.group);
        if (currentGroup) {
            if(currentGroup.players.length<2){
                currentGroup.broadcast({type: 'error', message: "Vous ne pouvez pas lancer seul"})
                return;
            }
            let game=new Game(currentGroup)
            games.set(currentGroup.id, game);
            game.start();
        }
    });

    socket.on('rollDice', () => {
        if(joueur){
            let g=games.get(joueur.group);
            if(g){
                g.rollDice(joueur);
            }
        }
    });

    socket.on('diceColor', (data) => {
        if(joueur){
            joueur.changeColor(data);
        }
    });

    socket.on('disconnect', () => {
        if (groups && joueur) {
            let currentGroup = groups.get(joueur.group);
            if (currentGroup) {
                // Démarrer un timer de déconnexion
                disconnectWaitGroup.set(session.userId ,setTimeout(() => {
                    currentGroup.handleDisconnect(joueur, groups);
                }, 10000));
            }
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
