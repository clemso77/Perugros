import React, {useEffect, useRef, useState} from 'react';
import {Canvas} from '@react-three/fiber';
import {Environment, OrbitControls, useGLTF} from '@react-three/drei';
import './App.css';
import {socket, startSocket, rememberPlayer, getRememberedColor} from './socket';
import {suggestBet} from './utils/bet';
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

const EMPTY_BET = {count: null, value: null};

// Lien d'invitation : https://.../?partie=abcd
function readInviteFromUrl() {
    const id = new URLSearchParams(window.location.search).get('partie');
    if (id) window.history.replaceState(null, '', window.location.pathname);
    return id;
}

const SceneModel = ({modelPath}) => {
    const {scene} = useGLTF(modelPath);
    return <primitive object={scene} scale={[1, 1, 1]} position={[0, -5, 0]}/>;
};

const App = () => {
    const [nom, setNom] = useState(null);
    const [group, setGroup] = useState(null);
    const [inputGroup, setInputGroup] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [renaming, setRenaming] = useState(false);
    const [online, setOnline] = useState(socket.connected);
    const [synced, setSynced] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [diceColor, setDiceColor] = useState(getRememberedColor() || "#ffffff");
    const [chef, setChef] = useState(false);
    const [currentBet, setCurrentBet] = useState(EMPTY_BET);
    const [betSelection, setBetSelection] = useState(suggestBet(EMPTY_BET));
    const [totalDice, setTotalDice] = useState(null);
    const [currentTurnPlayer, setCurrentTurnPlayer] = useState(null);
    const [players, setPlayers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [liarOverlay, setLiarOverlay] = useState({visible: false, payload: null});
    const [liarResult, setLiarResult] = useState({visible: false, payload: null});
    const [couldBet, setCouldBet] = useState(false);
    const [endScreen, setEndScreen] = useState({visible: false, payload: null});
    const [quitConfirmVisible, setQuitConfirmVisible] = useState(false);
    const pendingInvite = useRef(readInviteFromUrl());

    const myTurn = gameStarted && !!currentTurnPlayer && currentTurnPlayer === nom;

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
        document.addEventListener('touchend', handler, {passive: false});
        return () => document.removeEventListener('touchend', handler);
    }, []);

    // Suggère automatiquement le plus petit pari valide quand le pari change
    useEffect(() => {
        setBetSelection(suggestBet(currentBet));
    }, [currentBet]);

    // Petite vibration quand c'est notre tour (Android ; ignoré sur iOS)
    useEffect(() => {
        if (myTurn && couldBet) navigator.vibrate?.(150);
    }, [myTurn, couldBet]);

    // Rejoint automatiquement la partie d'un lien d'invitation (une fois l'état serveur reçu)
    useEffect(() => {
        if (!synced || !online || !pendingInvite.current) return;
        const invite = pendingInvite.current.trim().toLowerCase();
        pendingInvite.current = null;
        if (!gameStarted && invite !== group) socket.emit('joinPartie', invite);
    }, [synced, online, group, gameStarted]);

    useEffect(() => {
        const resetGameState = () => {
            setGameStarted(false);
            setCouldBet(false);
            setCurrentTurnPlayer(null);
            setCurrentBet(EMPTY_BET);
            setTotalDice(null);
        };

        const onConnect = () => setOnline(true);
        const onDisconnect = () => {
            setOnline(false);
            setSynced(false);
        };
        const onChef = (data) => setChef(data);
        const onGameEnded = () => resetGameState();
        const onPartieJoin = (data) => setGroup(data.group);
        const onPartieQuit = () => {
            resetGameState();
            setGroup(null);
            setChef(false);
            setPlayers([]);
            setQuitConfirmVisible(false);
        };
        const onLoggedIn = (data) => {
            rememberPlayer(data);
            setIsConnected(true);
            setRenaming(false);
            setNom(data.nom);
            setDiceColor(data.color);
        };
        // État complet envoyé par le serveur à chaque (re)connexion
        const onSyncState = (state) => {
            setIsConnected(true);
            setNom(state.nom);
            setDiceColor(state.color);
            setGroup(state.group);
            setPlayers(state.players || []);
            const game = state.game;
            setGameStarted(!!game);
            setChef(game ? game.myTurn : state.owner);
            setCouldBet(!!game?.couldBet);
            setCurrentTurnPlayer(game?.currentPlayer ?? null);
            setCurrentBet(game ? {count: game.diceCount, value: game.diceValue} : EMPTY_BET);
            setTotalDice(game?.totalDice ?? null);
            if (!state.group) setQuitConfirmVisible(false);
            setSynced(true);
        };
        const onGameStarted = () => setGameStarted(true);
        const onPlayerList = (data) => {
            const list = data.players || [];
            setPlayers(list);
            const total = list.reduce((sum, p) => sum + (p.nbDes || 0), 0);
            setTotalDice(total || null);
        };
        const onPlayerTurn = (data) => {
            setCurrentTurnPlayer(data.nextPlayerName);
            setCurrentBet({count: data.diceCount ?? null, value: data.diceValue ?? null});
        };
        const onAffichage = (data) => {
            setLiarResult({visible: false, payload: null});
            setEndScreen({visible: true, payload: data});
        };
        const onLiarDeclared = (data) => setLiarOverlay({visible: true, payload: data});
        const onCouldBet = (data) => setCouldBet(typeof data === 'boolean' ? data : !!data?.value);
        const onLiarEvaluated = (data) => {
            setLiarResult({visible: true, payload: data});
            setLiarOverlay({visible: false, payload: null});
        };
        const onColorChange = (color) => setDiceColor(color);

        const handlers = {
            connect: onConnect,
            disconnect: onDisconnect,
            chef: onChef,
            gameEnded: onGameEnded,
            partieJoin: onPartieJoin,
            partieQuit: onPartieQuit,
            loggedIn: onLoggedIn,
            syncState: onSyncState,
            gameStarted: onGameStarted,
            playerList: onPlayerList,
            playerTurn: onPlayerTurn,
            affichage: onAffichage,
            liarDeclared: onLiarDeclared,
            couldBet: onCouldBet,
            liarEvaluated: onLiarEvaluated,
            colorDiceChange: onColorChange,
        };
        Object.entries(handlers).forEach(([event, fn]) => socket.on(event, fn));
        setOnline(socket.connected);
        startSocket();
        return () => {
            Object.entries(handlers).forEach(([event, fn]) => socket.off(event, fn));
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

    const me = players.find(p => p.nom === nom);
    const spectator = gameStarted && me && !me.alive;
    const showLogin = !isConnected || renaming;

    return (
        <div className={`app-container ${gameStarted && !spectator ? 'in-game' : ''}`} style={{position: 'relative', height: '100%'}}>
            {isConnected && !online && (
                <div className='connection-banner' role='status'>
                    Connexion perdue… reconnexion en cours
                </div>
            )}

            <div className='top-container'>

                <LobbyPlayerList
                    isConnected={isConnected}
                    group={group}
                    playerTurn={currentTurnPlayer}
                    players={players}
                    nom={nom}
                />

                <TopBar
                    isConnected={isConnected}
                    gameStarted={gameStarted}
                    onQuit={handleQuitGame}
                />
            </div>

            <QuitConfirmModal
                visible={quitConfirmVisible}
                onConfirm={confirmQuit}
                onCancel={cancelQuit}
            />

            {isLoading && <LoadingScreen/>}
            <LiarOverlay
                visible={liarOverlay.visible}
                payload={liarOverlay.payload}
                onDone={() => setLiarOverlay({visible: false, payload: null})}
            />
            <LiarResultOverlay
                visible={liarResult.visible}
                payload={liarResult.payload}
                onDone={() => setLiarResult({visible: false, payload: null})}
            />
            <EndScreenOverlay
                visible={endScreen.visible}
                payload={endScreen.payload}
                onDone={() => setEndScreen({visible: false, payload: null})}
            />

            {!gameStarted && (
                <div className='container menu-container'>
                    <h1>Perugros</h1>
                    {showLogin ? (
                        <LoginForm socket={socket} initialName={nom}/>
                    ) : (
                        <GameActions
                            gameStarted={gameStarted}
                            group={group}
                            inputGroup={inputGroup}
                            setInputGroup={setInputGroup}
                            socket={socket}
                            chef={chef}
                            setDC={setDiceColor}
                            color={diceColor}
                            playerCount={players.length}
                            onRename={() => setRenaming(true)}
                        />
                    )}
                </div>
            )}

            {gameStarted && !spectator && (
                <BetControls
                    couldBet={couldBet}
                    currentTurnPlayer={currentTurnPlayer}
                    currentBet={currentBet}
                    selection={betSelection}
                    setSelection={setBetSelection}
                    myTurn={myTurn && chef}
                    totalDice={totalDice}
                    socket={socket}
                    diceColor={diceColor}
                />
            )}

            <GameStatus
                socket={socket}
                currentTurnPlayer={currentTurnPlayer}
                playerName={nom}
                couldBet={couldBet}
                hideBanner={gameStarted && couldBet && !spectator}
                spectator={spectator}
            />

            {/* Canvas principal qui occupe toute la page */}
            <Canvas
                className='main'
                dpr={[1, 1.75]}
                style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%'}}
            >
                <CameraAnimated isConnected={isConnected} targetPosition={[0, -1, 10]}/>
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
                <Environment files='/texture/hdr/lilienstein_1k.exr'/>
                <SceneModel modelPath="/model/fond/fond.glb"/>
                <OrbitControls enableZoom={true} enablePan={false} enableRotate={true}/>
            </Canvas>
        </div>
    );
};

export default App;
