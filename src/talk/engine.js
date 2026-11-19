// Conversation state machine. Pure: takes the brain's (already untrusted) result, normalizes it,
// rolls the dice and applies the game's rules. Claude proposes; this module decides.
import {
  clampMood, askJoinChance, CHANCE_P, ROLLED_ACTS, HOSTILE_ACTS,
  JOIN_OFFER_MIN, GIFT_MIN, ATTACK_MAX, HOSTILE_START_MOOD,
} from './rules.js';
import { normalizeResult } from './normalize.js';
import { ITEMS } from '../data/index.js';
import { addItem, takeItem, addFieldNote } from '../game/player.js';
import { newDemon, addDemon, owns, STOCK_MAX } from '../game/demons.js';
import { register } from '../growth/compendium.js';

export const OUTCOMES = ['joined', 'left', 'fled', 'passed', 'player_left', 'fight_player_first', 'fight_demon_first'];

const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

export function startTalk({ card, player, rng = Math.random, context = {} }) {
  const [pmin, pmax] = card.patience;
  let mood = card.startMood ?? 0;
  if (context.hostile) mood = Math.min(mood, HOSTILE_START_MOOD);
  if (context.attackedByPlayer) mood = Math.min(mood, 0) - 2;
  return {
    demonId: card.id,
    card,
    mood: clampMood(mood),
    patience: randInt(rng, pmin, pmax),
    turn: 0,
    log: [],
    pendingDemand: null,
    demandsMade: [],
    giftGiven: false,
    ended: false,
    outcome: null,
    speaksFirst: !!context.hostile || rng() < (card.opener?.chance ?? 0),
    context: { hostile: !!context.hostile, attackedByPlayer: !!context.attackedByPlayer },
    alreadyOwned: owns(player, card.id),
  };
}

function say(state, who, text, extra = {}) {
  state.log.push({ who, text, ...extra });
}

function end(state, outcome, text) {
  state.ended = true;
  state.outcome = outcome;
  const name = state.card.name;
  const msg = text ?? {
    joined: `${name} joined your party!`,
    left: `${name} left.`,
    fled: `${name} ran away.`,
    passed: `${name} lets you pass.`,
    player_left: 'You walked away.',
    fight_player_first: 'You attack. A fight begins, and you strike first.',
    fight_demon_first: `${name} attacks! A fight begins, and he strikes first.`,
  }[outcome];
  say(state, 'system', msg, { outcome });
}

function giveGift(state, player, gift, rng) {
  const card = state.card;
  state.giftGiven = true;
  let item = gift?.itemId && card.gifts.items.includes(gift.itemId) ? gift.itemId : null;
  let gold = 0;
  if (!item) {
    const [lo, hi] = card.gifts.gold;
    gold = gift?.gold ? Math.max(lo, Math.min(hi, gift.gold)) : randInt(rng, lo, hi);
    if (!gift?.gold && card.gifts.items.length && rng() < 0.5) {
      item = card.gifts.items[randInt(rng, 0, card.gifts.items.length - 1)];
      gold = 0;
    }
  }
  if (item) {
    addItem(player, item);
    say(state, 'system', `${card.name} gave you ${ITEMS[item].name}.`, { reward: { item } });
  } else {
    player.gold += gold;
    say(state, 'system', `${card.name} gave you ${gold} gold.`, { reward: { gold } });
  }
}

function tryJoin(state, player, rng) {
  const card = state.card;
  if (card.level > player.level) {
    say(state, 'system', `${card.name} is willing, but at level ${card.level} he is too strong for you to command.`);
    end(state, 'passed');
    return;
  }
  if (owns(player, card.id)) {
    say(state, 'system', `You already have ${card.name}, so he gives you something instead.`);
    giveGift(state, player, null, rng);
    end(state, 'passed');
    return;
  }
  if (player.stock.length >= STOCK_MAX) {
    say(state, 'system', `Your stock is full (${STOCK_MAX} demons), so ${card.name} gives you something instead.`);
    giveGift(state, player, null, rng);
    end(state, 'passed');
    return;
  }
  const demon = addDemon(player, newDemon(card.id));
  register(player, demon);
  player.deeds.recruited.push(card.id);
  end(state, 'joined');
}

function setDemand(state, player, proposed) {
  const card = state.card;
  if (!card.demands.length) return;
  // Snap Claude's proposal onto one of the card's demands (same id, else same kind, else the first unmade one).
  let base = card.demands.find((d) => d.id === proposed?.id)
    || card.demands.find((d) => d.kind === proposed?.kind && (d.kind !== 'item' || d.itemId === proposed.itemId))
    || card.demands.find((d) => !state.demandsMade.includes(d.id))
    || card.demands[0];
  const demand = { id: base.id, kind: base.kind, text: base.text };
  if (base.kind === 'item') demand.itemId = base.itemId;
  else {
    const amt = proposed?.kind === base.kind && proposed.amount ? proposed.amount : base.amount;
    demand.amount = Math.max(Math.ceil(base.amount / 2), Math.min(base.amount * 2, amt));
    if (base.kind === 'hp') demand.amount = Math.min(demand.amount, Math.max(1, player.maxHp - 1));
    if (base.kind === 'mp') demand.amount = Math.min(demand.amount, player.maxMp);
  }
  state.pendingDemand = demand;
  if (!state.demandsMade.includes(base.id)) state.demandsMade.push(base.id);
  say(state, 'system', `${card.name} wants ${demandLabel(demand)}.`, { demand });
}

export function demandLabel(d) {
  if (d.kind === 'gold') return `${d.amount} gold`;
  if (d.kind === 'item') return ITEMS[d.itemId]?.name ?? d.itemId;
  return `${d.amount} ${d.kind.toUpperCase()}`;
}

// Move what the player says he hands over, clamped to what he actually has.
function transfer(player, gives) {
  const got = { gold: 0, items: [], hp: 0, mp: 0, short: false };
  if (gives.gold) {
    got.gold = Math.min(gives.gold, player.gold);
    if (got.gold < gives.gold) got.short = true;
    player.gold -= got.gold;
  }
  for (const id of gives.items) {
    if (takeItem(player, id)) got.items.push(id);
    else got.short = true;
  }
  if (gives.hp) {
    got.hp = Math.min(gives.hp, player.hp - 1);
    player.hp -= got.hp;
  }
  if (gives.mp) {
    got.mp = Math.min(gives.mp, player.mp);
    player.mp -= got.mp;
  }
  return got;
}

function satisfies(demand, got) {
  if (!demand) return false;
  if (demand.kind === 'gold') return got.gold >= demand.amount;
  if (demand.kind === 'item') return got.items.includes(demand.itemId);
  if (demand.kind === 'hp') return got.hp >= demand.amount;
  if (demand.kind === 'mp') return got.mp >= demand.amount;
  return false;
}

function describeTransfer(got) {
  const parts = [];
  if (got.gold) parts.push(`${got.gold} gold`);
  for (const id of got.items) parts.push(ITEMS[id].name);
  if (got.hp) parts.push(`${got.hp} HP`);
  if (got.mp) parts.push(`${got.mp} MP`);
  return parts.join(', ');
}

/**
 * Apply one brain result. playerText is null for the demon's opening line.
 * Mutates state and player; returns { moodDelta, rolled } for the UI.
 */
export function applyTurn(state, player, playerText, raw, rng = Math.random) {
  if (state.ended) throw new Error('conversation already ended');
  const card = state.card;
  const r = normalizeResult(raw, card);
  const opener = playerText == null;
  const before = state.mood;
  const info = { moodDelta: 0, rolled: null };

  if (!opener) {
    say(state, 'player', playerText);
    state.turn++;
  }

  const note = (id) => addFieldNote(player, card.id, id);
  for (const id of r.matched) note(id);

  // 1. A hate ends the conversation immediately.
  const hate = r.matched.map((id) => card.hates.find((h) => h.id === id)).find(Boolean);
  if (hate && !opener) {
    state.mood = clampMood(Math.min(state.mood + Math.min(r.moodDelta, -2), -3));
    say(state, 'demon', r.reply, { moodDelta: state.mood - before });
    info.moodDelta = state.mood - before;
    if (hate.reaction === 'attack') end(state, 'fight_demon_first');
    else end(state, 'left');
    return info;
  }

  // 2. Whatever the player handed over.
  let demandMet = false;
  if (!opener) {
    const g = r.playerGives;
    if (g.gold || g.items.length || g.hp || g.mp) {
      const got = transfer(player, g);
      const desc = describeTransfer(got);
      if (desc) say(state, 'system', `You gave ${desc}.`);
      if (got.short) say(state, 'system', "You don't have everything you tried to give.");
      if (satisfies(state.pendingDemand, got)) {
        demandMet = true;
        state.pendingDemand = null;
        player.deeds.paid++;
      }
    }
  }

  // 3. Roll the dice on chancy acts. Claude rated the odds; the game decides.
  let branch = r;
  let success = true;
  if (!opener && ROLLED_ACTS.includes(r.playerAct)) {
    const p = r.playerAct === 'ask_join'
      ? (card.askStyle === 'normal' ? askJoinChance(state.mood, r.attemptChance) : 0)
      : CHANCE_P[r.attemptChance];
    success = rng() < p;
    info.rolled = { act: r.playerAct, p, success };
    if (!success) {
      branch = r.ifFails
        ? { ...r, ...r.ifFails }
        : { ...r, moodDelta: Math.min(r.moodDelta, 0), demonAct: ['give', 'offer_join', 'let_pass'].includes(r.demonAct) ? 'none' : r.demonAct };
    }
    // Asking a shy or proud demon directly always backfires; he has to offer.
    if (r.playerAct === 'ask_join' && card.askStyle !== 'normal') {
      branch = { ...branch, moodDelta: Math.min(branch.moodDelta, -1) };
      if (branch.demonAct === 'offer_join') branch.demonAct = 'none';
    }
  }

  state.mood = clampMood(state.mood + branch.moodDelta + (demandMet ? 1 : 0));
  info.moodDelta = state.mood - before;
  say(state, 'demon', branch.reply, { moodDelta: opener ? 0 : info.moodDelta });

  // 4. The instant-join line.
  if (!opener && card.instantJoin && r.matched.includes(card.instantJoin.id)) {
    tryJoin(state, player, rng);
    return info;
  }

  // 5. What the player did.
  if (!opener) {
    switch (r.playerAct) {
      case 'attack':
        player.deeds.attackedInTalk++;
        end(state, 'fight_player_first');
        return info;
      case 'mug':
        if (success) {
          const [lo, hi] = card.purse;
          const gold = randInt(rng, lo, hi);
          player.gold += gold;
          player.deeds.mugged++;
          say(state, 'system', `You snatched ${gold} gold.`, { reward: { gold } });
        }
        if (branch.demonAct === 'flee') end(state, 'fled');
        else if (branch.demonAct === 'leave') end(state, 'left');
        else end(state, 'fight_demon_first');
        return info;
      case 'ask_join':
        if (success && card.askStyle === 'normal') {
          tryJoin(state, player, rng);
          return info;
        }
        break;
      case 'leave':
        if (branch.demonAct === 'attack') end(state, 'fight_demon_first', `${card.name} attacks as you turn away! He strikes first.`);
        else end(state, 'player_left');
        return info;
      case 'insult':
        player.deeds.insulted++;
        break;
      default:
        break;
    }
  }

  // 6. What the demon does.
  const begLike = ['beg', 'trick', 'threaten'].includes(r.playerAct) && success && !opener;
  switch (branch.demonAct) {
    case 'offer_join':
      if (state.mood >= JOIN_OFFER_MIN) {
        tryJoin(state, player, rng);
        return info;
      }
      break;
    case 'give':
      if (!state.giftGiven && (begLike || state.mood >= GIFT_MIN)) giveGift(state, player, r.gift, rng);
      break;
    case 'demand':
      if (!state.pendingDemand) setDemand(state, player, r.demand);
      break;
    case 'leave':
      end(state, 'left');
      return info;
    case 'flee':
      end(state, 'fled');
      return info;
    case 'let_pass':
      end(state, 'passed');
      return info;
    case 'attack':
      if (state.mood <= ATTACK_MAX || HOSTILE_ACTS.includes(r.playerAct) || state.context.hostile) {
        end(state, 'fight_demon_first');
        return info;
      }
      break;
    default:
      break;
  }

  // 7. Patience.
  if (!opener) {
    state.patience--;
    if (state.patience <= 0) {
      say(state, 'system', `${card.name} has lost interest.`);
      end(state, state.mood <= -3 ? 'fight_demon_first' : 'left');
    }
  }
  return info;
}

export function fieldNoteTexts(player, card) {
  const ids = player.fieldNotes[card.id] || [];
  const all = [...card.likes, ...card.dislikes, ...card.hates, ...(card.instantJoin ? [card.instantJoin] : [])];
  return ids.map((id) => all.find((e) => e.id === id)?.note).filter(Boolean);
}

