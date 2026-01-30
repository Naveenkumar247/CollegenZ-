const { primaryDB } = require("../../db");
const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  postType: {
    type: String,
    enum: ["event", "general", "hiring"],
    default: "general"
  },

  username: { type: String, default: null },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "logins", required: true },
  data: String,
  imageurl: [String],
  createdAt: { type: Date, default: Date.now },

  // EVENT FIELDS
  event_title: String,
  event_location: String,
  event_mode: String,
  event_date: Date,
  event_time: String,
  event_contact: String,
  event_link: String,
  event_description: String,

  // HIRING FIELDS
  job_title: String,
  job_location: String,
  job_mode: String,
  job_contact: String,
  job_description: String,
  job_deadline: Date,
  job_link: String,

  status: {
  type: String,
  enum: ["APPROVED", "REJECTED"],
  default: "APPROVED"
},
moderationReason: {
  type: String,
  default: null
},

  saves: { type: Number, default: 0 },
  savedBy: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "logins" }],
    default: [],
    set: arr => [...new Set(arr.map(id => id.toString()))]
  },

  // Common
  userEmail: String,
  picture: { type: String, default: null },
  college: { type: String, default: null },

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
  isFeatured: { type: Boolean, default: false },
featuredOrder: { type: Number, default: 0 },
featuredUntil: { type: Date, default: null },
});

module.exports = primaryDB.model("users", postSchema);
