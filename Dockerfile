# =============================================================================
# UNVERIFIED — authored 2026-10-24 (AR-46). No container runtime was
# available in the authoring environment (`docker`, `podman`, `buildah`
# and `nerdctl` are all absent), so this image has NEVER been built or
# booted. Treat the first `docker build` as an owner-side verification
# step and run the first-build checks listed in DEPLOYMENT.md
# ("Docker (UNVERIFIED)") before relying on it.
#
# The only verification that exists for the install step below is
# host-level, not container-level: Phase 0 verified that
# `npm ci --omit=dev` installs 221 production packages and that the
# resulting tree boots with a stubbed DB (see AUDIT_ARCH_TRACKER.md,
# AR-43). That says nothing about this image: base-image contents,
# native-module builds for musl/Alpine (notably `sharp` and `bcrypt`),
# file permissions and the healthcheck can only be confirmed by an
# actual build.
# =============================================================================

# ---- Dependencies stage -----------------------------------------------------
# package.json declares engines node >=20.19.0; CI runs Node 24, so the
# image uses the Node 24 line on Alpine (PERF-019/SEC-006 remediation:
# majors aligned with CI). Dependencies are installed from the lockfile
# only, production packages only (devDependencies — eslint,
# mongodb-memory-server — are neither needed nor wanted at runtime).
# Pinned by digest (resolved from the Docker Hub registry API on
# 2026-10-29 for node:24-alpine); Dependabot's docker ecosystem keeps
# the digest current. NOTE: this image has still never been built —
# the first `docker build` remains an owner-side verification step.
FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4 AS deps

WORKDIR /app

# Manifests first, so the dependency layer is cached and only rebuilt
# when the dependency set actually changes.
COPY package.json package-lock.json ./

RUN npm ci --omit=dev && npm cache clean --force

# ---- Runtime stage ----------------------------------------------------------
FROM node:25-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4

# Production mode is what turns on the boot-time environment
# enforcement in server.js (required vars, JWT_SECRET length floor,
# TLS Mongo URI — see DEPLOYMENT.md "Environment").
ENV NODE_ENV=production

WORKDIR /app

# Installed dependencies from the deps stage, then the source. The
# build context excludes node_modules (see .dockerignore), so the
# source copy cannot overwrite the installed tree with a host one.
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .

# Run as the base image's built-in unprivileged user, never root.
USER node

# server.js listens on PORT (default 3001) bound to 0.0.0.0.
EXPOSE 3001

# Readiness, not liveness: /health/ready returns 200 only while
# MongoDB is connected, and 503 when the DB is down. That 503 is the
# CORRECT readiness semantics — the container should report unhealthy
# while it cannot serve checkouts, instead of looking ready.
# Implemented with `node -e` + fetch (Node 20's built-in fetch) rather
# than wget: busybox wget's exit code on an HTTP error status is an
# implementation detail this file should not depend on, while the
# script below maps the status to an exit code explicitly. It honors
# a non-default PORT.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "const p=process.env.PORT||3001;fetch('http://127.0.0.1:'+p+'/health/ready').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"

# Exec form: node is PID 1 and receives SIGTERM directly, which the
# graceful-drain path in server.js (ADR-0001) depends on — a shell
# wrapper would swallow or delay the signal.
CMD ["node", "server.js"]
