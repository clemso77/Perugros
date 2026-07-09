// Game configuration constants
const GAME_CONFIG = {
    MIN_PLAYERS: 2,
    INITIAL_DICE_COUNT: 5,
    DISCONNECT_TIMEOUT_MS: 60000,
    TURN_TIMEOUT_MS: 15000,
    ROUND_END_DELAY_MS: 3000,
    GAME_END_DELAY_MS: 11000
};

const isSecureCookie =
    process.env.COOKIE_SECURE === 'true' ||
    process.env.NODE_ENV === 'production';

const sessionSecret = process.env.SESSION_SECRET;

if (process.env.NODE_ENV === 'production' && !sessionSecret) {
    throw new Error('SESSION_SECRET must be set in production');
}

// Session configuration
const SESSION_CONFIG = {
    SECRET: sessionSecret || defaultDevSessionSecret,
    RESAVE: false,

    // La session est créée dès la première visite.
    // C'est plus fiable sur Safari.
    SAVE_UNINITIALIZED: true,

    COOKIE: {
        secure: isSecureCookie,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60
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
    PERUDO_VALUE: 1
};

module.exports = {
    GAME_CONFIG,
    SESSION_CONFIG,
    SOCKET_EVENTS,
    DICE_CONFIG
};