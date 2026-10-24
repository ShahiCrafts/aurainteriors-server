// AR-06: boot-time MongoDB topology check (design: Phase 0 boot
// matrix + AUDIT_ARCH_TRACKER.md "AR-06 design note").
//
// Every checkout (guest and authenticated) and the eSewa capture
// path run inside multi-document transactions. A standalone mongod
// cannot commit a transaction, so a standalone deployment would
// accept traffic and then fail 100% of checkouts at runtime - a
// partial outage discovered by customers, not by health checks.
// Fail fast instead: right after connecting, run `hello` once; a
// mongos (msg === "isdbgrid") or any replica-set member (setName
// present - a single-node replica set is a supported topology)
// passes; anything else is a standalone and the process exits(1)
// with one fatal line naming the requirement.
const mongoose = require("mongoose");

const FATAL_LINE =
  "Aura requires MongoDB running as a replica set (even single-node) or mongos: " +
  "checkouts run in transactions, which a standalone mongod cannot commit";

async function getTopology(connection) {
  const hello = await connection.db.admin().command({ hello: 1 });
  if (hello.msg === "isdbgrid") return { kind: "mongos", hello };
  if (typeof hello.setName === "string") return { kind: "replicaSet", setName: hello.setName, hello };
  return { kind: "standalone", hello };
}

async function assertReplicaSetTopology(connection = mongoose.connection) {
  // Skip silently when there is no database handle: the DB-stubbed
  // test preload (tests/fresh/fixtures/stub-db-preload.js) replaces
  // connectDatabase with a no-op and keeps mongoose disconnected, so
  // connection.db is undefined there. That path exists ONLY for the
  // stubbed boot tests - a real failed connect already exits(1)
  // inside connectDatabase before this check is reached.
  if (!connection || !connection.db) return null;
  // A hello error while connected propagates: startServer's catch
  // logs "Failed to start server" and exits 1 - fail-fast is the
  // design (a topology we cannot verify is not one we boot on).
  const topology = await getTopology(connection);
  if (topology.kind === "mongos") {
    console.log("[startup] MongoDB topology: mongos (transactions supported)");
    return topology;
  }
  if (topology.kind === "replicaSet") {
    console.log(`[startup] MongoDB topology: replica set "${topology.setName}" (transactions supported)`);
    return topology;
  }
  console.error(`[startup] FATAL: ${FATAL_LINE}`);
  process.exit(1);
}

module.exports = { getTopology, assertReplicaSetTopology, FATAL_LINE };
