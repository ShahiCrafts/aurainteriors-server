# Production topology — recommended settings

The codebase ships with development-friendly defaults: background
work runs inside the web process, email is sent synchronously, and
broadcasts run inline. All of the machinery for a scaled-out
production topology already exists and is switched by environment
variables only. This document records the recommended production
values (Report 2, PERF-B-07) and why. Nothing here changes a
default in code.

## Recommended production environment

| Variable | Production value | Why |
|---|---|---|
| `WORKER_MODE` | `separate` | Runs the Mongo job queue, ingestion, RSS refresh and periodic tasks in the dedicated `worker.js` process instead of the web process, so background CPU/DB work never competes with request handling. Start one worker alongside the web tier: `node worker.js`. |
| `EMAIL_MODE` | `outbox` | Order-confirmation, magic-link and OTP email is written to the email outbox (inside the caller's transaction when one exists) and sent by the drainer with bounded retries. A Brevo outage then delays email instead of adding its latency — or its failure — to checkout and sign-in responses. |
| `BROADCAST_MODE` | `queue` | Newsletter and promotion broadcasts are enqueued as durable jobs and sent in resumable 250-recipient slices by the worker, instead of loading every subscriber into the web process and sending inline in the admin's request. |
| `RATE_LIMIT_STORE` | `mongo` | Tier and auth rate limits are counted in MongoDB, so limits hold across all web instances. The default (`memory`) multiplies every limit by the instance count. Boot already warns in production when this is not `mongo` (VULN-005 remediation). |
| `TRUST_PROXY` | Decide explicitly — set to your proxy topology (e.g. `1` behind a single load balancer, or the platform's documented value) | Express does not trust `X-Forwarded-For` unless told to. Unset behind a load balancer means `req.ip` is the proxy's address and every IP-keyed limiter shares one global bucket (false 429s); set carelessly on a directly-exposed server it makes `X-Forwarded-For` spoofable (limit evasion). There is no safe universal value — it must match the deployment. Boot warns in production while it is unset. |

## Also recommended

- `CATALOG_CACHE_TTL_MS` — anonymous product-list responses are
  cached in-process (default 45 s; `0` disables). No change is
  needed for the default. Per-process by design: with N web
  instances each holds its own copy, bounded by the TTL and by
  write-invalidation within the instance that served the write —
  acceptable for a 45-second window; the `Cache-Control` headers
  (PERF-B-01) let shared caches in front do the heavier lifting.
- `UPLOAD_MAX_TOTAL_BYTES` — defaults to 50 MB aggregate per request
  (VULN-006 remediation); set explicitly only to change that budget.
- `OTP_PEPPER` — **required in production** (boot error if missing):
  the admin OTP HMAC must not fall back to the JWT secret.

## What stays in-process regardless

The scheduler lease system already prevents duplicate periodic runs
across instances, and the socket layer can use the Mongo adapter
(`SOCKET_ADAPTER=mongo`) when more than one web instance serves
realtime traffic. Moving work to the worker does not change any API
contract — it only changes which process executes it.
