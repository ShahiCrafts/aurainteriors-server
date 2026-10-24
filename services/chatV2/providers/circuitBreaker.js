// AR-13: the half-open state admits exactly ONE probe. canTry() in the
// half-open state CLAIMS the probe slot (probeInFlight) until
// success()/failure() releases it, so a recovering provider is not
// stampeded by every queued turn at once (previously half-open was
// just a label and every caller could probe simultaneously). Closed
// and open behavior is unchanged.
class CircuitBreaker {
  constructor({ threshold = 3, cooldownMs = 30000 } = {}) {
    this.threshold = threshold;
    this.cooldownMs = cooldownMs;
    this.s = new Map();
  }

  state(k) {
    const x = this.s.get(k) || { failures: 0, state: "closed", until: 0, probeInFlight: false };
    if (x.state === "open" && Date.now() >= x.until) {
      x.state = "half-open";
      x.probeInFlight = false;
    }
    this.s.set(k, x);
    return x;
  }

  canTry(k) {
    const x = this.state(k);
    if (x.state === "open") return false;
    if (x.state === "half-open") {
      if (x.probeInFlight) return false;
      x.probeInFlight = true;
      this.s.set(k, x);
      return true;
    }
    return true;
  }

  success(k) {
    this.s.set(k, { failures: 0, state: "closed", until: 0, probeInFlight: false });
  }

  failure(k, { fatal = false, retryAfterMs = 0 } = {}) {
    const x = this.state(k);
    x.failures++;
    x.probeInFlight = false;
    if (fatal || x.failures >= this.threshold) {
      x.state = "open";
      x.until = Date.now() + Math.max(this.cooldownMs, retryAfterMs);
    }
    this.s.set(k, x);
  }
}
module.exports = CircuitBreaker;
