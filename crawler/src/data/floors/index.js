// Floor registry: parsed lazily from the frozen floor sources.
import { parseFloor } from '../../world/floor.js';
import test from './test.js';

const SOURCES = { test };
const parsed = {};

export const FLOOR_IDS = Object.keys(SOURCES);

export function getFloor(id) {
  if (!SOURCES[id]) throw new Error(`no floor ${id}`);
  return (parsed[id] ||= parseFloor(SOURCES[id]));
}
