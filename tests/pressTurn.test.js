import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newIcons, spend, worstResult, iconsLeft, RESULT as R } from '../src/combat/pressTurn.js';
import { hitClass, damageTakenMult, supportDuration, debuffHitChance } from '../src/combat/affinity.js';

const ic = (full, half) => ({ full, half });

test('a turn starts with one full icon per member', () => {
  assert.deepEqual(newIcons(4), ic(4, 0));
});

test('weakness or critical turns a full icon into a half icon', () => {
  assert.deepEqual(spend(ic(4, 0), R.WEAK), ic(3, 1));
  assert.deepEqual(spend(ic(2, 1), R.CRIT), ic(1, 2));
});

test('weakness with no full icons left uses up a half icon', () => {
  assert.deepEqual(spend(ic(0, 3), R.WEAK), ic(0, 2));
});

test('pass uses a half icon if there is one, otherwise halves a full one', () => {
  assert.deepEqual(spend(ic(3, 1), R.PASS), ic(3, 0));
  assert.deepEqual(spend(ic(3, 0), R.PASS), ic(2, 1));
});

test('normal results (including +1/+2) use one icon, half icons first', () => {
  assert.deepEqual(spend(ic(3, 1), R.NORMAL), ic(3, 0));
  assert.deepEqual(spend(ic(3, 0), R.NORMAL), ic(2, 0));
});

test('miss, dodge or null use two icons, half icons first', () => {
  assert.deepEqual(spend(ic(3, 1), R.MISS), ic(2, 0));
  assert.deepEqual(spend(ic(3, 2), R.NULL), ic(3, 0));
  assert.deepEqual(spend(ic(1, 0), R.NULL), ic(0, 0));
});

test('absorb or reflect use all icons', () => {
  assert.deepEqual(spend(ic(3, 2), R.ABSORB), ic(0, 0));
  assert.deepEqual(spend(ic(4, 0), R.REFLECT), ic(0, 0));
});

test('multi-target attacks apply only the worst single result', () => {
  assert.equal(worstResult(['weak', 'normal', 'weak']), 'weak');
  assert.equal(worstResult(['weak', 'null', 'normal']), 'null');
  assert.equal(worstResult(['miss', 'absorb']), 'absorb');
  assert.equal(worstResult(['crit', 'normal']), 'crit');
  assert.equal(worstResult(['reflect', 'weak']), 'reflect');
});

test('half icons cannot create more: the maximum is twice the starting icons', () => {
  const s = newIcons(4);
  let actions = 0;
  while (iconsLeft(s) > 0 && actions < 100) { spend(s, R.WEAK); actions++; }
  assert.equal(actions, 8);
});

test('the design example: 4 icons, weak/normal/weak/weak/weak/normal/weak gives 7 actions with one icon left', () => {
  const s = newIcons(4);
  for (const r of ['weak', 'normal', 'weak', 'weak', 'weak', 'normal', 'weak']) spend(s, r);
  assert.deepEqual(s, ic(0, 1));
});

test('tier classes: any negative tier is a weakness; +3/+4 null; +5 absorbs', () => {
  assert.equal(hitClass(-1), 'weak');
  assert.equal(hitClass(-5), 'weak');
  assert.equal(hitClass(0), 'normal');
  assert.equal(hitClass(2), 'normal');
  assert.equal(hitClass(3), 'null');
  assert.equal(hitClass(4), 'null');
  assert.equal(hitClass(5), 'absorb');
  assert.ok(damageTakenMult(-1) > 1 && damageTakenMult(-3) > damageTakenMult(-1));
  assert.equal(damageTakenMult(5), -1);
});

test('support tier sets durations and debuff odds', () => {
  assert.equal(supportDuration(0), 3);
  assert.ok(supportDuration(4) > supportDuration(0));
  assert.ok(supportDuration(-4) < supportDuration(0));
  assert.ok(debuffHitChance(3) > debuffHitChance(-3));
});
