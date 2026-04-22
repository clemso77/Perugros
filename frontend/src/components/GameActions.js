import { useEffect, useRef, useState } from 'react';

const GameActions = ({ gameStarted, group, inputGroup, setInputGroup, socket, chef, setDC, color }) => {
    const [joinError, setJoinError] = useState(null);
    const [copyMessage, setCopyMessage] = useState(null);
    const copyMessageTimeoutRef = useRef(null);

    const handleColorChange = (event) => {
        socket.emit('diceColor', event.target.value);
        setDC(event.target.value);
    };

    const createPartie = () => {
        socket.emit('createPartie');
    };

    const quitGroupe = () => {
        socket.emit('quitGroupe');
    }
    const joinPartie = () => {
        if (inputGroup) {
            setJoinError(null);
            socket.emit('joinPartie', inputGroup);
        } else {
            setJoinError("Veuillez entrer un ID de partie valide.");
        }
    };

    const startGame = () => {
        socket.emit('startGame');
    };

    const copyGroupId = async () => {
        if (!group) return;
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(group);
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = group;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setCopyMessage('ID copié');
        } catch {
            setCopyMessage('Impossible de copier');
        }
        if (copyMessageTimeoutRef.current) {
            clearTimeout(copyMessageTimeoutRef.current);
        }
        copyMessageTimeoutRef.current = setTimeout(() => setCopyMessage(null), 2000);
    };

    useEffect(() => () => {
        if (copyMessageTimeoutRef.current) {
            clearTimeout(copyMessageTimeoutRef.current);
        }
    }, []);

    return (
        <div className="action-section">

            {!group && <button onClick={createPartie}>Créer une Partie</button>}
            {group && !gameStarted && chef && <button onClick={startGame} disabled={!chef}>Démarrer le Jeu</button>}
            {chef && !gameStarted && <p>Vous êtes le chef du groupe</p>}
            {!group && <div className="join-section">
                <input
                    type="text"
                    placeholder="ID de la Partie"
                    value={inputGroup}
                    onChange={(e) => setInputGroup(e.target.value)}
                />
                {!group && <button onClick={joinPartie}>Rejoindre la Partie</button>}
                {joinError && <p className='error'>{joinError}</p>}
            </div>}
            {group && !gameStarted && <div>
                <button onClick={quitGroupe}>Quitter le groupe</button>
            </div>}
            {group && !gameStarted && (
                <div className='partieInfo'>
                    <p>ID : {group}</p>
                    <button type='button' className='copy-id-btn' onClick={copyGroupId} aria-label='Copier ID de partie' style={{ padding: '0'}}>
                        <img src='/texture/icon/copy.png' alt='' />
                    </button>
                </div>
            )}
            {copyMessage && <p className='info'>{copyMessage}</p>}
            {!gameStarted && (
                <div>
                    <input
                        type="color"
                        id="diceColorPicker"
                        name="diceColor"
                        value={color}
                        onChange={handleColorChange}
                        style={{ marginBottom: '10px' }}
                    />
                </div>
            )}
        </div>
    );
};

export default GameActions;
