// Validate and clamp whatever the brain (live Claude or mock) returned. Claude proposes;
// this is the first line of the game deciding. Unknown ids and out-of-range values are dropped.
import { PLAYER_ACTS, DEMON_ACTS, CHANCES } from './rules.js';
import { ITEMS } from '../data/index.js';

const int = (v, d = 0) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : d);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function cardEntryIds(card) {
  return new Set([
    ...card.likes.map((x) => x.id),
    ...card.dislikes.map((x) => x.id),
    ...card.hates.map((x) => x.id),
    ...(card.instantJoin ? [card.instantJoin.id] : []),
  ]);
}

function cleanReply(v) {
  const s = typeof v === 'string' ? v.trim() : '';
  return s.slice(0, 600);
}

function cleanBranch(b, fallback) {
  return {
    reply: cleanReply(b?.reply) || fallback.reply,
    moodDelta: clamp(int(b?.moodDelta, fallback.moodDelta), -3, 3),
    demonAct: DEMON_ACTS.includes(b?.demonAct) ? b.demonAct : 'none',
  };
}

function cleanDemand(d) {
  if (!d || typeof d !== 'object') return null;
  const kind = ['gold', 'item', 'hp', 'mp'].includes(d.kind) ? d.kind : null;
  if (!kind) return null;
  const out = { kind, id: typeof d.id === 'string' ? d.id : null };
  if (kind === 'item') {
    if (!ITEMS[d.itemId]) return null;
    out.itemId = d.itemId;
  } else {
    out.amount = Math.max(1, int(d.amount, 0));
  }
  return out;
}

function cleanGift(g) {
  if (!g || typeof g !== 'object') return null;
  if (g.itemId && ITEMS[g.itemId]) return { itemId: g.itemId };
  const gold = int(g.gold, 0);
  return gold > 0 ? { gold } : null;
}

function cleanGives(g) {
  const out = { gold: 0, items: [], hp: 0, mp: 0 };
  if (!g || typeof g !== 'object') return out;
  out.gold = Math.max(0, int(g.gold, 0));
  out.hp = Math.max(0, int(g.hp, 0));
  out.mp = Math.max(0, int(g.mp, 0));
  if (Array.isArray(g.items)) out.items = g.items.filter((id) => typeof id === 'string' && ITEMS[id]).slice(0, 5);
  return out;
}

export function normalizeResult(raw, card) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const ids = cardEntryIds(card);
  const main = cleanBranch(r, { reply: '...', moodDelta: 0 });
  const matched = Array.isArray(r.matched) ? [...new Set(r.matched.filter((id) => ids.has(id)))] : [];
  return {
    ...main,
    matched,
    playerAct: PLAYER_ACTS.includes(r.playerAct) ? r.playerAct : 'other',
    attemptChance: CHANCES.includes(r.attemptChance) ? r.attemptChance : 'medium',
    ifFails: r.ifFails && typeof r.ifFails === 'object' ? cleanBranch(r.ifFails, { reply: main.reply, moodDelta: Math.min(0, main.moodDelta) }) : null,
    demand: cleanDemand(r.demand),
    gift: cleanGift(r.gift),
    playerGives: cleanGives(r.playerGives),
  };
}
