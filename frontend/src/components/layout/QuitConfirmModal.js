import React from 'react';

export default function QuitConfirmModal({ visible, onConfirm, onCancel }) {
    if (!visible) return null;

    return (
        <div className='quit-confirm-overlay'>
            <div className='quit-confirm-card'>
                <p className='quit-confirm-title'>Quitter la partie ?</p>
                <p className='quit-confirm-sub'>Votre progression sera perdue.</p>
                <div className='quit-confirm-actions'>
                    <button className='quit-confirm-yes' onClick={onConfirm}>Quitter</button>
                    <button className='quit-confirm-no' onClick={onCancel}>Annuler</button>
                </div>
            </div>
        </div>
    );
}
