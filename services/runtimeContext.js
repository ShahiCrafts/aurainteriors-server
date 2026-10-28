// AR-33: explicit runtime service registry.
//
// Replaces the mutable global.* sites (global.io,
// global.notificationGateway, global.notificationEventEmitter,
// global.keepAliveService) with one named, documented holder.
//
// Why a module registry instead of req.app.get()/app.set():
//   1. The heaviest consumers (services/chatService, notificationService,
//      notificationEventEmitter) run OUTSIDE any request - req.app cannot
//      reach them. One mechanism for every consumer beats two.
//   2. Controller tests invoke handlers with plain stub req objects that
//      have no .app; the registry keeps those tests mechanical
//      (set/reset instead of fabricating req.app).
//   3. It requires nothing and holds only process-lifetime singletons,
//      so it cannot introduce a circular dependency (madge: zero cycles
//      is the fact AR-33 must not regress).
//
// Populated ONCE during bootstrap (server.js startServer, right after
// the gateway / keep-alive service are constructed); read anywhere.
// Nothing else writes it. reset() exists for test isolation only.
const registry = {
  notificationGateway: null,
  keepAliveService: null,
};

module.exports = {
  setNotificationGateway(gateway) {
    registry.notificationGateway = gateway || null;
  },
  getNotificationGateway() {
    return registry.notificationGateway;
  },
  // Convenience: the Socket.IO server owned by the gateway
  // (null until the gateway is registered, e.g. pre-boot / in tests
  // that never construct one).
  getIo() {
    return registry.notificationGateway
      ? registry.notificationGateway.io
      : null;
  },
  setKeepAliveService(service) {
    registry.keepAliveService = service || null;
  },
  getKeepAliveService() {
    return registry.keepAliveService;
  },
  // Test-only: restore the never-booted state between tests.
  reset() {
    registry.notificationGateway = null;
    registry.keepAliveService = null;
  },
};
