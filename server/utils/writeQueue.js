/**
 * Simple in-memory serial queue to prevent concurrent file writes.
 * Each call to run() waits for the previous one to finish.
 */
export function createWriteQueue() {
  let pending = Promise.resolve()

  function run(fn) {
    const next = pending.then(fn, fn)
    pending = next.catch(() => {})
    return next
  }

  return { run }
}
