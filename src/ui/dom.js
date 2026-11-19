// Tiny DOM helpers. All text goes through textContent (never innerHTML) so demon replies can't inject markup.
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

// Render "*action*" spans as <em>. For player lines, text outside "quotes" is an action too.
export function richLine(text, { player = false } = {}) {
  const frag = document.createDocumentFragment();
  if (player) {
    for (const part of text.split(/("[^"]*")/)) {
      if (!part) continue;
      if (part.startsWith('"')) frag.append(h('span', { class: 'speech' }, part));
      else frag.append(h('em', { class: 'action' }, part.replace(/\*/g, '')));
    }
    return frag;
  }
  text.split(/(\*[^*]+\*)/).forEach((part) => {
    if (!part) return;
    if (part.startsWith('*') && part.endsWith('*')) frag.append(h('em', { class: 'action' }, part.slice(1, -1)));
    else frag.append(part);
  });
  return frag;
}
