// AR-42 (controller wiring) — every path that makes an address the
// default must go through Address.switchDefault (the single atomic
// pipeline update), never through set-flag + save() + the old pre-save
// hook. The real-mongod invariant proof lives in
// tests/platform/address-default.test.js; this file pins which
// controller paths call the atomic operation.
const test = require("node:test");
const assert = require("node:assert/strict");
const { stubModule, makeQuery, mockRes } = require("./helpers");

let switchCalls = [];
let findOneQueue = [];
let createCount = 0;
let countDocs = 1;

const createdDoc = { _id: "addr-new", user: "user1", isDefault: false };

stubModule("models/address.model", {
  findOne: () => makeQuery(findOneQueue.shift() ?? null),
  find: () => makeQuery([]),
  findByIdAndDelete: async () => ({}),
  countDocuments: async () => countDocs,
  create: async (doc) => {
    createCount += 1;
    return { ...createdDoc, ...doc };
  },
  switchDefault: async (userId, addressId) => {
    switchCalls.push([String(userId), String(addressId)]);
    return { modifiedCount: 3 };
  },
});

const ctrl = require("../../controllers/address.controller");
const USER = { id: "user1" };

function reset() {
  switchCalls = [];
  findOneQueue = [];
  createCount = 0;
  countDocs = 1;
}

test("AR-42 wiring: setDefaultAddress uses the atomic switch (no save-based flag set)", async () => {
  reset();
  const doc = {
    _id: "addr1",
    user: "user1",
    isDefault: false,
    save: async () => {
      throw new Error("save must not be used to set the default");
    },
  };
  findOneQueue = [doc];
  const res = mockRes();
  await ctrl.setDefaultAddress(
    { params: { id: "addr1" }, user: USER, body: {}, headers: {} },
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.deepEqual(switchCalls, [["user1", "addr1"]]);
  assert.equal(
    res.body.data.address.isDefault,
    true,
    "the response must present the address as default",
  );
});

test("AR-42 wiring: setDefaultAddress 404 does not switch", async () => {
  reset();
  findOneQueue = [null];
  const res = mockRes();
  await ctrl.setDefaultAddress(
    { params: { id: "missing" }, user: USER, body: {}, headers: {} },
    res,
  );
  assert.equal(res.statusCode, 404);
  assert.deepEqual(switchCalls, []);
});

test("AR-42 wiring: deleting the default promotes the newest remaining address via the atomic switch", async () => {
  reset();
  const doomed = { _id: "addr1", user: "user1", isDefault: true };
  const next = {
    _id: "addr2",
    user: "user1",
    isDefault: false,
    save: async () => {
      throw new Error("promotion must not use save");
    },
  };
  findOneQueue = [doomed, next];
  const res = mockRes();
  await ctrl.deleteAddress(
    { params: { id: "addr1" }, user: USER, body: {}, headers: {} },
    res,
  );
  assert.equal(res.statusCode, 200);
  assert.deepEqual(switchCalls, [["user1", "addr2"]]);
});

test("AR-42 wiring: creating an address as default enforces exclusivity via the atomic switch", async () => {
  reset();
  countDocs = 2; // not the first address; body asks for default
  const res = mockRes();
  await ctrl.createAddress(
    {
      user: USER,
      headers: {},
      body: {
        fullName: "P",
        phone: "980",
        addressLine1: "L1",
        city: "KTM",
        postalCode: "44600",
        isDefault: true,
      },
    },
    res,
  );
  assert.equal(res.statusCode, 201);
  assert.equal(createCount, 1);
  assert.deepEqual(switchCalls, [["user1", "addr-new"]]);
});
