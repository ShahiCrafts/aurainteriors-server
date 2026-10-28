// Batch 3 (FRESH remediation): FA-10, FA-15, FA-16, FA-65, FA-66, FA-67, FA-83.
// FA-10 tests are the converted fresh-audit PoC-01.
const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const repo = path.resolve(__dirname, "../..");

const { isPrivateIp, resolvePublicAddresses, createGuardedFetch } = require(
  path.join(repo, "utils/guardedFetch.js"),
);

test("FA-10: isPrivateIp parses addresses structurally (PoC-01 encodings + full matrix)", () => {
  const priv = [
    "127.0.0.1",
    "10.0.0.5",
    "172.16.0.9",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "0.0.0.0",
    "192.0.2.10",
    "198.51.100.7",
    "203.0.113.9",
    "224.0.0.1",
    "240.0.0.1",
    "100.64.0.1",
    "100.127.255.255", // CGNAT 100.64.0.0/10
    "198.18.0.1",
    "198.19.255.255", // benchmarking 198.18.0.0/15
    "::1",
    "0:0:0:0:0:0:0:1", // loopback, compressed + expanded
    "::",
    "fe80::1",
    "fd00::1",
    "fc00::1",
    "ff02::1",
    "2001:db8::1",
    "100::1",
    "::ffff:127.0.0.1", // IPv4-mapped, dotted
    "::ffff:7f00:1",
    "::ffff:a9fe:a9fe", // IPv4-mapped, hex (PoC-01 bypasses)
    "0:0:0:0:0:ffff:7f00:1", // IPv4-mapped, expanded hex
    "not-an-ip",
    "", // fail closed
  ];
  for (const ip of priv)
    assert.equal(isPrivateIp(ip), true, `${ip} must be private/reserved`);
  const pub = [
    "8.8.8.8",
    "1.1.1.1",
    "93.184.216.34",
    "172.15.0.1",
    "172.32.0.1",
    "100.63.0.1",
    "100.128.0.1",
    "198.17.0.1",
    "198.20.0.1",
    "2606:4700:4700::1111",
    "::ffff:8.8.8.8",
    "2001:4860:4860::8888",
  ];
  for (const ip of pub)
    assert.equal(isPrivateIp(ip), false, `${ip} must be public`);
});

test("FA-10/FA-15: resolvePublicAddresses rejects private literals and localhost", async () => {
  await assert.rejects(() => resolvePublicAddresses("127.0.0.1"), /non-public/);
  await assert.rejects(
    () => resolvePublicAddresses("::ffff:7f00:1"),
    /non-public/,
  );
  await assert.rejects(() => resolvePublicAddresses("localhost"), /non-public/);
  await assert.rejects(() => resolvePublicAddresses(""), /empty/);
});

// Local server + injected resolver: exercises redirect-following with
// re-validation per hop, address pinning mechanics, and the streaming cap
// through the REAL raw request layer. The production resolver is covered
// by the unit tests above; the seam exists so the loop can be tested
// without a public host.
async function withServer(handler, fn) {
  const server = http.createServer(handler);
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    return await fn(server.address().port);
  } finally {
    server.close();
  }
}

test("FA-15/FA-16: guarded fetch pins the validated address, sends Host, follows safe redirects", async () => {
  let seenHost = null;
  await withServer(
    (req, res) => {
      seenHost = req.headers.host;
      if (req.url === "/r") {
        res.writeHead(302, { location: "/final" });
        res.end();
      } else {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end("hello");
      }
    },
    async (port) => {
      const fetch2 = createGuardedFetch({
        resolve: async () => [{ address: "127.0.0.1", family: 4 }],
      });
      const res = await fetch2(`http://public.example:${port}/r`, {});
      assert.equal(res.status, 200);
      assert.equal(await res.text(), "hello");
      assert.equal(
        seenHost,
        `public.example:${port}`,
        "Host header carries the original hostname",
      );
    },
  );
});

test("FA-16: redirect into a private target is re-validated and refused", async () => {
  await withServer(
    (req, res) => {
      res.writeHead(302, { location: "http://127.0.0.1:9/secret" });
      res.end();
    },
    async (port) => {
      let first = true;
      const fetch2 = createGuardedFetch({
        resolve: async (host) => {
          if (first) {
            first = false;
            return [{ address: "127.0.0.1", family: 4 }];
          }
          throw new Error("SSRF guard: non-public IP host " + host);
        },
      });
      await assert.rejects(
        () => fetch2(`http://public.example:${port}/r`, {}),
        /non-public/,
      );
    },
  );
});

test("FA-16: response body is capped while streaming", async () => {
  await withServer(
    (req, res) => {
      res.writeHead(200);
      res.end(Buffer.alloc(64 * 1024, 65));
    },
    async (port) => {
      const fetch2 = createGuardedFetch({
        resolve: async () => [{ address: "127.0.0.1", family: 4 }],
      });
      await assert.rejects(
        () => fetch2(`http://public.example:${port}/big`, { maxBytes: 1024 }),
        /too large/,
      );
    },
  );
});

test("FA-16: non-http(s) schemes are refused", async () => {
  const { guardedFetch } = require(path.join(repo, "utils/guardedFetch.js"));
  await assert.rejects(() => guardedFetch("file:///etc/passwd"), /scheme/);
  await assert.rejects(() => guardedFetch("gopher://example.com/"), /scheme/);
});

test("FA-83: production ignores custom LLM base URLs unless explicitly allowed", () => {
  const { loadChatConfig } = require(
    path.join(repo, "services/chatV2/config/chatConfig.js"),
  );
  const prod = loadChatConfig({
    NODE_ENV: "production",
    GROQ_API_KEY: "k",
    GROQ_BASE_URL: "http://evil.example/v1",
  });
  assert.equal(prod.providers[0].baseUrl, "https://api.groq.com/openai/v1");
  const allowed = loadChatConfig({
    NODE_ENV: "production",
    GROQ_API_KEY: "k",
    GROQ_BASE_URL: "https://proxy.example/v1",
    CHAT_ALLOW_CUSTOM_LLM_BASE_URLS: "1",
  });
  assert.equal(allowed.providers[0].baseUrl, "https://proxy.example/v1");
  const httpCustom = loadChatConfig({
    NODE_ENV: "production",
    GROQ_API_KEY: "k",
    GROQ_BASE_URL: "http://proxy.example/v1",
    CHAT_ALLOW_CUSTOM_LLM_BASE_URLS: "1",
  });
  assert.equal(
    httpCustom.providers[0].baseUrl,
    "https://api.groq.com/openai/v1",
    "non-https override refused even with the flag",
  );
});
