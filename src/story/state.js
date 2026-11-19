// Story state (pure): named flags, hidden meters, seen scenes, fired triggers. Saved in the save's `world`.
// Behavior meters the engine bumps on its own (talks, recruits, fled, kills, mercy, lies_caught) live here too.
import { useSpring } from '../dungeon/events.js';
export const BEHAVIOR_METERS = ['talks', 'recruits', 'fled', 'kills', 'mercy', 'lies_caught', 'flirts', 'outfit_talks'];

export function newStory(bible) {
  const meters = Object.fromEntries(Object.keys(bible?.meters ?? {}).map((k) => [k, 0]));
  for (const k of BEHAVIOR_METERS) meters[k] ??= 0;
  return { flags: {}, meters, seen: [], fired: [], facts: [], log: [] };
}

export function setFlag(story, flag, value = true) {
  story.flags[flag] = !!value;
}

export function hasFlag(story, flag) {
  return !!story.flags[flag];
}

export function addMeter(story, meter, delta) {
  story.meters[meter] = (story.meters[meter] ?? 0) + Math.round(delta);
}

export function learnFact(story, factId) {
  if (!story.facts.includes(factId)) story.facts.push(factId);
}

// requires: { flags?: { f: true|false }, meters?: { m: { min?, max? } }, seen?: [sceneIds] }
export function meets(story, requires) {
  if (!requires) return true;
  for (const [f, want] of Object.entries(requires.flags ?? {})) if (hasFlag(story, f) !== !!want) return false;
  for (const [m, range] of Object.entries(requires.meters ?? {})) {
    const v = story.meters[m] ?? 0;
    if (range.min != null && v < range.min) return false;
    if (range.max != null && v > range.max) return false;
  }
  for (const id of requires.seen ?? []) if (!story.seen.includes(id)) return false;
  return true;
}

const list = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

// Apply a scene choice: sets flags, changes meters, gives/takes items, teaches facts. Returns the next scene id.
export function applyChoice(story, choice, player = null) {
  for (const [f, v] of Object.entries(choice.set ?? {})) setFlag(story, f, v);
  for (const [m, d] of Object.entries(choice.meters ?? {})) addMeter(story, m, d);
  for (const id of list(choice.learn)) learnFact(story, id);
  if (player) {
    for (const id of list(choice.give)) player.items[id] = (player.items[id] ?? 0) + 1;
    for (const id of list(choice.take)) if (player.items[id] > 0 && --player.items[id] === 0) delete player.items[id];
    if (choice.heal) useSpring(player); // e.g. Ines's soup: full HP/MP for you and your demons
  }
  // `record` is the readable decision for the Journal and NPCs ("You backed Dario."); plain choices only log their text.
  if (choice.text) story.log.push({ choice: choice.text, ...(choice.record ? { record: choice.record } : {}) });
  return choice.next ?? null;
}

export function markSeen(story, sceneId) {
  if (!story.seen.includes(sceneId)) story.seen.push(sceneId);
}
