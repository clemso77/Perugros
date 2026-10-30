// Test d'intégration : node test-reconnect.js (lance le serveur sur un port de test)
process.env.PORT = 3999;
process.env.DISCONNECT_TIMEOUT_MS = 1500;
process.env.GAME_END_DELAY_MS = 500;
require('./server');
const { io } = require('../node_modules/socket.io-client');
const assert = require('assert');

const URL = 'http://localhost:3999';
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const once = (s, ev) => new Promise(r => s.once(ev, r));

function client(playerId, nom) {
    return io(URL, { auth: { playerId, nom }, transports: ['websocket'], forceNew: true });
}

(async () => {
    const a = client('player-aaaaaaaa');
    await once(a, 'connect');
    a.emit('login', { nom: 'Alice' });
    await once(a, 'loggedIn');
    a.emit('createPartie');
    const { group } = await once(a, 'partieJoin');

    const b = client('player-bbbbbbbb');
    await once(b, 'connect');
    b.emit('login', { nom: 'Bob' });
    await once(b, 'loggedIn');
    const chefList = once(a, 'playerList');
    const chefNotif = once(a, 'notify');
    b.emit('joinPartie', group.toUpperCase() + ' ');
    await once(b, 'partieJoin');
    assert.strictEqual((await chefList).players.length, 2, 'le chef voit le nouveau joueur');
    assert.match((await chefNotif).message, /Bob a rejoint/);

    a.emit('startGame');
    const rollsA = await once(a, 'rollDice');
    assert.strictEqual(rollsA, 5);
    for (let i = 0; i < 3; i++) a.emit('diceRolled', 3);

    // Bob coupe brutalement puis revient avec le même id (rechargement de page)
    b.disconnect();
    await wait(300);
    const b2 = client('player-bbbbbbbb', 'Bob');
    const state = await once(b2, 'syncState');
    assert.strictEqual(state.group, group);
    assert.ok(state.game, 'la partie doit être restaurée');
    assert.strictEqual(state.players.length, 2);

    // Bob demande ses dés : il doit relancer 5 dés
    b2.emit('requestDice');
    const remaining = await once(b2, 'rollDice');
    assert.strictEqual(remaining, 5);

    // Alice redemande ses dés : 2 à relancer, 3 déjà connus
    a.emit('requestDice');
    assert.strictEqual(await once(a, 'rollDice'), 2);

    const couldBet = once(b2, 'couldBet');
    for (let i = 0; i < 2; i++) a.emit('diceRolled', 4);
    for (let i = 0; i < 5; i++) b2.emit('diceRolled', 6);
    assert.deepStrictEqual(await couldBet, { value: true });

    // Le tour est à Bob (joueur après le chef). Alice ne peut pas parier à sa place.
    a.emit('bet', { diceCount: 2, diceValue: 3 });
    assert.match((await once(a, 'error')).message, /pas votre tour/);
    const turn = once(a, 'playerTurn');
    b2.emit('bet', { diceCount: 2, diceValue: 3 });
    assert.strictEqual((await turn).nextPlayerName, 'Alice');

    // Ancien socket fermé tardivement : ne doit pas déclencher le retrait de Bob
    await wait(2000);
    const st = once(b2, 'syncState');
    b2.emit('joinPartie', group);
    assert.ok((await st).game, 'Bob est toujours dans la partie');

    // Bob part pour de bon : après le délai, Alice gagne et revient au salon
    b2.disconnect();
    const ended = once(a, 'gameEnded');
    const finalState = await new Promise(r => a.on('syncState', s => { if (!s.game) r(s); }));
    await ended;
    assert.strictEqual(finalState.group, group, 'Alice reste dans son salon');
    assert.strictEqual(finalState.players.length, 1);
    console.log('✅ tous les scénarios passent');
    process.exit(0);
})().catch(e => { console.error('❌', e); process.exit(1); });
