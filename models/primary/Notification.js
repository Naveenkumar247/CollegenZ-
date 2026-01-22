const { primaryDB } = require("../../db");
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  // Who receives this notification
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "logins",
    required: true
  },

  // Who triggered it (optional)
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "logins",
    default: null
  },

  // WHAT happened (generic)
  type: {
    type: String,
    enum: [
      "FRIEND_REQUEST",
      "FRIEND_ACCEPT",
      "FOLLOW",
      "LIKE",
      "COMMENT",
      "POST",
      "MESSAGE",
      "SYSTEM",
      "ADMIN"
    ],
    required: true
  },

  // Human-readable text
  message: {
    type: String,
    required: true
  },

  // Where to go when clicked
  link: {
    type: String,
    default: null
  },

  // Extra metadata (flexible!)
  meta: {
    type: Object,
    default: {}
  },

  isRead: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = primaryDB.model("notifications", notificationSchema);
