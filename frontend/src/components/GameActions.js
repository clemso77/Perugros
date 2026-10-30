import { useEffect, useRef, useState } from 'react';
import { rememberColor } from '../socket';

const GameActions = ({ gameStarted, group, inputGroup, setInputGroup, socket, chef, setDC, color, playerCount, onRename }) => {
    const [joinError, setJoinError] = useState(null);
    const [copyMessage, setCopyMessage] = useState(null);
    const copyMessageTimeoutRef = useRef(null);

    const handleColorChange = (event) => {
        socket.emit('diceColor', event.target.value);
        rememberColor(event.target.value);
        setDC(event.target.value);
    };

    const createPartie = () => {
        socket.emit('createPartie');
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
            setJoinError("Veuillez entrer un ID de partie valide.");
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
            await copyText(group);
            showCopyMessage('ID copié');
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
                showCopyMessage('Lien copié');
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

    const enoughPlayers = (playerCount ?? 0) >= 2;

    return (
        <div className="action-section">

            {!group && <button onClick={createPartie}>Créer une Partie</button>}
            {!group && (
                <form className="join-section" onSubmit={joinPartie}>
                    <input
                        type="text"
                        placeholder="ID de la Partie"
                        value={inputGroup}
                        onChange={(e) => setInputGroup(e.target.value)}
                        autoCapitalize="none"
                        autoCorrect="off"
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={8}
                    />
                    <button type="submit">Rejoindre la Partie</button>
                    {joinError && <p className='error'>{joinError}</p>}
                </form>
            )}

            {group && !gameStarted && (
                <>
                    <div className='partieInfo'>
                        <p>ID : <strong>{group}</strong></p>
                        <button type='button' className='copy-id-btn' onClick={copyGroupId} aria-label='Copier ID de partie'>
                            <img src='/texture/icon/copy.png' alt='' />
                        </button>
                    </div>
                    <button type='button' className='share-btn' onClick={shareGroup}>Inviter des amis</button>
                    {copyMessage && <p className='info'>{copyMessage}</p>}

                    {chef ? (
                        <button onClick={startGame} disabled={!enoughPlayers}>
                            {enoughPlayers ? 'Démarrer le Jeu' : 'En attente de joueurs…'}
                        </button>
                    ) : (
                        <p className='lobby-hint'>En attente du lancement par le chef 👑</p>
                    )}
                    <button className='secondary-btn' onClick={quitGroupe}>Quitter le groupe</button>
                </>
            )}

            {!gameStarted && (
                <label className='color-picker'>
                    <span>Couleur de mes dés</span>
                    <input
                        type="color"
                        id="diceColorPicker"
                        name="diceColor"
                        value={color}
                        onChange={handleColorChange}
                    />
                </label>
            )}

            {!group && (
                <button type='button' className='link-btn' onClick={onRename}>Changer de nom</button>
            )}
        </div>
    );
};

export default GameActions;
