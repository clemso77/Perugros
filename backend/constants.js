// Game configuration constants
const GAME_CONFIG = {
    MIN_PLAYERS: 2,
    INITIAL_DICE_COUNT: 5,
    // Temps laissé à un joueur déconnecté pour revenir avant d'être retiré du groupe.
    // Sur mobile, une app passée en arrière-plan peut perdre sa connexion plusieurs minutes.
    DISCONNECT_TIMEOUT_MS: Number(process.env.DISCONNECT_TIMEOUT_MS) || 5 * 60 * 1000,
    // Un joueur déconnecté et sans groupe est oublié après ce délai.
    IDLE_PLAYER_TTL_MS: 30 * 60 * 1000,
    ROUND_END_DELAY_MS: 3000,
    GAME_END_DELAY_MS: Number(process.env.GAME_END_DELAY_MS) || 11000,
    MAX_NAME_LENGTH: 20
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
    REQUEST_DICE: 'requestDice',

    // Server to client
    LOGGED_IN: 'loggedIn',
    SYNC_STATE: 'syncState',
    PARTIE_JOIN: 'partieJoin',
    PARTIE_QUIT: 'partieQuit',
    GAME_STARTED: 'gameStarted',
    GAME_ENDED: 'gameEnded',
    CHEF: 'chef',
    ROLL_DICE: 'rollDice',
    PLAYER_TURN: 'playerTurn',
    PLAYER_COUNT: 'playerCount',
    PLAYER_NAMES: 'playerNames',
    PLAYER_LIST: 'playerList',
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
    SOCKET_EVENTS,
    DICE_CONFIG
};
