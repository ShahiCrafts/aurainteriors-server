exports.boundedLimit = (value, fallback = 20) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? Math.min(number, 100) : fallback;
};
exports.boundedPage = value => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? Math.min(number, 10000) : 1;
};
exports.literalRegex = value => new RegExp(String(value).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
exports.escapeRegex = value => String(value).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
