const { SOCKET_EVENTS, GAME_CONFIG } = require('./constants');

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
    if (!data || !Number.isInteger(data.diceCount) || !Number.isInteger(data.diceValue)) {
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
    if (!Number.isInteger(result) || result < 1 || result > 6) {
        socket.emit(SOCKET_EVENTS.ERROR, { 
            message: "Résultat de dé invalide" 
        });
        return false;
    }
    return true;
}

/**
 * Nettoie un nom de joueur : retire les espaces superflus et limite la longueur
 * @param {*} nom
 * @returns {string|null} - Le nom nettoyé, ou null s'il est invalide
 */
function sanitizeName(nom) {
    if (typeof nom !== 'string') return null;
    const clean = nom.replace(/\s+/g, ' ').trim().slice(0, GAME_CONFIG.MAX_NAME_LENGTH);
    return clean || null;
}

/**
 * Valide une couleur hexadécimale (#rrggbb)
 * @param {*} couleur
 * @param {*} fallback - Valeur renvoyée si la couleur est invalide
 */
function sanitizeColor(couleur, fallback = '#ffffff') {
    return typeof couleur === 'string' && /^#[0-9a-fA-F]{6}$/.test(couleur) ? couleur : fallback;
}

/**
 * Vérifie le format d'un identifiant joueur envoyé par le client
 * @param {*} id
 */
function isValidPlayerId(id) {
    return typeof id === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(id);
}

module.exports = {
    sanitizeName,
    sanitizeColor,
    isValidPlayerId,
    validatePlayer,
    validateGroup,
    validateBetData,
    validateDiceRoll
};
