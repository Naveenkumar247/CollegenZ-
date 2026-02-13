const { primaryDB } = require("../../db");
const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({

  postType: {
    type: String,
    enum: ["general", "event", "hiring"],
    required: true
  },

  data: {
    type: String,
    required: true
  },

  imageurl: {
    type: [String],
    required: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "logins"
  },

  username: {
    type: String,
    required: true
  },

  isFeatured: {
    type: Boolean,
    default: false
  },

  featuredOrder: {
    type: Number,
    default: 0
  },

  featuredUntil: {
    type: Date,
    default: null
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

module.exports = primaryDB.model("Featured", postSchema);
