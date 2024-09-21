import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import './App.css'; // Import du fichier CSS

const socket = io('http://localhost:3001'); // Adresse du backend

const App = () => {
    const [diceResult, setDiceResult] = useState(null);
    const [nom, setNom] = useState('');
    const [group, setGroup] = useState(null);
    const [err, setErr] = useState(null);
    const [inputGroup, setInputGroup] = useState('');
    const [playerCount, setPlayerCount] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [currentTurnPlayer, setCurrentTurnPlayer] = useState(null);
    const [gameStarted, setGameStarted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(15); // État pour le temps restant
    const [chef, setChef] = useState(false);

    useEffect(() => {
        socket.on('diceRolled', (data) => {
            setDiceResult(data.result);
        });
    
        socket.on('chef', (data) => {
            // Utilisez une mise à jour fonctionnelle si vous avez besoin de l'état précédent
            setChef((prevChef) => !prevChef);
        });
    
        socket.on('partieJoin', (data) => {
            setNom(data.nom);
            setGroup(data.group);
        });
    
        socket.on('error', (data) => {
            setErr(data.message);
            setTimeout(() => {setErr(null)}, 5000)
        });
    
        socket.on('playerCount', (data) => {
            setPlayerCount(data.count);
        });
    
        socket.on('loggedIn', (data) => {
            setIsConnected(true);
            setNom(data.nom);
        });
    
        socket.on('playerTurn', (data) => {
            setCurrentTurnPlayer(data.nextPlayerName);
            setTimeLeft(15); // Réinitialiser le temps restant
        });
    
        socket.on('gameStarted', () => {
            setGameStarted(true);
        });
    
        // Nettoyage des écouteurs d'événements
        return () => {
            socket.off('diceRolled');
            socket.off('partieJoin');
            socket.off('error');
            socket.off('playerCount');
            socket.off('loggedIn');
            socket.off('playerTurn');
            socket.off('gameStarted');
            socket.off('chef');
        };
    }, []); // Pas besoin de dépendances, l'état est géré par mise à jour fonctionnelle
    

    useEffect(() => {
        let timer;
        if (gameStarted && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            socket.emit('timeExpired');
        }

        return () => clearInterval(timer);
    }, [gameStarted, timeLeft]);

    const rollDice = () => {
        if (chef && gameStarted) {
            socket.emit('rollDice');
        } else {
            setErr("Ce n'est pas votre tour ou le jeu n'a pas encore commencé !");
        }
    };

    const createPartie = () => {
        socket.emit('createPartie');
    };

    const joinPartie = () => {
        if (inputGroup) {
            socket.emit('joinPartie', inputGroup);
        } else {
            setErr("Veuillez entrer un ID de partie valide.");
        }
    };

    const startGame = () => {
        socket.emit('startGame');
    };

    const handleLogin = () => {
        if (nom.trim()) {
            socket.emit('login', { nom });
        } else {
            setErr("Veuillez entrer un nom.");
        }
    };

    if (!isConnected) {
        return (
            <div className="login-container">
                <h2>Entrez votre nom pour commencer</h2>
                <input 
                    type="text" 
                    placeholder="Nom du joueur"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                />
                <button onClick={handleLogin}>Se Connecter</button>
                {err && <p className="error">{err}</p>}
            </div>
        );
    }

    return (
        <div className="app-container">
            <h1>Jeu de Dés en Ligne</h1>
            
            <div className="game-section">
                <button onClick={rollDice} disabled={!group || !chef || !gameStarted}>Lancer les dés</button>
                {diceResult && <p>Résultat du dé : {diceResult}</p>}
            </div>

            <div className="action-section">
                {!group && <button onClick={createPartie}>Créer une Partie</button>}
                {group && !gameStarted && <button onClick={startGame} disabled={!group || !chef}>Démarrer le Jeu</button>}
                {chef && !gameStarted && <p>Vous ête le chef du groupe</p>}
                <div className="join-section">
                    <input 
                        type='text' 
                        placeholder='ID de la Partie' 
                        value={inputGroup}
                        onChange={(e) => setInputGroup(e.target.value)}
                    />
                    {!group && <button onClick={joinPartie}>Rejoindre la Partie</button>}
                </div>
            </div>

            {group && <p className="info">Partie en cours, bienvenue : {nom} | ID de la partie : {group}</p>}
            {currentTurnPlayer && <p className="info">C'est au tour de : {currentTurnPlayer}</p>}
            {playerCount !== 0 && <p className="info">Joueurs dans votre partie : {playerCount}</p>}
            {err && <p className="error">{err}</p>}
            {gameStarted && timeLeft > 0 && (
                <div className="timer-bar" style={{ width: `${(timeLeft / 15) * 100}%` }}>
                    {timeLeft} secondes restantes
                </div>
            )}
        </div>
    );
};

export default App;
