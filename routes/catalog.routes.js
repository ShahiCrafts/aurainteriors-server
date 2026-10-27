const express = require('express');
const router = express.Router();
const Category = require('../models/category.model');
const { rooms } = require('../config/catalogTaxonomy');
const { standardReadLimiter } = require('../middleware/rateLimit.middleware');
const catalogController = require('../controllers/catalog.controller');
const publicCache = require('../middleware/publicCache.middleware');
const { protect, protectOptional, restrictTo } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const {
  createProductTypeSchema,
  updateProductTypeSchema,
  createRoomSchema,
  updateRoomSchema,
  createCollectionSchema,
  updateCollectionSchema,
  createAttributeDefinitionSchema,
  updateAttributeDefinitionSchema,
} = require('../validators/catalog.validator');
router.use(standardReadLimiter);
// Phase 2: /schema is served from the DB registries (attribute
// definitions + product types + rooms) by the controller, with the
// static config as the never-bootstrapped fallback.
router.get('/schema', publicCache, catalogController.getSchema);
router.get('/navigation', publicCache, async (_req, res, next) => {
  try { res.json({ status: 'success', data: { categories: await Category.getCategoryTree(), rooms } }); }
  catch (error) { next(error); }
});
// Phase 5: delegated to the shared disjunctive facet engine
// (controllers/catalog.controller.js getCategoryFacets ->
// services/catalogFacets.service.js). The precursor's inline
// in-JS counting over a <=5,000-product sample is removed — one
// faceting implementation remains.
router.get('/categories/:slug/facets', publicCache, catalogController.getCategoryFacets);

// Phase 1: DB-backed registries (controllers/catalog.controller.js).
// Public reads — product types. SR-P6-1: the three LIST routes run
// protectOptional so an authenticated admin's ?includeInactive=true
// can be honored by the controllers; guests and non-admins see the
// unchanged active-only lists and the parameter is never
// acknowledged to them. Detail reads stay public-active.
router.get('/product-types', publicCache, protectOptional, catalogController.listProductTypes);
router.get('/product-types/:key', publicCache, catalogController.getProductType);

// Public reads — rooms (detail includes the room's published
// products, paginated).
router.get('/rooms', publicCache, protectOptional, catalogController.listRooms);
router.get('/rooms/:slug', publicCache, catalogController.getRoom);

// Public reads — collections (detail resolves the collection's
// products at read time: manual order or rule evaluation).
router.get('/collections', publicCache, protectOptional, catalogController.listCollections);
router.get('/collections/:slug', publicCache, catalogController.getCollection);

// Phase 2: attribute resolution reads — the applicable attribute
// set (global + type + inherited category assignments) for a
// category (slug or ObjectId) or a product type.
router.get('/categories/:ref/attributes', publicCache, catalogController.getCategoryAttributes);
router.get('/product-types/:key/attributes', publicCache, catalogController.getProductTypeAttributes);

// Phase 1: registry administration. Everything below is admin-only,
// behind the same protect + restrictTo("admin") gate as the product
// and category routers.
router.use(protect, restrictTo('admin'));

router.post('/product-types', validate(createProductTypeSchema), catalogController.createProductType);
router.patch('/product-types/:key', validate(updateProductTypeSchema), catalogController.updateProductType);
router.delete('/product-types/:key', catalogController.deleteProductType);

router.post('/rooms', validate(createRoomSchema), catalogController.createRoom);
router.patch('/rooms/:slug', validate(updateRoomSchema), catalogController.updateRoom);
router.delete('/rooms/:slug', catalogController.deleteRoom);

router.post('/collections', validate(createCollectionSchema), catalogController.createCollection);
router.patch('/collections/:slug', validate(updateCollectionSchema), catalogController.updateCollection);
router.delete('/collections/:slug', catalogController.deleteCollection);

// Phase 2: attribute definition administration. Delete is soft by
// default (deactivate); ?hard=true deletes an unused, unreferenced
// definition outright.
router.get('/attributes', catalogController.listAttributeDefinitions);
router.get('/attributes/:key', catalogController.getAttributeDefinition);
router.post('/attributes', validate(createAttributeDefinitionSchema), catalogController.createAttributeDefinition);
router.patch('/attributes/:key', validate(updateAttributeDefinitionSchema), catalogController.updateAttributeDefinition);
router.delete('/attributes/:key', catalogController.deleteAttributeDefinition);

module.exports = router;
