// CodeQL class C (#195-#210, js/regex-injection): every user-text
// RegExp site now goes through utils/escapeRegex.escapeRegExp /
// literalRegExp. Attack strings must be treated as literal text:
// no ReDoS, no filter defeat, no SyntaxError 500s.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { escapeRegExp, literalRegExp } = require("../../utils/escapeRegex");
const { literalRegex, escapeRegex } = require("../../utils/listQuery");

test("CQ-C: attack strings are literalized", () => {
  for (const attack of [
    "(a+)+$",
    ".*",
    "[",
    "\\",
    "a|b",
    "^$",
    "a{2,}",
    "(?<x>)",
    "\\\\d+",
  ]) {
    const re = literalRegExp(attack);
    assert.ok(re.test(attack), `the literal text itself must match: ${attack}`);
    assert.ok(
      !re.test("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
      `no pattern semantics for: ${attack}`,
    );
  }
  assert.equal(escapeRegExp("a.b*c"), "a\\.b\\*c");
  assert.equal(
    escapeRegExp("x".repeat(500)).length,
    100,
    "input is length-capped",
  );
  // listQuery re-exports are the same functions (single definition)
  assert.equal(escapeRegex, escapeRegExp);
  assert.equal(literalRegex("(a+)+$").source, escapeRegExp("(a+)+$"));
});

test("CQ-C: the classic ReDoS payload is inert and fast", () => {
  const re = literalRegExp("(a+)+$");
  const start = Date.now();
  assert.equal(re.test("a".repeat(10000) + "!"), false);
  assert.ok(Date.now() - start < 1000, "literal match must be linear");
});

test("CQ-C: substring search behavior is preserved (characterization)", () => {
  const re = literalRegExp("Oak Table");
  assert.ok(re.test("Solid Oak Table (Large)"));
  assert.ok(re.test("solid oak table"));
  assert.ok(
    re.test("Oak Tables"),
    "substring semantics: 'Oak Tables' contains the search text",
  );
  assert.ok(!re.test("Pine Table"));
});
