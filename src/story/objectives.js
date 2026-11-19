// Active objectives (bible.objectives): shown once their showIf is met, until their doneIf is met.
import { meets } from './state.js';

export function activeObjectives(bible, story) {
  return (bible?.objectives ?? []).filter((o) => meets(story, o.showIf ?? {}) && !(o.doneIf && meets(story, o.doneIf)));
}
