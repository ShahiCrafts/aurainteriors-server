// CodeQL class A (#3, js/type-confusion-through-parameter-tampering):
// array/object query values must never crash the product list handler
// or change its query semantics. Pre-fix, ?style[$ne]=x and friends
// reached .split()/parseFloat() raw and produced 500s / NaN filters.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  stubModule,
  makeQuery,
  mockRes,
  mockNext,
  until,
} = require("../audit/helpers");
const params = require("../../utils/params");

test("CQ-A: params helpers force scalars and reject containers", () => {
  assert.equal(params.asString("hi"), "hi");
  assert.equal(params.asString(["hi"]), undefined);
  assert.equal(params.asString({ $ne: "x" }), undefined);
  assert.equal(params.asString(42), undefined);
  assert.equal(params.asNumber("12.5"), 12.5);
  assert.equal(params.asNumber(7), 7);
  assert.equal(params.asNumber({ $gte: "0" }), undefined);
  assert.equal(params.asNumber(["5"]), undefined);
  assert.equal(params.asNumber("abc"), undefined);
  assert.equal(params.asNumber(""), undefined);
  assert.equal(params.asBoolean("true"), true);
  assert.equal(params.asBoolean({}), undefined);
  assert.equal(params.asEnum("active", ["active", "draft"]), "active");
  assert.equal(params.asEnum({ $ne: null }, ["active"]), undefined);
  assert.equal(
    params.asObjectId("507f1f77bcf86cd799439011"),
    "507f1f77bcf86cd799439011",
  );
  assert.equal(params.asObjectId({ $ne: null }), undefined);
  assert.equal(params.asObjectId("not-an-id"), undefined);
  assert.deepEqual(params.asStringList("a, b ,c"), ["a", "b", "c"]);
  assert.deepEqual(params.asStringList(["a", "b"]), []);
  assert.deepEqual(params.asStringList({ $in: ["a"] }), []);
});

let capturedFilter;
stubModule("models/product.model.js", {
  find: (filter) => {
    capturedFilter = filter;
    return makeQuery([]);
  },
  countDocuments: async () => 0,
});
stubModule("models/category.model.js", {
  find: () => ({ select: () => Promise.resolve([]) }),
});
stubModule("middleware/upload.middleware.js", {
  deleteFile: async () => {},
  deleteFiles: async () => {},
});
const productController = require("../../controllers/product.controller");

const list = async (query, user) => {
  capturedFilter = undefined;
  const res = mockRes();
  const next = mockNext();
  await productController.getAllProducts({ query, user }, res, next);
  await until(() => res.body !== undefined || next.error !== undefined);
  assert.equal(
    next.error,
    undefined,
    `handler must not error for ${JSON.stringify(query)?.slice(0, 60)}`,
  );
  assert.equal(res.statusCode, 200);
  return capturedFilter;
};

test("CQ-A: container payloads cannot crash or steer the product filter", async () => {
  const admin = { role: "admin" };
  let filter = await list({ style: { $ne: "Modern" } }, admin);
  assert.equal(
    filter.style,
    undefined,
    "object style must be treated as absent",
  );

  filter = await list({ status: ["active", "draft"] }, admin);
  assert.deepEqual(
    filter.status,
    { $in: ["active", "out_of_stock"] },
    "array status falls back to the default set",
  );

  filter = await list({ category: { $ne: null } }, admin);
  assert.equal(filter.category, undefined);

  filter = await list({ search: { $gt: "" } }, admin);
  assert.equal(filter.$text, undefined, "object search must not reach $text");

  filter = await list({ minPrice: { $gte: "0" }, maxPrice: ["999"] }, admin);
  assert.equal(
    filter.price,
    undefined,
    "container prices must not produce NaN operators",
  );
});

test("CQ-A: ordinary string parameters behave exactly as before (characterization)", async () => {
  const filter = await list(
    {
      style: "Modern, Classic",
      minPrice: "100",
      maxPrice: "500",
      search: "sofa",
      featured: "true",
      status: "draft",
    },
    { role: "admin" },
  );
  assert.deepEqual(filter.style, { $in: ["Modern", "Classic"] });
  // Phase 5 (catalog): minPrice/maxPrice no longer land on
  // filter.price — getAllProducts replaces the fragment with the
  // effective-price clause (Product.price for non-variant
  // products; any enabled variant's price for variant products).
  // The coerced bounds themselves are unchanged and still applied,
  // now inside the clause's product branch.
  assert.equal(filter.price, undefined);
  assert.deepEqual(filter.$and[0].$or[0], {
    hasVariants: { $ne: true },
    price: { $gte: 100, $lte: 500 },
  });
  assert.deepEqual(filter.$text, { $search: "sofa" });
  assert.equal(filter.isFeatured, true);
  assert.deepEqual(filter.status, { $in: ["draft"] });

  const customerFilter = await list(
    { status: "draft,active" },
    { role: "customer" },
  );
  assert.deepEqual(
    customerFilter.status,
    { $in: ["active"] },
    "customers still see only visible statuses",
  );
});
