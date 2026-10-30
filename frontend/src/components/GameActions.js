import { useEffect, useRef, useState } from 'react';
import { rememberColor } from '../socket';

const SWATCHES = ['#ffffff', '#e63946', '#f4a261', '#ffd166', '#2a9d8f', '#457b9d', '#9b5de5', '#222222'];

function ColorPicker({ color, onChange }) {
    const isCustom = !SWATCHES.includes(color?.toLowerCase());
    return (
        <div className='color-picker'>
            <span className='menu-label'>Couleur de mes dés</span>
            <div className='swatches'>
                {SWATCHES.map(c => (
                    <button
                        key={c}
                        type='button'
                        className={`swatch ${color?.toLowerCase() === c ? 'swatch-selected' : ''}`}
                        style={{ background: c }}
                        onClick={() => onChange(c)}
                        aria-label={`Couleur ${c}`}
                    />
                ))}
                <label className={`swatch swatch-custom ${isCustom ? 'swatch-selected' : ''}`} aria-label='Couleur personnalisée'
                       style={isCustom ? { background: color } : undefined}>
                    <input type='color' value={color} onChange={(e) => onChange(e.target.value)} />
                </label>
            </div>
        </div>
    );
}

const MODES = [
    { id: 'classique', icon: '🎲', title: 'Classique', description: 'Parier ou crier Menteur.', options: { calza: false, palifico: false } },
    { id: 'calza', icon: '🎯', title: 'Calza', description: 'Annoncer que le pari est exact : +1 dé.', options: { calza: true, palifico: false } },
    { id: 'palifico', icon: '🌵', title: 'Palifico', description: 'À 1 dé : Paco non jokers, valeur bloquée.', options: { calza: false, palifico: true } },
    { id: 'complet', icon: '⭐', title: 'Complet', description: 'Calza et Palifico.', options: { calza: true, palifico: true } }
];
const MODE_KEY = 'perugrosMode';

export function modeOf(options) {
    return MODES.find(m => m.options.calza === !!options?.calza && m.options.palifico === !!options?.palifico) || MODES[0];
}

function loadLastOptions() {
    try {
        const saved = JSON.parse(localStorage.getItem(MODE_KEY));
        if (saved && typeof saved === 'object') return { calza: !!saved.calza, palifico: !!saved.palifico, loserStarts: !!saved.loserStarts };
    } catch {
        // ignoré
    }
    return { calza: false, palifico: false, loserStarts: false };
}

function saveLastOptions(options) {
    try {
        localStorage.setItem(MODE_KEY, JSON.stringify(options));
    } catch {
        // ignoré
    }
}

/** Choix du mode de jeu à la création de la partie ; dans le salon, simple rappel non modifiable. */
function ModePicker({ options, editable, onChange }) {
    const current = modeOf(options);
    if (!editable) {
        return (
            <div className='mode-summary'>
                <span className='menu-label'>Mode de jeu</span>
                <div className='mode-summary-value'>
                    <span>{current.icon} <strong>{current.title}</strong></span>
                    {options?.loserStarts && <span className='mode-tag'>le perdant commence</span>}
                </div>
                <small>{current.description}</small>
            </div>
        );
    }
    return (
        <div className='mode-picker'>
            <span className='menu-label'>Mode de jeu</span>
            <div className='mode-grid' role='radiogroup' aria-label='Mode de jeu'>
                {MODES.map(m => (
                    <button
                        key={m.id}
                        type='button'
                        role='radio'
                        aria-checked={current.id === m.id}
                        className={`mode-card ${current.id === m.id ? 'mode-card-selected' : ''}`}
                        onClick={() => onChange({ ...options, ...m.options })}
                    >
                        <span className='mode-card-icon'>{m.icon}</span>
                        <strong>{m.title}</strong>
                        <small>{m.description}</small>
                    </button>
                ))}
            </div>
            <label className='variant'>
                <span className='variant-text'>
                    <strong>Le perdant commence</strong>
                    <small>Après un défi, le perdant ouvre la manche (sinon le gagnant).</small>
                </span>
                <input
                    type='checkbox'
                    className='switch'
                    checked={!!options?.loserStarts}
                    onChange={(e) => onChange({ ...options, loserStarts: e.target.checked })}
                />
            </label>
        </div>
    );
}

const GameActions = ({ group, inputGroup, setInputGroup, socket, chef, setDC, color, players, nom, options }) => {
    const [joinError, setJoinError] = useState(null);
    const [copyMessage, setCopyMessage] = useState(null);
    const copyMessageTimeoutRef = useRef(null);
    const [creating, setCreating] = useState(false);
    const [newOptions, setNewOptions] = useState(loadLastOptions);

    const changeColor = (value) => {
        socket.emit('diceColor', value);
        rememberColor(value);
        setDC(value);
    };

    const createPartie = () => {
        saveLastOptions(newOptions);
        socket.emit('createPartie', { options: newOptions });
        setCreating(false);
    };


    const quitGroupe = () => {
        socket.emit('quitGroupe');
    };

    const joinPartie = (event) => {
        event.preventDefault();
        if (inputGroup.trim()) {
            setJoinError(null);
            socket.emit('joinPartie', inputGroup.trim());
        } else {
            setJoinError("Entrez le code de la partie.");
        }
    };

    const startGame = () => {
        socket.emit('startGame');
    };

    const showCopyMessage = (message) => {
        setCopyMessage(message);
        if (copyMessageTimeoutRef.current) {
            clearTimeout(copyMessageTimeoutRef.current);
        }
        copyMessageTimeoutRef.current = setTimeout(() => setCopyMessage(null), 2000);
    };

    const copyText = async (text) => {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return;
        }
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    };

    const copyGroupId = async () => {
        if (!group) return;
        try {
            await copyText(group.toUpperCase());
            showCopyMessage('Code copié !');
        } catch {
            showCopyMessage('Impossible de copier');
        }
    };

    // Sur mobile : ouvre le menu de partage natif (SMS, WhatsApp...) avec un lien direct
    const shareGroup = async () => {
        if (!group) return;
        const url = `${window.location.origin}/?partie=${group}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: 'Perugros', text: 'Rejoins ma partie de Perugros !', url });
            } else {
                await copyText(url);
                showCopyMessage('Lien copié !');
            }
        } catch (err) {
            if (err?.name !== 'AbortError') showCopyMessage('Impossible de partager');
        }
    };

    useEffect(() => () => {
        if (copyMessageTimeoutRef.current) {
            clearTimeout(copyMessageTimeoutRef.current);
        }
    }, []);

    if (!group && creating) {
        return (
            <div className="action-section menu-card">
                <p className='menu-greeting'>Nouvelle partie</p>
                <ModePicker options={newOptions} editable onChange={setNewOptions} />
                <button className='btn-primary' onClick={createPartie}>
                    {modeOf(newOptions).icon} Créer la partie {modeOf(newOptions).title}
                </button>
                <button type='button' className='link-btn' onClick={() => setCreating(false)}>Retour</button>
            </div>
        );
    }

    if (!group) {
        return (
            <div className="action-section menu-card">
                <p className='menu-greeting'>Salut <strong>{nom}</strong> 👋</p>
                <button className='btn-primary' onClick={() => setCreating(true)}>🎲 Créer une partie</button>

                <div className='menu-divider'><span>ou rejoindre des amis</span></div>

                <form className="join-row" onSubmit={joinPartie}>
                    <input
                        type="text"
                        className='code-input'
                        placeholder="CODE"
                        value={inputGroup}
                        onChange={(e) => setInputGroup(e.target.value)}
                        autoCapitalize="characters"
                        autoCorrect="off"
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={8}
                        enterKeyHint="go"
                        aria-label='Code de la partie'
                    />
                    <button type="submit" className='btn-secondary'>Rejoindre</button>
                </form>
                {joinError && <p className='form-error'>{joinError}</p>}

                <ColorPicker color={color} onChange={changeColor} />
            </div>
        );
    }

    const enoughPlayers = players.length >= 2;
    const owner = players.find(p => p.owner);
    // La liste des joueurs fait foi : elle est rediffusée à chaque arrivée/départ
    const isOwner = owner ? owner.nom === nom : chef;

    return (
        <div className="action-section menu-card">
            <div className='lobby-code'>
                <span className='menu-label'>Code de la partie</span>
                <button type='button' className='lobby-code-value' onClick={copyGroupId} aria-label='Copier le code'>
                    {group.toUpperCase()}
                    <img src='/texture/icon/copy.png' alt='' />
                </button>
            </div>
            <button type='button' className='btn-share' onClick={shareGroup}>📤 Inviter des amis</button>
            {copyMessage && <p className='copy-feedback'>{copyMessage}</p>}

            <div className='lobby-players-header'>
                <span className='menu-label'>Joueurs</span>
                <span className='lobby-count'>{players.length}</span>
            </div>
            <ul className='lobby-players'>
                {players.map(p => (
                    <li key={p.nom} className={`lobby-player ${p.connected ? '' : 'lobby-player-offline'}`}>
                        <span className='lobby-player-dot' style={{ background: p.couleur }} />
                        <span className='lobby-player-name'>{p.nom}</span>
                        {p.nom === nom && <span className='lobby-tag'>vous</span>}
                        {p.owner && <span title='Chef'>👑</span>}
                        {!p.connected && <span className='lobby-player-status'>hors ligne</span>}
                    </li>
                ))}
                {!enoughPlayers && (
                    <li className='lobby-player lobby-player-placeholder'>
                        <span className='lobby-player-dot' />
                        En attente d’un autre joueur…
                    </li>
                )}
            </ul>

            <ModePicker options={options} />

            {isOwner ? (
                <button className='btn-primary' onClick={startGame} disabled={!enoughPlayers}>
                    {enoughPlayers ? `Lancer la partie (${players.length} joueurs)` : 'Il faut au moins 2 joueurs'}
                </button>
            ) : (
                <p className='lobby-hint'>⏳ En attente du lancement par {owner?.nom ?? 'le chef'}</p>
            )}

            <ColorPicker color={color} onChange={changeColor} />

            <button type='button' className='link-btn' onClick={quitGroupe}>Quitter le salon</button>
        </div>
    );
};

export default GameActions;
