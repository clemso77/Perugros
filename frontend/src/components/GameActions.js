import React, { useState } from 'react';

const GameActions = ({ gameStarted, group, inputGroup, setInputGroup, socket, chef, dc, dv, setDC, color }) => {
    const [diceCount, setDiceCount] = useState(dc); // Nombre de dés
    const [diceValue, setDiceValue] = useState(dv); // Valeur des dés

    const bet = () => {
        if (chef && gameStarted) {
            if (diceCount && diceValue) {
                socket.emit('bet', { diceCount, diceValue });
            } else {
                socket.emit("error", { message: "Veuillez entrer un nombre de dés et une valeur valide." });
            }
        } else {
            socket.emit("error", { message: "Ce n'est pas votre tour ou le jeu n'a pas encore commencé !" });
        }
    };

    const handleColorChange = (event) => {
        socket.emit('diceColor', event.target.value);
        setDC(event.target.value);
    };

    const accuseLiar = () => {
        if (gameStarted && chef) {
            socket.emit('accuseLiar')
        } else {
            socket.emit("error", { message: "Le jeu n'a pas encore commencé." });
        }
    };

    const createPartie = () => {
        socket.emit('createPartie');
    };

    const quitGroupe = () => {
        socket.emit('quitGroupe');
    }
    const joinPartie = () => {
        if (inputGroup) {
            socket.emit('joinPartie', inputGroup);
        } else {
            socket.emit("error", { message: "Veuillez entrer un ID de partie valide." });
        }
    };

    const startGame = () => {
        socket.emit('startGame');
    };

    return (
        <div className="action-section">
            {gameStarted && (
                <>
                    <div>
                        <input
                            type="number"
                            placeholder="Nombre de dés"
                            value={diceCount}
                            onChange={(e) => setDiceCount(e.target.value)}
                            min="1"
                        />
                        <input
                            type="number"
                            placeholder="Valeur des dés"
                            value={diceValue}
                            onChange={(e) => setDiceValue(e.target.value)}
                            min="1" max="6"
                        />
                    </div>
                    <button onClick={bet} disabled={!group || !chef || !gameStarted}>Parier</button>
                    <button onClick={accuseLiar} disabled={!gameStarted || !chef}>Mensonge</button>
                </>
            )}

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
            </div>}
            {group && !gameStarted && <div>
                <button onClick={quitGroupe}>Quitter le groupe</button>
            </div>}
            {group && !gameStarted && (
                <div className='partieInfo'>
                    ID : {group}
                    <img src='/texture/icon/copy.png' alt='' onClick={() => {
                        navigator.clipboard.writeText(group) // Passer directement group sans accolades
                            .then(() => {
                                alert("Copied the text: " + group); // Enlever les accolades ici aussi
                            })
                            .catch(err => {
                                console.error("Failed to copy: ", err);
                            });
                    }} />
                </div>
            )}
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
