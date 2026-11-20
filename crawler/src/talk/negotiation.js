// Negotiation (pure). A talk is 2-4 questions answered with stances, plus one demand (pay or refuse). The enemy
// type's hidden personality decides how each stance moves its mood. Outcome by mood at the end:
//   >= JOIN and level <= hero level -> joins; >= JOIN but stronger than you -> gift; >= GIFT -> gift or leave;
//   >= 0 -> leaves; < 0 (or <= ANGRY at any point) -> it attacks with a free turn.
// Text is placeholder on purpose ("[Question 3]"); no story or writing.
import { MONSTERS } from '../data/monsters.js';
import { ITEMS } from '../data/items.js';

export const STANCES = ['Agree', 'Disagree', 'Flatter', 'Joke', 'Stay silent'];
export const JOIN = 4;
export const GIFT = 2;
export const ANGRY = -3;
export const MOOD_MAX = 6;

// Mood change per stance, per personality.
export const PREFS = {
  proud: { Agree: 1, Disagree: -2, Flatter: 2, Joke: -1, 'Stay silent': -1 },
  timid: { Agree: 1, Disagree: -1, Flatter: 0, Joke: -1, 'Stay silent': 2 },
  cheerful: { Agree: 1, Disagree: 0, Flatter: 1, Joke: 2, 'Stay silent': -2 },
  gloomy: { Agree: 2, Disagree: -1, Flatter: -1, Joke: -2, 'Stay silent': 1 },
  greedy: { Agree: 0, Disagree: -1, Flatter: 1, Joke: 0, 'Stay silent': -1 },
  hothead: { Agree: -1, Disagree: 2, Flatter: -1, Joke: 1, 'Stay silent': -2 },
};
// Paying / refusing a demand, and the chance it takes what you paid and runs.
export const DEMAND_REACT = {
  proud: { pay: 1, refuse: -2, run: 0.03 },
  timid: { pay: 2, refuse: 0, run: 0.05 },
  cheerful: { pay: 2, refuse: -1, run: 0.1 },
  gloomy: { pay: 2, refuse: -1, run: 0.03 },
  greedy: { pay: 3, refuse: -3, run: 0.3 },
  hothead: { pay: 1, refuse: -1, run: 0.18 },
};

export const personalityOf = (type) => MONSTERS[type].personality;
export const canTalk = (type) => personalityOf(type) !== 'mindless';

const consumables = (inv) => Object.keys(inv || {}).filter((id) => inv[id] > 0 && ITEMS[id] && ITEMS[id].use !== 'key');

/**
 * ctx = { rng, heroLevel, money, inv, heroHp, heroMaxHp, heroMp, heroMaxMp, enemyHpPct }
 */
export function startTalk(enemy, ctx) {
  const { rng } = ctx;
  const personality = personalityOf(enemy.type);
  const nQ = Math.min(4, 2 + (enemy.level >= 4 ? 1 : 0) + (rng() < 0.4 ? 1 : 0));
  const questions = [];
  for (let i = 0; i < nQ; i++) {
    // 3-4 stances, always at least one the personality doesn't dislike.
    let opts;
    for (let tries = 0; tries < 20; tries++) {
      const pool = [...STANCES].sort(() => rng() - 0.5);
      opts = pool.slice(0, rng() < 0.5 ? 3 : 4);
      if (opts.some((s) => PREFS[personality][s] >= 1)) break;
    }
    questions.push({ text: `[Question ${1 + Math.floor(rng() * 9)}]`, options: STANCES.filter((s) => opts.includes(s)) });
  }
  let mood = 0;
  if (ctx.enemyHpPct !== undefined && ctx.enemyHpPct < 0.5) mood += 1; // hurt enemies listen
  if (ctx.heroLevel >= enemy.level + 3) mood += 1;
  const demandAt = Math.min(nQ - 1, 1 + Math.floor(rng() * (nQ - 1)));
  return {
    type: enemy.type, level: enemy.level, name: enemy.name, personality, mood, step: 0, questions, demandAt,
    demand: null, demandDone: false, log: [], outcome: null, greeting: `[Greeting: ${personality}]`,
  };
}

function rollDemand(talk, ctx) {
  const { rng } = ctx;
  const items = consumables(ctx.inv);
  const kinds = ['money', 'money', 'hp', 'mp', ...(items.length ? ['item', 'item'] : [])];
  const kind = kinds[Math.floor(rng() * kinds.length)];
  if (kind === 'money') return { kind, amount: Math.round(talk.level * 12 + 10) };
  if (kind === 'item') return { kind, item: items[Math.floor(rng() * items.length)] };
  if (kind === 'hp') return { kind, amount: Math.max(1, Math.round(ctx.heroMaxHp * 0.15)) };
  return { kind: 'mp', amount: Math.max(1, Math.round(ctx.heroMaxMp * 0.25)) };
}

// What the talk wants from the player next.
export function prompt(talk, ctx) {
  if (talk.outcome) return { kind: 'end', outcome: talk.outcome };
  if (talk.step === talk.demandAt && !talk.demandDone) {
    talk.demand ||= rollDemand(talk, ctx);
    return { kind: 'demand', demand: talk.demand, canPay: canPay(talk.demand, ctx) };
  }
  if (talk.step < talk.questions.length) return { kind: 'question', ...talk.questions[talk.step] };
  return { kind: 'end', outcome: settle(talk, ctx) };
}

export function canPay(d, ctx) {
  if (d.kind === 'money') return ctx.money >= d.amount;
  if (d.kind === 'item') return (ctx.inv?.[d.item] || 0) > 0;
  if (d.kind === 'hp') return ctx.heroHp > d.amount;
  return ctx.heroMp >= d.amount;
}

const clampMood = (m) => Math.min(MOOD_MAX, m);

/** Answer the current question. Returns { delta }. */
export function answer(talk, stance, ctx) {
  const q = talk.questions[talk.step];
  if (!q || !q.options.includes(stance)) throw new Error(`bad stance ${stance}`);
  const delta = PREFS[talk.personality][stance];
  talk.mood = clampMood(talk.mood + delta);
  talk.log.push({ stance, delta });
  talk.step += 1;
  if (talk.mood <= ANGRY) talk.outcome = { kind: 'angry' };
  return { delta };
}

/** Pay or refuse the demand. Returns { delta, ran }. The caller applies the payment (money/item/HP/MP). */
export function respond(talk, pay, ctx) {
  const d = talk.demand;
  const react = DEMAND_REACT[talk.personality];
  talk.demandDone = true;
  if (pay && !canPay(d, ctx)) pay = false;
  const delta = pay ? react.pay : react.refuse;
  talk.mood = clampMood(talk.mood + delta);
  talk.log.push({ demand: d.kind, pay, delta });
  if (pay && ctx.rng() < react.run) {
    talk.outcome = { kind: 'fled' };
    return { delta, ran: true, paid: true };
  }
  if (talk.mood <= ANGRY) talk.outcome = { kind: 'angry' };
  return { delta, ran: false, paid: pay };
}

// End of the talk: decide by mood.
export function settle(talk, ctx) {
  if (talk.outcome) return talk.outcome;
  const m = talk.mood;
  let out;
  if (m >= JOIN && talk.level <= ctx.heroLevel) out = { kind: 'join' };
  else if (m >= JOIN) out = { kind: 'gift', item: giftFor(talk, ctx), tooStrong: true };
  else if (m >= GIFT) out = ctx.rng() < 0.6 ? { kind: 'gift', item: giftFor(talk, ctx) } : { kind: 'leave' };
  else if (m >= 0) out = { kind: 'leave' };
  else out = { kind: 'angry' };
  talk.outcome = out;
  return out;
}

function giftFor(talk, ctx) {
  const pool = talk.level >= 8 ? ['salve', 'mana_drop', 'revival_bead', 'holy_shard', 'dusk_shard'] : ['medicine', 'medicine', 'fire_shard', 'ice_shard', 'bolt_shard', 'wind_shard', 'mana_drop'];
  return pool[Math.floor(ctx.rng() * pool.length)];
}

// ---- Notebook: what each personality liked, and which types have which personality --------------------------
export function newNotebook() {
  return { types: {}, stances: {}, demands: {} };
}

export function recordTalk(book, talk) {
  book.types[talk.type] = talk.personality;
  const st = (book.stances[talk.personality] ||= {});
  const dm = (book.demands[talk.personality] ||= {});
  for (const l of talk.log) {
    if (l.stance) st[l.stance] = l.delta;
    if (l.demand) dm[l.pay ? 'pay' : 'refuse'] = l.delta;
  }
  if (talk.outcome?.kind === 'fled') dm.ran = true;
}
