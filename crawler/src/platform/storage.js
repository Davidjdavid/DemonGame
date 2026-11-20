// Save slots: the artifact's `db` capability (the viewer's private data/users/<id>/ subtree) when available, plus
// localStorage as a fallback (both wrapped: either can be missing or throw). Docs hold { json, at, label }.
const LS = (slot) => `hollow-spire-save-${slot}`;
let refsPromise = null;

function capabilities() {
  if (typeof window === 'undefined' || typeof window.claude?.use !== 'function') return Promise.resolve(null);
  refsPromise ||= (async () => {
    try {
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      const id = user ? await user.id() : null;
      return db && id ? { db, id } : null;
    } catch {
      return null;
    }
  })();
  return refsPromise;
}

export async function writeSlot(slot, data, label) {
  const doc = { json: JSON.stringify(data), at: Date.now(), label };
  let where = null;
  try {
    const c = await capabilities();
    if (c) { await c.db.collection(`data/users/${c.id}`).doc(`save-${slot}`).set(doc); where = 'cloud'; }
  } catch (e) {
    console.warn('cloud save failed', e?.code || e);
  }
  try { localStorage.setItem(LS(slot), JSON.stringify(doc)); where ||= 'browser'; } catch { /* storage blocked */ }
  return where;
}

export async function readSlot(slot) {
  let best = null;
  try {
    const c = await capabilities();
    if (c) {
      const snap = await c.db.collection(`data/users/${c.id}`).doc(`save-${slot}`).get();
      if (snap.exists) best = snap.data();
    }
  } catch (e) {
    console.warn('cloud load failed', e?.code || e);
  }
  try {
    const raw = localStorage.getItem(LS(slot));
    const local = raw ? JSON.parse(raw) : null;
    if (local && (!best || local.at > best.at)) best = local;
  } catch { /* storage blocked */ }
  if (!best) return null;
  try { return { data: JSON.parse(best.json), at: best.at, label: best.label }; } catch { return null; }
}
