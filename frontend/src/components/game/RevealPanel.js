import React, { useEffect, useState } from 'react';
import DiceFace from '../Dice/DiceFace';
import { feedback } from '../../utils/feedback';
import useReportHeight from '../../hooks/useReportHeight';

/**
 * Pendant un « Menteur » ou une « Calza » : les dés de chaque joueur sous son nom,
 * les dés qui comptent s'allument un par un et le total monte jusqu'au verdict.
 */
export default function RevealPanel({ socket, nom, onHeight }) {
    const panelRef = useReportHeight(onHeight);
    const [reveal, setReveal] = useState(null);
    const [counted, setCounted] = useState({});
    const [total, setTotal] = useState(0);
    const [done, setDone] = useState(false);

    useEffect(() => {
        const onReveal = (data) => {
            setReveal(data);
            setCounted({});
            setTotal(0);
            setDone(false);
        };
        const onShowDice = (data) => {
            if (!data?.reveal) return;
            const { nom: owner, index, total: newTotal } = data.reveal;
            setCounted(prev => ({ ...prev, [`${owner}#${index}`]: true }));
            setTotal(newTotal);
            feedback('tick', { step: newTotal });
        };
        const onEvaluated = () => setDone(true);
        const onHide = () => setReveal(null);

        socket.on('reveal', onReveal);
        socket.on('showDice', onShowDice);
        socket.on('liarEvaluated', onEvaluated);
        socket.on('clearDice', onHide);
        socket.on('gameEnded', onHide);
        socket.on('partieQuit', onHide);
        return () => {
            socket.off('reveal', onReveal);
            socket.off('showDice', onShowDice);
            socket.off('liarEvaluated', onEvaluated);
            socket.off('clearDice', onHide);
            socket.off('gameEnded', onHide);
            socket.off('partieQuit', onHide);
        };
    }, [socket]);

    if (!reveal) return null;

    const reached = total >= reveal.diceCount;

    return (
        <div ref={panelRef} className='reveal-panel' aria-live='polite'>
            <div className='reveal-header'>
                <span>Pari : <strong>{reveal.diceCount} ×</strong></span>
                <DiceFace value={reveal.diceValue} size={26} />
                <span className='reveal-rule'>{reveal.wild ? 'Paco jokers' : 'Paco non jokers'}</span>
            </div>
            <div className={`reveal-total ${reached ? 'reveal-total-reached' : ''}`}>
                <span className='reveal-total-count' key={total}>{total}</span>
                <span className='reveal-total-target'>/ {reveal.diceCount}</span>
            </div>
            <ul className='reveal-hands'>
                {reveal.hands.map(hand => (
                    <li key={hand.nom} className='reveal-hand'>
                        <span className='reveal-hand-name'>{hand.nom === nom ? 'Vous' : hand.nom}</span>
                        <span className='reveal-hand-dice'>
                            {hand.des.map((value, index) => {
                                const isCounted = counted[`${hand.nom}#${index}`];
                                return (
                                    <span
                                        key={index}
                                        className={`reveal-die ${isCounted ? 'reveal-die-counted' : ''} ${done && !isCounted ? 'reveal-die-dim' : ''}`}
                                    >
                                        <DiceFace value={value} color={hand.couleur} size={26} />
                                    </span>
                                );
                            })}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
