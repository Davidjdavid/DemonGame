// Floor registry: parsed lazily from the frozen floor sources.
import { parseFloor } from '../../world/floor.js';
import test from './test.js';
import hub from './hub.js';
import f1 from './f1.js';
import f2 from './f2.js';
import f3 from './f3.js';
import f4 from './f4.js';
import f5 from './f5.js';
import f6 from './f6.js';
import f7 from './f7.js';

const SOURCES = { hub, f1, f2, f3, f4, f5, f6, f7, test };
const parsed = {};

export const FLOOR_IDS = Object.keys(SOURCES);

export function getFloor(id) {
  if (!SOURCES[id]) throw new Error(`no floor ${id}`);
  return (parsed[id] ||= parseFloor(SOURCES[id]));
}
