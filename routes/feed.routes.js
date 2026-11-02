const express = require("express");
const feedController = require("../controllers/feed.controller");

const router = express.Router();

router.get("/google.xml", feedController.googleFeed);

module.exports = router;
