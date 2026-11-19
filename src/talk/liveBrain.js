// Live brain: one sample.json call per message, through the artifact's `sample` capability.
import { buildPrompt } from './prompt.js';

export function createLiveBrain(sample) {
  return {
    kind: 'live',
    async respond({ state, player, playerText, signal }) {
      const input = buildPrompt(state, player, playerText);
      // Every chat turn must get a fresh answer, so no caching.
      return sample.json(input, { cache: false, signal });
    },
  };
}
