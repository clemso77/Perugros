import React from 'react';

export default function LobbyPlayerList({ isConnected, group, playerTurn, playerNames, nom }) {
    if(!nom) return null;
    if (!isConnected || !group || playerNames.length === 0) return (
      <div className='player-list'>
          <span className={`player-chip player-chip-me`}>
              👤 {nom}
          </span>
      </div>
    );

    return (
        <div className='player-list'>
            {playerNames.map((name, i) => (
                <span key={i} className={`player-chip ${name === nom ? 'player-chip-me' : ''} ${name === playerTurn && name !==nom ? 'player-chip-turn' : ''}`}>
                    {name === nom ? '👤 ' : ''}{name}
                </span>
            ))}
        </div>
    );
}
