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

// Background music (CC0 loops in assets/music/<name>.mp3; see assets/credits.json). One track at a time, crossfaded.
// Browsers only start audio after the first click or key press; until then this stays silent.
const MUSIC_VOLUME = { ward: 0.32, tunnels: 0.4, battle: 0.3, boss: 0.34 };
let track = null;
let trackName = null;

function fade(a, to, ms, done) {
  const from = a.volume;
  const t0 = performance.now();
  const tick = () => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    a.volume = from + (to - from) * k;
    if (k < 1) requestAnimationFrame(tick); else done?.();
  };
  requestAnimationFrame(tick);
}

export function music(name) {
  if (typeof Audio === 'undefined' || name === trackName) return;
  trackName = name;
  const old = track;
  track = null;
  if (old) fade(old, 0, 500, () => old.pause());
  if (!name || muted) return;
  try {
    const a = new Audio(`assets/music/${name}.mp3`);
    a.loop = true;
    a.volume = 0;
    a.play().then(() => fade(a, MUSIC_VOLUME[name] ?? 0.3, 800)).catch(() => { if (trackName === name) trackName = null; });
    track = a;
  } catch { /* ignore */ }
}

export function setSound(on) {
  setMuted(!on);
  if (!on && track) { track.pause(); track = null; }
  if (on && trackName) { const n = trackName; trackName = null; music(n); }
}
