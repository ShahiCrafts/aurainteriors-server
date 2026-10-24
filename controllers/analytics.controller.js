const Order = require("../models/order.model");
const Product = require("../models/product.model");
const User = require("../models/user.model");
const catchAsync = require("../utils/catchAsync");
const { getCached, setCached } = require("../utils/ttlCache");

// AR-11: analytics responses are cached in-process only when
// ANALYTICS_CACHE_TTL_MS > 0 (default: no caching, current behavior).
// The key includes the full query shape so different filters/days
// never collide. See docs/adr/ADR-0002 for the freshness trade-off.
const cacheKey = (name, req) => `analytics:${name}:${JSON.stringify(req.query || {})}`;
// 1. Dashboard Stats (Cards)
exports.getDashboardStats = catchAsync(async (req, res, next) => {
    const hit = getCached(cacheKey("dashboard", req));
    if (hit !== undefined) return res.status(200).json(hit);
    const [revenueStats, totalOrders, totalProducts, totalUsers] = await Promise.all([
        Order.aggregate([
        {
            $match: {
                paymentStatus: { $in: ["paid"] },
                orderStatus: { $nin: ["cancelled", "refunded"] },
            },
        },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: "$total" },
            },
        },
    ]),
        Order.countDocuments(),
        Product.countDocuments({
            status: { $ne: "discontinued" },
            deletedAt: null,
        }),
        User.countDocuments({ deletedAt: null }),
    ]);

    const body = {
        status: "success",
        data: {
            totalRevenue: revenueStats[0]?.totalRevenue || 0,
            totalOrders,
            totalProducts,
            totalUsers,
        },
    };
    setCached(cacheKey("dashboard", req), body);
    res.status(200).json(body);
});

// 2. Revenue Analytics (Area Chart)
exports.getRevenueAnalytics = catchAsync(async (req, res, next) => {
    const hit = getCached(cacheKey("revenue", req));
    if (hit !== undefined) return res.status(200).json(hit);
    // AR-11 (behavior-correcting, recorded in CLIENT_IMPACT.md): days
    // was unbounded — one request could widen the scan to all history.
    // It is now clamped to 1..365; in-range values are unchanged and a
    // non-numeric value falls back to the previous default of 30.
    const parsedDays = req.query.days ? parseInt(req.query.days, 10) : 30;
    const days = Number.isFinite(parsedDays) ? Math.min(365, Math.max(1, parsedDays)) : 30;
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    const revenueChart = await Order.aggregate([
        {
            $match: {
                createdAt: { $gte: dateFrom },
                paymentStatus: { $in: ["paid"] },
                orderStatus: { $nin: ["cancelled", "refunded"] },
            },
        },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                revenue: { $sum: "$total" },
                orders: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    const body = {
        status: "success",
        data: {
            chartData: revenueChart.map((item) => ({
                date: item._id,
                revenue: item.revenue,
                orders: item.orders,
            })),
        },
    };
    setCached(cacheKey("revenue", req), body);
    res.status(200).json(body);
});

// 3. Sales by Category (Pie Chart)
exports.getCategorySales = catchAsync(async (req, res, next) => {
    const hit = getCached(cacheKey("categories", req));
    if (hit !== undefined) return res.status(200).json(hit);
    const categorySales = await Order.aggregate([
        { $match: { orderStatus: { $nin: ["cancelled", "refunded"] } } },
        { $unwind: "$items" },
        {
            $lookup: {
                from: "products",
                localField: "items.product",
                foreignField: "_id",
                as: "product",
            },
        },
        { $unwind: "$product" },
        {
            $lookup: {
                from: "categories",
                localField: "product.category",
                foreignField: "_id",
                as: "category",
            },
        },
        { $unwind: "$category" },
        {
            $group: {
                _id: "$category.name",
                value: { $sum: "$items.quantity" },
                revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
            },
        },
        { $sort: { value: -1 } },
        { $limit: 6 }, // Top 6 categories
    ]);

    const body = {
        status: "success",
        data: {
            salesByCategory: categorySales.map((item) => ({
                name: item._id,
                value: item.value,
                revenue: item.revenue,
            })),
        },
    };
    setCached(cacheKey("categories", req), body);
    res.status(200).json(body);
});

// 4. Top Selling Products (Table)
exports.getTopProducts = catchAsync(async (req, res, next) => {
    const hit = getCached(cacheKey("top-products", req));
    if (hit !== undefined) return res.status(200).json(hit);
    const topProducts = await Order.aggregate([
        { $match: { orderStatus: { $nin: ["cancelled", "refunded"] } } },
        { $unwind: "$items" },
        {
            $group: {
                _id: "$items.product",
                name: { $first: "$items.name" },
                image: { $first: "$items.image" },
                sales: { $sum: "$items.quantity" },
                revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
            },
        },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "productDoc",
            },
        },
        { $unwind: { path: "$productDoc", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                name: 1,
                image: 1,
                sales: 1,
                revenue: 1,
                category: "$productDoc.category", // Need another lookup if we want category name here
                price: "$productDoc.price",
                stock: "$productDoc.stock",
            },
        },
        { $sort: { sales: -1 } },
        { $limit: 5 },
    ]);

    const body = {
        status: "success",
        data: {
            topProducts,
        },
    };
    setCached(cacheKey("top-products", req), body);
    res.status(200).json(body);
});
