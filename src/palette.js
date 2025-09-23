console.log("System Blocks palette loaded");

// Minimal placeholder to prove the UI is alive.
// Add real rendering + messaging later.
function createBlock(name, x, y) {
  const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
  return { id, name, x, y, interfaces: [], links: [] };
}
