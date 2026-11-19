// Dialogue box over the map: scripted scenes line by line, then choices. Click, Enter or Space advances.
import { h, mount } from './dom.js';
import { applyChoice, markSeen, meets } from '../story/state.js';

let keyHandler = null;

/**
 * Play scene `id` (and any scenes its choices lead to) inside `box`. `scenes` maps id → scene.
 * Calls onDone(lastSceneId) when the conversation is over.
 */
export function playScene(box, scenes, story, id, onDone, { portraitFor, player = null } = {}) {
  const scene = scenes[id];
  if (!scene) { onDone?.(null); return; }
  markSeen(story, id);
  const lines = (scene.lines ?? []).filter((l) => !l.requires || meets(story, l.requires));
  let i = 0;
  box.hidden = false;
  const finish = (next) => {
    if (next && scenes[next]) { playScene(box, scenes, story, next, onDone, { portraitFor, player }); return; }
    box.hidden = true;
    mount(box, );
    if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
    onDone?.(id);
  };
  const render = () => {
    const line = lines[i];
    const last = i >= lines.length - 1;
    const choices = last ? (scene.choices ?? []).filter((c) => !c.requires || meets(story, c.requires)) : [];
    const speaker = line?.speaker ?? '';
    const portrait = speaker && portraitFor ? portraitFor(speaker) : null;
    mount(box, 
      h('div', { class: 'dlg-inner' },
        portrait,
        h('div', { class: 'dlg-text' },
          speaker ? h('p', { class: 'dlg-speaker' }, speaker) : null,
          h('p', { class: speaker ? 'dlg-line' : 'dlg-line narration', id: 'dlg-line' }, line?.text ?? ''),
          choices.length
            ? h('div', { class: 'dlg-choices' }, choices.map((c, n) => h('button', { type: 'button', class: 'dlg-choice', id: `choice-${n}`, onclick: () => finish(applyChoice(story, c, player)) }, c.text)))
            : h('button', { type: 'button', class: 'dlg-next', id: 'dlg-next', onclick: advance }, last ? 'Close' : 'Next ▸'))));
    box.querySelector('.dlg-choice, .dlg-next')?.focus();
  };
  const advance = () => {
    if (i < lines.length - 1) { i += 1; render(); } else if (!(scene.choices ?? []).length) finish(scene.next ?? null);
  };
  if (keyHandler) document.removeEventListener('keydown', keyHandler);
  keyHandler = (e) => {
    if (box.hidden) return;
    if ((e.key === 'Enter' || e.key === ' ') && box.querySelector('.dlg-next')) { e.preventDefault(); advance(); }
  };
  document.addEventListener('keydown', keyHandler);
  if (!lines.length) { finish(scene.next ?? null); return; }
  render();
}

// A one-off message in the same box (signs, chests, doors).
export function showMessage(box, text, onDone) {
  playScene(box, { _msg: { id: '_msg', lines: [{ speaker: '', text }] } }, { seen: [], flags: {}, meters: {} }, '_msg', onDone);
}
