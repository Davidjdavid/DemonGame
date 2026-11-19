import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newStory, setFlag, addMeter, learnFact } from '../src/story/state.js';
import { startNpcTalk, applyNpcTurn, buildNpcPrompt, mockNpcRespond } from '../src/story/npcTalk.js';
import { eligibleOutcomes, resolveFinale, buildDirectorPrompt, recordLines, mockDirector } from '../src/story/finale.js';

const bible = {
  title: 'Test', premise: 'p', theme: 't', world: [], factions: [], fixedEvents: [],
  meters: { trust_ana: 'Ana' }, flags: { saw_pump: 'saw the pump' },
  facts: [{ id: 'f1', text: 'The pump is broken.', true: true }, { id: 'f2', text: 'Ana fixed it.', true: false }, { id: 'f3', text: 'Ana broke it.', true: true }],
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
  applyNpcTurn(s, story, bible, '"What happened?"', { reply: 'Hm.', revealFacts: ['f1', 'f3'], setFlags: ['saw_pump', 'evil'], meters: { trust_ana: 9, other: 3 } });
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
  assert.doesNotMatch(p, /Ana broke it/, 'facts she does not know stay out');
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
