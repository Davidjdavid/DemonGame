import list from './skills.json' with { type: 'json' };
import signatures from './signatures.json' with { type: 'json' };
// Generated skills plus one hand-written signature move per demon (src/data/signatures.json).
export const SKILL_LIST = [...list, ...signatures.map((s) => ({ accuracy: 0.95, hits: [1, 1], rank: 2, signature: true, ...s }))];
export const SKILLS = Object.fromEntries(SKILL_LIST.map((s) => [s.id, s]));
