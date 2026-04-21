import React from 'react';

export default function LobbyPlayerList({ isConnected, group, gameStarted, playerNames, nom }) {
    if (!isConnected || !group || gameStarted || playerNames.length === 0) return null;

    return (
        <div className='player-list'>
            {playerNames.map((name, i) => (
                <span key={i} className={`player-chip ${name === nom ? 'player-chip-me' : ''}`}>
                    {name === nom ? '👤 ' : ''}{name}
                </span>
            ))}
        </div>
    );
}
