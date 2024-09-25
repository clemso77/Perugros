import React, {  } from 'react';
const GameActions = ({ chef, gameStarted, group, inputGroup, setInputGroup, socket, diceResult}) => {
    const rollDice = () => {
        if (chef && gameStarted) {
            socket.emit('rollDice');
        } else {
            socket.emit("error", {message: "Ce n'est pas votre tour ou le jeu n'a pas encore commencé !"});
        }
    };

    const createPartie = () => {
        socket.emit('createPartie');
    };

    const joinPartie = () => {
        if (inputGroup) {
            socket.emit('joinPartie', inputGroup);
        } else {
            socket.emit("error", {message: "Veuillez entrer un ID de partie valide."});
        }
    };

    const startGame = () => {
        socket.emit('startGame');
    };

    return (
        <div className="action-section">
            <button onClick={rollDice} disabled={!group || !chef || !gameStarted}>Lancer les dés</button>
            {diceResult && <p>Résultat du dé : {diceResult}</p>}
            
            {!group && <button onClick={createPartie}>Créer une Partie</button>}
            {group && !gameStarted && <button onClick={startGame} disabled={!chef}>Démarrer le Jeu</button>}
            {chef && !gameStarted && <p>Vous êtes le chef du groupe</p>}
            <div className="join-section">
                <input
                    type="text"
                    placeholder="ID de la Partie"
                    value={inputGroup}
                    onChange={(e) => setInputGroup(e.target.value)}
                />
                {!group && <button onClick={joinPartie}>Rejoindre la Partie</button>}
            </div>
        </div>
    );
};

export default GameActions;
