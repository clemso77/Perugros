import React, { useCallback, useEffect, useState } from 'react';
import Toast from './Toast';

const GameStatus = ({ socket, currentTurnPlayer, playerName }) => {
    const [errorMsg, setErrorMsg] = useState(null);
    const [infoMsg, setInfoMsg] = useState(null);

    const clearError = useCallback(() => setErrorMsg(null), []);
    const clearInfo = useCallback(() => setInfoMsg(null), []);

    useEffect(() => {
        socket.on('error', (data) => {
            setErrorMsg(data.message);
        });

        socket.on('message', (data) => {
            if (data.message) {
                setInfoMsg(data.message);
            } else {
                setInfoMsg(null);
            }
        });

        return () => {
            socket.off('error');
            socket.off('message');
        };
    }, [socket]);

    const isMyTurn = playerName && currentTurnPlayer && playerName === currentTurnPlayer;

    return (
        <>
            {/* Current turn banner */}
            {currentTurnPlayer && (
                <div className={`turn-banner ${isMyTurn ? 'turn-banner-mine' : ''}`}>
                    {isMyTurn
                        ? '🎲 C\'est votre tour !'
                        : `⏳ Tour de ${currentTurnPlayer}`}
                </div>
            )}

            {/* Non-intrusive toasts */}
            <Toast message={infoMsg} type="info" onDone={clearInfo} duration={4000} />
            <Toast message={errorMsg} type="error" onDone={clearError} duration={4500} />
        </>
    );
};

export default GameStatus;
