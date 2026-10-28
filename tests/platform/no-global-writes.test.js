// AR-33: no mutable-global service wiring may remain.
//
// The bootstrap used to publish the notification gateway, the Socket.IO
// server, the notification event emitter, and the keep-alive service on
// the mutable global object (global.io, global.notificationGateway,
// global.notificationEventEmitter, global.keepAliveService), and
// controllers/services/routes read them from there. All of that now
// goes through services/runtimeContext.js, populated once at bootstrap.
//
// This test greps every production .js file (comments stripped, so the
// explanatory "// AR-33: registry, not global.io" notes do not trip it)
// and fails on ANY remaining code reference to those globals - read or
// write. The sanctioned registry is services/runtimeContext.js itself,
// which holds no global.* references in code.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repo = path.join(__dirname, "..", "..");
const SELF = path.basename(__filename);

// Built from parts so this file's own source does not match the scan.
const FORBIDDEN = [
  ["global", "io"],
  ["global", "notificationGateway"],
  ["global", "notificationEventEmitter"],
  ["global", "keepAliveService"],
].map(([a, b]) => new RegExp(`${a}\\.${b}(?![\\w$])`));

function jsFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) jsFiles(p, out);
    else if (entry.name.endsWith(".js") && entry.name !== SELF) out.push(p);
  }
  return out;
}

function stripComments(src) {
  // Remove /* */ blocks first, then // line comments. Deleting text can
  // never CREATE a global.* match, so URL-looking content in strings
  // (https://...) is harmless to the scan.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^\S\r\n])\/\/.*$/gm, "$1");
}

test("AR-33: no global.io / global.notification* / global.keepAliveService references remain in code", () => {
  const offenders = [];
  for (const file of jsFiles(repo)) {
    const code = stripComments(fs.readFileSync(file, "utf8"));
    for (const re of FORBIDDEN) {
      const m = code.match(re);
      if (m) {
        const lineNo = code.slice(0, m.index).split("\n").length;
        offenders.push(`${path.relative(repo, file)}:${lineNo}: ${m[0]}`);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `mutable-global service wiring remains:\n${offenders.join("\n")}`,
  );
});

test("AR-33: services/runtimeContext.js is the only sanctioned holder (requires nothing)", () => {
  const src = fs.readFileSync(
    path.join(repo, "services", "runtimeContext.js"),
    "utf8",
  );
  assert.ok(
    !/^const .* = require\(/m.test(src),
    "runtimeContext must require nothing (no circular-dependency risk)",
  );
  for (const name of [
    "setNotificationGateway",
    "getNotificationGateway",
    "getIo",
    "setKeepAliveService",
    "getKeepAliveService",
    "reset",
  ]) {
    assert.ok(src.includes(name), `runtimeContext must export ${name}`);
  }
});
