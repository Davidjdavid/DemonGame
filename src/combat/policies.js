// Player-side policies for the simulator (and an optional auto-battle): random and smart.
import { usableSkills, validTargets, currentActor, alive, rawDamage } from './battle.js';
import { damageTakenMult } from './affinity.js';

export function randomPolicy(state) {
  const actor = currentActor(state);
  const skills = usableSkills(state, actor);
  const skill = skills[Math.floor(state.rng() * skills.length)];
  const groups = validTargets(state, actor, skill);
  const g = groups[Math.floor(state.rng() * groups.length)];
  return { type: 'skill', skill: skill.id, targets: g.map((t) => t.key) };
}

// Known tier of an enemy for an element (null = unknown). `veteran` knows every tier.
function knownTierOf(state, enemy, el, veteran) {
  if (el === 'almighty') return 0;
  if (veteran || state.known[enemy.key]?.has(el)) return enemy.tiers[el] || 0;
  return null;
}

// Expected value of an attack skill on a target group, from what the player knows.
function score(state, actor, skill, group, veteran) {
  let total = 0;
  let weak = 0;
  let bad = false;
  let unknown = 0;
  for (const t of group) {
    const tier = knownTierOf(state, t, skill.element, veteran);
    if (t.repel.has(skill.element) && (veteran || state.known[t.key]?.has(skill.element))) bad = true;
    if (tier === null) { unknown++; total += rawDamage({ ...state, rng: () => 0.5 }, actor, t, skill) * 0.9; continue; }
    if (tier >= 3) { bad = true; continue; }
    if (tier < 0) weak++;
    total += Math.min(t.hp, rawDamage({ ...state, rng: () => 0.5 }, actor, t, skill) * damageTakenMult(tier));
  }
  return { total, weak, bad, unknown };
}

export function smartPolicy(state, { veteran = false } = {}) {
  const actor = currentActor(state);
  const skills = usableSkills(state, actor);
  const friends = state.sides[actor.side];
  const ic = state.icons;

  // Heal a badly hurt ally (especially the protagonist).
  const hurt = friends.filter(alive).filter((f) => f.hp / f.maxHp < (f.isProtagonist ? 0.45 : 0.3));
  const heal = skills.find((s) => s.kind === 'heal');
  if (hurt.length && heal) {
    const t = heal.target === 'allies' ? friends.filter(alive) : [hurt.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]];
    return { type: 'skill', skill: heal.id, targets: t.map((x) => x.key) };
  }
  const dead = friends.filter((f) => !alive(f) && !f.gone);
  const rev = skills.find((s) => s.kind === 'revive');
  if (dead.length && rev) return { type: 'skill', skill: rev.id, targets: [dead[0].key] };

  let best = null;
  for (const skill of skills.filter((s) => s.kind === 'attack')) {
    for (const g of validTargets(state, actor, skill)) {
      const s = score(state, actor, skill, g, veteran);
      if (s.bad) continue;
      // Prefer weakness hits (extra press turns), then exploration of unknown tiers, then raw damage.
      const value = s.total * (1 + 0.6 * s.weak) + (s.weak ? 60 : 0) + (s.unknown && !veteran ? 15 : 0);
      if (!best || value > best.value) best = { value, weak: s.weak, action: { type: 'skill', skill: skill.id, targets: g.map((t) => t.key) } };
    }
  }

  // Pass to a teammate who can hit a known weakness, if this actor can't and passing gains a half icon.
  if (best && !best.weak && ic.half === 0 && ic.full > 1) {
    const mates = friends.filter((f) => f !== actor && alive(f));
    const mateCanExploit = mates.some((m) => usableSkills(state, m).some((s) => s.kind === 'attack'
      && state.sides.enemy.some((e) => alive(e) && (knownTierOf(state, e, s.element, veteran) ?? 0) < 0)));
    if (mateCanExploit) return { type: 'pass' };
  }
  if (best) return best.action;
  const buff = skills.find((s) => s.kind === 'buff');
  if (buff) return { type: 'skill', skill: buff.id, targets: friends.filter(alive).map((f) => f.key) };
  return { type: 'pass' };
}
