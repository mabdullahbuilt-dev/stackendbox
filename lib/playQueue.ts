/**
 * Limits how many complex card animations run at once. `acquire` starts immediately while a slot is free,
 * otherwise waits its turn. The returned function cancels (and frees the slot or leaves the line).
 * `start` receives a `release` it must call when its animation finishes.
 */
const MAX = 2;
let running = 0;
const waiting: Array<() => void> = [];

function pump() {
  while (running < MAX && waiting.length) waiting.shift()!();
}

export function acquire(start: (release: () => void) => void): () => void {
  let state: "wait" | "run" | "done" = "wait";
  const release = () => {
    if (state === "run") { state = "done"; running -= 1; pump(); }
    else state = "done";
  };
  const go = () => { if (state !== "wait") return; state = "run"; running += 1; start(release); };
  if (running < MAX) go(); else waiting.push(go);
  return () => {
    if (state === "wait") { const i = waiting.indexOf(go); if (i >= 0) waiting.splice(i, 1); state = "done"; }
    else release();
  };
}
