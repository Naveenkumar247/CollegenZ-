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
  },

    likes: { type: Number, default: 0 },
  likedBy: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "logins" }],
    default: [],
    set: arr => [...new Set(arr.map(id => id.toString()))]
  },

  shares: { type: Number, default: 0 },
  sharedBy: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "logins" }],
    default: [],
    set: arr => [...new Set(arr.map(id => id.toString()))]
  },

  picture: { type: String, default: null }

});

module.exports = primaryDB.model("Featured", postSchema);
