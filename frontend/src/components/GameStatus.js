import React, { useCallback, useEffect, useRef, useState } from 'react';
import Toast from './Toast';
import { feedback } from '../utils/feedback';

const MAX_VISIBLE = 3;
const ROLLING_STATUS = "En attente du résultat des dés";

const GameStatus = ({ socket, currentTurnPlayer, playerName, hideBanner, spectator }) => {
    const [notifications, setNotifications] = useState([]);
    const [status, setStatus] = useState(null);
    const nextId = useRef(0);

    const push = useCallback((message, type) => {
        if (!message) return;
        setNotifications(list => {
            // Pas de doublon si le même message est déjà affiché
            if (list.some(n => n.message === message && n.type === type)) return list;
            return [...list.slice(-(MAX_VISIBLE - 1)), { id: ++nextId.current, message, type }];
        });
    }, []);

    const remove = useCallback((id) => {
        setNotifications(list => list.filter(n => n.id !== id));
    }, []);

    useEffect(() => {
        const onError = (data) => push(data?.message || 'Une erreur est survenue', 'error');
        const onNotify = (data) => {
            if (data?.kind === 'join') feedback('join');
            push(data?.message, data?.kind || 'info');
        };
        // Message d'état persistant (ex : attente des dés), affiché tant que le serveur ne l'efface pas
        const onMessage = (data) => setStatus(data?.message || null);
        const onSyncState = (state) => setStatus(state.game?.phase === 'rolling' ? ROLLING_STATUS : null);
        const onReset = () => setStatus(null);

        socket.on('error', onError);
        socket.on('notify', onNotify);
        socket.on('message', onMessage);
        socket.on('syncState', onSyncState);
        socket.on('partieQuit', onReset);
        socket.on('gameEnded', onReset);
        return () => {
            socket.off('error', onError);
            socket.off('notify', onNotify);
            socket.off('message', onMessage);
            socket.off('syncState', onSyncState);
            socket.off('partieQuit', onReset);
            socket.off('gameEnded', onReset);
        };
    }, [socket, push]);

    const isMyTurn = playerName && currentTurnPlayer && playerName === currentTurnPlayer;

    return (
        <>
            {status && !hideBanner && <div className='status-pill'>{status}…</div>}

            {currentTurnPlayer && !hideBanner && (
                <div className={`turn-banner ${isMyTurn ? 'turn-banner-mine' : ''}`}>
                    {spectator && '👀 '}
                    {isMyTurn
                        ? '🎲 C\'est votre tour !'
                        : `⏳ Tour de ${currentTurnPlayer}`}
                </div>
            )}

            <div className='toast-stack'>
                {notifications.map(n => (
                    <Toast
                        key={n.id}
                        stacked
                        message={n.message}
                        type={n.type}
                        duration={n.type === 'error' ? 4500 : 3500}
                        onDone={() => remove(n.id)}
                    />
                ))}
            </div>
        </>
    );
};

export default GameStatus;
