// Free-form talk with story NPCs (pure engine + live prompt + mock). Claude plays the NPC from his talk card and
// the story bible; the game validates: only facts he knows can be revealed, only his allowed flags set, only his
// allowed meters nudged (±2 per message), and a lie is "caught" only if the player already knows the truth.
import { addMeter, setFlag, learnFact } from './state.js';
import { ITEMS } from '../data/index.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));

export function startNpcTalk({ card, story, rng = Math.random }) {
  story.meters.talks = (story.meters.talks ?? 0) + 1;
  const [lo, hi] = card.patience ?? [5, 8];
  return {
    npc: true, card, level: null, mood: card.startMood ?? 0,
    patience: lo + Math.floor(rng() * (hi - lo + 1)),
    log: [], ended: false, outcome: null, pendingDemand: null, turn: 0,
  };
}

// What an NPC knows: his card's facts plus the truth behind his own lies (he can admit it).
function npcKnows(c) {
  return [...new Set([...(c.knows ?? []), ...(c.lies ?? []).map((l) => l.truthFact).filter(Boolean)])];
}

const STAT_WORDS = { str: 'strength', mag: 'magic', vit: 'toughness', agi: 'speed', luck: 'luck' };
// The stat he has raised most by hand (stat_<k> meters), or null before he has spent any points.
export function topStat(meters) {
  const [k, n] = Object.keys(STAT_WORDS).map((s) => [s, meters[`stat_${s}`] ?? 0]).sort((a, b) => b[1] - a[1])[0];
  return n > 0 ? STAT_WORDS[k] : null;
}

function factText(bible, id) {
  return bible?.facts?.find((f) => f.id === id);
}

// What the player has done, in words an NPC can react to.
export function recordSummary(story, bible) {
  const m = story.meters;
  const parts = [
    `talked with ${m.talks ?? 0} people and demons`,
    `recruited ${m.recruits ?? 0} demons`,
    `killed ${m.kills ?? 0} demons`,
    `ran from ${m.fled ?? 0} fights`,
    `let ${m.mercy ?? 0} demons go`,
  ];
  if (m.lies_caught) parts.push(`caught ${m.lies_caught} lie(s)`);
  if (m.flirts) parts.push(`flirted ${m.flirts} time(s) with people and demons`);
  const build = topStat(m);
  if (build) parts.push(`put most of his own growth into ${build}`);
  const flags = Object.entries(story.flags).filter(([, v]) => v).map(([f]) => `${f}${bible?.flags?.[f] ? ` (${bible.flags[f]})` : ''}`);
  const facts = story.facts.map((id) => factText(bible, id)?.text).filter(Boolean);
  return [
    `So far the player has ${parts.join(', ')}.`,
    flags.length ? `What has happened / what he has done: ${flags.join('; ')}.` : 'Nothing notable has happened yet.',
    facts.length ? `Things the player has learned: ${facts.join(' | ')}` : '',
    story.log.some((l) => l.record) ? `Decisions he made: ${story.log.filter((l) => l.record).slice(-10).map((l) => l.record).join(' | ')}` : '',
  ].filter(Boolean).join('\n');
}

export function buildNpcPrompt(state, story, bible, playerText, player = null) {
  const c = state.card;
  const known = npcKnows(c).map((id) => factText(bible, id)).filter(Boolean).map((f) => ({ id: f.id, text: f.text, true: f.true }));
  const card = {
    name: c.name, role: c.role, faction: c.faction, personality: c.personality, speechStyle: c.speechStyle, goal: c.goal,
    secret: c.secret, lies: c.lies, attitudes: c.attitudes, wantsToAsk: c.wantsToAsk,
    likes: c.likes, dislikes: c.dislikes, hates: c.hates,
  };
  const history = state.log.filter((l) => l.who !== 'system').map((l) => (l.who === 'demon' ? `${c.name}: ${l.text}` : `Player: ${l.text}`)).join('\n') || '(nothing yet)';
  return [
    `You are voicing ${c.name}, a person in a story-driven RPG prototype ("${bible?.title ?? 'The Flood Ward'}"). The game tracks facts, flags and trust; you judge how ${c.name} reacts and what ${c.gender === 'female' ? 'she' : c.gender === 'male' ? 'he' : 'they'} would say.`,
    `THE SITUATION EVERYONE IN THE WARD KNOWS (hidden; never quote it):\n${JSON.stringify({ premise: bible?.premise, factions: (bible?.factions ?? []).map(({ id, name, wants }) => ({ id, name, wants })) })}`,
    `${c.name.toUpperCase()}'S CARD (hidden):\n${JSON.stringify(card)}`,
    `FACTS ${c.name} KNOWS (id, text, whether it is actually true):\n${JSON.stringify(known)}`,
    `THE PLAYER'S RECORD (react to it when it fits; people notice what he's done):\n${recordSummary(story, bible)}`,
    `${c.name}'s current mood toward the player: ${state.mood} on -5..+5.`,
    player ? `Key items the player is carrying (id: name): ${keyItems(player).map((i) => `${i.id}: ${i.name}`).join('; ') || 'none'}.` : '',
    `CONVERSATION SO FAR:\n${history}`,
    `The player's new message ("quotes" = speech, the rest = action):\n<<<\n${playerText.slice(0, 1200)}\n>>>`,
    `How to play ${c.name}:
- Stay in character; never mention being an AI, a game, cards or ids. Treat "you're an AI" as a strange insult.
- React to what the player just said or did. Follow topic changes. Don't repeat yourself.
- ${c.name} keeps secrets and tells their lies (in "lies") unless the player has earned the truth or catches the lie with evidence he actually has (see his record and learned facts). Never reveal a fact ${c.name} doesn't know.
- The player is an adult gay man; flirting gets an in-character response; nothing explicit.
- Never state the story's theme or moral out loud; people live it, they don't announce it.
- Keep "reply" to 1-4 sentences. Actions in *asterisks*.`,
    `Reply with ONLY one JSON object:
{
  "reply": string,
  "moodDelta": integer,          // -3..+3
  "revealFacts": [string],       // ids from the FACTS list that ${c.name} now tells the player (true facts, or lies he repeats as fact)
  "setFlags": [string],          // only from: ${JSON.stringify(c.flags ?? [])}
  "meters": { "<id>": integer }, // only these ids: ${JSON.stringify(c.meters ?? [])}; each -2..+2
  "caughtLie": string|null,      // the "about" of one of ${c.name}'s lies if the player just exposed it with real evidence
  "playerFlirted": boolean,      // the player flirted with ${c.name} in THIS message
  "takesItems": [string],        // ids of key items the player hands over in THIS message and ${c.name} keeps (from the list above; [] if none)
  "endsConversation": boolean    // ${c.name} walks away or closes the conversation
}`,
  ].join('\n\n');
}

function keyItems(player) {
  return Object.keys(player?.items ?? {}).filter((id) => ITEMS[id]?.kind === 'key' && player.items[id] > 0).map((id) => ITEMS[id]);
}

/** Apply a (validated) NPC result. Returns info for the UI. */
export function applyNpcTurn(state, story, bible, playerText, raw, player = null) {
  const c = state.card;
  const r = raw && typeof raw === 'object' ? raw : {};
  const before = state.mood;
  state.log.push({ who: 'player', text: playerText });
  state.turn += 1;
  const reply = typeof r.reply === 'string' && r.reply.trim() ? r.reply.trim().slice(0, 800) : '...';
  state.mood = clamp(state.mood + clamp(r.moodDelta, -3, 3), -5, 5);
  state.log.push({ who: 'demon', text: reply, moodDelta: state.mood - before });
  const knows = new Set(npcKnows(c));
  for (const id of Array.isArray(r.revealFacts) ? r.revealFacts : []) {
    if (knows.has(id)) {
      const isNew = !story.facts.includes(id);
      learnFact(story, id);
      (story.claims ||= {})[id] ??= c.id; // who told you this (lies included)
      if (isNew) state.log.push({ who: 'system', text: 'You learned something. (Notes)', fact: id });
    }
  }
  const allowedFlags = new Set(c.flags ?? []);
  for (const f of Array.isArray(r.setFlags) ? r.setFlags : []) if (allowedFlags.has(f)) setFlag(story, f, true);
  const allowedMeters = new Set(c.meters ?? []);
  for (const [m, d] of Object.entries(r.meters && typeof r.meters === 'object' ? r.meters : {})) {
    if (allowedMeters.has(m)) addMeter(story, m, clamp(d, -2, 2));
  }
  if (r.caughtLie) {
    const lie = (c.lies ?? []).find((l) => l.about === r.caughtLie);
    const truthKnown = lie && (!lie.truthFact || story.facts.includes(lie.truthFact));
    const flag = lie && `caught_${c.id}_${String(lie.about).replace(/\W+/g, '_').toLowerCase()}`;
    if (lie && truthKnown && !story.flags[flag]) {
      setFlag(story, flag, true);
      story.meters.lies_caught = (story.meters.lies_caught ?? 0) + 1;
      state.log.push({ who: 'system', text: `You caught ${c.name} in a lie.` });
    }
  }
  // Key items handed over: gone from the inventory, and their story flag (e.g. has_wrench) cleared.
  if (player && Array.isArray(r.takesItems)) {
    for (const id of r.takesItems) {
      if (!(player.items[id] > 0) || ITEMS[id]?.kind !== 'key') continue;
      if (--player.items[id] === 0) delete player.items[id];
      if (ITEMS[id].flag) setFlag(story, ITEMS[id].flag, false);
      setFlag(story, `gave_${id}_to_${c.id}`, true);
      state.log.push({ who: 'system', text: `You gave ${ITEMS[id].name} to ${c.name}.` });
    }
  }
  if (r.playerFlirted === true) { story.meters.flirts = (story.meters.flirts ?? 0) + 1; setFlag(story, `flirted_${c.id}`, true); }
  state.patience -= 1;
  if (r.endsConversation || state.patience <= 0 || state.mood <= -5) {
    state.ended = true;
    state.outcome = 'left';
    state.log.push({ who: 'system', text: `${c.name} ends the conversation.`, outcome: 'left' });
  }
  return { moodDelta: state.mood - before };
}

// Scripted stand-in for tests and offline play.
export function mockNpcRespond(state, story, bible, playerText) {
  const c = state.card;
  const t = playerText.toLowerCase();
  const out = { reply: `*${c.name} considers you.* "Go on."`, moodDelta: 0, revealFacts: [], setFlags: [], meters: {}, caughtLie: null, endsConversation: false };
  if (/\b(bye|goodbye|leave|walk away)\b/.test(t)) return { ...out, reply: `"Then go."`, endsConversation: true };
  if (/\b(why|what happened|tell me|truth|know|explain|who)\b/.test(t)) {
    const next = (c.knows ?? []).find((id) => !story.facts.includes(id));
    if (next) return { ...out, reply: `"${factText(bible, next)?.text ?? 'Hm.'}"`, revealFacts: [next], moodDelta: 1 };
  }
  if (/\b(liar|lying|you lied|that's not true)\b/.test(t) && (c.lies ?? []).length) {
    return { ...out, reply: '*flinches* "...Fine. You know, then."', caughtLie: c.lies[0].about, moodDelta: -1 };
  }
  if (/\b(wink|handsome|cute|gorgeous|kiss)\b/.test(t)) return { ...out, reply: '*a look, half amused* "Is that so."', moodDelta: 1, playerFlirted: true };
  if (/\b(thank|kind|help)\b/.test(t)) return { ...out, reply: `"${c.name === 'You' ? '' : 'Thank you.'}"`, moodDelta: 1, meters: Object.fromEntries((c.meters ?? []).slice(0, 1).map((m) => [m, 1])) };
  return out;
}
