import React, { useEffect, useState } from 'react';

const GameStatus = ({ socket, currentTurnPlayer }) => {
    const [err, setErr] = useState(null);

    useEffect(() => {
        socket.on('error', (data) => {
            setErr(data.message);
            let timer = setTimeout(() => setErr(null), 5000);
            return () => clearTimeout(timer);
        });

        socket.on('gameEnded', () => {
            socket.emit('quitGroupe');
        })

        return (() => {
            socket.off('error');
        }
        )
    }, [socket])
    return (
        <>
            <div className='container mess'>
                {currentTurnPlayer && <p className="info">C'est au tour de : {currentTurnPlayer}</p>}
                {err && <p className="error">{err}</p>}
            </div>
        </>
    );
};

export default GameStatus;
