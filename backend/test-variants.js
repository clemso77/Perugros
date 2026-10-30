// Test des variantes : node test-variants.js
process.env.PORT = 3995;
require('./server');
const { io } = require('../node_modules/socket.io-client');
const assert = require('assert');

const once = (s, ev) => new Promise(r => s.once(ev, r));
const until = (s, ev, pred) => new Promise(r => { const h = (d) => { if (pred(d)) { s.off(ev, h); r(d); } }; s.on(ev, h); });
const client = (id, nom) => io('http://localhost:3995', { auth: { playerId: id, nom }, transports: ['websocket'], forceNew: true });

async function setup(names, options, rolls) {
    const socks = [];
    for (const nom of names) {
        const s = client(`test-${nom}-${Date.now()}`, nom);
        await once(s, 'syncState');
        socks.push(s);
    }
    socks[0].emit('createPartie', { options });
    const { group } = await once(socks[0], 'partieJoin');
    for (const s of socks.slice(1)) {
        const state = until(s, 'syncState', st => st.group === group);
        s.emit('joinPartie', group);
        // Les joueurs qui rejoignent reçoivent le mode choisi à la création
        assert.deepStrictEqual((await state).options, { calza: false, palifico: false, loserStarts: false, ...options });
    }
    // Le mode ne peut plus être modifié une fois dans le salon
    socks[0].emit('setOptions', { calza: !options.calza });
    await new Promise(r => setTimeout(r, 200));
    const betting = socks.map(s => until(s, 'couldBet', d => d.value));
    socks[0].emit('startGame');
    socks.forEach((s, i) => s.once('rollDice', n => { for (let k = 0; k < n; k++) s.emit('diceRolled', rolls[i]); }));
    await Promise.all(betting);
    return socks;
}

(async () => {
    // Mode choisi directement à la création de la partie
    {
        const s = client(`test-mode-${Date.now()}`, 'M');
        await once(s, 'syncState');
        const opts = once(s, 'options');
        s.emit('createPartie', { options: { calza: true, palifico: true } });
        assert.deepStrictEqual((await opts).options, { calza: true, palifico: true, loserStarts: false });
        console.log('✅ mode choisi à la création');
        s.disconnect();
    }

    // Calza réussie : 2 joueurs, 5 dés de 3 chacun -> 10 « 3 » exactement
    {
        const [a, b] = await setup(['A', 'B'], { calza: true }, [3, 3]);
        b.emit('bet', { diceCount: 10, diceValue: 3 });
        await until(a, 'chef', v => v);
        a.emit('calza');
        const res = await once(b, 'liarEvaluated');
        assert.strictEqual(res.kind, 'calza');
        assert.strictEqual(res.success, true);
        console.log('✅ calza exacte détectée (A est déjà à 5 dés, plafonné)');
        a.disconnect(); b.disconnect();
    }

    // Menteur raté + loserStarts : le challenger perd et commence la manche suivante
    {
        const [a, b] = await setup(['C', 'D'], { loserStarts: true }, [4, 4]);
        b.emit('bet', { diceCount: 3, diceValue: 4 });
        await until(a, 'chef', v => v);
        const reveal = once(a, 'reveal');
        a.emit('liar');
        const r = await reveal;
        assert.strictEqual(r.hands.length, 2);
        assert.deepStrictEqual(r.hands[0].des, [4, 4, 4, 4, 4]);
        const turn = await until(a, 'playerTurn', t => t.nextPlayerName);
        assert.strictEqual(turn.nextPlayerName, 'C', 'le perdant C commence');
        console.log('✅ révélation des mains + le perdant commence');
        a.disconnect(); b.disconnect();
    }

    // Palifico : 3 joueurs, règles de pari et Paco non jokers
    {
        const Game = require('./Game');
        const p = (c, v) => ({ count: c, value: v });
        assert.ok(Game.isPossibleToBet(p(null, null), p(2, 1), { palifico: true }), 'Paco autorisés en ouverture');
        assert.ok(!Game.isPossibleToBet(p(2, 4), p(3, 5), { palifico: true }), 'valeur bloquée');
        assert.ok(Game.isPossibleToBet(p(2, 4), p(3, 4), { palifico: true }));
        assert.ok(!Game.isPossibleToBet(p(2, 4), p(2, 4), { palifico: true }));
        console.log('✅ règles de pari Palifico');
    }

    // Historique des paris
    {
        const [a, b] = await setup(['E', 'F'], {}, [2, 5]);
        b.emit('bet', { diceCount: 2, diceValue: 3 });
        await until(a, 'chef', v => v);
        const turn = until(b, 'playerTurn', t => t.history?.length === 2);
        a.emit('bet', { diceCount: 3, diceValue: 3 });
        const t = await turn;
        assert.deepStrictEqual(t.history.map(h => `${h.nom}:${h.count}x${h.value}`), ['F:2x3', 'E:3x3']);
        console.log('✅ historique des paris');
    }
    process.exit(0);
})().catch(e => { console.error('❌', e); process.exit(1); });
