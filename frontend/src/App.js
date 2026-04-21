import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment } from '@react-three/drei';
import io from 'socket.io-client';
import './App.css';
import LoginForm from './components/LoginForm';
import GameActions from './components/GameActions';
import DiceRoll from './components/Dice/DiceRoll';
import GameStatus from './components/GameStatus';
import CameraAnimated from './components/CameraAnimated';
import LoadingScreen from './components/LoadingScreen';
import LiarOverlay from "./components/LiarOverlay";
import LiarResultOverlay from "./components/LiarResult";
import EndScreenOverlay from "./components/EndScreenOverlay";
import BetControls from './components/game/BetControls';
import TopBar from './components/layout/TopBar';
import LobbyPlayerList from './components/layout/LobbyPlayerList';
import QuitConfirmModal from './components/layout/QuitConfirmModal';


//const socket = io('http://78.193.155.119:3001');
const socket = io({ withCredentials: true });

const SceneModel = ({ modelPath }) => {
    const { scene } = useGLTF(modelPath);
    return <primitive object={scene} scale={[1, 1, 1]} position={[0, -5, 0]} />;
};

const App = () => {
    const [nom, setNom] = useState(null);
    const [group, setGroup] = useState(null);
    const [inputGroup, setInputGroup] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [diceColor, setDiceColor] = useState("#ffffff");
    const [chef, setChef] = useState(false);
    const [diceBetCount, setDiceBetCount] = useState(1);
    const [diceBetValue, setDiceBetValue] = useState(null);
    const [currentTurnPlayer, setCurrentTurnPlayer] = useState(null);
    const [playerCount, setPlayerCount] = useState(null);
    const [playerNames, setPlayerNames] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [liarOverlay, setLiarOverlay] = useState({ visible: false, payload: null });
    const [liarResult, setLiarResult] = useState({ visible: false, payload: null });
    const [couldBet, setCouldBet] = useState(false);
    const [serverLoading, setServerLoading] = useState(false);
    const [endScreen, setEndScreen] = useState({ visible: false, payload: null });
    const [quitConfirmVisible, setQuitConfirmVisible] = useState(false);

    useEffect(() => {
        const setVh = () => {
            document.documentElement.style.setProperty(
                '--vh',
                `${window.innerHeight * 0.01}px`
            );
        };
        setVh();
        window.addEventListener('resize', setVh);
        return () => window.removeEventListener('resize', setVh);
    }, []);


    useEffect(() => {
        let lastTouchEnd = 0;
        const handler = (e) => {
            const now = Date.now();
            if (now - lastTouchEnd <= 300) e.preventDefault();
            lastTouchEnd = now;
        };
        document.addEventListener('touchend', handler, { passive: false });
        return () => document.removeEventListener('touchend', handler);
    }, []);


    useEffect(() => {
        const onChef = (data) => setChef(data);
        const onGameEnded = () => {
            setCurrentTurnPlayer(null);
            socket.emit('quitGroupe');
            setIsLoading(true);
            setTimeout(() => setIsLoading(false), 1000);
        };
        const onPartieJoin = (data) => setGroup(data.group);
        const onPartieQuit = () => {
            setGroup(null);
            setChef(false);
            setGameStarted(false);
            setCouldBet(false);
            setCurrentTurnPlayer(null);
            setPlayerNames([]);
            setQuitConfirmVisible(false);
        };
        const onLoggedIn = (data) => {
            setIsConnected(true);
            setNom(data.nom);
            setDiceColor(data.color);
        };
        const onGameStarted = () => setGameStarted(true);
        const onPlayerCount = (data) => setPlayerCount(data.count);
        const onPlayerNames = (data) => setPlayerNames(data.names || []);
        const onPlayerTurn = (data) => {
            setCurrentTurnPlayer(data.nextPlayerName);
            setDiceBetCount(data.diceCount);
            setDiceBetValue(data.diceValue);
        };
        const onAffichage = (data) => {
            setLiarResult({ visible: false, payload: null });
            setEndScreen({ visible: true, payload: data });
        };
        const onLiarDeclared = (data) => setLiarOverlay({ visible: true, payload: data });
        const onCouldBet = (data) => setCouldBet(typeof data === 'boolean' ? data : !!data?.value);
        const onLoading = (data) => setServerLoading(data);
        const onLiarEvaluated = (data) => {
            setLiarResult({ visible: true, payload: data });
            setLiarOverlay({ visible: false, payload: null });
        };

        socket.on('chef', onChef);
        socket.on('gameEnded', onGameEnded);
        socket.on('partieJoin', onPartieJoin);
        socket.on('partieQuit', onPartieQuit);
        socket.on('loggedIn', onLoggedIn);
        socket.on('gameStarted', onGameStarted);
        socket.on('playerCount', onPlayerCount);
        socket.on('playerNames', onPlayerNames);
        socket.on('playerTurn', onPlayerTurn);
        socket.on('affichage', onAffichage);
        socket.on('liarDeclared', onLiarDeclared);
        socket.on('couldBet', onCouldBet);
        socket.on('loading', onLoading);
        socket.on('liarEvaluated', onLiarEvaluated);

        return () => {
            socket.off('chef', onChef);
            socket.off('gameEnded', onGameEnded);
            socket.off('partieJoin', onPartieJoin);
            socket.off('partieQuit', onPartieQuit);
            socket.off('loggedIn', onLoggedIn);
            socket.off('gameStarted', onGameStarted);
            socket.off('playerCount', onPlayerCount);
            socket.off('playerNames', onPlayerNames);
            socket.off('playerTurn', onPlayerTurn);
            socket.off('affichage', onAffichage);
            socket.off('liarDeclared', onLiarDeclared);
            socket.off('couldBet', onCouldBet);
            socket.off('loading', onLoading);
            socket.off('liarEvaluated', onLiarEvaluated);
        };
    }, []);

    const handleQuitGame = () => {
        setQuitConfirmVisible(true);
    };

    const confirmQuit = () => {
        socket.emit('quitGroupe');
        setQuitConfirmVisible(false);
    };

    const cancelQuit = () => {
        setQuitConfirmVisible(false);
    };

    return (
        <div className="app-container" style={{ position: 'relative', height: '100%' }}>
            <TopBar
                isConnected={isConnected}
                playerCount={playerCount}
                group={group}
                nom={nom}
                gameStarted={gameStarted}
                onQuit={handleQuitGame}
            />
            <LobbyPlayerList
                isConnected={isConnected}
                group={group}
                gameStarted={gameStarted}
                playerNames={playerNames}
                nom={nom}
            />
            <QuitConfirmModal
                visible={quitConfirmVisible}
                onConfirm={confirmQuit}
                onCancel={cancelQuit}
            />

            {(isLoading || serverLoading) && <LoadingScreen />}
            <LiarOverlay
                visible={liarOverlay.visible}
                payload={liarOverlay.payload}
                onDone={() => setLiarOverlay({ visible: false, payload: null })}
            />
            <LiarResultOverlay
                visible={liarResult.visible}
                payload={liarResult.payload}
                onDone={() => setLiarResult({ visible: false, payload: null })}
            />
            <EndScreenOverlay
                visible={endScreen.visible}
                payload={endScreen.payload}
                onDone={() => setEndScreen({ visible: false, payload: null })}
            />

            {/* LoginBar, GameActions ou DiceBet en haut avec position absolute */}
            <div className='container' style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', zIndex: 11 }}>
                <h1>Perugros</h1>
                {!isConnected ? (
                    <LoginForm socket={socket} />
                ) : (
                    <>
                        {!gameStarted ? (
                            <GameActions
                                gameStarted={gameStarted}
                                group={group}
                                inputGroup={inputGroup}
                                setInputGroup={setInputGroup}
                                socket={socket}
                                chef={chef}
                                setDC={setDiceColor}
                                color={diceColor}
                            />
                        ) : (
                            <BetControls
                                couldBet={couldBet}
                                diceBetCount={diceBetCount}
                                diceBetValue={diceBetValue}
                                setDiceBetCount={setDiceBetCount}
                                setDiceBetValue={setDiceBetValue}
                                chef={chef}
                                socket={socket}
                                diceColor={diceColor}
                            />
                        )
                        }
                    </>
                )}
            </div>

            <GameStatus
                group={group}
                socket={socket}
                currentTurnPlayer={currentTurnPlayer}
                playerName={nom}
            />

            {/* Canvas principal qui occupe toute la page */}
            <Canvas className='main' style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                <CameraAnimated isConnected={isConnected} targetPosition={[0, -1, 10]} />
                <directionalLight
                    intensity={3.5}
                    position={[-5, 3, -5]}
                    castShadow
                />
                <DiceRoll
                    nb={5}
                    color={diceColor}
                    socket={socket}
                    setIsLoading={setIsLoading}
                />
                <Environment files='/texture/hdr/lilienstein_1k.exr' />
                <SceneModel modelPath="/model/fond/fond.glb" />
                <OrbitControls enableZoom={true} enablePan={false} enableRotate={true} />
            </Canvas>
        </div >
    );
};

export default App;
