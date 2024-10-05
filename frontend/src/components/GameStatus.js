import React, { useEffect, useState } from 'react';

const GameStatus = ({ group,  socket, diceBetCount, diceBetValue, currentTurnPlayer }) => {
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
                       <img src='/texture/icon/copy.png' alt='' onClick={() => {
                        navigator.clipboard.writeText(group) // Passer directement group sans accolades
                            .then(() => {
                                alert("Copied the text: " + group); // Enlever les accolades ici aussi
                            })
                            .catch(err => {
                                console.error("Failed to copy: ", err);
                            });
                    }} />
                    </div>
                )}
                {currentTurnPlayer && <p className="info">C'est au tour de : {currentTurnPlayer}</p>}
                {diceBetCount && diceBetValue && <p>Parie en cour: {diceBetCount} * {diceBetValue}</p>}
                {err && <p className="error">{err}</p>}
            </div>
        </>
    );
};

export default GameStatus;
