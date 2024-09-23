import React from 'react';

const GameStatus = ({ group, nom, currentTurnPlayer, playerCount, err, timeLeft, gameStarted }) => {
    return (
        <div>
            {group && <p className="info">Partie en cours, bienvenue : {nom} | ID de la partie : {group}</p>}
            {currentTurnPlayer && <p className="info">C'est au tour de : {currentTurnPlayer}</p>}
            {playerCount && playerCount !== 0 && <p className="info">Joueurs dans votre partie : {playerCount}</p>}
            {err && <p className="error">{err}</p>}
            {gameStarted && timeLeft > 0 && (
                <div className="timer-bar" style={{ width: `${(timeLeft / 15) * 100}%` }}>
                    {timeLeft} secondes restantes
                </div>
            )}
        </div>
    );
};

export default GameStatus;
