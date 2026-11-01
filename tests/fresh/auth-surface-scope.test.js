// Session surface scoping (2026-11-01): the storefront and the admin
// panel share one API host, hence one cookie jar. They must not share
// one session cookie — an admin sign-in used to overwrite the
// customer session in the same browser (and vice versa on logout).
// The storefront keeps cookie "jwt"; the admin surface uses
// "jwt_admin"; extraction picks the cookie by the request's Origin.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const repo = path.resolve(__dirname, "../..");
const stub = (rel, exports) => {
  const abs = path.join(repo, rel);
  require.cache[abs] = { id: abs, filename: abs, loaded: true, exports };
};
process.env.JWT_SECRET = "<redacted>";
process.env.ADMIN_URL = "https://admin.aurainteriors.live";

stub("models/user.model.js", {});
stub("models/revokedToken.model.js", { exists: async () => false });
stub("services/email.service.js", { sendMagicLinkEmail: () => {} });

const authToken = require(path.join(repo, "utils/authToken.js"));

const SHOP = "https://www.aurainteriors.live";
const ADMIN = "https://admin.aurainteriors.live";
const BOTH = "jwt=CUSTOMER_TOKEN; jwt_admin=ADMIN_TOKEN";

test("surfaceOf: ADMIN_URL origin and admin.* hosts are admin; everything else customer", () => {
  assert.equal(authToken.surfaceOf({ headers: { origin: ADMIN } }), "admin");
  assert.equal(
    authToken.surfaceOf({ headers: { origin: "https://admin.example.com" } }),
    "admin",
    "admin. subdomain heuristic applies when ADMIN_URL does not match",
  );
  assert.equal(authToken.surfaceOf({ headers: { origin: SHOP } }), "customer");
  assert.equal(authToken.surfaceOf({ headers: {} }), "customer");
  assert.equal(authToken.surfaceOf({}), "customer");
  assert.equal(
    authToken.surfaceOf({ headers: { referer: `${ADMIN}/login` } }),
    "admin",
    "referer is the fallback when origin is absent",
  );
});

test("extract: each surface reads only its own cookie", () => {
  assert.equal(
    authToken.extract({ headers: { origin: SHOP, cookie: BOTH } }),
    "CUSTOMER_TOKEN",
  );
  assert.equal(
    authToken.extract({ headers: { origin: ADMIN, cookie: BOTH } }),
    "ADMIN_TOKEN",
  );
  assert.equal(
    authToken.extract({ headers: { origin: ADMIN, cookie: "jwt=CUSTOMER_TOKEN" } }),
    null,
    "the admin surface cannot ride the customer session",
  );
  assert.equal(
    authToken.extract({ headers: { origin: SHOP, cookie: "jwt_admin=ADMIN_TOKEN" } }),
    null,
    "the storefront cannot ride the admin session",
  );
  assert.equal(
    authToken.extract({
      headers: { origin: ADMIN },
      cookies: { jwt: "CUSTOMER_TOKEN", jwt_admin: "ADMIN_TOKEN" },
    }),
    "ADMIN_TOKEN",
    "parsed-cookie path (cookie-parser) is scoped the same way",
  );
  assert.equal(
    authToken.extract({ headers: { cookie: BOTH } }),
    "CUSTOMER_TOKEN",
    "origin-less requests keep the historical behaviour",
  );
  assert.equal(
    authToken.extract({
      headers: { origin: ADMIN, authorization: "Bearer BEARER_TOKEN", cookie: BOTH },
    }),
    "BEARER_TOKEN",
    "Bearer keeps precedence on both surfaces",
  );
});

test("sendAuthResponse: admin issuance sets jwt_admin, customer issuance keeps jwt", () => {
  const auth = require(path.join(repo, "controllers/auth.controller.js"));
  const user = {
    _id: "64b64c2f9f1b2c3d4e5f6001",
    email: "a@example.com",
    role: "admin",
  };
  const call = (surface) => {
    const captured = {};
    const res = {
      cookie(name, value, opts) {
        captured.cookie = { name, value, opts };
      },
      status(c) {
        captured.code = c;
        return this;
      },
      json(b) {
        captured.body = b;
      },
    };
    if (surface) auth._sendAuthResponse(user, 200, res, surface);
    else auth._sendAuthResponse(user, 200, res);
    return captured;
  };
  assert.equal(call().cookie.name, "jwt");
  assert.equal(call("customer").cookie.name, "jwt");
  const adminOut = call("admin");
  assert.equal(adminOut.cookie.name, "jwt_admin");
  assert.ok(adminOut.cookie.value, "admin cookie carries the token");
  assert.equal(adminOut.cookie.opts.httpOnly, true);
});

test("csrfOrigin: a jwt_admin cookie also triggers origin enforcement", async () => {
  const { createOriginCheck } = require(
    path.join(repo, "middleware/csrfOrigin.js"),
  );
  const mw = createOriginCheck([ADMIN]);
  const runMw = (req) =>
    new Promise((resolve) => {
      const res = {
        status(c) {
          this.code = c;
          return this;
        },
        json() {
          resolve({ passed: false, code: this.code });
        },
      };
      mw(req, res, () => resolve({ passed: true }));
    });
  assert.equal(
    (
      await runMw({
        method: "POST",
        path: "/api/v1/orders",
        headers: { cookie: "jwt_admin=ADMIN_TOKEN", origin: "https://evil.example" },
      })
    ).passed,
    false,
    "admin-cookie mutations from an untrusted origin are blocked",
  );
  assert.equal(
    (
      await runMw({
        method: "POST",
        path: "/api/v1/orders",
        headers: { cookie: "jwt_admin=ADMIN_TOKEN", origin: ADMIN },
      })
    ).passed,
    true,
    "admin-cookie mutations from the admin origin pass",
  );
});
