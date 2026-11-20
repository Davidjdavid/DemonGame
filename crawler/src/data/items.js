// Item definitions (Stage 1: names only; effects arrive with combat).
export const ITEMS = {
  medicine: { name: 'Medicine', desc: 'Restores HP.' },
  brass_key: { name: 'Brass Key', desc: 'Opens a brass lock on this floor.', key: true },
};

export const itemName = (id) => ITEMS[id]?.name || id.replace(/_/g, ' ');
