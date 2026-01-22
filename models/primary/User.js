const { primaryDB } = require("../../db");
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, default: null, lowercase: true, trim: true, unique: true },
  age: { type: Number, default: null },
  phone: { type: String, default: null },
  email: { type: String, required: true, unique: true },
  password: { type: String, default: null },

  dob: { type: String, default: null },
  college: { type: String, default: null },
  bio: { type: String, default: null },

  picture: { type: String, default:"https://collegenz.in/uploads/profilepic.jpg" },
  dream: { type: String, default: null },

  googleUser: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },

  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "logins" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "logins" }],


friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "logins" }],
friendRequestsSent: [{ type: mongoose.Schema.Types.ObjectId, ref: "logins" }],
friendRequestsReceived: [{ type: mongoose.Schema.Types.ObjectId, ref: "logins" }],
  accountType: {
  type: String,
  enum: ["public", "personal", "business"],
  default: "public"
},

  likedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Posts", default: [] }],

  savedPosts: [
    {
      postId: { type: mongoose.Schema.Types.ObjectId, ref: "Posts" },
      data: String,
      imageurl: [{ type: String }],
      event_date: Date,
      createdAt: { type: Date, default: Date.now },
      userEmail: String,
    }
  ],
  points: { type: Number, default: 0 },
  learningpath: { type: String, default: null },
  postCount: { type: Number, default: 0 },
  rank: { type: Number, default: () => Math.floor(Math.random() * 10000) },
  totalLikes: { type: Number, default: 0 },
  totalSaves: { type: Number, default: 0 },
  instagram: { type: String, default: null },
linkedin: { type: String, default: null },
youtube: { type: String, default: null },
website: { type: String, default: null },
});


module.exports = primaryDB.model("logins", userSchema);
