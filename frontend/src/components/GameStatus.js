import React, { useEffect, useState } from 'react';

const GameStatus = ({ group, nom, socket, diceBetCount, diceBetValue, playerCount, currentTurnPlayer }) => {
    const [err, setErr] = useState();

    useEffect(() => {
        socket.on('error', (data) => {
            setErr(data.message);
            let timer = setTimeout(() => setErr(null), 5000);
            return () => clearTimeout(timer);
        });

        return (() => {
            socket.off('error');
        }
        )
    }, [socket])
    return (
        <>
            <div className='message-container'>
                {group && !currentTurnPlayer && (
                    <div className='info'>ID de la partie : {group}
                        <img src='/texture/icon/copy.png' alt='' onClick={() =>{
                            navigator.clipboard.writeText({group});
                            alert("Copied the text: "+{group});
                        }}/>
                    </div>
                )}
                {currentTurnPlayer && <p className="info">C'est au tour de : {currentTurnPlayer}</p>}
                {diceBetCount && diceBetValue && <p>Parie en cour: {diceBetCount} * {diceBetValue}</p>}
                {err && <p className="error">{err}</p>}
            </div>
            <div className='count'>
                {group && playerCount && playerCount > 0 && 
                    <img src='/texture/icon/player.png' className='user' alt=''/> &&
                    <p>: {playerCount}12</p>
                }
            </div>
            <div className='name'>
                {nom && <p>Clément</p>}
            </div>
        </>
    );
};

export default GameStatus;
