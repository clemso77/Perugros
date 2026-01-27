const { SOCKET_EVENTS } = require('./constants');

/**
 * Wraps a socket event handler with error handling
 * @param {Function} handler - The event handler function
 * @returns {Function} - Wrapped handler with error handling
 */
function withErrorHandler(handler) {
    return async function(...args) {
        try {
            await handler.apply(this, args);
        } catch (error) {
            console.error('Error in socket handler:', error);
            // The last argument is typically the socket or callback
            const socket = this;
            if (socket && socket.emit) {
                socket.emit(SOCKET_EVENTS.ERROR, { 
                    message: "Une erreur s'est produite. Veuillez réessayer." 
                });
            }
        }
    };
}

/**
 * Validates that a player is logged in
 * @param {Object} joueur - The player object
 * @param {Object} socket - The socket object
 * @returns {boolean} - True if player is valid, false otherwise
 */
function validatePlayer(joueur, socket) {
    if (!joueur || !joueur.socket) {
        socket.emit(SOCKET_EVENTS.ERROR, { 
            message: "Erreur vous devez être connecter" 
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
    withErrorHandler,
    validatePlayer,
    validateGroup,
    validateBetData,
    validateDiceRoll
};
