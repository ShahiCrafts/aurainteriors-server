// FA-10 / FA-15 / FA-16 (FRESH): the ONE guarded server-side fetch helper.
//
// - isPrivateIp parses addresses STRUCTURALLY (the previous prefix-string
//   version judged expanded IPv6 loopback, hex IPv4-mapped forms such as
//   ::ffff:7f00:1 / ::ffff:a9fe:a9fe, and CGNAT space as public).
// - Resolution happens ONCE per hop; the request is then PINNED to a
//   validated address (Host header / TLS servername carry the hostname),
//   which closes the validate-then-fetch DNS-rebinding window.
// - Redirects are followed manually with full re-validation on every hop,
//   and the body is streamed under a hard byte cap.
const dns = require("dns");
const http = require("http");
const https = require("https");

// ---------------- structural IP parsing ----------------
function parseIPv4(str) {
  const parts = String(str).split(".");
  if (parts.length !== 4) return null;
  const out = [];
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const n = Number(p);
    if (n > 255) return null;
    out.push(n);
  }
  return out;
}
const v4Int = ([a, b, c, d]) => a * 2 ** 24 + b * 2 ** 16 + c * 2 ** 8 + d;
const V4_PRIVATE = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
].map(([base, bits]) => [v4Int(parseIPv4(base)), bits]);
function isPrivateIPv4(parts) {
  const n = v4Int(parts);
  return V4_PRIVATE.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
    return (n & mask) === (base & mask);
  });
}
function expandIPv6(str) {
  let s = String(str).toLowerCase();
  if (s.includes(".")) {
    const idx = s.lastIndexOf(":");
    if (idx < 0) return null;
    const v4 = parseIPv4(s.slice(idx + 1));
    if (!v4) return null;
    s = `${s.slice(0, idx)}:${(v4[0] * 256 + v4[1]).toString(16)}:${(v4[2] * 256 + v4[3]).toString(16)}`;
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const parseGroups = (text) => {
    if (text === "") return [];
    const groups = text.split(":");
    if (groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
    return groups.map((g) => parseInt(g, 16));
  };
  const head = parseGroups(halves[0]);
  const tail = halves.length === 2 ? parseGroups(halves[1]) : [];
  if (head === null || tail === null) return null;
  if (halves.length === 1) return head.length === 8 ? head : null;
  const missing = 8 - head.length - tail.length;
  if (missing < 1) return null;
  return [...head, ...Array(missing).fill(0), ...tail];
}
function isPrivateIPv6(g) {
  const firstFiveZero = g.slice(0, 5).every((x) => x === 0);
  if (firstFiveZero && g[5] === 0xffff) {
    // IPv4-mapped (covers dotted and hex embedded forms alike)
    return isPrivateIPv4([g[6] >> 8, g[6] & 0xff, g[7] >> 8, g[7] & 0xff]);
  }
  if (g.every((x) => x === 0)) return true;                        // ::
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return true; // ::1
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) {
    return isPrivateIPv4([g[6] >> 8, g[6] & 0xff, g[7] >> 8, g[7] & 0xff]); // NAT64 well-known prefix
  }
  if (g[0] === 0x2002) return isPrivateIPv4([g[1] >> 8, g[1] & 0xff, g[2] >> 8, g[2] & 0xff]); // 6to4 embeds a v4
  if ((g[0] & 0xffc0) === 0xfe80) return true;                     // fe80::/10 link-local
  if ((g[0] & 0xfe00) === 0xfc00) return true;                     // fc00::/7 ULA
  if ((g[0] & 0xff00) === 0xff00) return true;                     // ff00::/8 multicast
  if (g[0] === 0x100 && g[1] === 0 && g[2] === 0 && g[3] === 0) return true; // 100::/64 discard
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true;             // documentation
  return false;
}
function isPrivateIp(ip) {
  if (typeof ip !== "string") return true;
  const value = ip.trim().toLowerCase();
  const v4 = parseIPv4(value);
  if (v4) return isPrivateIPv4(v4);
  if (value.includes(":")) {
    const groups = expandIPv6(value);
    if (!groups) return true;
    return isPrivateIPv6(groups);
  }
  return true; // not an IP at all - fail closed in an IP context
}

// ---------------- resolution (validate once) ----------------
async function resolvePublicAddresses(hostname, lookupFn = dns.promises.lookup) {
  const host = String(hostname || "").trim().toLowerCase();
  if (!host) throw new Error("SSRF guard: empty host");
  if (parseIPv4(host) || host.includes(":")) {
    if (isPrivateIp(host)) throw new Error(`SSRF guard: non-public IP host ${host}`);
    return [{ address: host, family: host.includes(":") ? 6 : 4 }];
  }
  const addresses = await lookupFn(host, { all: true, verbatim: true });
  if (!addresses.length) throw new Error(`SSRF guard: no DNS results for ${host}`);
  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new Error(`SSRF guard: ${host} resolves to non-public address ${address}`);
    }
  }
  return addresses;
}
async function assertPublicHost(hostname) {
  await resolvePublicAddresses(hostname);
}

// ---------------- pinned raw request ----------------
function rawRequest(urlObj, pinned, { headers = {}, timeoutMs = 10000, maxBytes = 5 * 1024 * 1024 } = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const isHttps = urlObj.protocol === "https:";
    const port = Number(urlObj.port) || (isHttps ? 443 : 80);
    const hostHeader = urlObj.port ? `${urlObj.hostname}:${urlObj.port}` : urlObj.hostname;
    const options = {
      host: pinned.address,
      family: pinned.family,
      port,
      path: `${urlObj.pathname}${urlObj.search}`,
      method: "GET",
      headers: { ...headers, Host: hostHeader },
      timeout: timeoutMs,
    };
    if (isHttps && !parseIPv4(urlObj.hostname) && !urlObj.hostname.includes(":")) {
      options.servername = urlObj.hostname; // SNI + certificate validation for the real name
    }
    const req = (isHttps ? https : http).request(options, (res) => {
      const chunks = [];
      let total = 0;
      res.on("data", (chunk) => {
        total += chunk.length;
        if (total > maxBytes) {
          req.destroy(new Error(`guardedFetch: response too large (cap ${maxBytes} bytes)`));
          return;
        }
        chunks.push(chunk);
      });
      res.on("end", () => resolvePromise({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on("error", rejectPromise);
    });
    req.on("timeout", () => req.destroy(new Error(`guardedFetch: request timed out after ${timeoutMs}ms`)));
    req.on("error", rejectPromise);
    req.end();
  });
}

// ---------------- redirect-following guarded fetch ----------------
function createGuardedFetch(deps = {}) {
  const resolveHost = deps.resolve || ((hostname) => resolvePublicAddresses(hostname));
  const request = deps.request || rawRequest;
  return async function guardedFetch(urlString, { headers = {}, timeoutMs = 10000, maxBytes = 5 * 1024 * 1024, maxRedirects = 5 } = {}) {
    let current = new URL(urlString);
    for (let hop = 0; hop <= maxRedirects; hop++) {
      if (current.protocol !== "http:" && current.protocol !== "https:") {
        throw new Error(`guardedFetch: refused scheme ${current.protocol}`);
      }
      const addresses = await resolveHost(current.hostname);
      const res = await request(current, addresses[0], { headers, timeoutMs, maxBytes });
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const location = res.headers.location || res.headers.Location;
        if (!location) return finalize(res);
        current = new URL(location, current); // next hop is fully re-validated above
        continue;
      }
      return finalize(res);
    }
    throw new Error("guardedFetch: too many redirects");
    function finalize(res) {
      return {
        status: res.status,
        ok: res.status >= 200 && res.status < 300,
        headers: { get: (name) => res.headers[String(name).toLowerCase()] ?? null },
        text: async () => res.body.toString("utf8"),
        json: async () => JSON.parse(res.body.toString("utf8")),
        buffer: async () => res.body,
        arrayBuffer: async () => res.body.buffer.slice(res.body.byteOffset, res.body.byteOffset + res.body.byteLength),
      };
    }
  };
}
const guardedFetch = createGuardedFetch();

module.exports = { isPrivateIp, assertPublicHost, resolvePublicAddresses, guardedFetch, createGuardedFetch, _rawRequest: rawRequest };
