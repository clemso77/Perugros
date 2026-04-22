import React, { useCallback, useEffect, useState } from 'react';
import Toast from './Toast';

const GameStatus = ({ socket, currentTurnPlayer, playerName, couldBet }) => {
    const [errorMsg, setErrorMsg] = useState(null);
    const [infoMsg, setInfoMsg] = useState(null);

    const clearError = useCallback(() => setErrorMsg(null), []);
    const clearInfo = useCallback(() => setInfoMsg(null), []);

    useEffect(() => {
        const onError = (data) => {
            setErrorMsg(data?.message || 'Une erreur est survenue');
        };
        const onMessage = (data) => {
            if (data.message) {
                setInfoMsg(data.message);
            } else {
                setInfoMsg(null);
            }
        };

        socket.on('error', onError);
        socket.on('message', onMessage);

        return () => {
            socket.off('error', onError);
            socket.off('message', onMessage);
        };
    }, [socket]);

    useEffect(() => {
        if (couldBet) {
            setInfoMsg(null);
        }
    }, [couldBet])

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
            <Toast message={infoMsg} type="info" onDone={clearInfo} duration={100000} />
            <Toast message={errorMsg} type="error" onDone={clearError} duration={4500} />
        </>
    );
};

export default GameStatus;
