// Start a fight from the field: build combatants, run the battle screen, apply the result.
import { heroCombatant, recruitCombatant, enemyCombatant } from '../combat/units.js';
import { applyVictory, syncParty } from '../game/rewards.js';
import { runBattleScreen } from './battle.js';
import { talkHook } from './talk.js';

/** group = [{ type, level, boss? }]. Returns 'win' | 'lose' | 'escaped'. */
export async function fight(root, game, { group, rng, fast = false, first = 'player', canEscape = true, intro = null, hooks = { talk: talkHook(game, rng, { fast }) } }) {
  if (!fast) {
    // A short flash so a random encounter never just pops in.
    const flash = document.createElement('div');
    flash.className = 'enc-flash';
    root.append(flash);
    await new Promise((r) => setTimeout(r, 380));
    flash.remove();
  }
  const party = [heroCombatant(game.hero), ...game.party.map((r) => recruitCombatant(r))];
  const enemies = group.map((g, i) => enemyCombatant(g.type, g.level, `e${i}`, { boss: g.boss || null }));
  const screen = runBattleScreen(root, { party, enemies, rng, inventory: game.inv, settings: game.settings, fast, first, canEscape, hooks, intro });
  try {
    const state = await screen.run();
    if (state.outcome === 'win') {
      const r = applyVictory(game, state);
      await screen.finish({ lines: r.lines });
    } else if (state.outcome === 'escaped') {
      syncParty(state);
    } else {
      syncParty(state);
      await screen.finish({ lines: ['Your party has fallen.'], button: 'Retry from last save' });
    }
    return state.outcome;
  } finally {
    screen.destroy();
  }
}
