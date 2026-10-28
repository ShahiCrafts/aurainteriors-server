const mongoose = require("mongoose");

const FATAL_LINE =
  "Aura requires MongoDB running as a replica set (even single-node) or mongos: " +
  "checkouts run in transactions, which a standalone mongod cannot commit";

async function getTopology(connection) {
  const hello = await connection.db.admin().command({ hello: 1 });
  if (hello.msg === "isdbgrid") return { kind: "mongos", hello };
  if (typeof hello.setName === "string")
    return { kind: "replicaSet", setName: hello.setName, hello };
  return { kind: "standalone", hello };
}

async function assertReplicaSetTopology(connection = mongoose.connection) {
  if (!connection || !connection.db) return null;
  const topology = await getTopology(connection);
  if (topology.kind === "mongos") {
    console.log("[startup] MongoDB topology: mongos (transactions supported)");
    return topology;
  }
  if (topology.kind === "replicaSet") {
    console.log(
      `[startup] MongoDB topology: replica set "${topology.setName}" (transactions supported)`,
    );
    return topology;
  }
  console.error(`[startup] FATAL: ${FATAL_LINE}`);
  process.exit(1);
}

module.exports = { getTopology, assertReplicaSetTopology, FATAL_LINE };
