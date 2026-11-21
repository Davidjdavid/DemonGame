// Using items outside battle. Pure.
import { ITEMS } from '../data/items.js';
import { SKILLS } from '../data/skills.js';
import { heroDerived, recruitMax } from '../combat/units.js';

export const maxOf = (game, who) => (who === game.hero ? heroDerived(game.hero) : recruitMax(who));

export function partyMembers(game) {
  return [game.hero, ...game.party];
}

export function memberName(game, who) {
  return who === game.hero ? game.hero.name : who.name || who.type;
}

// Use a field item on `who` (a hero/recruit object) or the whole party. Returns { ok, msg }.
export function useFieldItem(game, id, who = null) {
  const it = ITEMS[id];
  if (!it || !(game.inv[id] > 0) || !['field', 'both'].includes(it.use)) return { ok: false, msg: "You can't use that here." };
  const e = it.effect;
  const targets = it.target === 'allies' ? partyMembers(game) : who ? [who] : [];
  if (e.ward) { game.enc.ward = e.ward; return spend(game, id, 'The incense keeps enemies away for a while.'); }
  if (e.exit) return { ok: true, exit: true, msg: 'Use the charm to return to the hub.' };
  if (!targets.length) return { ok: false, msg: 'Choose who to use it on.' };
  let did = false;
  for (const t of targets) {
    const mx = maxOf(game, t);
    if (e.revive && t.hp <= 0) { t.hp = Math.max(1, Math.round((mx.maxHp * e.revive) / 100)); did = true; }
    if (e.hp && t.hp > 0 && t.hp < mx.maxHp) { t.hp = Math.min(mx.maxHp, t.hp + e.hp); did = true; }
    if (e.mp && t.mp < mx.maxMp) { t.mp = Math.min(mx.maxMp, t.mp + e.mp); did = true; }
  }
  if (!did) return { ok: false, msg: 'It would have no effect.' };
  return spend(game, id, `Used ${it.name}.`);
}

function spend(game, id, msg) {
  game.inv[id] -= 1;
  if (game.inv[id] <= 0) delete game.inv[id];
  return { ok: true, msg };
}

// Cast a recruit's heal / revive skill outside battle. Returns { ok, msg }.
export function castField(game, caster, skillId, target) {
  const s = SKILLS[skillId];
  if (!s || !caster.skills.includes(skillId) || !['heal', 'revive'].includes(s.kind)) return { ok: false, msg: "That skill can't be used here." };
  if (caster.hp <= 0) return { ok: false, msg: 'A fallen ally cannot cast.' };
  const cost = s.cost?.mp || 0;
  if (caster.mp < cost) return { ok: false, msg: 'Not enough MP.' };
  const targets = s.target === 'allies' ? partyMembers(game).filter((m) => m.hp > 0) : [target];
  const stats = caster.stats || maxOf(game, caster).stats;
  const k = Math.max(0.7, Math.min(1.5, 0.7 + (stats?.ma || 0) * 0.02)) * 0.9;
  let did = false;
  for (const t of targets) {
    const mx = maxOf(game, t);
    if (s.kind === 'revive') {
      if (t.hp > 0) continue;
      t.hp = Math.max(1, Math.round((mx.maxHp * s.power) / 100));
      did = true;
    } else if (t.hp > 0 && t.hp < mx.maxHp) {
      t.hp = Math.min(mx.maxHp, t.hp + Math.round(((mx.maxHp * s.power) / 100) * k));
      did = true;
    }
  }
  if (!did) return { ok: false, msg: 'It would have no effect.' };
  caster.mp -= cost;
  return { ok: true, msg: `${s.name}!` };
}

// One click: recruits cast their heal / revive skills outside battle until everyone is at ~85% or MP runs out.
// Revives first, then group heals when two or more are hurt, else the cheapest single heal on the most hurt.
export function healPartyWithSkills(game) {
  const members = partyMembers(game);
  const casters = game.party.filter((r) => r.hp > 0);
  let casts = 0;
  for (let guard = 0; guard < 40; guard++) {
    const dead = members.filter((m) => m.hp <= 0);
    const hurt = members.filter((m) => m.hp > 0 && m.hp < maxOf(game, m).maxHp * 0.85);
    let did = false;
    for (const c of casters) {
      if (c.hp <= 0) continue;
      const has = (kind, target) => c.skills.map((sid) => SKILLS[sid]).filter((s) => s && s.kind === kind && (!target || s.target === target) && c.mp >= (s.cost?.mp || 0));
      if (dead.length && has('revive').length) { did = castField(game, c, has('revive')[0].id, dead[0]).ok; if (did) break; }
      if (hurt.length >= 2 && has('heal', 'allies').length) { did = castField(game, c, has('heal', 'allies')[0].id).ok; if (did) break; }
      if (hurt.length) {
        const single = has('heal', 'ally').sort((a, b) => a.cost.mp - b.cost.mp);
        const worst = hurt.sort((a, b) => a.hp / maxOf(game, a).maxHp - b.hp / maxOf(game, b).maxHp)[0];
        if (single.length) { did = castField(game, c, single[0].id, worst).ok; if (did) break; }
      }
    }
    if (!did) break;
    casts++;
  }
  return { ok: casts > 0, casts, msg: casts ? `Your allies cast ${casts} heal${casts > 1 ? 's' : ''}.` : 'Nobody can heal (or no one needs it).' };
}

// Walking slowly restores MP: every living party member regains 1 MP every MP_STEPS steps.
export const MP_STEPS = 2;
export function stepRegen(game) {
  if (game.steps % MP_STEPS) return;
  for (const m of partyMembers(game)) {
    if (m.hp <= 0) continue;
    m.mp = Math.min(maxOf(game, m).maxMp, m.mp + 1);
  }
}
