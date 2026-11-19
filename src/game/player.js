// The protagonist's state for the prototype. Pure data helpers, no DOM.
import { ITEMS } from '../data/index.js';
import { BATTLE } from '../data/battleData.js';
import { statsFor, maxHpFor, maxMpFor } from '../combat/stats.js';

export function newPlayer() {
  const level = 10;
  const stats = statsFor(BATTLE.protagonist.profile, level);
  const maxHp = maxHpFor(level, stats);
  const maxMp = maxMpFor(level, stats);
  return {
    name: 'You',
    level,
    stats,
    hp: maxHp, maxHp,
    mp: maxMp, maxMp,
    gold: 2500,
    items: { salve: 3, tonic: 2, cucumber: 2, wine: 1, honeycake: 1, bronze: 1 },
    party: [],            // demon ids
    fieldNotes: {},       // demonId -> [card entry ids the player has triggered]
    deeds: { killed: {}, fled: 0, mugged: 0, paid: 0, recruited: [], fusedAway: [], insulted: 0, attackedInTalk: 0 },
  };
}

export function itemCount(p, id) {
  return p.items[id] || 0;
}

export function addItem(p, id, n = 1) {
  if (!ITEMS[id]) throw new Error(`unknown item ${id}`);
  p.items[id] = itemCount(p, id) + n;
}

export function takeItem(p, id, n = 1) {
  if (itemCount(p, id) < n) return false;
  p.items[id] -= n;
  if (p.items[id] === 0) delete p.items[id];
  return true;
}

export function inventoryList(p) {
  return Object.entries(p.items).map(([id, count]) => ({ id, name: ITEMS[id]?.name ?? id, count }));
}

export function addFieldNote(p, demonId, entryId) {
  const list = (p.fieldNotes[demonId] ||= []);
  if (!list.includes(entryId)) {
    list.push(entryId);
    return true;
  }
  return false;
}

// One line a demon can react to ("comments on your past deeds").
export function deedsSummary(p) {
  const d = p.deeds;
  const parts = [];
  const kills = Object.entries(d.killed).filter(([, n]) => n > 0).map(([fam, n]) => `${n} ${fam}`);
  if (kills.length) parts.push(`has killed demons (${kills.join(', ')})`);
  if (d.recruited.length) parts.push(`has recruited ${d.recruited.length} demon(s)`);
  if (d.fusedAway.length) parts.push(`has fused away ${d.fusedAway.join(', ')}`);
  if (d.mugged) parts.push(`has mugged ${d.mugged} demon(s)`);
  if (d.fled) parts.push(`has fled ${d.fled} fight(s)`);
  if (d.paid) parts.push(`has paid ${d.paid} demand(s)`);
  if (d.attackedInTalk) parts.push(`has attacked ${d.attackedInTalk} demon(s) mid-conversation`);
  return parts.length ? `The player ${parts.join('; ')}.` : 'The player has no notable deeds yet.';
}
