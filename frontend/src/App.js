import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import './App.css';
import LoginForm from './LoginForm';
import GameActions from './components/GameActions';
import DiceRoll from './components/Dice/DiceRoll';
import GameStatus from './components/GameStatus';

const socket = io('http://localhost:3001'); // Adresse du backend

const App = () => {
    const [nom, setNom] = useState(null);
    const [group, setGroup] = useState(null);
    const [inputGroup, setInputGroup] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [diceColor, setdiceColor] = useState("#ffffff");
    const [chef, setChef] = useState(false);
    const [diceBetCount, setDiceBetCount] = useState('');
    const [diceBetValue, setDiceBetValue] = useState('');
    const [currentTurnPlayer, setCurrentTurnPlayer]= useState(null);
    const [playerCount, setPlayerCount] = useState(null);

    useEffect(() => {

        socket.on('chef', () => {
            setChef((prevChef) => !prevChef);
        });

        socket.on('partieJoin', (data) => {
            setGroup(data.group);
        });

        socket.on('partieQuit', () => {
            setGroup(null);
            setChef(false);
            setGameStarted(false);
        });

        socket.on('loggedIn', (data) => {
            setIsConnected(true);
            setNom(data.nom);
            setdiceColor(data.color);
        });

        socket.on('gameStarted', () => {
            setGameStarted(true);
        });

        socket.on('playerCount', (data) => {
            setPlayerCount(data.count);
        });


        socket.on('playerTurn', (data) => {
            setCurrentTurnPlayer(data.nextPlayerName);
            setDiceBetCount(data.diceCount);
            setDiceBetValue(data.diceValue);
        });

        return () => {
            socket.off('partieJoin');
            socket.off('loggedIn');
            socket.off('gameStarted');
            socket.off('chef');
            socket.off('playerCount');
            socket.off('playerTurn');
        };
    }, []);

    return (
        <div className="app-container">
            {!isConnected ? (
                <>
                <LoginForm socket={socket} />
                </>
            ) : (
                <>
                    <h1>Perugros</h1>
                    
                    <DiceRoll
                        nb={5}
                        socket={socket}
                        color={diceColor}
                    />
                   
                    <GameActions
                        gameStarted={gameStarted}
                        group={group}
                        inputGroup={inputGroup}
                        setInputGroup={setInputGroup}
                        socket={socket}
                        chef={chef}
                        dc={diceBetCount}
                        dv={diceBetValue}
                    />
                    <GameStatus
                        group={group}
                        nom={nom}
                        socket={socket}
                        playerCount={playerCount}
                        currentTurnPlayer={currentTurnPlayer}
                        diceBetCount={diceBetCount}
                        diceBetValue={diceBetValue}
                    />
                </>
            )}
        </div>
    );
};

export default App;
