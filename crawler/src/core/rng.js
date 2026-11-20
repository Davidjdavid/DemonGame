// Seeded RNG (mulberry32). Pure. All game randomness goes through one of these.
export function makeRng(seed = 1) {
  let a = seed >>> 0;
  const rng = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.int = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1)); // inclusive
  rng.pick = (list) => list[Math.floor(rng() * list.length)];
  rng.state = () => a;
  rng.setState = (s) => { a = s >>> 0; };
  return rng;
}
