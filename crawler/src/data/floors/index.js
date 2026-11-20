// Floor registry: parsed lazily from the frozen floor sources.
import { parseFloor } from '../../world/floor.js';
import test from './test.js';
import hub from './hub.js';

const SOURCES = { hub, test };
const parsed = {};

export const FLOOR_IDS = Object.keys(SOURCES);

export function getFloor(id) {
  if (!SOURCES[id]) throw new Error(`no floor ${id}`);
  return (parsed[id] ||= parseFloor(SOURCES[id]));
}
