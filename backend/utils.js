const { SOCKET_EVENTS } = require('./constants');

/**
 * Validates that a player is logged in
 * @param {Object} joueur - The player object
 * @param {Object} socket - The socket object
 * @returns {boolean} - True if player is valid, false otherwise
 */
function validatePlayer(joueur, socket) {
    if (!joueur || !joueur.socket) {
        socket.emit(SOCKET_EVENTS.ERROR, { 
            message: "Erreur vous devez être connecté" 
        });
        return false;
    }
    return true;
}

/**
 * Validates that a group exists
 * @param {Object} group - The group object
 * @param {Object} socket - The socket object
 * @returns {boolean} - True if group is valid, false otherwise
 */
function validateGroup(group, socket) {
    if (!group) {
        socket.emit(SOCKET_EVENTS.ERROR, { 
            message: "Le groupe n'existe pas." 
        });
        return false;
    }
    return true;
}

/**
 * Validates bet data
 * @param {Object} data - The bet data
 * @param {Object} socket - The socket object
 * @returns {boolean} - True if valid, false otherwise
 */
function validateBetData(data, socket) {
    if (!data || typeof data.diceCount !== 'number' || typeof data.diceValue !== 'number') {
        socket.emit(SOCKET_EVENTS.ERROR, { 
            message: "Données de pari invalides" 
        });
        return false;
    }
    if (data.diceValue < 1 || data.diceValue > 6) {
        socket.emit(SOCKET_EVENTS.ERROR, { 
            message: "La valeur du dé doit être entre 1 et 6" 
        });
        return false;
    }
    if (data.diceCount < 1) {
        socket.emit(SOCKET_EVENTS.ERROR, { 
            message: "Le nombre de dés doit être au moins 1" 
        });
        return false;
    }
    return true;
}

/**
 * Validates dice roll result
 * @param {number} result - The dice roll result
 * @param {Object} socket - The socket object
 * @returns {boolean} - True if valid, false otherwise
 */
function validateDiceRoll(result, socket) {
    if (typeof result !== 'number' || result < 1 || result > 6) {
        socket.emit(SOCKET_EVENTS.ERROR, { 
            message: "Résultat de dé invalide" 
        });
        return false;
    }
    return true;
}

module.exports = {
    validatePlayer,
    validateGroup,
    validateBetData,
    validateDiceRoll
};
