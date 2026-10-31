import React, {useEffect, useRef, useState} from 'react';
import {Canvas} from '@react-three/fiber';
import {Environment, OrbitControls, useGLTF} from '@react-three/drei';
import './App.css';
import {socket, startSocket, rememberPlayer, forgetName, getRememberedColor} from './socket';
import {suggestBet} from './utils/bet';
import {feedback} from './utils/feedback';
import {PROTOCOL_VERSION} from './version';
import useWakeLock from './hooks/useWakeLock';
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
import RevealPanel from './components/game/RevealPanel';
import DeviceOptions from './components/DeviceOptions';
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
    // null : on ne sait pas encore si un nom est mémorisé sur cet appareil
    const [needName, setNeedName] = useState(null);
    const [lastBettor, setLastBettor] = useState(null);
    const [options, setOptions] = useState(null);
    // Version annoncée par le serveur (null tant qu'inconnue)
    const [serverProtocol, setServerProtocol] = useState(null);
    const [palifico, setPalifico] = useState(false);
    const [betHistory, setBetHistory] = useState([]);
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
    // Hauteur des panneaux du bas : la scène 3D se place au-dessus pour que les dés restent visibles
    const [betPanelHeight, setBetPanelHeight] = useState(0);
    const [revealPanelHeight, setRevealPanelHeight] = useState(0);
    const pendingInvite = useRef(readInviteFromUrl());
    // Les écouteurs du socket sont créés une seule fois : ils lisent le nom via cette ref
    const nomRef = useRef(nom);
    nomRef.current = nom;
    const historyLengthRef = useRef(0);

    const myTurn = gameStarted && !!currentTurnPlayer && currentTurnPlayer === nom;


    useEffect(() => {
        let lastTouchEnd = 0;
        const handler = (e) => {
            // Les boutons et champs gardent tous leurs taps (ex : « + » appuyé rapidement)
            if (e.target.closest?.('button, input, label, select, textarea, a')) return;
            const now = Date.now();
            if (now - lastTouchEnd <= 300) e.preventDefault();
            lastTouchEnd = now;
        };
        document.addEventListener('touchend', handler, {passive: false});
        return () => document.removeEventListener('touchend', handler);
    }, []);

    // App installée (iOS) : après la fermeture du clavier, la page peut rester décalée vers le haut
    useEffect(() => {
        const onFocusOut = (e) => {
            if (!e.target.matches?.('input, textarea')) return;
            setTimeout(() => {
                if (!document.activeElement?.matches?.('input, textarea')) window.scrollTo(0, 0);
            }, 50);
        };
        document.addEventListener('focusout', onFocusOut);
        return () => document.removeEventListener('focusout', onFocusOut);
    }, []);

    // Sans barre d'adresse, le geste « retour » fermait l'app en pleine partie : on demande confirmation
    useEffect(() => {
        if (!gameStarted) return;
        window.history.pushState({perugrosGame: true}, '');
        const onPopState = () => {
            window.history.pushState({perugrosGame: true}, '');
            setQuitConfirmVisible(true);
        };
        window.addEventListener('popstate', onPopState);
        return () => {
            window.removeEventListener('popstate', onPopState);
            if (window.history.state?.perugrosGame) window.history.back();
        };
    }, [gameStarted]);

    // Suggère automatiquement le plus petit pari valide quand le pari change
    useEffect(() => {
        setBetSelection(suggestBet(currentBet, {palifico}));
    }, [currentBet, palifico]);

    // Son + vibration quand c'est notre tour
    useEffect(() => {
        if (myTurn && couldBet) feedback('turn');
    }, [myTurn, couldBet]);

    // L'écran reste allumé pendant une partie
    useWakeLock(gameStarted);

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
            setLastBettor(null);
            setTotalDice(null);
            setPalifico(false);
            setBetHistory([]);
            historyLengthRef.current = 0;
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
            setNeedName(false);
            setNom(data.nom);
            setDiceColor(data.color);
        };
        // État complet envoyé par le serveur à chaque (re)connexion
        const onSyncState = (state) => {
            setServerProtocol(state.protocol ?? 0);
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
            setLastBettor(game?.lastBettor ?? null);
            setTotalDice(game?.totalDice ?? null);
            setPalifico(!!game?.palifico);
            setBetHistory(game?.history ?? []);
            historyLengthRef.current = game?.history?.length ?? 0;
            setOptions(game?.options ?? state.options ?? null);
            if (!state.group) setQuitConfirmVisible(false);
            setSynced(true);
        };
        const onGameStarted = (data) => {
            setGameStarted(true);
            if (data?.options) setOptions(data.options);
        };
        const onPlayerList = (data) => {
            const list = data.players || [];
            setPlayers(list);
            const total = list.reduce((sum, p) => sum + (p.nbDes || 0), 0);
            setTotalDice(total || null);
        };
        const onPlayerTurn = (data) => {
            setCurrentTurnPlayer(data.nextPlayerName);
            setCurrentBet({count: data.diceCount ?? null, value: data.diceValue ?? null});
            setLastBettor(data.lastBettor ?? null);
            setPalifico(!!data.palifico);
            const history = data.history ?? [];
            // Petit son quand un autre joueur vient de parier
            if (history.length > historyLengthRef.current && history[history.length - 1]?.nom !== nomRef.current) {
                feedback('bet');
            }
            historyLengthRef.current = history.length;
            setBetHistory(history);
        };
        const onRollDice = () => feedback('roll');
        const onOptions = (data) => setOptions(data.options);
        const onAffichage = (data) => {
            if (data.lose) {
                if (data.name === nomRef.current) feedback('lose');
            } else {
                feedback('win');
            }
            setLiarResult({visible: false, payload: null});
            setEndScreen({visible: true, payload: data});
        };
        const onLiarDeclared = (data) => {
            feedback(data.kind === 'calza' ? 'calza' : 'liar');
            setLiarOverlay({visible: true, payload: data});
        };
        const onCouldBet = (data) => setCouldBet(typeof data === 'boolean' ? data : !!data?.value);
        const onLiarEvaluated = (data) => {
            // Son selon notre camp : celui qui défie gagne si success, celui qui a parié gagne sinon
            const me = nomRef.current;
            if (data.challenger === me) feedback(data.success ? 'success' : 'fail');
            else if (data.bettor === me && data.kind !== 'calza') feedback(data.success ? 'fail' : 'success');
            setLiarResult({visible: true, payload: data});
            setLiarOverlay({visible: false, payload: null});
        };
        const onColorChange = (color) => setDiceColor(color);
        // Le serveur ne peut pas nous identifier : on demande le nom
        const onNeedLogin = () => {
            forgetName();
            setIsConnected(false);
            setNeedName(true);
        };

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
            needLogin: onNeedLogin,
            options: onOptions,
            rollDice: onRollDice,
        };
        Object.entries(handlers).forEach(([event, fn]) => socket.on(event, fn));
        setOnline(socket.connected);
        startSocket().then(({hasName}) => {
            if (!hasName) setNeedName(true);
        });
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

    return (
        <div
            className={`app-container ${gameStarted && !spectator ? 'in-game' : ''}`}
            style={{'--bottom-panel-space': `${Math.max(betPanelHeight, revealPanelHeight)}px`}}
        >
            {serverProtocol !== null && serverProtocol !== PROTOCOL_VERSION && (
                <div className='version-banner' role='alert'>
                    {serverProtocol > PROTOCOL_VERSION ? (
                        <>
                            Une nouvelle version de l’app est disponible.
                            <button type='button' onClick={() => window.location.reload()}>Recharger</button>
                        </>
                    ) : (
                        <>⚠️ Le serveur n’est pas à jour : redémarrez-le, sinon certaines options (comme le mode de jeu) ne fonctionneront pas.</>
                    )}
                </div>
            )}

            {isConnected && !online && (
                <div className='connection-banner' role='status'>
                    Connexion perdue… reconnexion en cours
                </div>
            )}

            <div className='top-container'>

                {gameStarted && <LobbyPlayerList
                    isConnected={isConnected}
                    group={group}
                    playerTurn={currentTurnPlayer}
                    players={players}
                    nom={nom}
                />}

                <TopBar
                    isConnected={isConnected}
                    gameStarted={gameStarted}
                    onQuit={handleQuitGame}
                    options={options}
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
                    {isConnected ? (
                        <GameActions
                            group={group}
                            inputGroup={inputGroup}
                            setInputGroup={setInputGroup}
                            socket={socket}
                            chef={chef}
                            setDC={setDiceColor}
                            color={diceColor}
                            players={players}
                            nom={nom}
                            options={options}
                        />
                    ) : needName ? (
                        <LoginForm socket={socket} online={online}/>
                    ) : (
                        <div className='menu-card menu-connecting'>Connexion au serveur…</div>
                    )}
                    {isConnected && <DeviceOptions/>}
                </div>
            )}

            {gameStarted && !spectator && (
                <BetControls
                    couldBet={couldBet}
                    currentTurnPlayer={currentTurnPlayer}
                    currentBet={currentBet}
                    lastBettor={lastBettor === nom ? 'Vous' : lastBettor}
                    palifico={palifico}
                    options={options}
                    history={betHistory}
                    nom={nom}
                    selection={betSelection}
                    setSelection={setBetSelection}
                    myTurn={myTurn && chef}
                    totalDice={totalDice}
                    socket={socket}
                    diceColor={diceColor}
                    onHeight={setBetPanelHeight}
                />
            )}

            <RevealPanel socket={socket} nom={nom} onHeight={setRevealPanelHeight}/>

            <GameStatus
                socket={socket}
                currentTurnPlayer={currentTurnPlayer}
                playerName={nom}
                hideBanner={gameStarted && couldBet && !spectator}
                spectator={spectator}
            />

            {/* Canvas principal qui occupe toute la page */}
            <Canvas
                className='main'
                dpr={[1, 1.75]}
                style={{position: 'absolute', top: 0, left: 0, width: '100%'}}
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
