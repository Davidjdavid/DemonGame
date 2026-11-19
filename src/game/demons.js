// Owned demon instances (stock). Pure data helpers.
import { DEMONS } from '../data/index.js';
import { BATTLE } from '../data/battleData.js';

export const STOCK_MAX = 8;
export const PARTY_MAX = 3;
export const SKILL_SLOTS = 8;

let counter = 0;
export function newUid() {
  counter += 1;
  return `d${Date.now().toString(36)}${counter.toString(36)}`;
}

export function newDemon(id, { level, skills, exp = 0 } = {}) {
  const card = DEMONS[id];
  const battle = BATTLE[id];
  if (!card || !battle) throw new Error(`unknown demon ${id}`);
  return {
    uid: newUid(),
    id,
    level: level ?? card.level,
    exp,
    skills: [...(skills ?? battle.skills)].slice(0, SKILL_SLOTS),
    inParty: false,
    taught: false,       // has the protagonist copied a skill from this demon?
    pendingLearn: [],    // skills waiting for a free slot (player chooses what to replace)
  };
}

export function owns(player, id) {
  return player.stock.some((d) => d.id === id);
}

export function partyDemons(player) {
  return player.stock.filter((d) => d.inParty).slice(0, PARTY_MAX);
}

// Add to stock; joins the active party if there's room. Returns the instance or null if stock is full.
export function addDemon(player, demon) {
  if (player.stock.length >= STOCK_MAX) return null;
  if (partyDemons(player).length < PARTY_MAX) demon.inParty = true;
  player.stock.push(demon);
  return demon;
}

export function removeDemon(player, uid) {
  const i = player.stock.findIndex((d) => d.uid === uid);
  if (i < 0) return null;
  return player.stock.splice(i, 1)[0];
}

export function setInParty(player, uid, on) {
  const d = player.stock.find((x) => x.uid === uid);
  if (!d) return false;
  if (on && !d.inParty && partyDemons(player).length >= PARTY_MAX) return false;
  d.inParty = on;
  return true;
}
