import list from './skills.json' with { type: 'json' };
export const SKILL_LIST = list;
export const SKILLS = Object.fromEntries(list.map((s) => [s.id, s]));
