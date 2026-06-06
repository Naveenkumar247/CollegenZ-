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


zrole: {
    type: String,
    enum: ["user", "intern", "mentor"],
    default: "user"
  },

  // ========================================================
  // RESTRUCTURED TO ARRAY FOR PARALLEL INTERNSHIPS
  // ========================================================
  internshipProfiles: [
    {
      companyName: { type: String, default: "CodeAlpha" },
      status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
      startDate: { type: String, default: "09.06.2026" },
      endDate: { type: String, default: "09.07.2026" },
      deadlineDate: { type: String, default: "09.08.2026" },
      progress: { type: Number, default: 50 },
      
      // Specific to Intern context
      noOfTask: { type: Number, default: 4 },
      noOfCompletedTask: { type: Number, default: 2 },
      noOfPendingTask: { type: Number, default: 2 },
      nameOfMentor: { type: String, default: "Amir" },

      // Specific to Mentor context
      noOfStudents: { type: Number, default: 44 },
      noOfTaskAssigned: { type: Number, default: 2 },
      noOfTaskPending: { type: Number, default: 2 }
    }
  ]
});

module.exports = primaryDB.model("logins", userSchema);
