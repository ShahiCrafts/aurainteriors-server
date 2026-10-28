const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  _id: String,
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});
module.exports = mongoose.model("RevokedToken", schema);
