import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demonCard, DEMONS } from '../src/data/index.js';
import { newPlayer } from '../src/game/player.js';
import { owns, addDemon, newDemon } from '../src/game/demons.js';
import { startTalk, applyTurn, fieldNoteTexts } from '../src/talk/engine.js';
import { normalizeResult } from '../src/talk/normalize.js';
import { mockRespond } from '../src/talk/mockBrain.js';
import { buildPrompt } from '../src/talk/prompt.js';
import { askJoinChance } from '../src/talk/rules.js';

// Deterministic rng: always returns the given values in order, then repeats the last.
const seq = (...vals) => { let i = 0; return () => vals[Math.min(i++, vals.length - 1)]; };

function talk(id, { hostile = false, rng = seq(0.5), player = newPlayer() } = {}) {
  const state = startTalk({ card: demonCard(id), player, rng, context: { hostile } });
  return { state, player, rng };
}
function say(t, text) {
  const raw = mockRespond(t.state, t.player, text);
  return applyTurn(t.state, t.player, text, raw, t.rng);
}

test('every demon card has the required fields and consistent ids', () => {
  for (const card of Object.values(DEMONS)) {
    for (const f of ['id', 'name', 'family', 'level', 'source', 'personality', 'speechStyle', 'description', 'likes', 'dislikes', 'hates', 'askStyle', 'flirt', 'patience', 'demands', 'gifts', 'purse']) {
      assert.ok(card[f] !== undefined, `${card.id} missing ${f}`);
    }
    assert.ok(card.likes.length >= 1 && card.likes.length <= 5, `${card.id} likes 1-5`);
    assert.ok(card.hates.length <= 2, `${card.id} hates 0-2`);
    assert.ok(['normal', 'shy', 'proud'].includes(card.askStyle));
    assert.ok(['into it', 'shy', 'not interested', 'taken', 'n/a'].includes(card.flirt));
    for (const l of card.likes) assert.ok(l.weight >= 1 && l.weight <= 3 && l.note, `${card.id}.${l.id}`);
    for (const d of card.dislikes) assert.ok(d.weight <= -1 && d.weight >= -3 && d.note, `${card.id}.${d.id}`);
    for (const h of card.hates) assert.ok(['attack', 'leave'].includes(h.reaction) && h.note);
    const ids = [...card.likes, ...card.dislikes, ...card.hates].map((x) => x.id);
    assert.equal(new Set(ids).size, ids.length, `${card.id} duplicate entry ids`);
  }
});

test('Ares: glory warms him, he demands a blow, taking it makes him offer to join', () => {
  const t = talk('ares');
  say(t, '"Tell me of the glory of your greatest battle!"');
  assert.ok(t.state.mood >= 2);
  assert.equal(t.state.pendingDemand?.kind, 'hp');
  const hpBefore = t.player.hp;
  say(t, '*I plant my feet* "Go ahead. I\'ll take the blow."');
  assert.ok(t.player.hp < hpBefore, 'the blow costs HP');
  assert.equal(t.state.outcome, 'joined');
  assert.ok(owns(t.player, 'ares'));
  assert.ok(fieldNoteTexts(t.player, t.state.card).some((n) => /glory/i.test(n)));
});

test('Ares: begging for mercy is cowardice, a hate: he attacks at once', () => {
  const t = talk('ares');
  say(t, '"Please, spare me! I\'m scared!"');
  assert.equal(t.state.ended, true);
  assert.equal(t.state.outcome, 'fight_demon_first');
  assert.ok(fieldNoteTexts(t.player, t.state.card).some((n) => /cowardice/i.test(n)));
});

test('Ares is proud: asking him directly to join backfires', () => {
  const t = talk('ares');
  const before = t.state.mood;
  const info = say(t, '"Join me, Ares."');
  assert.equal(t.state.ended, false);
  assert.ok(t.state.mood < before);
  assert.equal(info.rolled.p, 0);
});

test('Ares, hostile: talking of glory talks you out of the fight', () => {
  const t = talk('ares', { hostile: true });
  assert.ok(t.state.speaksFirst);
  applyTurn(t.state, t.player, null, mockRespond(t.state, t.player, null), t.rng);
  say(t, '"I want glory, not a cheap brawl in the dark."');
  assert.equal(t.state.outcome, 'passed');
});

test('Hephaestus: mocking his limp throws you out and records the note', () => {
  const t = talk('hephaestus');
  say(t, '"Nice limp, old man."');
  assert.equal(t.state.outcome, 'left');
  assert.ok(fieldNoteTexts(t.player, t.state.card).some((n) => /limp/i.test(n)));
});

test('Hephaestus: flirting puts him off (he is taken)', () => {
  const t = talk('hephaestus');
  say(t, '*I wink* "You look handsome tonight."');
  assert.ok(t.state.mood < 0);
});

test('Hephaestus: speaking of Thetis is his instant join', () => {
  const t = talk('hephaestus');
  say(t, '"Thetis told me you were kind to her."');
  assert.equal(t.state.outcome, 'joined');
});

test('Kappa: manners then a demanded cucumber recruits it', () => {
  const t = talk('kappa');
  say(t, '"Good day, most honored kappa."');
  assert.equal(t.state.pendingDemand?.itemId, 'cucumber');
  const cukes = t.player.items.cucumber;
  say(t, '*I hand him a cucumber*');
  assert.equal(t.player.items.cucumber, cukes - 1);
  assert.equal(t.state.outcome, 'joined');
});

test('Kappa: touching its dish is a hate and it attacks', () => {
  const t = talk('kappa');
  say(t, '*I reach out to tip the dish on its head*');
  assert.equal(t.state.outcome, 'fight_demon_first');
});

test('already owning a demon: he gives a gift instead of joining', () => {
  const player = newPlayer();
  addDemon(player, newDemon('hephaestus'));
  const t = talk('hephaestus', { player });
  const gold = player.gold;
  const items = JSON.stringify(player.items);
  say(t, '"Eurynome sends her love."');
  assert.equal(t.state.outcome, 'passed');
  assert.ok(player.gold > gold || JSON.stringify(player.items) !== items);
  assert.equal(player.stock.filter((x) => x.id === 'hephaestus').length, 1);
});

test('a demon above your level cannot join', () => {
  const player = newPlayer();
  player.level = 5;
  const t = talk('hephaestus', { player });
  say(t, '"Thetis spoke of you."');
  assert.equal(t.state.outcome, 'passed');
  assert.ok(!owns(player, 'hephaestus'));
});

test('patience runs out and he leaves', () => {
  const t = talk('hephaestus', { rng: seq(0) });
  for (let i = 0; i < 10 && !t.state.ended; i++) say(t, '"Hm."');
  assert.equal(t.state.outcome, 'left');
});

test('the kappa river ruse: agreeing lets it leave', () => {
  const t = talk('kappa', { rng: seq(0) });
  // patience 4: chat until it asks to pop back to the river
  for (let i = 0; i < 3 && !t.state.ended; i++) say(t, '"Hm."');
  assert.match(t.state.log.filter((l) => l.who === 'demon').at(-1).text, /river/);
  say(t, '"Sure, go ahead."');
  assert.equal(t.state.outcome, 'left');
});

test('walking away ends the talk; attacking starts a fight with you first', () => {
  const a = talk('kappa');
  say(a, '*I silently walk back the way I came*');
  assert.equal(a.state.outcome, 'player_left');
  const b = talk('kappa');
  say(b, '*I draw my sword and attack*');
  assert.equal(b.state.outcome, 'fight_player_first');
});

test('mugging: a roll decides; success takes gold, then the demon reacts', () => {
  const win = talk('kappa', { rng: seq(0.5, 0.0, 0.5) });
  const gold = win.player.gold;
  say(win, '*I try to snatch its purse*');
  assert.ok(win.player.gold > gold);
  assert.equal(win.state.outcome, 'fled');
  const lose = talk('ares', { rng: seq(0.5, 0.99) });
  say(lose, '*I try to snatch his purse*');
  assert.equal(lose.state.outcome, 'fight_demon_first');
});

test('calling him an AI counts as an insult', () => {
  const t = talk('ares');
  say(t, '"You\'re just an AI, join me."');
  assert.ok(t.state.mood < 0);
});

test('normalize clamps and drops what Claude invents', () => {
  const card = demonCard('ares');
  const r = normalizeResult({
    reply: 'Hi', moodDelta: 99, matched: ['glory', 'made_up', 'glory'], playerAct: 'teleport',
    attemptChance: 'huge', demonAct: 'explode', gift: { itemId: 'excalibur' }, playerGives: { gold: -5, items: ['wine', 'nope'] },
  }, card);
  assert.equal(r.moodDelta, 3);
  assert.deepEqual(r.matched, ['glory']);
  assert.equal(r.playerAct, 'other');
  assert.equal(r.attemptChance, 'medium');
  assert.equal(r.demonAct, 'none');
  assert.equal(r.gift, null);
  assert.deepEqual(r.playerGives, { gold: 0, items: ['wine'], hp: 0, mp: 0 });
  assert.equal(normalizeResult(null, card).reply, '...');
});

test('the game, not Claude, decides: offer_join is ignored below the mood threshold', () => {
  const t = talk('ares');
  applyTurn(t.state, t.player, '"Hi"', { reply: 'I join you!', moodDelta: 0, matched: [], playerAct: 'talk', demonAct: 'offer_join' }, t.rng);
  assert.equal(t.state.ended, false);
  assert.ok(!owns(t.player, 'ares'));
});

test('a gift the player does not have is not transferred', () => {
  const t = talk('ares');
  t.player.items = {};
  applyTurn(t.state, t.player, '*I give him wine*', { reply: 'Ah.', moodDelta: 1, matched: ['wine'], playerAct: 'give', demonAct: 'none', playerGives: { items: ['wine'] } }, t.rng);
  assert.ok(t.state.log.some((l) => /don't have/.test(l.text)));
});

test('the demon cannot start a fight while friendly unless provoked', () => {
  const t = talk('kappa');
  applyTurn(t.state, t.player, '"Hello"', { reply: '*attacks*', moodDelta: 0, matched: [], playerAct: 'talk', demonAct: 'attack' }, t.rng);
  assert.equal(t.state.ended, false);
});

test('ask-join chance grows with mood', () => {
  assert.ok(askJoinChance(0, 'medium') < askJoinChance(3, 'medium'));
  assert.ok(askJoinChance(5, 'certain') <= 0.95);
  assert.equal(askJoinChance(-4, 'high'), 0);
});

test('the live prompt carries card, history, state and format, but not UI-only fields', () => {
  const t = talk('kappa');
  say(t, '"Good day, most honored kappa."');
  const p = buildPrompt(t.state, t.player, '*I bow deeply*');
  assert.match(p, /HIDDEN CARD/);
  assert.match(p, /most honored kappa/);
  assert.match(p, /I bow deeply/);
  assert.match(p, /"moodDelta"/);
  assert.match(p, /cucumber/);
  assert.doesNotMatch(p, /assets\/demons/);
  assert.match(buildPrompt(t.state, t.player, null), /hasn't said anything yet/);
});

test('a demon met above his base level joins at that level, and level limits use it', () => {
  const player = newPlayer();
  const state = startTalk({ card: demonCard('kappa'), player, rng: seq(0.5), level: 6 });
  applyTurn(state, player, '*I bow deeply*', mockRespond(state, player, '*I bow deeply*'), seq(0.5));
  assert.equal(state.outcome, 'joined');
  assert.equal(player.stock[0].level, 6);
  const low = newPlayer({ level: 5 });
  const s2 = startTalk({ card: demonCard('kappa'), player: low, rng: seq(0.5), level: 7 });
  applyTurn(s2, low, '*I bow deeply*', mockRespond(s2, low, '*I bow deeply*'), seq(0.5));
  assert.equal(s2.outcome, 'passed');
});

test('the live prompt tells the demon to follow topic changes and not repeat itself', () => {
  const t = talk('kappa');
  const p = buildPrompt(t.state, t.player, '"Forget the riddle. Nice weather?"');
  assert.match(p, /changes the subject, go with the new subject/);
  assert.match(p, /never repeat a question, riddle or demand/);
});

test('the mock brain does not repeat its neutral line', () => {
  const t = talk('hephaestus', { rng: seq(0) });
  say(t, '"Hm."');
  say(t, '"Hm."');
  const lines = t.state.log.filter((l) => l.who === 'demon').map((l) => l.text);
  assert.notEqual(lines[0], lines[1]);
});
