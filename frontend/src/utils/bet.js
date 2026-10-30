const PERUDO_VALUE = 1;

// Même règle que côté serveur (backend/Game.js)
export function isPossibleToBet(current, bet) {
    if (current.count == null || current.value == null) {
        return bet.value !== PERUDO_VALUE;
    }
    if (bet.value === PERUDO_VALUE) {
        if (current.count < bet.count) return true;
        return current.value !== PERUDO_VALUE && Math.floor(current.count / 2) + 1 <= bet.count;
    }
    if (current.value === PERUDO_VALUE) {
        return current.count * 2 + 1 <= bet.count;
    }
    if (current.count < bet.count) return true;
    return current.count === bet.count && current.value < bet.value;
}

/** Le plus petit pari valide au-dessus du pari actuel, utilisé comme suggestion. */
export function suggestBet(current) {
    if (current.count == null || current.value == null) return { count: 1, value: 2 };
    if (current.value === PERUDO_VALUE) return { count: current.count + 1, value: PERUDO_VALUE };
    if (current.value < 6) return { count: current.count, value: current.value + 1 };
    return { count: current.count + 1, value: 2 };
}
