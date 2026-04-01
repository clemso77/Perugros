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
import DicePres from './components/Dice/DicePres';
import LiarOverlay from "./components/LiarOverlay";
import LiarResultOverlay from "./components/LiarResult";
import EndScreenOverlay from "./components/EndScreenOverlay";


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
        // Socket listeners
        socket.on('chef', (data) => {
            setChef(data);
        });

        socket.on('gameEnded', () => {
            setCurrentTurnPlayer(null);
            socket.emit('quitGroupe');
            setIsLoading(true);
            setTimeout(() => {
                setIsLoading(false);
            }, 1000);
        })

        socket.on('partieJoin', (data) => {
            setGroup(data.group);
        });

        socket.on('partieQuit', () => {
            setGroup(null);
            setChef(false);
            setGameStarted(false);
            setCouldBet(false);
            setCurrentTurnPlayer(null);
            setPlayerNames([]);
            setQuitConfirmVisible(false);
        });

        socket.on('loggedIn', (data) => {
            setIsConnected(true);
            setNom(data.nom);
            setDiceColor(data.color);
        });

        socket.on('gameStarted', () => {
            setGameStarted(true);
        });

        socket.on('playerCount', (data) => {
            setPlayerCount(data.count);
        });

        socket.on('playerNames', (data) => {
            setPlayerNames(data.names || []);
        });

        socket.on('playerTurn', (data) => {
            setCurrentTurnPlayer(data.nextPlayerName);
            setDiceBetCount(data.diceCount);
            setDiceBetValue(data.diceValue);
        });

        socket.on('affichage', (data) => {
            setLiarResult({visible: false, payload: null});
            setEndScreen({ visible: true, payload: data });
        });


        socket.on('liarDeclared', (data) => {
            setLiarOverlay({ visible: true, payload: data });
        })

        socket.on('couldBet', (data) => {
            setCouldBet(data.value)
        })

        socket.on('loading', (data) => {
            setServerLoading(data)
        })

        socket.on("liarEvaluated", (data) => {
            setLiarResult({ visible: true, payload: data });
            setLiarOverlay({visible: false, payload: null});
        });


        return () => {
            socket.off('partieJoin');
            socket.off('loggedIn');
            socket.off('gameStarted');
            socket.off('chef');
            socket.off('playerCount');
            socket.off('playerNames');
            socket.off('playerTurn');
            socket.off('partieQuit');
            socket.off('liarDeclared');
            socket.off('couldBet');
            socket.off("liarEvaluated");
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
            {isConnected && (
                <div className='top-container'>
                    {(playerCount >= 0) && group && (
                        <div className='count'>
                            <img src='/texture/icon/player.png' className='user' alt='' />
                            <span className='count-number'>{playerCount}</span>
                        </div>
                    )}

                    {nom && isConnected && (
                        <div className='name' title={nom}>
                            <span>{nom}</span>
                        </div>
                    )}

                    {gameStarted && (
                        <button className='quit-btn' onClick={handleQuitGame} aria-label="Quitter la partie">
                            ✕
                        </button>
                    )}
                </div>
            )}

            {/* Player list (lobby only) */}
            {isConnected && group && !gameStarted && playerNames.length > 0 && (
                <div className='player-list'>
                    {playerNames.map((name, i) => (
                        <span key={i} className={`player-chip ${name === nom ? 'player-chip-me' : ''}`}>
                            {name === nom ? '👤 ' : ''}{name}
                        </span>
                    ))}
                </div>
            )}

            {/* Quit confirmation overlay */}
            {quitConfirmVisible && (
                <div className='quit-confirm-overlay'>
                    <div className='quit-confirm-card'>
                        <p className='quit-confirm-title'>Quitter la partie ?</p>
                        <p className='quit-confirm-sub'>Votre progression sera perdue.</p>
                        <div className='quit-confirm-actions'>
                            <button className='quit-confirm-yes' onClick={confirmQuit}>Quitter</button>
                            <button className='quit-confirm-no' onClick={cancelQuit}>Annuler</button>
                        </div>
                    </div>
                </div>
            )}

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
                                dc={diceBetCount}
                                dv={diceBetValue}
                                setDC={setDiceColor}
                                color={diceColor}
                            />
                        ) : ( <>{ (!couldBet) ? null :
                                (
                                    <div className='container' style={{ marginTop: '10%' }}>
                                        <div className='bet'>
                                            <button className='up' onClick={() => { setDiceBetValue((diceBetValue %6)+1) }}>
                                                +
                                            </button>
                                            <button className='up' onClick={() => { setDiceBetCount(diceBetCount + 1) }}>
                                                +
                                            </button>
                                        </div>
                                        <div className='bet' style={{ width: "200px", height: "90px"}}>
                                            <div className='dice'>
                                                <Canvas style={{width: "10vh", height: "10vh"}}>
                                                    <Environment files='/texture/hdr/lilienstein_1k.exr' />
                                                    <CameraAnimated isConnected={true} targetPosition={[0, 0, 0.7]} />
                                                    <directionalLight
                                                        intensity={4.5}
                                                        position={[0, 0, -5]}
                                                        castShadow
                                                    />
                                                    <DicePres face={diceBetValue ?? 6} color={diceColor}/>
                                                </Canvas>
                                            </div>
                                            <div className="counter-container" style={{width: "100px"}}>
                                                <p className="counter-value" id="counter-display">{diceBetCount ?? 1}</p>
                                            </div>
                                        </div>
                                        <div className='bet' >
                                            <button className='minus' onClick={() => { setDiceBetValue(diceBetValue === 1 || !diceBetValue ? 6 : diceBetValue - 1) }}>
                                                -
                                            </button>
                                            <button className='minus' onClick={() => { setDiceBetCount(diceBetCount === 1 || !diceBetCount ? 1 : diceBetCount - 1) }}>
                                                -
                                            </button>
                                        </div>
                                        <button disabled={!chef} className='betButton' onClick={() => { socket.emit('bet', {diceCount: diceBetCount == null ? 1 : diceBetCount, diceValue: diceBetValue == null ? 6: diceBetValue})}}>Parier</button>
                                        {(chef && diceBetValue != null) && (
                                            <button className='liarButton' onClick={() => socket.emit('liar')}>Menteur</button>
                                        )}
                                    </div>
                                )
                            }</>)
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