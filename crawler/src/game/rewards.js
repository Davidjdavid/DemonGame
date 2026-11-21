// Battle results: copy HP/MP back to the persistent hero and recruits, grant EXP and money. Pure.
import { expFor, moneyFor, gainHeroExp, gainRecruitExp } from '../growth/leveling.js';
import { MONSTERS } from '../data/monsters.js';
import { SKILLS } from '../data/skills.js';

export function syncParty(state) {
  for (const c of state.sides.player) {
    if (!c.ref) continue;
    c.ref.hp = Math.max(0, c.hp);
    c.ref.mp = Math.max(0, c.mp);
  }
}

/** After a won battle. Returns { exp, money, lines: [text] }. Fallen allies get no EXP; a fallen hero gets up at 1 HP. */
export function applyVictory(game, state) {
  const beaten = state.sides.enemy.filter((e) => !e.gone);
  // Talking isn't a levelling penalty: an enemy that joined, gave a gift or left gives half its EXP.
  const talked = state.sides.enemy.filter((e) => ['joined', 'gift', 'left'].includes(e.gone));
  const exp = beaten.reduce((s, e) => s + expFor(e.level, e.boss), 0) + talked.reduce((s, e) => s + Math.round(expFor(e.level) / 2), 0);
  const money = beaten.reduce((s, e) => s + moneyFor(e.level, e.boss), 0);
  syncParty(state);
  const lines = [`Victory! +${exp} EXP, +${money} gold.`];
  game.money += money;
  const hero = state.sides.player.find((c) => c.isHero);
  if (hero.hp <= 0) { game.hero.hp = 1; lines.push('You get back up with 1 HP.'); }
  for (const ev of gainHeroExp(game.hero, exp)) lines.push(ev.type === 'learn' ? `You learned ${SKILLS[ev.skill].name}!` : `You reached level ${ev.level}! (+3 stat points)`);
  for (const c of state.sides.player) {
    if (c.isHero || !c.ref || c.ref.hp <= 0) continue;
    for (const ev of gainRecruitExp(c.ref, exp)) {
      lines.push(ev.type === 'level' ? `${ev.who} reached level ${ev.level}.` : `${ev.who} learned a new skill.`);
    }
  }
  for (const e of state.sides.enemy) {
    if (e.gone === 'joined') lines.push(`${e.name} joined you.`);
    else if (e.gone === 'gift' || e.gone === 'left') lines.push(`${e.name} left${e.gone === 'gift' ? ' (it gave you something)' : ''}.`);
  }
  const learned = new Set();
  for (const ev of state.log) for (const l of ev.learned || []) if (l.tier !== 'normal') learned.add(`${MONSTERS[l.type]?.name}`);
  if (learned.size) lines.push(`Your party remembers what it learned about: ${[...learned].join(', ')}.`);
  return { exp, money, lines };
}
