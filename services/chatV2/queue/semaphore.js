// AR-13: a counting semaphore bounding concurrent chat turns
// process-wide (turns were previously bounded only per chat by
// KeyedTurnQueue, so distinct concurrent turns — and the LLM calls,
// provider spend and in-memory closures they carry — grew without any
// global bound). max <= 0 means UNBOUNDED: acquire() always succeeds
// immediately, which is the pre-AR-13 behavior and the default when
// CHAT_MAX_CONCURRENT_TURNS is unset/0.
class Semaphore {
  constructor(max) {
    this.max = Number.isFinite(max) && max > 0 ? Math.floor(max) : 0;
    this.active = 0;
    this.waiters = [];
  }

  async acquire() {
    if (this.max === 0) return () => {};
    if (this.active < this.max) {
      this.active += 1;
      return this._makeRelease();
    }
    return new Promise((resolve) => {
      this.waiters.push(() => {
        this.active += 1;
        resolve(this._makeRelease());
      });
    });
  }

  _makeRelease() {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active -= 1;
      while (this.waiters.length > 0 && this.active < this.max) {
        const next = this.waiters.shift();
        next();
      }
    };
  }
}

module.exports = Semaphore;
