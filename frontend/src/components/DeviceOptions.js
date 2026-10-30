import React, { useEffect, useState } from 'react';
import { enablePush, pushPermission, pushSupported } from '../utils/push';
import { canPromptInstall, isIos, isStandalone, onInstallAvailabilityChange, promptInstall } from '../utils/install';

const DISMISS_KEY = 'perugrosInstallDismissed';

function wasDismissed() {
    try {
        return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
        return false;
    }
}

/** Sous le menu : installation de l'app et notifications « c'est votre tour ». */
export default function DeviceOptions({ socket }) {
    const [installable, setInstallable] = useState(canPromptInstall());
    const [dismissed, setDismissed] = useState(wasDismissed());
    const [permission, setPermission] = useState(pushPermission());
    const [pushError, setPushError] = useState(null);

    useEffect(() => onInstallAvailabilityChange(() => setInstallable(canPromptInstall())), []);

    const standalone = isStandalone();
    const showIosHint = !standalone && isIos() && !dismissed;
    const showInstall = !standalone && installable && !dismissed;

    const dismiss = () => {
        setDismissed(true);
        try {
            localStorage.setItem(DISMISS_KEY, '1');
        } catch {
            // ignoré
        }
    };

    const activatePush = async () => {
        setPushError(null);
        try {
            await enablePush(socket);
        } catch (err) {
            setPushError(err?.message === 'denied'
                ? 'Notifications bloquées : autorisez-les dans les réglages du navigateur.'
                : 'Impossible d’activer les notifications.');
        }
        setPermission(pushPermission());
    };

    return (
        <div className='device-options'>
            {showInstall && (
                <div className='device-card'>
                    <span>📲 Installez Perugros pour jouer en plein écran et être prévenu de votre tour.</span>
                    <div className='device-card-actions'>
                        <button type='button' className='device-btn' onClick={() => promptInstall().then(() => setInstallable(canPromptInstall()))}>
                            Installer
                        </button>
                        <button type='button' className='device-link' onClick={dismiss}>Plus tard</button>
                    </div>
                </div>
            )}
            {showIosHint && (
                <div className='device-card'>
                    <span>
                        📲 Pour installer l’app : touchez <strong>Partager</strong> <span aria-hidden>⬆️</span> puis
                        <strong> « Sur l’écran d’accueil »</strong>. Nécessaire sur iPhone pour les notifications.
                    </span>
                    <div className='device-card-actions'>
                        <button type='button' className='device-link' onClick={dismiss}>Compris</button>
                    </div>
                </div>
            )}
            {pushSupported() && permission !== 'granted' && (
                <button type='button' className='device-btn device-btn-wide' onClick={activatePush} disabled={permission === 'denied'}>
                    🔔 Me prévenir quand c’est mon tour
                </button>
            )}
            {permission === 'granted' && <p className='device-ok'>🔔 Notifications de tour activées</p>}
            {pushError && <p className='device-error'>{pushError}</p>}
        </div>
    );
}
