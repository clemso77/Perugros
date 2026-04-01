// Game configuration constants
const GAME_CONFIG = {
    MIN_PLAYERS: 2,
    INITIAL_DICE_COUNT: 5,
    DISCONNECT_TIMEOUT_MS: 5000, // 5 seconds to allow reconnection
    TURN_TIMEOUT_MS: 15000 // 15 seconds per turn (currently commented out)
};

// Session configuration
const SESSION_CONFIG = {
    SECRET: process.env.SESSION_SECRET || 'secret-key',
    RESAVE: false,
    SAVE_UNINITIALIZED: true,
    COOKIE: { 
        SECURE: false 
    }
};
// Socket event names
const SOCKET_EVENTS = {
    // Client to server
    LOGIN: 'login',
    CREATE_PARTIE: 'createPartie',
    JOIN_PARTIE: 'joinPartie',
    START_GAME: 'startGame',
    LIAR: 'liar',
    DICE_ROLLED: 'diceRolled',
    BET: 'bet',
    DICE_COLOR: 'diceColor',
    DISCONNECT: 'disconnect',
    QUIT_GROUPE: 'quitGroupe',
    
    // Server to client
    LOGGED_IN: 'loggedIn',
    PARTIE_JOIN: 'partieJoin',
    PARTIE_QUIT: 'partieQuit',
    GAME_STARTED: 'gameStarted',
    GAME_ENDED: 'gameEnded',
    LOADING: 'loading',
    CHEF: 'chef',
    ROLL_DICE: 'rollDice',
    PLAYER_TURN: 'playerTurn',
    PLAYER_COUNT: 'playerCount',
    PLAYER_NAMES: 'playerNames',
    COLOR_DICE_CHANGE: 'colorDiceChange',
    ERROR: 'error',
    LIAR_DECLARED: 'liarDeclared',
    SHOW_DICE: 'showDice',
    CLEAR_DICE: 'clearDice',
    COULD_BET: 'couldBet',
    MESSAGE: 'message',
    LIAR_EVALUATED: 'liarEvaluated',
    AFFICHAGE: 'affichage'
};

// Dice values
const DICE_CONFIG = {
    MIN_VALUE: 1,
    MAX_VALUE: 6,
    PERUDO_VALUE: 1 // Special value in the game
};

module.exports = {
    GAME_CONFIG,
    SESSION_CONFIG,
    SOCKET_EVENTS,
    DICE_CONFIG
};
