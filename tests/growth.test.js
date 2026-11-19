import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newPlayer } from '../src/game/player.js';
import { newDemon, addDemon, owns, partyDemons, STOCK_MAX, SKILL_SLOTS } from '../src/game/demons.js';
import { gainDemonExp, gainPlayerExp, expToNext, primeLevel, canTeach, teachProtagonist, spendStatPoint, resolvePending, finalLearnLevel } from '../src/growth/leveling.js';
import { fusionResult, fuse, inheritanceCandidates, freeSlots, resultFamily, FUSION_CHART } from '../src/growth/fusion.js';
import { resummon, summonCost } from '../src/growth/compendium.js';
import { BATTLE } from '../src/data/battleData.js';
import { DEMONS } from '../src/data/index.js';
import { SKILLS } from '../src/data/skills.js';

test('every learnset uses real skills, ends at the prime level, and stays within base..prime', () => {
  for (const [id, b] of Object.entries(BATTLE)) {
    if (id === 'protagonist') continue;
    for (const l of b.learns) {
      assert.ok(SKILLS[l.skill], `${id} learns unknown ${l.skill}`);
      assert.ok(l.level > DEMONS[id].level && l.level <= primeLevel(id), `${id} learns ${l.skill} at ${l.level}`);
    }
    assert.equal(finalLearnLevel(id), primeLevel(id), `${id}'s last skill comes at prime`);
  }
});

test('demons learn their set skills as they level, up to prime', () => {
  const p = newPlayer();
  const k = addDemon(p, newDemon('kappa'));
  const ev = gainDemonExp(p, k, 5000);
  assert.ok(k.level > primeLevel('kappa'));
  assert.ok(ev.some((e) => e.type === 'learn' && e.skill === 'frost_edge'));
  assert.ok(k.skills.includes('mend_all'));
  assert.equal(p.compendium.kappa.level, k.level, 'the compendium keeps the latest level');
});

test('past prime, each level needs 1.5x more EXP', () => {
  const prime = 16;
  assert.equal(expToNext(15, prime), 30 + 15 * 12);
  assert.equal(expToNext(16, prime), Math.round((30 + 16 * 12) * 1.5));
  assert.equal(expToNext(17, prime), Math.round((30 + 17 * 12) * 1.5 ** 2));
});

test('a skill learned with full slots waits for the player to choose', () => {
  const p = newPlayer();
  const a = addDemon(p, newDemon('ares'));
  a.skills = ['bash', 'twin_slash', 'flame_edge', 'war_cry', 'ember', 'chill', 'spark', 'gust'];
  assert.equal(a.skills.length, SKILL_SLOTS);
  gainDemonExp(p, a, expToNext(10, 16) + expToNext(11, 16));
  assert.deepEqual(a.pendingLearn, ['counter']);
  resolvePending(p, a, 'counter', 'gust');
  assert.ok(a.skills.includes('counter') && !a.skills.includes('gust'));
  assert.deepEqual(a.pendingLearn, []);
});

test('the protagonist levels normally, gets 3 stat points, and can spend them', () => {
  const p = newPlayer();
  const hp = p.maxHp;
  gainPlayerExp(p, expToNext(10));
  assert.equal(p.level, 11);
  assert.equal(p.statPoints, 3);
  assert.ok(p.maxHp > hp);
  const vit = p.stats.vit;
  const before = p.maxHp;
  assert.ok(spendStatPoint(p, 'vit'));
  assert.equal(p.stats.vit, vit + 1);
  assert.ok(p.maxHp > before);
  assert.equal(p.statPoints, 2);
  assert.ok(!spendStatPoint(p, 'charm'));
});

test('the protagonist copies one skill from a demon that has learned everything', () => {
  const p = newPlayer();
  const k = addDemon(p, newDemon('kappa'));
  assert.ok(!canTeach(k));
  assert.equal(teachProtagonist(p, k, 'chill').ok, false);
  gainDemonExp(p, k, 5000);
  assert.ok(canTeach(k));
  assert.ok(teachProtagonist(p, k, 'chill').ok);
  assert.ok(p.skills.includes('chill'));
  assert.ok(!canTeach(k), 'once per demon');
});

test('fusion chart covers every pair of different families and never same-family', () => {
  const fams = [...new Set(Object.values(DEMONS).map((d) => d.family))];
  for (const a of fams) for (const b of fams) {
    if (a === b) assert.equal(resultFamily(a, b), null);
  }
  for (const v of Object.values(FUSION_CHART)) assert.ok(typeof v === 'string');
  for (let i = 0; i < fams.length; i++) for (let j = i + 1; j < fams.length; j++) {
    assert.ok(resultFamily(fams[i], fams[j]), `${fams[i]} + ${fams[j]} has no result`);
  }
});

test('fusion picks the lowest result-family demon at or above the parents average + 1', () => {
  const p = newPlayer();
  p.level = 30;
  const a = addDemon(p, newDemon('ares'));        // Warrior 10
  const h = addDemon(p, newDemon('hephaestus'));  // Maker 8
  const res = fusionResult(a, h, p.level);        // Warrior + Maker = Construct
  assert.equal(res.family, 'Construct');
  const members = Object.values(DEMONS).filter((d) => d.family === 'Construct').sort((x, y) => x.level - y.level);
  const target = (a.level + h.level) / 2 + 1;
  const expected = members.find((d) => d.level >= target) ?? members[members.length - 1];
  assert.equal(res.id, expected.id);
  assert.equal(res.locked, false);
});

test('a fusion result above your level is locked (shown as ???) and cannot be fused', () => {
  const p = newPlayer();
  p.level = 4;
  const a = addDemon(p, newDemon('ares'));
  const h = addDemon(p, newDemon('hephaestus'));
  assert.equal(fusionResult(a, h, p.level).locked, true);
  assert.equal(fuse(p, a.uid, h.uid).ok, false);
});

test('fusing consumes the parents, keeps the child\'s own skills, and inherits into free slots', () => {
  const p = newPlayer();
  p.level = 30;
  const a = addDemon(p, newDemon('ares'));
  const h = addDemon(p, newDemon('hephaestus'));
  const childId = fusionResult(a, h, p.level).id;
  const cands = inheritanceCandidates(a, h, childId);
  const slots = freeSlots(childId);
  const choice = cands.slice(0, slots);
  const r = fuse(p, a.uid, h.uid, cands.length > slots ? choice : null);
  assert.ok(r.ok, r.reason);
  assert.ok(owns(p, childId));
  assert.ok(!owns(p, 'ares') && !owns(p, 'hephaestus'));
  for (const s of BATTLE[childId].skills) assert.ok(r.child.skills.includes(s));
  assert.ok(r.child.skills.length <= SKILL_SLOTS);
  assert.ok(p.deeds.fusedAway.includes('Ares'));
  assert.ok(p.compendium[childId]);
});

test('when there are more candidates than slots, the player must pick', () => {
  const p = newPlayer();
  p.level = 30;
  const a = addDemon(p, newDemon('ares', { skills: ['bash', 'twin_slash', 'flame_edge', 'war_cry', 'ember', 'chill', 'spark', 'gust'] }));
  const h = addDemon(p, newDemon('hephaestus', { skills: ['ember', 'cinder_rain', 'bash', 'iron_skin', 'glint', 'shade', 'hail', 'squall'] }));
  const childId = fusionResult(a, h, p.level).id;
  const cands = inheritanceCandidates(a, h, childId);
  assert.ok(cands.length > freeSlots(childId));
  assert.equal(fuse(p, a.uid, h.uid).ok, false);
  assert.ok(fuse(p, a.uid, h.uid, cands.slice(0, freeSlots(childId))).ok);
});

test('compendium re-summons at the saved level and skills, for gold', () => {
  const p = newPlayer();
  const k = addDemon(p, newDemon('kappa'));
  gainDemonExp(p, k, 600);
  const saved = { ...p.compendium.kappa };
  p.stock = [];
  const gold = p.gold;
  const r = resummon(p, 'kappa');
  assert.ok(r.ok, r.reason);
  assert.equal(r.demon.level, saved.level);
  assert.deepEqual(r.demon.skills, saved.skills);
  assert.equal(p.gold, gold - summonCost(saved));
  assert.equal(resummon(p, 'kappa').ok, false, 'no duplicates');
});

test('stock holds at most 8 demons and the active party at most 3', () => {
  const p = newPlayer();
  for (let i = 0; i < STOCK_MAX + 2; i++) addDemon(p, newDemon('kappa'));
  assert.equal(p.stock.length, STOCK_MAX);
  assert.equal(partyDemons(p).length, 3);
});

import { serialize, deserialize, SAVE_VERSION } from '../src/game/save.js';
test('a save round-trips the player and keeps a world section', () => {
  const p = newPlayer();
  addDemon(p, newDemon('kappa'));
  p.fieldNotes.kappa = ['manners'];
  const data = JSON.parse(JSON.stringify(serialize(p)));
  assert.equal(data.version, SAVE_VERSION);
  assert.deepEqual(data.world, {});
  const { player } = deserialize(data);
  assert.equal(player.stock[0].id, 'kappa');
  assert.deepEqual(player.fieldNotes.kappa, ['manners']);
  assert.throws(() => deserialize({}));
  assert.throws(() => deserialize({ version: 99, player: {} }));
});

import { buyItem, sellItem, buyArmor, armorTiers, ARMOR } from '../src/game/shop.js';
test('shop: buy and sell items, buy and equip armor that sets your tiers', () => {
  const p = newPlayer();
  const gold = p.gold;
  assert.ok(buyItem(p, 'salve', 2).ok);
  assert.equal(p.gold, gold - 200);
  assert.ok(sellItem(p, 'salve').ok);
  assert.equal(p.gold, gold - 150);
  assert.deepEqual(armorTiers(p), {});
  assert.ok(buyArmor(p, 'rain_cape').ok);
  assert.deepEqual(armorTiers(p), ARMOR.rain_cape.tiers);
  const g = p.gold;
  assert.ok(buyArmor(p, 'traveler_coat').ok);
  assert.equal(p.gold, g, 're-equipping owned armor is free');
  p.gold = 0;
  assert.equal(buyArmor(p, 'bronze_cuirass').ok, false);
});

test('field items heal you or a demon, not a fallen one', async () => {
  const { useItemOn } = await import('../src/game/fieldItems.js');
  const p = newPlayer();
  p.hp = 10;
  assert.ok(useItemOn(p, 'salve', 'you').ok);
  assert.equal(p.hp, 60);
  const k = addDemon(p, newDemon('kappa'));
  k.hp = 0;
  assert.equal(useItemOn(p, 'salve', k.uid).ok, false);
  k.hp = 5;
  assert.ok(useItemOn(p, 'salve', k.uid).ok);
  assert.equal(k.hp, 55);
});

import { awardVictory, victoryRewards } from '../src/growth/rewards.js';
test('victory rewards: EXP and gold for killed enemies only; kill deeds by family', () => {
  const p = newPlayer();
  const k = addDemon(p, newDemon('kappa'));
  const gold = p.gold;
  const lines = awardVictory(p, [{ demonId: 'oni', level: 8 }, { demonId: 'puck', level: 5, gone: 'joined' }]);
  assert.match(lines[0], /Victory/);
  assert.equal(p.gold, gold + victoryRewards([{ level: 8 }]).gold);
  assert.equal(p.deeds.killed.Brute, 1);
  assert.equal(p.deeds.killed.Fairy, undefined);
  assert.ok(k.exp > 0 || k.level > 3);
  assert.deepEqual(awardVictory(p, [{ demonId: 'oni', level: 8, gone: 'left' }]), ['The fight is over.']);
});

test('the protagonist learns his own skills by level (Glint at 7) and the results screen says so', () => {
  const p = newPlayer();
  p.level = 6; p.exp = 0; // the story starts at Lv 6
  assert.ok(!p.skills.includes('glint'));
  const events = gainPlayerExp(p, expToNext(p.level));
  assert.equal(p.level, 7);
  assert.ok(p.skills.includes('glint'));
  assert.ok(events.some((e) => e.type === 'learn' && e.skill === 'glint'));
  const q = newPlayer();
  q.level = 6; q.exp = 0;
  const lines = awardVictory(q, [{ level: 30, demonId: 'ares', boss: true }]);
  assert.ok(lines.some((l) => /You learned Glint/.test(l)), lines.join('\n'));
});
