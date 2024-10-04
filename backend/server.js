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
    console.log("Joueur connecter", socket.id);
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
            socket.emit('loggedIn', { nom: session.nom, color: session.couleur });
            currentGroup.joinPartie(joueur)
            if(games.get(currentGroup.id)){
                games.get(currentGroup.id).refreshPlayer(joueur);
            }
        } else {
            // Crée un nouveau joueur si ce n'est pas le cas
            joueur = new Player(session.nom, socket, 5, session.group, session.couleur);
            if (currentGroup) {
                socket.emit('joinPartie', currentGroup.id); // Émet l'événement de rejoindre la partie
            }
        }
    }
    

    socket.on('login', (data) => {
        joueur = new Player(data.nom, socket, 5, null, "#ffffff");
    });

    socket.on('createPartie', () => {
        if(!joueur || !joueur.socket){
            socket.emit("error", {message: "Erreur vous devez être connecter"});
            return;
        }
        if(groups.get(joueur.id)){
            groups.get(joueur.id).joinPartie(joueur);
        }else{
            let gr = Group.createPartie(joueur);
            groups.set(gr.id, gr);
        }
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

    socket.on('accuseLiar', () => {
        if(joueur){
            let g=games.get(joueur.group);
            if(g){
                g.liar();
            }
        }
    });

    socket.on('diceRolled', (nombre) => {
        if(joueur){
            let g=games.get(joueur.group);
            if(g){
                g.rollDice(joueur, nombre);
            }
        }
    });

    socket.on('bet', (data) => {
        if(joueur){
            let g=games.get(joueur.group);
            if(g){
                g.bet(data.diceCount, data.diceValue);
            }
        }
    });

    socket.on('diceColor', (data) => {
        if(joueur){
            joueur.changeColor(data);
            joueur.socket.emit('colorDiceChange', data);
        }
    });

    socket.on('disconnect', () => {
        if (groups && joueur) {
            let currentGroup = groups.get(joueur.group);
            if (currentGroup) {
                // Démarrer un timer de déconnexion
                disconnectWaitGroup.set(session.userId ,setTimeout(() => {
                    currentGroup.handleDisconnect(joueur, groups);
                    if(!groups.get(currentGroup.id) && games.get(currentGroup.id)){
                        games.delete(currentGroup.id);
                    }
                }, 10000));
            }
        }
    });

    socket.on('quitGroupe', () => {
        if (groups && joueur) {
            let currentGroup = groups.get(joueur.group);
            if (currentGroup) {
                currentGroup.handleDisconnect(joueur, groups);
                socket.emit('partieQuit');
                if(!groups.get(currentGroup.id) && games.get(currentGroup.id)){
                    games.delete(currentGroup.id);
                }
            }else{
                socket.emit('error', {message: "Erreur vous n'êtes pas dans un groupe"})
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
