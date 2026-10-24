// SSRF guards for server-side fetches of URLs influenced by stored or
// external data. FA-10/FA-15/FA-16 (FRESH): the implementation moved to
// utils/guardedFetch.js, which parses IP addresses structurally (the
// prefix-string version here judged expanded IPv6 loopback, hex
// IPv4-mapped forms, and CGNAT space as public), pins requests to the
// validated address, re-validates every redirect hop, and caps streamed
// bodies. This module remains as the stable import path for existing
// callers; new fetch code should use guardedFetch directly.
const { isPrivateIp, assertPublicHost } = require("./guardedFetch");

module.exports = { isPrivateIp, assertPublicHost };
