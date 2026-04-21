import React from 'react';

export default function TopBar({ isConnected, playerCount, group, nom, gameStarted, onQuit }) {
    if (!isConnected) return null;

    return (
        <div className='top-container'>
            {(playerCount >= 0) && group && (
                <div className='count'>
                    <img src='/texture/icon/player.png' className='user' alt='' />
                    <span className='count-number'>{playerCount}</span>
                </div>
            )}

            {nom && (
                <div className='name' title={nom}>
                    <span>{nom}</span>
                </div>
            )}

            {gameStarted && (
                <button className='quit-btn' onClick={onQuit} aria-label="Quitter la partie">
                    ✕
                </button>
            )}
        </div>
    );
}
