import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import './App.css';
import LoginForm from './LoginForm';

import GameActions from './components/GameActions';
import DiceRoll from './components/DiceRoll';
import GameStatus from './components/GameStatus';

React.lazy(() => import('./components/GameActions'));
React.lazy(() => import('./components/GameStatus'));

const socket = io('http://localhost:3001'); // Adresse du backend

const App = () => {
    const [diceResult, setDiceResult] = useState(null);
    const [nom, setNom] = useState(null);
    const [group, setGroup] = useState(null);
    const [err, setErr] = useState(null);
    const [inputGroup, setInputGroup] = useState('');
    const [playerCount, setPlayerCount] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [currentTurnPlayer, setCurrentTurnPlayer] = useState(null);
    const [gameStarted, setGameStarted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(15);
    const [chef, setChef] = useState(false);

    useEffect(() => {
        socket.on('diceRolled', (data) => {
            setDiceResult(null);
            setDiceResult(data.result);
        });

        socket.on('chef', () => {
            setChef((prevChef) => !prevChef);
        });

        socket.on('partieJoin', (data) => {
            setNom(data.nom);
            setGroup(data.group);
        });

        socket.on('error', (data) => {
            setErr(data.message);
            let timer=setTimeout(() => setErr(null), 5000);
            return () => clearTimeout(timer); 
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
            setTimeLeft(15);
        });

        socket.on('gameStarted', () => {
            setGameStarted(true);
        });

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
    }, []);

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

    const handleLogin = (name) => {
        if (name.trim()) {
            socket.emit('login', { nom: name });
        } else {
            setErr("Veuillez entrer un nom.");
        }
    };

    return (
        <div className="app-container">
            {!isConnected ? (
                <LoginForm handleLogin={handleLogin} err={err} />
            ) : (
                <>
                    <h1>Perugros</h1>
                    <DiceRoll
                        diceValue={diceResult}
                        nb={5}
                    />
                    <GameActions
                        chef={chef}
                        gameStarted={gameStarted}
                        group={group}
                        inputGroup={inputGroup}
                        setInputGroup={setInputGroup}
                        socket={socket}
                        setErr={setErr}
                        diceResult={diceResult}
                    />
                    <GameStatus
                        group={group}
                        nom={nom}
                        currentTurnPlayer={currentTurnPlayer}
                        playerCount={playerCount}
                        err={err}
                        timeLeft={timeLeft}
                        gameStarted={gameStarted}
                    />
                </>
            )}
        </div>
    );
};

export default App;
