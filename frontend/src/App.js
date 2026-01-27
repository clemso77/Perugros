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
import background from "three/src/renderers/common/Background";

//const socket = io('http://78.193.155.119:3001');
const socket = io('http://localhost:3001');

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
    const [isLoading, setIsLoading] = useState(true);
    const [liarOverlay, setLiarOverlay] = useState({ visible: false, payload: null });

    useEffect(() => {
        // Socket listeners
        socket.on('chef', (data) => {
            setChef(data);
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
            setDiceColor(data.color);
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

        socket.on('liarDeclared', (data) => {
            setLiarOverlay({ visible: true, payload: data });
        })

        return () => {
            socket.off('partieJoin');
            socket.off('loggedIn');
            socket.off('gameStarted');
            socket.off('chef');
            socket.off('playerCount');
            socket.off('playerTurn');
            socket.off('partieQuit');
        };
    }, []);

    return (
        <div className="app-container" style={{ position: 'relative', height: '100%' }}>
            {isConnected && (
                <div className='top-container'>
                    {(playerCount >= 0) && group && (
                        <div className='count'>
                            <img src='/texture/icon/player.png' className='user' alt='' />
                            <p>: {playerCount}</p>
                        </div>
                    )}

                    {nom && isConnected && (<div className='name'>
                        <p>{nom}</p>
                    </div>)}
                </div>
            )}
            {isLoading && <LoadingScreen />}
            <LiarOverlay
                visible={liarOverlay.visible}
                payload={liarOverlay.payload}
                onDone={() => setLiarOverlay({ visible: false, payload: null })}
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
                        ) : ( <>{ liarOverlay.visible ? null :
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
                                                <Canvas style={{width: "100px"}}>
                                                    <Environment files='/texture/hdr/lilienstein_1k.exr' />
                                                    <CameraAnimated isConnected={true} targetPosition={[0, 0, 0.7]} />
                                                    <directionalLight
                                                        intensity={4.5}
                                                        position={[0, 0, -5]}
                                                        castShadow
                                                    />
                                                    <DicePres face={diceBetValue ?? 6} />
                                                </Canvas>
                                            </div>
                                            <div className="counter-container" style={{width: "100px"}}>
                                                <p className="counter-value" id="counter-display" style={{ backgroundColor: diceColor}}>{diceBetCount ?? 1}</p>
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