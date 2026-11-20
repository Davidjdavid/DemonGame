// Fusion (pure): two recruits -> one. The result's family comes from a family-pair table; the result is the
// lowest member of that family whose base level is at least the parents' average + 1 (else the highest member).
// You can't fuse a result more than FUSION_REACH levels above the hero. The child inherits chosen skills from its
// parents and both parents' knowledge. Fusion-only types are reachable only this way. Registry: re-summon for gold.
import { MONSTERS, FAMILIES, skillsAt } from '../data/monsters.js';
import { newRecruit, MAX_SKILLS } from './leveling.js';

export const FUSION_REACH = 3;
export const MAX_INHERIT = 3;

// Family-pair table: a fixed rotation over the family list (never one of the parents' own families).
export const FUSION_CHART = (() => {
  const chart = {};
  const n = FAMILIES.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let k = (i + j + 1) % n;
      while (k === i || k === j) k = (k + 1) % n;
      chart[`${FAMILIES[i]}+${FAMILIES[j]}`] = FAMILIES[k];
    }
  }
  return chart;
})();

export function resultFamily(famA, famB) {
  if (famA === famB) return null;
  return FUSION_CHART[`${famA}+${famB}`] ?? FUSION_CHART[`${famB}+${famA}`] ?? null;
}

export function familyMembers(fam) {
  return Object.entries(MONSTERS).filter(([, m]) => m.family === fam && !m.boss).sort((a, b) => a[1].level - b[1].level).map(([id]) => id);
}

/** { type, level, family, locked } or null when the pair can't fuse. */
export function fusionResult(a, b, heroLevel) {
  const fam = resultFamily(MONSTERS[a.type].family, MONSTERS[b.type].family);
  if (!fam) return null;
  const members = familyMembers(fam);
  const target = Math.floor((a.level + b.level) / 2) + 1;
  const type = members.find((t) => MONSTERS[t].level >= target) ?? members[members.length - 1];
  const level = MONSTERS[type].level;
  return { type, level, family: fam, locked: level > heroLevel + FUSION_REACH };
}

export function inheritCandidates(a, b, res) {
  const own = new Set(skillsAt(res.type, res.level));
  return [...new Set([...a.skills, ...b.skills])].filter((s) => !own.has(s));
}

export function inheritSlots(res) {
  return Math.max(0, Math.min(MAX_INHERIT, MAX_SKILLS - skillsAt(res.type, res.level).length));
}

function mergeKnows(...list) {
  const out = {};
  for (const k of list) for (const [type, els] of Object.entries(k || {})) out[type] = { ...(out[type] || {}), ...els };
  return out;
}

/** Fuse two owned recruits (by uid). chosen = skills to inherit. Returns { ok, reason?, child? }. */
export function fuse(game, uidA, uidB, chosen = []) {
  const all = [...game.party, ...game.stock];
  const a = all.find((r) => r.uid === uidA);
  const b = all.find((r) => r.uid === uidB);
  if (!a || !b || a === b) return { ok: false, reason: 'Pick two different monsters.' };
  const res = fusionResult(a, b, game.hero.level);
  if (!res) return { ok: false, reason: "Two of the same family can't be fused." };
  if (res.locked) return { ok: false, reason: `The result (Lv ${res.level}) is too strong for you to command.` };
  const cands = inheritCandidates(a, b, res);
  const pick = chosen.filter((s) => cands.includes(s)).slice(0, inheritSlots(res));
  const wasInParty = game.party.includes(a) || game.party.includes(b);
  for (const list of [game.party, game.stock]) {
    for (const r of [a, b]) { const i = list.indexOf(r); if (i >= 0) list.splice(i, 1); }
  }
  const child = newRecruit(res.type, res.level, { uid: game.nextUid++, skills: [...skillsAt(res.type, res.level), ...pick] });
  child.knows = mergeKnows(a.knows, b.knows, child.knows);
  if (wasInParty && game.party.length < 3) game.party.push(child);
  else if (game.party.length < 3) game.party.push(child);
  else game.stock.push(child);
  register(game, child);
  return { ok: true, child };
}

// ---- Registry ---------------------------------------------------------------------------------------------------
export function register(game, r) {
  const prev = game.registry[r.type];
  if (!prev || prev.level <= r.level) game.registry[r.type] = { level: r.level, skills: [...r.skills] };
}

export const summonCost = (level) => Math.round(40 + level * level * 8);

export function summon(game, type, maxRecruits = 8) {
  const reg = game.registry[type];
  if (!reg) return { ok: false, reason: 'Not registered.' };
  if (game.party.length + game.stock.length >= maxRecruits) return { ok: false, reason: 'No room for another monster.' };
  if (reg.level > game.hero.level + FUSION_REACH) return { ok: false, reason: 'Too strong for you to command.' };
  const cost = summonCost(reg.level);
  if (game.money < cost) return { ok: false, reason: `Costs ${cost} gold.` };
  game.money -= cost;
  const r = newRecruit(type, reg.level, { uid: game.nextUid++, skills: [...reg.skills] });
  if (game.party.length < 3) game.party.push(r);
  else game.stock.push(r);
  return { ok: true, recruit: r, cost };
}
