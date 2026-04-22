import React from 'react';

export default function TopBar({isConnected, playerCount, group, nom, gameStarted, onQuit}) {
    if (!isConnected) return null;

    return (
        <>
            {gameStarted && (
                <button className='quit-btn' onClick={onQuit} aria-label="Quitter la partie">
                    ✕
                </button>
            )}
        </>
    );
}
