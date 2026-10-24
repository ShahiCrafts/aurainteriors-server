// Bounded-concurrency mapper (AR-12). Promise.all over a whole
// request's files runs every item's pipeline at once; this runs at
// most `limit` of them concurrently and pulls the next item only as a
// slot frees. Semantics otherwise mirror Promise.all: results come
// back in input order, and the first rejection stops new work from
// starting (in-flight items settle) and is rethrown to the caller.
async function mapWithConcurrency(items, limit, fn) {
  const list = Array.isArray(items) ? items : [];
  const results = new Array(list.length);
  const cap = Math.max(1, Math.min(Math.floor(limit) || 1, list.length || 1));
  let nextIndex = 0;
  let firstError = null;

  async function worker() {
    while (firstError === null && nextIndex < list.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = await fn(list[index], index);
      } catch (error) {
        if (firstError === null) firstError = error;
      }
    }
  }

  await Promise.all(Array.from({ length: cap }, () => worker()));
  if (firstError !== null) throw firstError;
  return results;
}

module.exports = { mapWithConcurrency };
