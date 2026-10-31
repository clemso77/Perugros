import React, { useEffect, useState } from 'react';
import { isMuted, setMuted, feedback, unlockAudio } from '../../utils/feedback';
import { isIos } from '../../utils/install';
import { modeOf } from '../GameActions';

export default function TopBar({ isConnected, gameStarted, onQuit, options }) {
    const [muted, setMutedState] = useState(isMuted());
    const [hint, setHint] = useState(false);

    useEffect(() => {
        if (!hint) return;
        const t = setTimeout(() => setHint(false), 5000);
        return () => clearTimeout(t);
    }, [hint]);

    if (!isConnected) return null;

    const toggleSound = () => {
        const nextMuted = !muted;
        setMuted(nextMuted);
        setMutedState(nextMuted);
        if (!nextMuted) {
            // Le toucher sur ce bouton débloque l'audio : on joue un son de test
            unlockAudio();
            feedback('turn');
            if (isIos()) setHint(true);
        }
    };

    return (
        <div className='top-actions'>
            {hint && (
                <div className='sound-hint' role='status'>
                    🔔 Pas de son ? Désactivez le mode silencieux de l’iPhone (bouton sur le côté).
                </div>
            )}
            {gameStarted && options && (
                <span className='mode-badge' title={`Mode ${modeOf(options).title}`}>
                    {modeOf(options).icon}<span className='mode-badge-title'> {modeOf(options).title}</span>
                </span>
            )}
            <button
                type='button'
                className='icon-btn'
                onClick={toggleSound}
                aria-label={muted ? 'Activer le son' : 'Couper le son'}
                aria-pressed={muted}
            >
                {muted ? '🔇' : '🔊'}
            </button>
            {gameStarted && (
                <button className='quit-btn' onClick={onQuit} aria-label="Quitter la partie">
                    ✕
                </button>
            )}
        </div>
    );
}
