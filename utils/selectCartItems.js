const AppError = require("./AppError");
exports.selectCartItems = (items, ids) => {
  if (ids === undefined) return items;
  if (!Array.isArray(ids) || !ids.length || ids.length > 100 ||
      ids.some(id => typeof id !== "string" || !/^[a-f0-9]{24}$/i.test(id)) || new Set(ids.map(id => id.toLowerCase())).size !== ids.length) {
    throw new AppError("Select between 1 and 100 unique cart items", 400);
  }
  const selected = new Set(ids.map(id => id.toLowerCase()));
  const result = items.filter(item => selected.has(String(item._id).toLowerCase()));
  if (result.length !== selected.size) throw new AppError("Selected cart items changed. Refresh your cart.", 400);
  return result;
};
