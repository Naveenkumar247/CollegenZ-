// models/Session.js
const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "logins",
    required: true
  },
  email: { type: String, required: true },

  username: { type: String, default: null },
  college: { type: String, default: null },

  sessionId: { type: String, required: true },

  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

module.exports = mongoose.model("Session", SessionSchema);
