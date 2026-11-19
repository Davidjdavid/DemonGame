// Turns battle log events into short readable lines. Pure.
import { SKILLS } from '../data/skills.js';

const TAG = { weak: 'WEAK!', crit: 'CRITICAL!', null: 'NULL', miss: 'MISS', absorb: 'ABSORBED', reflect: 'REPELLED!' };

export function describeEvent(ev, nameOf) {
  if (ev.type === 'turn') return null;
  const who = nameOf(ev.actor);
  if (ev.pass) return `${who} ${who === 'You' ? 'pass' : 'passes'}.`;
  const skill = SKILLS[ev.skill];
  const parts = [`${who}: ${skill?.name ?? ev.skill}`];
  const hits = [];
  for (const h of ev.hits) {
    const t = nameOf(h.target);
    if (h.result === 'miss') hits.push(`${t} dodges`);
    else if (h.result === 'null') hits.push(`${t} NULL`);
    else if (h.result === 'absorb') hits.push(`${t} absorbs it (+${h.amount})`);
    else if (h.result === 'reflect') hits.push(`${t} REPELS it! ${nameOf(h.reflectedTo)} takes ${h.amount}`);
    else hits.push(`${t} ${h.result === 'weak' ? 'WEAK! ' : ''}${h.crit ? 'CRITICAL! ' : ''}${h.amount}${h.killed ? ', down!' : ''}`);
  }
  if (hits.length) parts.push(hits.join('; '));
  for (const e of ev.effects) {
    if (e.heal !== undefined) parts.push(`${nameOf(e.target)} +${e.heal} HP`);
    if (e.revived === true) parts.push(`${nameOf(e.target)} revives!`);
    if (e.revived === false) parts.push('the revival fails');
    if (e.buff) parts.push(`${e.buff.toUpperCase()} up for ${e.turns} turns`);
    if (e.debuff && !e.missed) parts.push(`enemy ${e.debuff.toUpperCase()} down for ${e.turns} turns`);
    if (e.debuff && e.missed) parts.push('it fails (MISS)');
  }
  if (ev.counter) parts.push(`${nameOf(ev.counter.by)} counters${ev.counter.amount ? ` for ${ev.counter.amount}` : ''}`);
  return parts.join(' → ');
}

export function resultTag(result) {
  return TAG[result] ?? null;
}
