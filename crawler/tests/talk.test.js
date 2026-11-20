import test from 'node:test';
import assert from 'node:assert/strict';
import { startTalk, prompt, answer, respond, settle, PREFS, newNotebook, recordTalk, canTalk } from '../src/talk/negotiation.js';
import { enemyCombatant } from '../src/combat/units.js';
import { makeRng } from '../src/core/rng.js';

const ctx = (rng, extra = {}) => ({ rng, heroLevel: 3, money: 500, inv: { medicine: 2 }, heroHp: 50, heroMaxHp: 50, heroMp: 20, heroMaxMp: 20, enemyHpPct: 1, ...extra });

// Play a talk with a chooser: best = pick the stance the personality likes most; worst = least.
function play(type, level, pick, pay, seed, extra = {}) {
  const rng = makeRng(seed);
  const e = enemyCombatant(type, level, 'e0');
  const c = ctx(rng, extra);
  const t = startTalk(e, c);
  for (let i = 0; i < 12; i++) {
    const p = prompt(t, c);
    if (p.kind === 'end') return { t, out: p.outcome };
    if (p.kind === 'question') {
      const sorted = [...p.options].sort((a, b) => PREFS[t.personality][b] - PREFS[t.personality][a]);
      answer(t, pick === 'best' ? sorted[0] : sorted[sorted.length - 1], c);
    } else respond(t, pay, c);
  }
  return { t, out: settle(t, c) };
}

test('mindless enemies never talk', () => {
  assert.equal(canTalk('husk'), false);
  assert.equal(canTalk('slime'), true);
});

test('the right stances and paying recruit a weaker enemy (except when it runs off)', () => {
  let joined = 0; let fled = 0;
  for (let s = 0; s < 200; s++) {
    const { out } = play('slime', 2, 'best', true, s);
    if (out.kind === 'join') joined++;
    if (out.kind === 'fled') fled++;
  }
  assert.ok(joined > 170, `joined ${joined}`);
  assert.ok(fled < 20);
});

test('wrong stances make it angry (free attack) or leave', () => {
  let angry = 0;
  for (let s = 0; s < 100; s++) if (play('imp', 3, 'worst', false, s).out.kind === 'angry') angry++;
  assert.ok(angry > 80, `angry ${angry}`);
});

test("an enemy above your level won't join; it gives a gift instead", () => {
  for (let s = 0; s < 30; s++) {
    const { out } = play('slime', 5, 'best', true, s, { heroLevel: 3 });
    assert.notEqual(out.kind, 'join');
  }
});

test('greedy enemies sometimes take the payment and run', () => {
  let fled = 0;
  for (let s = 0; s < 300; s++) if (play('imp', 2, 'best', true, s).out.kind === 'fled') fled++;
  assert.ok(fled > 40 && fled < 150, `fled ${fled}`);
});

test('every question offers 3-4 stances and at least one the personality likes', () => {
  for (let s = 0; s < 100; s++) {
    const t = startTalk(enemyCombatant('dustmoth', 2, 'e0'), ctx(makeRng(s)));
    assert.ok(t.questions.length >= 2 && t.questions.length <= 4);
    for (const q of t.questions) {
      assert.ok(q.options.length >= 3 && q.options.length <= 4);
      assert.ok(q.options.some((o) => PREFS.hothead[o] >= 1));
    }
  }
});

test('notebook records personality and stance results', () => {
  const { t } = play('gnawer', 1, 'best', true, 4);
  const nb = newNotebook();
  recordTalk(nb, t);
  assert.equal(nb.types.gnawer, 'timid');
  assert.ok(Object.keys(nb.stances.timid).length >= 1);
});
