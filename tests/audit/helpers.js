// Shared test helpers for audit regression tests.
// Technique: pre-populate require.cache with stub modules BEFORE requiring the
// controller under test, so no database / network / real services are touched.
const path = require("path");

const repoRoot = path.join(__dirname, "..", "..");

function stubModule(relPath, exportsValue) {
  let resolved;
  try {
    resolved = require.resolve(path.join(repoRoot, relPath));
  } catch {
    resolved = require.resolve(relPath, { paths: [repoRoot] }); // bare package name, e.g. "mongoose"
  }
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports: exportsValue,
  };
  return resolved;
}

// A thenable query stub: supports .session/.populate/.select/.sort/.skip/.limit/.lean
// chaining, records skip/limit calls, and resolves to `result` when awaited.
function makeQuery(result, record = {}) {
  const q = {
    _record: record,
    session() {
      return q;
    },
    populate() {
      return q;
    },
    select() {
      return q;
    },
    sort() {
      return q;
    },
    lean() {
      return q;
    },
    skip(n) {
      record.skip = n;
      return q;
    },
    limit(n) {
      record.limit = n;
      return q;
    },
    maxTimeMS(n) {
      record.maxTimeMS = n;
      return q;
    },
    then(onFulfilled, onRejected) {
      return Promise.resolve(result).then(onFulfilled, onRejected);
    },
    catch(onRejected) {
      return Promise.resolve(result).catch(onRejected);
    },
  };
  return q;
}

function mockRes() {
  return {
    statusCode: undefined,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function mockNext() {
  const fn = (err) => {
    fn.error = err;
  };
  fn.error = undefined;
  return fn;
}

// catchAsync in this codebase does not return the inner promise, so tests
// poll a completion predicate instead of awaiting the handler directly.
async function until(predicate, timeoutMs = 3000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs)
      throw new Error("until(): timed out waiting for handler to settle");
    await new Promise((r) => setTimeout(r, 5));
  }
}

module.exports = { stubModule, makeQuery, mockRes, mockNext, repoRoot, until };
