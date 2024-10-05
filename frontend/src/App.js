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

//const socket = io('http://78.193.155.119:3001');
const socket = io('http://localhost:3001');
const SceneModel = ({ modelPath }) => {
    const { scene } = useGLTF(modelPath);
    return <primitive object={scene} scale={[1, 1, 1]} position={[0, -5, 0]} />;
};

const App = () => {
    const [isFullScreen, setIsFullScreen] =useState(false);
    const [nom, setNom] = useState(null);
    const [group, setGroup] = useState(null);
    const [inputGroup, setInputGroup] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [diceColor, setDiceColor] = useState("#ffffff");
    const [chef, setChef] = useState(false);
    const [diceBetCount, setDiceBetCount] = useState('');
    const [diceBetValue, setDiceBetValue] = useState('');
    const [currentTurnPlayer, setCurrentTurnPlayer] = useState(null);
    const [playerCount, setPlayerCount] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    const requestFullScreen = ()=> {
        const element = document.documentElement;
      
        if (!isFullScreen) {
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if (element.mozRequestFullScreen) {
                element.mozRequestFullScreen();
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen();
            } else if (element.msRequestFullscreen) {
                element.msRequestFullscreen();
            }
            setIsFullScreen(true);
        } else {
            // Si on est déjà en plein écran, on quitte le mode plein écran
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
            setIsFullScreen(false);
        }
      }

    useEffect(() => {

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
        <div className="app-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {isLoading && <LoadingScreen />}
                <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
                    <Canvas style={{ flex: '1', height: '100vh'  ,background: '#D2AA8D'  }}>
                        <CameraAnimated isConnected={isConnected}/>
                        <directionalLight
                            intensity={3.5}
                            position={[-5, 3, -5]}
                            castShadow
                            shadow-mapSize-width={512}
                            shadow-mapSize-height={512}
                        />
                        <DiceRoll
                            nb={5}
                            color={diceColor}
                            socket={socket}
                            setIsLoading={setIsLoading}
                        />
                        <Environment files='/texture/hdr/lilienstein_1k.exr' />
                        <SceneModel modelPath="/model/fond/fond2.glb" />
                        <OrbitControls enableZoom={false} enablePan={false} enableRotate={true}/>
                    </Canvas>

                    <div>
                    <img   src={isFullScreen? 'texture/icon/reduire.png' : '/texture/icon/fullscreen.png'} alt='' className='fullscreen' onClick={requestFullScreen}/>
                    <div className=''>
                        <h1>Perugros</h1>
                        {!isConnected &&
                <LoginForm socket={socket} />
                        }
                    </div>
                    {!isConnected ? (
                <LoginForm socket={socket} />
             ) : (
                <>

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
                </div>
        </div>
    );
};

export default App;