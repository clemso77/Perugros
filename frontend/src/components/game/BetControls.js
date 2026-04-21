import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import CameraAnimated from '../CameraAnimated';
import DicePres from '../Dice/DicePres';

export default function BetControls({
    couldBet,
    diceBetCount,
    diceBetValue,
    setDiceBetCount,
    setDiceBetValue,
    chef,
    socket,
    diceColor
}) {
    if (!couldBet) return null;

    return (
        <div className='bet-controls'>
            <div className='bet'>
                <button className='up' onClick={() => setDiceBetValue((diceBetValue % 6) + 1)}>+</button>
                <button className='up' onClick={() => setDiceBetCount(diceBetCount + 1)}>+</button>
            </div>

            <div className='bet bet-preview'>
                <div className='dice'>
                    <Canvas style={{ width: "10vh", height: "10vh" }}>
                        <Environment files='/texture/hdr/lilienstein_1k.exr' />
                        <CameraAnimated isConnected={true} targetPosition={[0, 0, 0.7]} />
                        <directionalLight intensity={4.5} position={[0, 0, -5]} castShadow />
                        <DicePres face={diceBetValue ?? 6} color={diceColor} />
                    </Canvas>
                </div>
                <div className="counter-container" style={{ width: "100px" }}>
                    <p className="counter-value" id="counter-display" aria-label="Nombre de dés pariés">
                        {diceBetCount ?? 1}
                    </p>
                </div>
            </div>

            <div className='bet'>
                <button className='minus' onClick={() => setDiceBetValue(diceBetValue === 1 || !diceBetValue ? 6 : diceBetValue - 1)}>-</button>
                <button className='minus' onClick={() => setDiceBetCount(diceBetCount === 1 || !diceBetCount ? 1 : diceBetCount - 1)}>-</button>
            </div>

            <div className='bottom-actions'>
                <button
                    disabled={!chef}
                    className='betButton'
                    onClick={() => socket.emit('bet', {
                        diceCount: diceBetCount == null ? 1 : diceBetCount,
                        diceValue: diceBetValue == null ? 6 : diceBetValue
                    })}
                >
                    Parier
                </button>
                {chef && diceBetValue != null && (
                    <button className='liarButton' onClick={() => socket.emit('liar')}>
                        Menteur
                    </button>
                )}
            </div>
        </div>
    );
}
