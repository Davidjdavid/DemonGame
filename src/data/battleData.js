// Battle data: src/data/battle.json (the first ten) plus one file per newer demon in src/data/battle/.
import battle from './battle.json' with { type: 'json' };
import { BATTLE_FILES } from './battle/index.js';
export const BATTLE = { ...battle, ...BATTLE_FILES };
