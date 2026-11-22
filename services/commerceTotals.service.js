"use strict";

// Batch 4: settings-driven order money — delivery fee + VAT.
//
// Before this batch, controllers/order.controller.js hardcoded
// shippingCost = 0 ("Free shipping") and tax = 0 in
// calculateOrderTotals. The commerce settings (services/settings)
// now carry shipping zones, a VAT toggle/rate and a minimum order
// amount, and this service is the single place that turns them into
// numbers. Every default reproduces the old behaviour exactly:
// all zone rates are 0 (fee 0 for every address), VAT is off
// (tax 0), minimum is 0 (nothing rejected).
//
// Resolution follows the Batch 2 consumer pattern: when the DB is
// ready, the merged settings (stored overrides over defaults) win;
// on any failure — no DB (tests/boot), read error — the defaults
// apply, which are today's behaviour by construction.

const { DEFAULT_SETTINGS } = require("./settings/defaults");

async function resolveCommerceSettings() {
  try {
    const settingsService = require("./settings/settingsService");
    if (settingsService.isDbReady()) {
      const settings = await settingsService.getSettings();
      if (settings && settings.commerce) return settings.commerce;
    }
  } catch {
    // Defaults below are today's behaviour — safe to fall back.
  }
  return structuredClone(DEFAULT_SETTINGS.commerce);
}

const VALLEY_CITIES = ["kathmandu", "lalitpur", "bhaktapur", "patan"];
const VALLEY_STATES = ["bagmati", "bagmati province", "province 3"];

function normalise(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

// The order address schema (models/order.model.js) has city / state /
// country — no district field. The Kathmandu Valley districts map to
// the city field (Kathmandu, Lalitpur, Bhaktapur) in practice, and
// Bagmati is the valley's province in the state field.
function isKathmanduValleyAddress(address) {
  if (!address) return false;
  return (
    VALLEY_CITIES.includes(normalise(address.city)) ||
    VALLEY_STATES.includes(normalise(address.state))
  );
}

function enabledZones(commerce) {
  const zones =
    commerce && commerce.shipping ? commerce.shipping.zones : null;
  if (!Array.isArray(zones)) return [];
  return zones.filter((z) => z && z.enabled && typeof z.name === "string");
}

// Which zone's flat rate applies to an address: Kathmandu Valley
// first, then International for non-Nepal countries, then the
// configured default zone. Returns null when no enabled zone
// matches (fee 0 — the store never invents a charge).
function matchShippingZone(commerce, address) {
  const zones = enabledZones(commerce);
  if (isKathmanduValleyAddress(address)) {
    const valley = zones.find((z) => z.name === "Kathmandu Valley");
    if (valley) return valley;
  }
  const country = normalise(address && address.country) || "nepal";
  if (country !== "nepal") {
    const international = zones.find((z) => z.name === "International");
    if (international) return international;
  }
  const defaultName = commerce && commerce.shipping
    ? commerce.shipping.defaultZone
    : undefined;
  return zones.find((z) => z.name === defaultName) || null;
}

function computeDeliveryFee(commerce, address, goodsAmount) {
  const shipping = (commerce && commerce.shipping) || {};
  if (!shipping.enabled) return 0;
  const threshold = commerce ? commerce.freeShippingThreshold : undefined;
  if (
    typeof threshold === "number" &&
    threshold > 0 &&
    goodsAmount >= threshold
  ) {
    return 0;
  }
  const zone = matchShippingZone(commerce, address);
  if (!zone) return 0;
  const rate = Number(zone.rate);
  return Number.isFinite(rate) && rate > 0 ? rate : 0;
}

// VAT is charged on the goods amount actually paid (subtotal minus
// discount) and rounded to 2 decimals (paisa).
function computeVat(commerce, goodsAmount) {
  const tax = (commerce && commerce.tax) || {};
  if (!tax.vatEnabled) return 0;
  const rate = Number(tax.vatRate);
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return Math.round(goodsAmount * rate) / 100;
}

module.exports = {
  resolveCommerceSettings,
  isKathmanduValleyAddress,
  matchShippingZone,
  computeDeliveryFee,
  computeVat,
};
