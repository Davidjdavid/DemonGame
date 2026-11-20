// Elements and affinity tiers. Pure.
export const ELEMENTS = ['phys', 'fire', 'ice', 'elec', 'wind', 'light', 'dark']; // almighty has no affinity
export const ELEMENT_NAMES = {
  phys: 'Physical', fire: 'Fire', ice: 'Ice', elec: 'Electric', wind: 'Wind', light: 'Light', dark: 'Dark', almighty: 'Almighty',
};
export const ELEMENT_SHORT = { phys: 'Phy', fire: 'Fir', ice: 'Ice', elec: 'Elc', wind: 'Wnd', light: 'Lgt', dark: 'Drk', almighty: 'Alm' };
export const ELEMENT_COLORS = {
  phys: '#e8e8e8', fire: '#ff8a2a', ice: '#5fe6ff', elec: '#ffe23a', wind: '#5fe87a', light: '#fffbe0', dark: '#b45cff', almighty: '#ff4ad8',
};
export const TIERS = ['weak', 'normal', 'resist', 'null', 'repel', 'absorb'];
export const TIER_SHORT = { weak: 'Wk', normal: '-', resist: 'Rs', null: 'Nu', repel: 'Rp', absorb: 'Ab' };

// Damage taken multiplier by tier (absorb heals, repel bounces; handled by the engine).
export const TAKEN = { weak: 1.5, normal: 1, resist: 0.5, null: 0, repel: 0, absorb: 0 };

export const tierOf = (affinities, el) => (el === 'almighty' ? 'normal' : affinities?.[el] || 'normal');
