import React from 'react';
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

export default function BetControls({ couldBet, currentTurnPlayer, currentBet, selection, setSelection, myTurn, totalDice, socket, diceColor }) {
    if (!couldBet) return null;

    const hasBet = currentBet.count != null && currentBet.value != null;
    const valid = isPossibleToBet(currentBet, selection) && (!totalDice || selection.count <= totalDice);
    const setCount = (count) => setSelection({ ...selection, count });
    const setValue = (value) => setSelection({ ...selection, value });

    const bet = () => {
        if (!valid) return;
        socket.emit('bet', { diceCount: selection.count, diceValue: selection.value });
    };

    return (
        <div className={`bet-panel ${myTurn ? 'bet-panel-active' : ''}`}>
            <div className='bet-turn'>
                {myTurn ? '🎲 À vous de jouer !' : `⏳ Tour de ${currentTurnPlayer ?? '…'}`}
            </div>
            <div className='bet-current'>
                {hasBet ? (
                    <>
                        <span>Pari actuel</span>
                        <strong>{currentBet.count} ×</strong>
                        <DiceFace value={currentBet.value} size={28} />
                    </>
                ) : (
                    <span>Aucun pari pour l’instant</span>
                )}
                {totalDice ? <span className='bet-total'>{totalDice} dés en jeu</span> : null}
            </div>

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
                        >
                            <DiceFace value={selection.value} color={diceColor} size={48} />
                        </Stepper>
                    </div>

                    <div className='bet-actions'>
                        <button type='button' className='betButton' onClick={bet} disabled={!valid}>
                            {valid ? `Parier ${selection.count} × ${selection.value}` : 'Pari trop bas'}
                        </button>
                        {hasBet && (
                            <button type='button' className='liarButton' onClick={() => socket.emit('liar')}>
                                Menteur !
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
