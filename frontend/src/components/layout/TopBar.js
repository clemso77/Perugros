import React, { useState } from 'react';
import { isMuted, setMuted, feedback } from '../../utils/feedback';

export default function TopBar({ isConnected, gameStarted, onQuit }) {
    const [muted, setMutedState] = useState(isMuted());
    if (!isConnected) return null;

    const toggleSound = () => {
        setMuted(!muted);
        setMutedState(!muted);
        if (muted) feedback('tick');
    };

    return (
        <div className='top-actions'>
            <button
                type='button'
                className='icon-btn'
                onClick={toggleSound}
                aria-label={muted ? 'Activer le son' : 'Couper le son'}
                aria-pressed={muted}
            >
                {muted ? '🔇' : '🔊'}
            </button>
            {gameStarted && (
                <button className='quit-btn' onClick={onQuit} aria-label="Quitter la partie">
                    ✕
                </button>
            )}
        </div>
    );
}
