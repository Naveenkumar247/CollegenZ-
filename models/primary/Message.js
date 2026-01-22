const { primaryDB } = require("../../db");
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "logins",
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "logins",
    required: true
  },
  text: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false   // 🔑 IMPORTANT
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = primaryDB.model("messages", messageSchema);
