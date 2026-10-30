import React from 'react';

export default function LobbyPlayerList({ isConnected, group, playerTurn, players, nom }) {
    if (!nom) return null;
    if (!isConnected || !group || players.length === 0) return (
        <div className='player-list'>
            <span className='player-chip player-chip-me'>👤 {nom}</span>
        </div>
    );

    return (
        <div className='player-list'>
            {players.map((p) => {
                const classes = ['player-chip'];
                if (p.nom === nom) classes.push('player-chip-me');
                if (p.nom === playerTurn && p.nom !== nom) classes.push('player-chip-turn');
                if (!p.connected) classes.push('player-chip-offline');
                if (!p.alive) classes.push('player-chip-out');
                return (
                    <span key={p.nom} className={classes.join(' ')} title={p.connected ? undefined : 'Déconnecté'}>
                        <span className='player-chip-dot' style={{ background: p.couleur }} />
                        {p.owner && '👑 '}
                        {p.nom}
                        {p.nbDes != null && <span className='player-chip-dice'>🎲{p.nbDes}</span>}
                        {!p.connected && <span className='player-chip-status'>hors ligne</span>}
                    </span>
                );
            })}
        </div>
    );
}
