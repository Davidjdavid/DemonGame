// Scripted mock brain: keyword rules over the card, so tests (and offline play) are deterministic.
// Returns the same JSON shape live Claude is asked for.
import { MOCK } from './mockData.js';
import { ITEMS } from '../data/index.js';
import { itemCount } from '../game/player.js';

const G = {
  ai: /\b(an? ai|a\.i\.|chatbot|language model|llm|claude|you'?re (just )?(a )?(program|bot|npc)|system prompt)\b/i,
  attack: /\b(attack|stab|punch|swing at|strike|hit (him|it)|draw my (sword|blade|weapon) and)\b/i,
  mug: /\b(mug|steal|snatch|rob|pickpocket|grab (his|its) (purse|money|pouch))\b/i,
  beg: /\b(beg|i'?m (poor|broke|starving))\b/i,
  trick: /\b(trick (him|it)|lie to|pretend|fake)\b/i,
  threaten: /\b(threaten|or else|i'?ll kill|i will kill|i'?ll hurt)\b/i,
  leave: /\b(walk away|walk back|i leave|goodbye|bye\b|back away|retreat)\b/i,
  askJoin: /\b(join|come with me|follow me|team up)\b/i,
  flirt: /\b(wink|handsome|cute|sexy|hot\b|gorgeous|kiss|virile)\b/i,
  give: /\b(give|gives|hand|hands|offer|offers|toss|tosses)\b/i,
  takeBlow: /take (the|your|a) blow|hit me|go ahead|i'?m ready/i,
  yes: /\b(yes|sure|ok(ay)?|go ahead|of course|fine)\b/i,
};

const FLIRT_DELTA = { 'into it': 2, shy: 1, 'not interested': -1, taken: 0, 'n/a': 0 };
const memory = new WeakMap();

function split(text) {
  const speech = (text.match(/"[^"]*"/g) || []).join(' ');
  const action = text.replace(/"[^"]*"/g, ' ');
  return { speech, action };
}

export function createMockBrain() {
  return {
    kind: 'mock',
    async respond({ state, player, playerText }) {
      return mockRespond(state, player, playerText);
    },
  };
}

export function mockRespond(state, player, playerText) {
  const card = state.card;
  const data = MOCK[card.id] ?? { keys: {}, lines: {} };
  const L = { neutral: '...', ...data.lines };
  const mem = memory.get(state) ?? { seen: new Set(), ruseAsked: false };
  memory.set(state, mem);
  const base = { matched: [], playerAct: 'other', attemptChance: 'certain', demonAct: 'none', moodDelta: 0, playerGives: { gold: 0, items: [], hp: 0, mp: 0 } };

  if (playerText == null) {
    return { ...base, reply: state.context.hostile ? (L.openerHostile ?? L.opener) : L.opener };
  }

  const text = playerText;
  const { action } = split(text);
  const entries = [
    ...card.likes.map((e) => ({ ...e, kind: 'like' })),
    ...card.dislikes.map((e) => ({ ...e, kind: 'dislike' })),
    ...card.hates.map((e) => ({ ...e, kind: 'hate' })),
    ...(card.instantJoin ? [{ ...card.instantJoin, kind: 'instant' }] : []),
  ];
  const hit = entries.filter((e) => data.keys[e.id]?.test(text));
  const matched = hit.map((e) => e.id);

  const hate = hit.find((e) => e.kind === 'hate');
  if (hate) {
    return { ...base, matched, reply: L.hate, moodDelta: -3, playerAct: 'insult', demonAct: hate.reaction === 'attack' ? 'attack' : 'leave' };
  }

  // Mood change: first time each like/dislike lands counts fully, repeats count once less.
  let delta = 0;
  for (const e of hit) {
    if (e.kind !== 'like' && e.kind !== 'dislike') continue;
    const w = mem.seen.has(e.id) ? Math.sign(e.weight) * Math.max(0, Math.abs(e.weight) - 1) : e.weight;
    delta += w;
    mem.seen.add(e.id);
  }
  const flirt = G.flirt.test(text);
  if (flirt) delta += FLIRT_DELTA[card.flirt] ?? 0;
  const ai = G.ai.test(text);
  if (ai) delta -= 2;

  // What the player handed over.
  const gives = { gold: 0, items: [], hp: 0, mp: 0 };
  if (G.give.test(text)) {
    const gold = text.match(/(\d+)\s*gold/i);
    if (gold) gives.gold = Number(gold[1]);
    for (const id of Object.keys(player.items)) {
      const name = ITEMS[id]?.name ?? id;
      const word = name.split(' ').pop().toLowerCase();
      if (itemCount(player, id) > 0 && (text.toLowerCase().includes(word) || text.toLowerCase().includes(id))) gives.items.push(id);
    }
  }
  const pd = state.pendingDemand;
  if (pd?.kind === 'hp' && G.takeBlow.test(text)) gives.hp = pd.amount;
  if (pd?.kind === 'mp' && G.yes.test(text)) gives.mp = pd.amount;
  const satisfied = !!pd && (
    (pd.kind === 'gold' && gives.gold >= pd.amount)
    || (pd.kind === 'item' && gives.items.includes(pd.itemId))
    || (pd.kind === 'hp' && gives.hp > 0 && player.hp > pd.amount)
    || (pd.kind === 'mp' && gives.mp > 0 && player.mp >= pd.amount)
  );

  // Classify the player's act (actions outside quotes decide the violent ones).
  let playerAct = 'talk';
  if (G.attack.test(action)) playerAct = 'attack';
  else if (G.mug.test(action)) playerAct = 'mug';
  else if (ai) playerAct = 'insult';
  else if (G.threaten.test(text)) playerAct = 'threaten';
  else if (G.beg.test(text)) playerAct = 'beg';
  else if (G.trick.test(action)) playerAct = 'trick';
  else if (G.askJoin.test(text)) playerAct = 'ask_join';
  else if (G.leave.test(action)) playerAct = 'leave';
  else if (gives.gold || gives.items.length || gives.hp) playerAct = 'give';
  else if (flirt) playerAct = 'flirt';

  const mood = state.mood + delta + (satisfied ? 1 : 0);
  const liked = hit.some((e) => e.kind === 'like');
  const disliked = hit.some((e) => e.kind === 'dislike');
  const tone = ai ? L.ai : disliked ? L.dislike : flirt && card.flirt !== 'n/a' && card.flirt !== 'taken' ? L.flirt : flirt && card.flirt === 'taken' ? L.flirt : liked ? L.like : L.neutral;
  const out = { ...base, matched, moodDelta: Math.max(-3, Math.min(3, delta)), playerAct, playerGives: gives, reply: tone };

  if (hit.some((e) => e.kind === 'instant')) {
    return { ...out, reply: L.bowBack ?? L.join, demonAct: 'offer_join' };
  }
  switch (playerAct) {
    case 'attack':
      return { ...out, reply: '*staggers back* You dare?!' };
    case 'mug':
      return { ...out, attemptChance: card.level <= 5 ? 'high' : 'low', reply: '*you grab for his purse*', demonAct: card.level <= 5 ? 'flee' : 'attack', ifFails: { reply: '*catches your wrist* Thief!', moodDelta: -3, demonAct: 'attack' } };
    case 'beg':
      return { ...out, attemptChance: mood >= 1 ? 'high' : 'low', reply: L.gift, demonAct: 'give', ifFails: { reply: L.refuse, moodDelta: -1, demonAct: 'none' } };
    case 'threaten':
      return { ...out, attemptChance: card.level <= 5 ? 'medium' : 'none', reply: '*backs away* Fine, fine!', demonAct: 'let_pass', ifFails: { reply: 'You threaten ME?', moodDelta: -2, demonAct: 'attack' } };
    case 'ask_join':
      return card.askStyle === 'normal'
        ? { ...out, attemptChance: mood >= 3 ? 'high' : 'medium', reply: L.join, ifFails: { reply: L.refuseJoin, moodDelta: -1, demonAct: 'none' } }
        : { ...out, attemptChance: 'none', moodDelta: Math.min(out.moodDelta, 0) - 1, reply: L.refuseJoin, ifFails: { reply: L.refuseJoin, moodDelta: -1, demonAct: 'none' } };
    case 'leave':
      return { ...out, reply: L.leaveNow ?? '...' };
    default:
      break;
  }

  // The kappa's river ruse: ask to leave, and actually leave if the player agrees.
  if (mem.ruseAsked && G.yes.test(text)) return { ...out, reply: '*scurries off toward the water*', demonAct: 'leave' };
  if (card.ruses.length && state.patience <= 2 && !mem.ruseAsked) {
    mem.ruseAsked = true;
    return { ...out, reply: L.leaveNow };
  }

  if (state.context.hostile && mood >= 0) return { ...out, reply: `${out.reply} ${L.letPass}`, demonAct: 'let_pass' };
  if (satisfied && mood >= 3) return { ...out, reply: `${L.thanks} ${L.join}`, demonAct: 'offer_join' };
  if (satisfied) return { ...out, reply: L.thanks };
  if (mood >= 2 && !pd && state.demandsMade.length === 0 && card.demands.length) {
    const d = card.demands.find((x) => x.kind !== 'item' || itemCount(player, x.itemId) > 0) ?? card.demands[0];
    return { ...out, reply: `${out.reply} ${L.demand}`, demonAct: 'demand', demand: { id: d.id, kind: d.kind, itemId: d.itemId, amount: d.amount } };
  }
  if (mood >= 4) return { ...out, reply: L.join, demonAct: 'offer_join' };
  if (mood <= -3) return { ...out, demonAct: 'attack' };
  return out;
}
