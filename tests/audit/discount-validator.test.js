// Phase 3 (testing programme): direct unit battery for
// validators/discount.validator.js — previously ZERO test files
// referenced this money-adjacent module; discount behaviour was only
// exercised indirectly through controllers. Pure Joi validation: no
// DB, no network, no env.
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createDiscountSchema,
  updateDiscountSchema,
  getDiscountsQuerySchema,
  applyDiscountSchema,
  previewDiscountSchema,
} = require("../../validators/discount.validator");

const future = () => new Date(Date.now() + 7 * 24 * 3600 * 1000);
const validCreate = () => ({
  code: "SAVE10",
  description: "Ten percent off",
  discountPercentage: 10,
  minimumOrderAmount: 500,
  maxUsageLimit: 100,
  expiryDate: future(),
});

test("should accept a valid create payload when all fields are well-formed", () => {
  const { error, value } = createDiscountSchema.validate(validCreate());
  assert.equal(error, undefined, error && error.message);
  assert.equal(value.code, "SAVE10");
  assert.equal(value.isActive, true, "isActive defaults to true");
});

test("should normalise the code to uppercase when it is supplied in lowercase", () => {
  const { error, value } = createDiscountSchema.validate({
    ...validCreate(),
    code: "save10",
  });
  assert.equal(error, undefined, error && error.message);
  assert.equal(value.code, "SAVE10");
});

test("should default minimumOrderAmount to 0 when it is omitted", () => {
  const body = validCreate();
  delete body.minimumOrderAmount;
  const { error, value } = createDiscountSchema.validate(body);
  assert.equal(error, undefined, error && error.message);
  assert.equal(value.minimumOrderAmount, 0);
});

test("should reject a create payload when the code is missing", () => {
  const body = validCreate();
  delete body.code;
  const { error } = createDiscountSchema.validate(body);
  assert.ok(error, "missing code must be rejected");
  assert.match(error.message, /Discount code is required/);
});

test("should reject codes outside the 3-20 character boundary", () => {
  for (const code of ["AB", "A".repeat(21)]) {
    const { error } = createDiscountSchema.validate({
      ...validCreate(),
      code,
    });
    assert.ok(error, `code of length ${code.length} must be rejected`);
  }
  for (const code of ["ABC", "A".repeat(20)]) {
    const { error } = createDiscountSchema.validate({
      ...validCreate(),
      code,
    });
    assert.equal(error, undefined, `code of length ${code.length} must pass`);
  }
});

test("should reject a code containing punctuation or spaces", () => {
  for (const code of ["SAVE-10", "SAVE 10", "SAVE_10", "SAVE!"]) {
    const { error } = createDiscountSchema.validate({
      ...validCreate(),
      code,
    });
    assert.ok(error, `code ${JSON.stringify(code)} must be rejected`);
  }
});

test("should reject discount percentages outside 1-100", () => {
  for (const discountPercentage of [0, -5, 100.5, 101]) {
    const { error } = createDiscountSchema.validate({
      ...validCreate(),
      discountPercentage,
    });
    assert.ok(error, `percentage ${discountPercentage} must be rejected`);
  }
  for (const discountPercentage of [1, 100]) {
    const { error } = createDiscountSchema.validate({
      ...validCreate(),
      discountPercentage,
    });
    assert.equal(error, undefined, `percentage ${discountPercentage} must pass`);
  }
});

test("should reject a negative minimumOrderAmount and a non-integer or zero maxUsageLimit", () => {
  assert.ok(
    createDiscountSchema.validate({
      ...validCreate(),
      minimumOrderAmount: -1,
    }).error,
  );
  assert.ok(
    createDiscountSchema.validate({ ...validCreate(), maxUsageLimit: 0 })
      .error,
  );
  assert.ok(
    createDiscountSchema.validate({ ...validCreate(), maxUsageLimit: 2.5 })
      .error,
  );
  const okNull = createDiscountSchema.validate({
    ...validCreate(),
    maxUsageLimit: null,
  });
  assert.equal(okNull.error, undefined, "null usage limit means unlimited");
});

test("should reject an expiryDate in the past or missing on create", () => {
  assert.ok(
    createDiscountSchema.validate({
      ...validCreate(),
      expiryDate: new Date(Date.now() - 1000),
    }).error,
    "past expiry must be rejected",
  );
  const body = validCreate();
  delete body.expiryDate;
  assert.ok(createDiscountSchema.validate(body).error);
});

test("should reject injection-style payloads where objects replace scalars", () => {
  for (const patch of [
    { code: { $ne: "" } },
    { discountPercentage: { $gt: 0 } },
    { minimumOrderAmount: { $gte: 0 } },
    { code: ["SAVE10"] },
    { description: { $where: "1" } },
  ]) {
    const { error } = createDiscountSchema.validate({
      ...validCreate(),
      ...patch,
    });
    assert.ok(
      error,
      `payload ${JSON.stringify(patch)} must not validate`,
    );
  }
});

test("should reject unknown keys so extra fields cannot be mass-assigned", () => {
  const { error } = createDiscountSchema.validate({
    ...validCreate(),
    isAdmin: true,
  });
  assert.ok(error, "unknown key must be rejected");
  assert.match(error.message, /isAdmin/);
});

test("should reject an empty update and accept a single-field update", () => {
  assert.ok(updateDiscountSchema.validate({}).error, "empty update rejected");
  const { error, value } = updateDiscountSchema.validate({
    discountPercentage: 25,
  });
  assert.equal(error, undefined, error && error.message);
  assert.equal(value.discountPercentage, 25);
});

test("should apply defaults and reject out-of-range values in the list query schema", () => {
  const { error, value } = getDiscountsQuerySchema.validate({});
  assert.equal(error, undefined, error && error.message);
  assert.equal(value.page, 1);
  assert.equal(value.limit, 20);
  assert.ok(getDiscountsQuerySchema.validate({ limit: 101 }).error);
  assert.ok(getDiscountsQuerySchema.validate({ page: 0 }).error);
  assert.ok(getDiscountsQuerySchema.validate({ status: "bogus" }).error);
  assert.equal(
    getDiscountsQuerySchema.validate({ status: "active" }).error,
    undefined,
  );
});

test("should uppercase the code in applyDiscount and reject a missing or object code", () => {
  const { error, value } = applyDiscountSchema.validate({ code: "save10" });
  assert.equal(error, undefined, error && error.message);
  assert.equal(value.code, "SAVE10");
  assert.ok(applyDiscountSchema.validate({}).error);
  assert.ok(applyDiscountSchema.validate({ code: { $ne: "" } }).error);
});

const OID = "507f1f77bcf86cd799439011";

test("should accept a preview with selectedItemIds and reject one with neither or both item sources", () => {
  const ok = previewDiscountSchema.validate({
    code: "SAVE10",
    selectedItemIds: [OID],
  });
  assert.equal(ok.error, undefined, ok.error && ok.error.message);
  assert.ok(
    previewDiscountSchema.validate({ code: "SAVE10" }).error,
    "xor: one of selectedItemIds/items is required",
  );
  assert.ok(
    previewDiscountSchema.validate({
      code: "SAVE10",
      selectedItemIds: [OID],
      items: [{ productId: OID, quantity: 1 }],
    }).error,
    "xor: both sources together are rejected",
  );
});

test("should reject preview item ids that are not ObjectIds and duplicate ids", () => {
  assert.ok(
    previewDiscountSchema.validate({
      code: "SAVE10",
      selectedItemIds: ["not-an-id"],
    }).error,
  );
  assert.ok(
    previewDiscountSchema.validate({
      code: "SAVE10",
      selectedItemIds: [OID, OID],
    }).error,
    "duplicate ids violate .unique()",
  );
  assert.ok(
    previewDiscountSchema.validate({
      code: "SAVE10",
      selectedItemIds: [{ $ne: "" }],
    }).error,
    "object-shaped ids are rejected",
  );
});

test("should bound preview item quantities to 1-10000", () => {
  for (const quantity of [0, -1, 10001, 1.5]) {
    assert.ok(
      previewDiscountSchema.validate({
        code: "SAVE10",
        items: [{ productId: OID, quantity }],
      }).error,
      `quantity ${quantity} must be rejected`,
    );
  }
  assert.equal(
    previewDiscountSchema.validate({
      code: "SAVE10",
      items: [{ productId: OID, quantity: 10000 }],
    }).error,
    undefined,
  );
});
