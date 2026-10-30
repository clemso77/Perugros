const PERUDO_VALUE = 1;

// Même règle que côté serveur (backend/Game.js)
export function isPossibleToBet(current, bet, { palifico = false } = {}) {
    // Manche Palifico : premier pari libre (Paco compris), puis même valeur et nombre supérieur
    if (palifico) {
        if (current.count == null || current.value == null) return true;
        return bet.value === current.value && bet.count > current.count;
    }
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
export function suggestBet(current, { palifico = false } = {}) {
    if (current.count == null || current.value == null) return { count: 1, value: 2 };
    if (palifico || current.value === PERUDO_VALUE) return { count: current.count + 1, value: current.value };
    if (current.value < 6) return { count: current.count, value: current.value + 1 };
    return { count: current.count + 1, value: 2 };
}
