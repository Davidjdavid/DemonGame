// Save slots: the artifact's `db` capability (the viewer's private data/users/<id>/ subtree) when
// available, else localStorage (wrapped in try/catch: it can throw or be empty).
import { useCapability } from './claude.js';

const LS_KEY = (slot) => `demongame-save-${slot}`;

async function dbRef(slot) {
  const db = await useCapability('db');
  if (!db) return null;
  const user = await useCapability('user');
  const id = user ? await user.id().catch(() => null) : null;
  if (!id) return null;
  return db.collection(`data/users/${id}`).doc(`save-${slot}`);
}

export async function saveSlot(slot, data) {
  let where = null;
  try {
    const ref = await dbRef(slot);
    if (ref) {
      await ref.set({ json: JSON.stringify(data) });
      where = 'cloud';
    }
  } catch (e) {
    console.warn('db save failed', e?.code ?? e);
  }
  try {
    localStorage.setItem(LS_KEY(slot), JSON.stringify(data));
    where ||= 'browser';
  } catch {
    /* storage blocked */
  }
  return where;
}

export async function loadSlot(slot) {
  try {
    const ref = await dbRef(slot);
    if (ref) {
      const snap = await ref.get();
      if (snap.exists) return { data: JSON.parse(snap.data().json), where: 'cloud' };
    }
  } catch (e) {
    console.warn('db load failed', e?.code ?? e);
  }
  try {
    const raw = localStorage.getItem(LS_KEY(slot));
    if (raw) return { data: JSON.parse(raw), where: 'browser' };
  } catch {
    /* storage blocked */
  }
  return null;
}
