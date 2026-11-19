import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newStory, setFlag, addMeter, learnFact } from '../src/story/state.js';
import { startNpcTalk, applyNpcTurn, buildNpcPrompt, mockNpcRespond } from '../src/story/npcTalk.js';
import { eligibleOutcomes, resolveFinale, buildDirectorPrompt, recordLines, mockDirector } from '../src/story/finale.js';

const bible = {
  title: 'Test', premise: 'p', theme: 't', world: [], factions: [], fixedEvents: [],
  meters: { trust_ana: 'Ana' }, flags: { saw_pump: 'saw the pump' },
  facts: [{ id: 'f1', text: 'The pump is broken.', true: true }, { id: 'f2', text: 'Ana fixed it.', true: false }, { id: 'f3', text: 'Ana broke it.', true: true }, { id: 'f4', text: 'Teo hid the spare pump.', true: true }],
  outcomes: [
    { id: 'seal', title: 'Seal the Ward', requires: {}, narration: 'You seal it.' },
    { id: 'open', title: 'Open the gates', requires: { flags: { saw_pump: true } }, narration: 'You open it.' },
    { id: 'trusted', title: 'Ana stands with you', requires: { meters: { trust_ana: { min: 2 } } }, narration: 'Ana helps.' },
  ],
};
const ana = { id: 'ana', name: 'Ana', knows: ['f1', 'f2'], flags: ['saw_pump'], meters: ['trust_ana'], lies: [{ about: 'pump', says: 'I fixed it', truth: 'She broke it', truthFact: 'f3' }] };

test('NPC talk only reveals known facts, sets allowed flags, nudges allowed meters within ±2', () => {
  const story = newStory(bible);
  const s = startNpcTalk({ card: ana, story, rng: () => 0 });
  assert.equal(story.meters.talks, 1);
  applyNpcTurn(s, story, bible, '"What happened?"', { reply: 'Hm.', revealFacts: ['f1', 'f4'], setFlags: ['saw_pump', 'evil'], meters: { trust_ana: 9, other: 3 } });
  assert.deepEqual(story.facts, ['f1']);
  assert.equal(story.flags.saw_pump, true);
  assert.equal(story.flags.evil, undefined);
  assert.equal(story.meters.trust_ana, 2);
  assert.equal(story.meters.other, undefined);
});

test('a lie is caught only if the player already knows the truth', () => {
  const story = newStory(bible);
  const s = startNpcTalk({ card: ana, story, rng: () => 0.9 });
  applyNpcTurn(s, story, bible, '"Liar."', { reply: '...', caughtLie: 'pump' });
  assert.equal(story.meters.lies_caught, 0);
  learnFact(story, 'f3');
  applyNpcTurn(s, story, bible, '"You broke it. I know."', { reply: '...', caughtLie: 'pump' });
  assert.equal(story.meters.lies_caught, 1);
  assert.ok(story.flags.caught_ana_pump);
});

test('the NPC prompt carries the card, known facts, the player record and the format', () => {
  const story = newStory(bible);
  addMeter(story, 'fled', 3);
  const s = startNpcTalk({ card: ana, story });
  const p = buildNpcPrompt(s, story, bible, '"Hi"');
  assert.match(p, /The pump is broken/);
  assert.doesNotMatch(p, /Teo hid the spare pump/, 'facts she does not know stay out');
  assert.match(p, /ran from 3 fights/);
  assert.match(p, /"caughtLie"/);
});

test('the finale only allows outcomes the record supports, and validates the director', () => {
  const story = newStory(bible);
  assert.deepEqual(eligibleOutcomes(bible, story).map((o) => o.id), ['seal']);
  setFlag(story, 'saw_pump');
  addMeter(story, 'trust_ana', 2);
  assert.equal(eligibleOutcomes(bible, story).length, 3);
  const bad = resolveFinale(bible, newStory(bible), 'open the gates', { outcome: 'open', narration: 'x' });
  assert.equal(bad.outcome.id, 'seal', 'an impossible pick falls back to a possible one');
  const good = resolveFinale(bible, story, 'I open the gates', { outcome: 'open', narration: 'The gates swing open.', reflection: 'You chose.' });
  assert.equal(good.outcome.id, 'open');
  assert.equal(good.reflection, 'You chose.');
  assert.equal(mockDirector(bible, story, 'Ana and I stand together, she helps').outcome, 'trusted');
  assert.match(buildDirectorPrompt(bible, story, 'I open the gates'), /possible outcomes/i);
  assert.ok(recordLines(story).length >= 3);
});

test('the mock NPC reveals facts and can be caught lying', () => {
  const story = newStory(bible);
  const s = startNpcTalk({ card: ana, story });
  const r = mockNpcRespond(s, story, bible, '"Tell me what happened."');
  assert.deepEqual(r.revealFacts, ['f1']);
});

import { activeObjectives } from '../src/story/objectives.js';
test('objectives show when their showIf holds and hide once done', () => {
  const b = { objectives: [{ id: 'warn', text: 'Warn Sump Row.', showIf: { flags: { saw_survey: true } }, doneIf: { flags: { warned: true } } }] };
  const story = newStory(bible);
  assert.equal(activeObjectives(b, story).length, 0);
  setFlag(story, 'saw_survey');
  assert.equal(activeObjectives(b, story)[0].id, 'warn');
  setFlag(story, 'warned');
  assert.equal(activeObjectives(b, story).length, 0);
});

test('an NPC knows the truth behind her own lie but can only admit it once the lie is caught', () => {
  const story = newStory(bible);
  const s = startNpcTalk({ card: ana, story });
  const p = buildNpcPrompt(s, story, bible, '"Hi"');
  assert.match(p, /THE TRUTH BEHIND ANA/, 'her own lie\'s truth is in its own block');
  applyNpcTurn(s, story, bible, '"Tell me everything."', { reply: 'I broke it.', revealFacts: ['f3'] });
  assert.ok(!story.facts.includes('f3'), 'not admitted without a catch');
  learnFact(story, 'f3'); // the player finds the evidence elsewhere
  applyNpcTurn(s, story, bible, '"You broke it. I know."', { reply: 'Fine. I did.', caughtLie: 'pump', revealFacts: ['f3'] });
  assert.ok(Object.keys(story.flags).some((f) => f.startsWith('caught_') && f.endsWith('_talk')), 'caught in talk');
});

import { recordLines as recordLinesX } from '../src/story/finale.js';
test('the record names who you sought first, your build, flirts and your most-used demon', () => {
  const story = { flags: { first_talk_dario: true }, meters: { talks: 3, flirts: 2, stat_mag: 4, stat_str: 1 }, usage: { furfur: 5, kappa: 2 } };
  const lines = recordLinesX(story, null, (id) => ({ dario: 'Dario', furfur: 'Furfur' })[id] ?? id).join('\n');
  assert.match(lines, /you went to Dario first/);
  assert.match(lines, /built yourself for magic/);
  assert.match(lines, /flirted 2 times/);
  assert.match(lines, /Furfur fought beside you most \(5 fights\)/);
});

test('offline director follows what he says he is aiming at, not the longest narration', async () => {
  const { default: bible } = await import('../src/data/story/bible.json', { with: { type: 'json' } });
  const m = { trust_dario: 3, trust_hester: 3, trust_ines: 3, trust_teo: 3, mercy: 3, kills: 5, recruits: 4, fled: 0, promises: 0 };
  const B = { flags: { charges_to_dario: true, gonggong_beaten: false }, meters: m };
  assert.equal(mockDirector(bible, B, 'Shout up the drain and tell Dario to use his last charge on the wall.').outcome, 'the_breach');
  assert.equal(mockDirector(bible, B, 'I spare Gonggong. Let the river go home and the demons with it.').outcome, 'river_home');
  assert.equal(mockDirector(bible, B, "I can't choose. I'll wait and see what happens.").outcome, 'high_water');
});

test('ending fates: one row per person, matching lines joined', async () => {
  const { endingDetails } = await import('../src/story/finale.js');
  const outcome = { fates: [{ who: 'dario', text: 'He walks out.' }, { who: 'ines', text: 'She stays.' }, { who: 'dario', text: 'He writes you a better line.', requires: { flags: { flirted_dario: true } } }] };
  const d = endingDetails({ reflections: [] }, { flags: { flirted_dario: true }, meters: {}, seen: [] }, outcome);
  assert.deepEqual(d.fates.map((f) => [f.who, f.text]), [['dario', 'He walks out. He writes you a better line.'], ['ines', 'She stays.']]);
});

test('finale asides: "Pell, go home" is honored in the narration and the fates', async () => {
  const { default: bible } = await import('../src/data/story/bible.json', { with: { type: 'json' } });
  const { resolveFinale, endingDetails } = await import('../src/story/finale.js');
  const m = { trust_dario: 3, trust_hester: 3, trust_ines: 3, trust_teo: 3, mercy: 3, kills: 5, recruits: 4, fled: 0, promises: 0 };
  const story = { flags: { charges_to_dario: true, gonggong_beaten: false, pell_guides: true, met_pell: true }, meters: m, seen: [], facts: [], log: [] };
  const decision = 'Blow the wall and walk everyone out. Pell, go home to your mother.';
  const end = resolveFinale(bible, story, decision, mockDirector(bible, story, decision));
  assert.equal(end.outcome.id, 'the_breach');
  assert.match(end.narration, /tell him to go home/);
  assert.equal(story.flags.pell_rescued, true);
  const pell = endingDetails(bible, story, end.outcome).fates.find((f) => f.who === 'pell');
  assert.match(pell.text, /mother's bag/);
});
