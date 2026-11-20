// Talk panel inside a battle: questions with stance buttons (with notebook hints), one demand, the outcome.
import { startTalk, prompt, answer, respond, settle, recordTalk, PREFS } from '../talk/negotiation.js';
import { newRecruit } from '../growth/leveling.js';
import { register } from '../growth/fusion.js';
import { itemName } from '../data/items.js';
import { MONSTERS } from '../data/monsters.js';
import { drawFigure } from './figures.js';
import { el, clear } from './dom.js';

export const MAX_RECRUITS = 8; // 3 in the party + 5 in stock

const REACT = (d) => (d >= 2 ? '[loves that] ▲▲' : d === 1 ? '[likes that] ▲' : d === 0 ? '[shrugs] –' : d === -1 ? '[dislikes that] ▼' : '[hates that] ▼▼');
const HINT = (d) => (d === undefined ? '' : d >= 2 ? ' ▲▲' : d === 1 ? ' ▲' : d === 0 ? ' –' : d === -1 ? ' ▼' : ' ▼▼');

function demandText(d) {
  if (d.kind === 'money') return `[Demand: ${d.amount} gold]`;
  if (d.kind === 'item') return `[Demand: one ${itemName(d.item)}]`;
  if (d.kind === 'hp') return `[Demand: ${d.amount} of your HP]`;
  return `[Demand: ${d.amount} of your MP]`;
}

/** Returns a battle action { type: 'talk', target, outcome, endTurn }. */
export function talkHook(game, rng, { fast = false } = {}) {
  return async (state, actor, target, ui) => {
    const wait = ui.wait;
    const ctx = () => ({
      rng, heroLevel: game.hero.level, money: game.money, inv: game.inv,
      heroHp: actor.hp, heroMaxHp: actor.maxHp, heroMp: actor.mp, heroMaxMp: actor.maxMp,
      enemyHpPct: target.hp / target.maxHp,
    });
    const talk = startTalk(target, ctx());
    const known = game.notebook.types[target.type];
    const hints = known ? game.notebook.stances[known] || {} : {};
    const battleRoot = document.querySelector('.battle');
    const fig = el('canvas', { class: 'fig', width: 140, height: 140 });
    drawFigure(fig, MONSTERS[target.type].shape, MONSTERS[target.type].color);
    const moodBar = el('div', { class: 'mood' });
    const speech = el('div', { class: 'speech' });
    const react = el('div', { class: 'react' });
    const opts = el('div', { class: 'talk-opts' });
    const panel = el('div', { class: 'talk' },
      el('div', { class: 'talk-head' }, fig, el('div', {},
        el('div', { class: 'e-name' }, `${target.name}`, el('span', { class: 'lv' }, ` Lv ${target.level}`)),
        el('div', { class: 'muted small' }, known ? `Personality: ${known}` : 'Personality: unknown'),
        el('div', { class: 'small' }, 'Mood ', moodBar))),
      speech, react, opts);
    battleRoot.append(panel);
    const drawMood = () => {
      clear(moodBar);
      for (let i = -3; i <= 6; i++) {
        if (i === 0) moodBar.append(el('span', { class: 'mood-zero' }));
        moodBar.append(el('i', { class: `pip${talk.mood >= i && i > 0 ? ' up' : ''}${talk.mood <= i && i < 0 ? ' down' : ''}${i === 4 ? ' join' : ''}` }));
      }
    };
    const choose = (buttons) => new Promise((resolve) => {
      clear(opts);
      const done = (v) => { window.removeEventListener('keydown', onKey); resolve(v); };
      const onKey = (e) => {
        const n = Number(e.key);
        if (n >= 1 && n <= buttons.length && !buttons[n - 1][2]) { e.preventDefault(); done(buttons[n - 1][1]); }
      };
      buttons.forEach(([label, value, disabled], i) => {
        opts.append(el('button', { class: 'm', disabled, onclick: () => done(value) }, el('kbd', {}, String(i + 1)), label));
      });
      window.addEventListener('keydown', onKey);
    });

    speech.textContent = `${target.name}: "${talk.greeting}"`;
    drawMood();
    let outcome = null;
    for (let guard = 0; guard < 12 && !outcome; guard++) {
      const p = prompt(talk, ctx());
      if (p.kind === 'question') {
        speech.textContent = `${target.name}: "${p.text}"`;
        const stance = await choose(p.options.map((s) => [`[${s}]${HINT(hints[s])}`, s]));
        const { delta } = answer(talk, stance, ctx());
        hints[stance] = delta;
        react.textContent = `${target.name}: ${REACT(delta)}`;
        react.className = `react ${delta > 0 ? 'good' : delta < 0 ? 'bad' : ''}`;
        drawMood();
        await wait(fast ? 0 : 450);
      } else if (p.kind === 'demand') {
        speech.textContent = `${target.name}: "${demandText(p.demand)}"`;
        react.textContent = '';
        const pay = await choose([['Pay', true, !p.canPay], ['Refuse', false]]);
        if (pay && p.canPay) {
          const d = p.demand;
          if (d.kind === 'money') game.money -= d.amount;
          if (d.kind === 'item') { game.inv[d.item] -= 1; if (game.inv[d.item] <= 0) delete game.inv[d.item]; }
          if (d.kind === 'hp') actor.hp = Math.max(1, actor.hp - d.amount);
          if (d.kind === 'mp') actor.mp = Math.max(0, actor.mp - d.amount);
        }
        const r = respond(talk, pay, ctx());
        react.textContent = r.ran ? `${target.name}: [takes it and runs!]` : `${target.name}: ${REACT(r.delta)}`;
        react.className = `react ${r.ran || r.delta < 0 ? 'bad' : 'good'}`;
        drawMood();
        await wait(fast ? 0 : 500);
      } else {
        outcome = p.outcome;
      }
    }
    outcome ||= settle(talk, ctx());
    recordTalk(game.notebook, talk);
    let battleOutcome = 'left';
    let line = '';
    if (outcome.kind === 'join') {
      if (game.party.length + game.stock.length >= MAX_RECRUITS) {
        line = `${target.name}: "[would join, but you have no room]" It leaves.`;
      } else {
        const r = newRecruit(target.type, target.level, { uid: game.nextUid++ });
        r.hp = Math.max(1, Math.round(r.hp * (target.hp / target.maxHp)));
        if (game.party.length < 3) game.party.push(r);
        else game.stock.push(r);
        register(game, r);
        game.stats.recruited++;
        battleOutcome = 'joined';
        line = `${target.name} joins you!${game.party.includes(r) ? '' : ' (sent to stock)'}`;
      }
    } else if (outcome.kind === 'gift') {
      game.inv[outcome.item] = (game.inv[outcome.item] || 0) + 1;
      battleOutcome = 'gift';
      line = `${outcome.tooStrong ? `${target.name}: "[you're too weak to lead me]" ` : ''}${target.name} gives you a ${itemName(outcome.item)} and leaves.`;
    } else if (outcome.kind === 'leave') {
      line = `${target.name}: "[loses interest]" It leaves.`;
    } else if (outcome.kind === 'fled') {
      battleOutcome = 'fled';
      line = `${target.name} ran off with your offering!`;
    } else {
      battleOutcome = 'angry';
      line = `${target.name}: "[gets angry]" It attacks!`;
    }
    speech.textContent = line;
    clear(opts);
    await wait(fast ? 0 : 1100);
    panel.remove();
    ui.say(line);
    return { type: 'talk', target: target.key, outcome: battleOutcome, endTurn: battleOutcome === 'angry' };
  };
}

export const prefsFor = (p) => PREFS[p];
