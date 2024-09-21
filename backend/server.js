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
        socket.emit('loggedIn', { nom: session.nom });
        let timer=disconnectWaitGroup.get(session.userId);
        let currentGroup = groups.get(session.group);
        if(timer){
            if (currentGroup) {
                clearTimeout(timer);
                console.log("Pas encore deco");
                const index = currentGroup.players.findIndex(player => player.id === session.userId);
                joueur=currentGroup.players[index];
                joueur.socket=socket;
                joueur.socket.emit('partieJoin', { group: currentGroup.id });
                joueur.socket.emit('playerCount', {count: currentGroup.players.length});
                if(joueur == currentGroup.chef){
                    joueur.socket.emit('chef');
                }
            }
        }else{
            joueur = new Player(session.nom, socket, session.des, session.group);
            if (currentGroup) {
                currentGroup.joinPartie(joueur);
            }
        }
    }

    socket.on('login', (data) => {
        // Initialisation du joueur
        session.nom = data.nom;
        session.userId = socket.id;
        session.des = 5;
        joueur = new Player(session.nom, socket, session.des, session.group);

        session.save(() => {
            socket.emit('loggedIn', { nom: data.nom });
        });
    });

    socket.on('createPartie', () => {
        let gr = Group.createPartie(joueur);
        groups.set(gr.id, gr);
    });

    socket.on('joinPartie', (data) => {
        let currentGroup = groups.get(data);
        if (currentGroup) {
            currentGroup.joinPartie(joueur);
        } else {
            socket.emit('error', { message: "Le groupe n'existe pas." });
        }
    });

    socket.on('startGame', () => {
        console.log("Start");
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
        let g=games.get(joueur.group);
        if(g){
            g.rollDice(joueur);
        }
    });

    socket.on('disconnect', () => {
        if (groups && joueur) {
            let currentGroup = groups.get(joueur.group);
            if (currentGroup) {
                // Démarrer un timer de déconnexion
                disconnectWaitGroup.set(session.userId ,setTimeout(() => {
                    currentGroup.handleDisconnect(joueur, groups);
                }, 30000));
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
