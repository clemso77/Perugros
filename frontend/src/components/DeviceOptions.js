import React, { useEffect, useState } from 'react';
import { canPromptInstall, isIos, isStandalone, onInstallAvailabilityChange, promptInstall } from '../utils/install';

const DISMISS_KEY = 'perugrosInstallDismissed';

function wasDismissed() {
    try {
        return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
        return false;
    }
}

/** Sous le menu : proposition d'installer l'app sur l'écran d'accueil. */
export default function DeviceOptions() {
    const [installable, setInstallable] = useState(canPromptInstall());
    const [dismissed, setDismissed] = useState(wasDismissed());

    useEffect(() => onInstallAvailabilityChange(() => setInstallable(canPromptInstall())), []);

    const standalone = isStandalone();
    const showIosHint = !standalone && isIos() && !dismissed;
    const showInstall = !standalone && installable && !dismissed;
    if (!showIosHint && !showInstall) return null;

    const dismiss = () => {
        setDismissed(true);
        try {
            localStorage.setItem(DISMISS_KEY, '1');
        } catch {
            // ignoré
        }
    };

    return (
        <div className='device-options'>
            <div className='device-card'>
                {showInstall ? (
                    <span>📲 Installez Perugros pour jouer en plein écran.</span>
                ) : (
                    <span>
                        📲 Pour jouer en plein écran : touchez <strong>Partager</strong> puis
                        <strong> « Sur l’écran d’accueil »</strong>.
                    </span>
                )}
                <div className='device-card-actions'>
                    {showInstall && (
                        <button type='button' className='device-btn' onClick={() => promptInstall().then(() => setInstallable(canPromptInstall()))}>
                            Installer
                        </button>
                    )}
                    <button type='button' className='device-link' onClick={dismiss}>{showInstall ? 'Plus tard' : 'Compris'}</button>
                </div>
            </div>
        </div>
    );
}
