import React, { useState } from 'react';
import DiceFace from '../Dice/DiceFace';
import { isPossibleToBet } from '../../utils/bet';

function Stepper({ label, onMinus, onPlus, minusDisabled, plusDisabled, children }) {
    return (
        <div className='bet-stepper' role='group' aria-label={label}>
            <button type='button' className='bet-step' onClick={onMinus} disabled={minusDisabled} aria-label={`${label} moins`}>−</button>
            <div className='bet-stepper-value'>{children}</div>
            <button type='button' className='bet-step' onClick={onPlus} disabled={plusDisabled} aria-label={`${label} plus`}>+</button>
        </div>
    );
}

function BetHistory({ history, nom }) {
    return (
        <ol className='bet-history'>
            {[...history].reverse().map((h, i) => (
                <li key={history.length - i} className={i === 0 ? 'bet-history-last' : ''}>
                    <span className='bet-history-name'>{h.nom === nom ? 'Vous' : h.nom}</span>
                    <span className='bet-history-bet'>{h.count} × <DiceFace value={h.value} size={20} /></span>
                </li>
            ))}
        </ol>
    );
}

export default function BetControls({
    couldBet, currentTurnPlayer, currentBet, lastBettor, selection, setSelection,
    myTurn, totalDice, socket, diceColor, palifico, options, history = [], nom
}) {
    const [showHistory, setShowHistory] = useState(false);
    if (!couldBet) return null;

    const hasBet = currentBet.count != null && currentBet.value != null;
    const valueLocked = palifico && hasBet;
    const valid = isPossibleToBet(currentBet, selection, { palifico }) && (!totalDice || selection.count <= totalDice);
    const setCount = (count) => setSelection({ ...selection, count });
    const setValue = (value) => setSelection({ ...selection, value });

    const bet = () => {
        if (!valid) return;
        socket.emit('bet', { diceCount: selection.count, diceValue: selection.value });
    };

    return (
        <div className={`bet-panel ${myTurn ? 'bet-panel-active' : ''} ${palifico ? 'bet-panel-palifico' : ''}`}>
            <div className='bet-turn'>
                {myTurn ? '🎲 À vous de jouer !' : `⏳ Tour de ${currentTurnPlayer ?? '…'}`}
            </div>
            {palifico && (
                <div className='bet-palifico'>🌵 Palifico : les Paco ne sont pas jokers{hasBet ? ', valeur bloquée' : ''}</div>
            )}
            <div className='bet-current'>
                {hasBet ? (
                    <>
                        <span>{lastBettor ? `${lastBettor} ${lastBettor === 'Vous' ? 'avez' : 'a'} parié` : 'Pari actuel'}</span>
                        <strong>{currentBet.count} ×</strong>
                        <DiceFace value={currentBet.value} size={28} />
                    </>
                ) : (
                    <span>Aucun pari pour l’instant</span>
                )}
                {totalDice ? <span className='bet-total'>{totalDice} dés en jeu</span> : null}
                {history.length > 0 && (
                    <button
                        type='button'
                        className={`bet-history-toggle ${showHistory ? 'open' : ''}`}
                        onClick={() => setShowHistory(v => !v)}
                        aria-expanded={showHistory}
                    >
                        Historique ({history.length}) {showHistory ? '▾' : '▸'}
                    </button>
                )}
            </div>
            {showHistory && history.length > 0 && <BetHistory history={history} nom={nom} />}

            {myTurn && (
                <>
                    <div className='bet-row'>
                        <Stepper
                            label='Nombre'
                            onPlus={() => setCount(selection.count + 1)}
                            onMinus={() => setCount(selection.count - 1)}
                            plusDisabled={!!totalDice && selection.count >= totalDice}
                            minusDisabled={selection.count <= 1}
                        >
                            <span className='bet-count'>{selection.count}</span>
                        </Stepper>
                        <span className='bet-times'>×</span>
                        <Stepper
                            label='Valeur'
                            onPlus={() => setValue((selection.value % 6) + 1)}
                            onMinus={() => setValue(selection.value === 1 ? 6 : selection.value - 1)}
                            plusDisabled={valueLocked}
                            minusDisabled={valueLocked}
                        >
                            <DiceFace value={selection.value} color={diceColor} size={48} />
                        </Stepper>
                    </div>

                    <div className={`bet-actions ${options?.calza && hasBet ? 'bet-actions-3' : ''}`}>
                        <button type='button' className='betButton' onClick={bet} disabled={!valid}>
                            {valid ? `Parier ${selection.count} × ${selection.value}` : 'Pari trop bas'}
                        </button>
                        {hasBet && (
                            <button type='button' className='liarButton' onClick={() => socket.emit('liar')}>
                                Menteur !
                            </button>
                        )}
                        {hasBet && options?.calza && (
                            <button type='button' className='calzaButton' onClick={() => socket.emit('calza')}>
                                Calza !
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
