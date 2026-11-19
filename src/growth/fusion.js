// Family fusion (DESIGN: Growth and fusion). Pure.
import chart from '../data/fusion.json' with { type: 'json' };
import { DEMONS } from '../data/index.js';
import { BATTLE } from '../data/battleData.js';
import { newDemon, addDemon, removeDemon, owns, SKILL_SLOTS } from '../game/demons.js';
import { register } from './compendium.js';

export const FUSION_CHART = chart;

export function resultFamily(famA, famB) {
  if (famA === famB) return null; // no same-family fusion in the prototype
  return chart[[famA, famB].sort().join('+')] ?? null;
}

/**
 * The child of two demon instances: { id, family, level, locked } or null.
 * The lowest-level demon of the result family whose base level is at least the parents' average + 1,
 * or the highest in that family if none qualifies. `locked` = above the player's level (shown as ???).
 */
export function fusionResult(a, b, playerLevel) {
  const fam = resultFamily(DEMONS[a.id].family, DEMONS[b.id].family);
  if (!fam) return null;
  const members = Object.values(DEMONS).filter((d) => d.family === fam && BATTLE[d.id]).sort((x, y) => x.level - y.level);
  if (!members.length) return null;
  const target = (a.level + b.level) / 2 + 1;
  const pick = members.find((d) => d.level >= target) ?? members[members.length - 1];
  return { id: pick.id, family: fam, level: pick.level, locked: pick.level > playerLevel };
}

// Skills the child could inherit: the parents' skills it doesn't start with.
export function inheritanceCandidates(a, b, childId) {
  const own = new Set(BATTLE[childId].skills);
  return [...new Set([...a.skills, ...b.skills])].filter((s) => s !== 'attack' && !own.has(s));
}

export function freeSlots(childId) {
  return Math.max(0, SKILL_SLOTS - BATTLE[childId].skills.length);
}

/**
 * Fuse two owned demons. `chosen` = inherited skills (if more candidates than slots, the player picks;
 * otherwise all candidates are inherited). Returns { ok, reason?, child? }.
 */
export function fuse(player, uidA, uidB, chosen = null) {
  const a = player.stock.find((d) => d.uid === uidA);
  const b = player.stock.find((d) => d.uid === uidB);
  if (!a || !b || a === b) return { ok: false, reason: 'Pick two different demons.' };
  const res = fusionResult(a, b, player.level);
  if (!res) return { ok: false, reason: 'Those two can\'t be fused.' };
  if (res.locked) return { ok: false, reason: 'The result is too strong for you to command.' };
  if (owns(player, res.id) && res.id !== a.id && res.id !== b.id) return { ok: false, reason: `You already have ${DEMONS[res.id].name}.` };
  const cands = inheritanceCandidates(a, b, res.id);
  const slots = freeSlots(res.id);
  let inherit = cands.length <= slots ? cands : (chosen ?? []);
  inherit = inherit.filter((s) => cands.includes(s));
  if (inherit.length > slots) return { ok: false, reason: `Pick at most ${slots} skills.` };
  if (cands.length > slots && inherit.length < Math.min(slots, cands.length) && chosen === null) {
    return { ok: false, reason: 'Choose which skills to inherit.' };
  }
  const wasInParty = a.inParty || b.inParty;
  removeDemon(player, a.uid);
  removeDemon(player, b.uid);
  player.deeds.fusedAway.push(DEMONS[a.id].name, DEMONS[b.id].name);
  const child = addDemon(player, newDemon(res.id, { level: res.level, skills: [...BATTLE[res.id].skills, ...inherit] }));
  if (wasInParty) child.inParty = true;
  register(player, child);
  return { ok: true, child };
}
