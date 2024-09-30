import React, { useEffect, useState } from 'react';

const GameStatus = ({ group, nom, socket, diceBetCount, diceBetValue, playerCount, currentTurnPlayer}) => {
    const [err, setErr] = useState(null);

    useEffect(() => {
        socket.on('error', (data) => {
            setErr(data.message);
            let timer = setTimeout(() => setErr(null), 5000);
            return () => clearTimeout(timer);
        });

        return(() =>{
            socket.off('error');
        }
    )
    }, [socket])
    return (
        <div>
            {group && <p className="info">Partie en cours, bienvenue : {nom} | ID de la partie : {group}</p>}
            {currentTurnPlayer && <p className="info">C'est au tour de : {currentTurnPlayer}</p>}
            {diceBetCount && diceBetValue && <p>Parie en cour: {diceBetCount} * {diceBetValue}</p>}
            {group && playerCount && playerCount > 0 && <p className="info">Joueurs dans votre partie : {playerCount}</p>}
            {err && <p className="error">{err}</p>}
        </div>
    );
};

export default GameStatus;
