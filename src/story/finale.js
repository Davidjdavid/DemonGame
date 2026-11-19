// The chapter-end decision. The player writes what he does in his own words; a "director" (live Claude, or a
// keyword mock) picks one of the outcomes his record makes possible and tailors the narration. The game validates
// the pick. Then an SMT I / Catherine-style reflection mirrors his behavior back around the theme.
import { meets } from './state.js';
import { recordSummary, topStat } from './npcTalk.js';

export function eligibleOutcomes(bible, story) {
  return (bible?.outcomes ?? []).filter((o) => meets(story, o.requires));
}

// `shown`: the lines of the finale scenes that just played (the director continues from them, never re-tells them).
export function buildDirectorPrompt(bible, story, decision, { shown = [] } = {}) {
  const ok = eligibleOutcomes(bible, story);
  // The bible's reflections that will be printed under the ending (computed as if his side requests happened).
  const preview = { ...story, flags: { ...story.flags } };
  for (const a of asidesFor(bible, story, decision)) Object.assign(preview.flags, a.set ?? {});
  const printed = endingDetails(bible, preview, null).reflections;
  const eligible = ok.map((o) => ({ id: o.id, title: o.title, intent: o.intent, narration: o.narration, verdict: o.verdict }));
  const blocked = (bible.outcomes ?? []).filter((o) => !ok.includes(o)).map((o) => ({ title: o.title, intent: o.intent, whyNot: o.ifUnmet }));
  return [
    `You are the director of a story-driven RPG prototype ("${bible.title}"). The player's chapter is ending and he has just said, in his own words, what he does. Pick the outcome that best follows from his words AND what he has actually done. The world has its own truth: don't just grant what he asks if his record or the facts make it impossible; choose the closest outcome that is possible and let the narration show why.`,
    `STORY BIBLE (hidden): ${JSON.stringify({ premise: bible.premise, theme: bible.theme, world: bible.world, factions: bible.factions, fixedEvents: bible.fixedEvents, npcs: (bible.npcs ?? []).map(({ id, name, role, faction, goal, secret }) => ({ id, name, role, faction, goal, secret })) })}`,
    `THE PLAYER'S RECORD:\n${recordSummary(story, bible)}\nMeters: ${JSON.stringify(story.meters)}`,
    `OUTCOMES THAT ARE POSSIBLE GIVEN HIS RECORD (choose one id from these only; "intent" is what he'd have to be aiming at):\n${JSON.stringify(eligible)}`,
    `OUTCOMES HIS RECORD MAKES IMPOSSIBLE (if he asks for one of these, pick the nearest possible outcome and let the narration show why; whyNot lists every possible reason — use only the ones that match his record above):\n${JSON.stringify(blocked)}`,
    bible.finale?.rule ? `RULE: ${bible.finale.rule}` : '',
    (bible.finale?.asides ?? []).some((a) => meets(story, a.when ?? {})) ? `SIDE REQUESTS THAT ARE STILL POSSIBLE (if his words ask for one, make it happen in the narration, briefly, alongside the main outcome):\n${JSON.stringify((bible.finale.asides ?? []).filter((a) => meets(story, a.when ?? {})).map(({ asks, text }) => ({ asks, text })))}` : '',
    tooLate(bible, story).length ? `THINGS THAT ARE ALREADY TOO LATE (if he asks for one, honor the spirit where possible and use its text to say why it can't happen now):\n${JSON.stringify(tooLate(bible, story).map(({ asks, text }) => ({ asks, text })))}` : '',
    shown.length ? `ALREADY SHOWN, JUST BEFORE HIS DECISION (continue from this moment; don't re-tell it):\n${shown.join('\n')}` : '',
    printed.length ? `THESE REFLECTIONS WILL BE PRINTED UNDER THE ENDING (your "reflection" must say something different; don't repeat them):\n${JSON.stringify(printed)}` : '',
    `THE PLAYER'S DECISION:\n<<<\n${decision.slice(0, 2000)}\n>>>`,
    `Reply with ONLY one JSON object:
{
  "outcome": string,     // one id from the possible outcomes
  "narration": string,   // 4-8 sentences: what happens, in second person, honoring his words where the world allows and showing the cost
  "reflection": string   // 2-4 sentences, Catherine/SMT I style: what his choices and behavior say about him, framed by the theme (positions that can't all fit; the cost of each). Specific to his record. Not preachy, no moralizing, no "right answer".
}`,
  ].join('\n\n');
}

// Validate the director's answer; fall back to the mock's pick if it chose something impossible.
export function resolveFinale(bible, story, decision, raw) {
  const eligible = eligibleOutcomes(bible, story);
  const asides = asidesFor(bible, story, decision);
  const r = raw && typeof raw === 'object' ? raw : {};
  let outcome = eligible.find((o) => o.id === r.outcome);
  let narration = typeof r.narration === 'string' && r.narration.trim() ? r.narration.trim() : null;
  if (!outcome) {
    outcome = mockPick(eligible, decision) ?? eligible.find((o) => o.id === bible.finale?.fallback) ?? null;
    narration = null;
  }
  // The mock's narration already carries the aside lines; a fallback narration gets them added here.
  if (!narration && asides.length) narration = [outcome?.narration, ...asides.map((a) => a.text)].filter(Boolean).join('\n\n');
  applyAsides(bible, story, decision);
  return {
    outcome,
    narration: narration ?? outcome?.narration ?? 'The water rises, and the Ward goes on without an answer.',
    reflection: typeof r.reflection === 'string' && r.reflection.trim() ? r.reflection.trim() : null,
  };
}

// Offline director (also the fallback when live Claude can't answer): what he says he's aiming at (title + intent)
// counts three times as much as words that only appear in the narration, and the catch-all outcomes (no requirements)
// only win when nothing specific matches as well.
const STOP = new Set('that this with have they them then their there what when where will would from into your just like make sure about some them'.split(' '));
const stem = (w) => w.replace(/'s$/, '').replace(/(ing|ed|es|s)$/, '');
const words = (text) => new Set((String(text).toLowerCase().match(/[a-z']{4,}/g) ?? []).filter((w) => !STOP.has(w)).map(stem));

function mockPick(eligible, decision) {
  const said = words(decision);
  let best = null;
  let bestScore = -Infinity;
  for (const o of eligible) {
    const aim = words(`${o.id.replace(/_/g, ' ')} ${o.title} ${o.intent ?? ''}`);
    const story = words(o.narration);
    let score = 0;
    for (const w of said) score += aim.has(w) ? 3 : story.has(w) ? 1 : 0;
    const catchAll = !o.requires || Object.keys(o.requires).length === 0;
    if (catchAll) score -= 1.5;
    if (score > bestScore) { best = o; bestScore = score; }
  }
  return best;
}

// Side requests still possible at the end ("Pell, go home"): matched by keyword in his words; each adds its line to
// the narration and may set flags so the fates agree. finale.asides: [{ id, asks, keywords, when, text, set }].
export function asidesFor(bible, story, decision) {
  const words = String(decision).toLowerCase();
  return (bible?.finale?.asides ?? []).filter((a) => meets(story, a.when ?? {}) && (a.keywords ?? []).some((k) => words.includes(String(k).toLowerCase())));
}

function applyAsides(bible, story, decision) {
  const hit = asidesFor(bible, story, decision);
  for (const a of hit) for (const [f, v] of Object.entries(a.set ?? {})) story.flags[f] = v;
  return hit;
}

export function tooLate(bible, story) {
  return (bible?.finale?.tooLate ?? []).filter((t) => meets(story, t.when ?? {}));
}

export function mockDirector(bible, story, decision) {
  const o = mockPick(eligibleOutcomes(bible, story), decision);
  const words = decision.toLowerCase();
  const late = tooLate(bible, story).filter((t) => (t.keywords ?? []).some((k) => words.includes(String(k).toLowerCase())));
  const asides = asidesFor(bible, story, decision);
  const narration = [...late.map((t) => t.text), o?.narration, ...asides.map((a) => a.text)].filter(Boolean).join('\n\n'); // "you can't" first, then what happens, then what he asked on the side
  return { outcome: o?.id, narration, reflection: null };
}

// Fates whose conditions hold, the bible's reflections that match his record (up to 3), and the coda.
export function endingDetails(bible, story, outcome) {
  // One row per person: several matching fate lines for the same "who" are joined, in order.
  const fates = [];
  for (const f of (Array.isArray(outcome?.fates) ? outcome.fates : []).filter((x) => !x.requires || meets(story, x.requires))) {
    const row = fates.find((r) => r.who === f.who);
    const text = f.text ?? f.fate ?? '';
    if (row) row.text = `${row.text} ${text}`.trim(); else fates.push({ ...f, text });
  }
  const reflections = (bible?.reflections ?? []).filter((r) => meets(story, r.requires)).slice(0, 3).map((r) => r.text);
  const coda = Array.isArray(bible?.coda) ? bible.coda : bible?.coda ? [bible.coda] : [];
  return { fates, reflections, coda, verdict: outcome?.verdict ?? null };
}

// The plain record shown under the ending (always available, no Claude needed).
export function recordLines(story, player, nameOf = (id) => id) {
  const m = story.meters;
  const first = Object.keys(story.flags).find((f) => f.startsWith('first_talk_') && story.flags[f])?.slice('first_talk_'.length);
  const build = topStat(m);
  const [top, fights] = Object.entries(story.usage ?? {}).sort((a, b) => b[1] - a[1])[0] ?? [];
  const lines = [
    `You spoke with ${m.talks ?? 0} ${(m.talks ?? 0) === 1 ? 'person or demon' : 'people and demons'}, recruited ${m.recruits ?? 0}, and killed ${m.kills ?? 0}.`,
    m.fled ? `You ran from ${m.fled} fight${m.fled === 1 ? '' : 's'}.` : 'You never ran from a fight.',
    m.mercy ? `You let ${m.mercy} demon${m.mercy === 1 ? '' : 's'} walk away.` : null,
    first ? `Of the four who wanted something from you, you went to ${nameOf(first)} first.` : null,
    build ? `You built yourself for ${build}.` : null,
    m.flirts ? `You flirted ${m.flirts} time${m.flirts === 1 ? '' : 's'}.` : null,
    top ? `${nameOf(top)} fought beside you most (${fights} fight${fights === 1 ? '' : 's'}).` : null,
    m.lies_caught ? `You caught ${m.lies_caught} lie${m.lies_caught === 1 ? '' : 's'}.` : 'You never caught anyone lying.',
    player ? `You ended at level ${player.level} with ${player.stock.length} demon${player.stock.length === 1 ? '' : 's'} beside you.` : null,
  ];
  return lines.filter(Boolean);
}
