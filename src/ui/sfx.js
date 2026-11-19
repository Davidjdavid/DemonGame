// Small CC0 sound effects (assets/sfx/<name>.ogg). Silent if a file is missing or audio isn't allowed yet.
const cache = {};
let muted = false;
try { muted = localStorage.getItem('demongame-mute') === '1'; } catch { /* storage blocked */ }

export function isMuted() { return muted; }
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('demongame-mute', m ? '1' : '0'); } catch { /* storage blocked */ }
}

export function play(name, volume = 0.5) {
  if (muted || typeof Audio === 'undefined') return;
  try {
    const base = (cache[name] ||= new Audio(`assets/sfx/${name}.ogg`));
    const a = base.cloneNode();
    a.volume = volume;
    a.play().catch(() => {});
  } catch { /* ignore */ }
}
