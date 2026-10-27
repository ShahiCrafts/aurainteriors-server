// Phase 2 (catalog) — product write-path attribute orchestration.
//
// Bridges the pure validation engine
// (services/attributeValidation.service.js) and applicability
// resolution (services/attributeResolution.service.js) for the
// product create/update controllers. Both functions throw
// AppError(400) on any problem and are always invoked BEFORE the
// product is persisted, so a rejected payload saves nothing.
//
// Write contract (Phase 2 brief):
//   - A PROVIDED catalogAttributes payload is fully validated:
//     unknown key -> 400 naming it; a field-storage key -> 400;
//     an invalid value -> 400 naming the key and the reason;
//     prototype-pollution keys anywhere -> 400. Valid values are
//     stored NORMALIZED (hex case, trimmed strings, deduped
//     multi-enums, canonical measurement/dimensions shapes).
//     Any ACTIVE definition key is writable — applicability
//     governs forms/filters/required, not writability, so e.g.
//     `firmness` can be set on a product whose category has no
//     product type yet (Product.productType arrives in Phase 3).
//   - REQUIRED attributes (per resolution for the product's
//     category) are enforced on create, and on update ONLY when
//     the payload touches catalogAttributes or category — an
//     unrelated partial update (price, stock, ...) never fails
//     over attributes it did not touch.
//   - When an update changes ONLY the category, the product's
//     stored values are not re-validated (legacy values must not
//     make a legitimate move fail), but the move cannot strand
//     the product in a category whose required attributes it
//     lacks.
const AppError = require("../utils/AppError");
const {
  validateCatalogAttributesMap,
  missingRequiredAttributes,
} = require("./attributeValidation.service");
const {
  loadActiveDefinitions,
  resolveForCategory,
} = require("./attributeResolution.service");

const parseJsonField = (field) => {
  if (typeof field === "string") {
    try {
      return JSON.parse(field);
    } catch {
      return field;
    }
  }
  return field;
};

function missingError(missing) {
  return new AppError(
    `Missing required attribute(s) for this category: ${missing.join(", ")}`,
    400
  );
}

// Phase 3: `productType` (the product's own type, when the write
// sets or carries one) supplies the resolution's type level via
// typeKeyOverride, so required attributes from the PRODUCT's type
// are enforced — not only the category's.
async function prepareCatalogAttributes({ category, raw, productType }) {
  const parsed = parseJsonField(raw);
  const definitionsByKey = await loadActiveDefinitions();
  const result = validateCatalogAttributesMap(definitionsByKey, parsed);
  if (!result.ok) {
    throw new AppError(result.error, 400);
  }
  if (category) {
    const resolved = await resolveForCategory(category, {
      typeKeyOverride: productType || undefined,
    });
    const missing = missingRequiredAttributes(resolved, result.value);
    if (missing.length > 0) throw missingError(missing);
  }
  return result.value;
}

async function assertRequiredForStoredAttributes({ category, storedAttrs }) {
  if (!category) return;
  const plain =
    storedAttrs instanceof Map
      ? Object.fromEntries(storedAttrs)
      : storedAttrs && typeof storedAttrs.toObject === "function"
        ? storedAttrs.toObject()
        : storedAttrs || {};
  const resolved = await resolveForCategory(category);
  const missing = missingRequiredAttributes(resolved, plain);
  if (missing.length > 0) throw missingError(missing);
}

module.exports = {
  prepareCatalogAttributes,
  assertRequiredForStoredAttributes,
};
