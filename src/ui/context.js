// Shared UI context so screens don't import each other (app.js fills it in at start).
export const ui = {
  root: null,
  game: null,
  statusBar: () => null,
  goHub: () => {},
};
