
require("dotenv").config();
const bcryptjs = require("bcryptjs");
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const LocalStrategy = require("passport-local").Strategy;
const MongoStore = require("connect-mongo");
const multer = require("multer");
const path = require("path");
const app = express();
const router = express.Router();
const cron = require("node-cron");
const nodemailer = require("nodemailer");
const sessionSecret = process.env.SESSION_SECRET;
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);  // ✅ STEP 2
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});
console.log("✅ Socket.io initialized");

const collegenzCertificateRoutes = require("./routes/collegenz.certificate.routes");

cloudinary.config({
  secure: true, // ensures HTTPS
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ dest: "uploads/" });

// ---------- MongoDB Connection ----------
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB!"))
  .catch(err => console.error("❌ MongoDB connection error:", err.message));

// ---------- Express Middleware ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.use('/', express.static('assets'));
app.use(express.static("public"));


// ===============================
// 🔹 SIMPLE TEXT MODERATION
// ===============================
const bannedWords = [
  "porn", "sex", "xxx", "nude", "fuck",
  "boobs", "blowjob", "rape", "adult"
];

function hasBannedText(text = "") {
  return bannedWords.some(word =>
    text.toLowerCase().includes(word)
  );
}
// ===============================
// 🔒 IMAGE CONTENT RULES
// ===============================
const BLOCKED_LABELS = [
  "Swimwear",
  "Bikini",
  "Lingerie",
  "Partial Nudity",
  "Suggestive",
  "Sexualized"
];

const ALLOWED_CONTEXTS = [
  "Classroom",
  "Education",
  "Conference",
  "Seminar",
  "Workshop",
  "Office",
  "Stage",
  "College",
  "University"
];

function isBlockedImage(uploaded, postType) {
  const labels = uploaded.moderation?.[0]?.moderationLabels || [];

  // 1️⃣ Block sexualized labels
  const blocked = labels.find(
    l => BLOCKED_LABELS.includes(l.Name) && l.Confidence >= 60
  );
  if (blocked) return true;

  // 2️⃣ Detect person
  const hasPerson = labels.some(l => l.Name === "Person");

  // 3️⃣ Check valid context
  const hasContext = labels.some(l =>
    ALLOWED_CONTEXTS.includes(l.Name)
  );

  // 4️⃣ Rules
  if (hasPerson && !hasContext) return true;
  if (postType === "general" && hasPerson) return true;

  return false;
}

// ---------- Session Setup ----------
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    ttl: 24 * 60 * 60, // 1 day
  }),
  cookie: { maxAge: 24 * 60 * 60 * 1000, secure: false, httpOnly: true },
}));


app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded"
      });
    }

    // 🔍 CLOUDINARY UPLOAD WITH NSFW MODERATION
     const moderation = uploaded.moderation?.[0];

    // ❌ BLOCK NSFW IMAGES
    const uploaded = await cloudinary.uploader.upload(req.file.path, {
  folder: "users",
  moderation: "aws_rek",
  flags: "no_index"
});

// 🔴 STRONG IMAGE CHECK
if (isBlockedImage(uploaded, "general")) {
  fs.unlinkSync(req.file.path);
  return res.status(400).json({
    success: false,
    type: "CONTENT",
    message: "Non-productive or inappropriate image detected"
  });
}

    // ✅ CLEAN IMAGE → DELETE LOCAL FILE
    fs.unlinkSync(req.file.path);

    // ✅ SUCCESS
    res.json({
      success: true,
      imageUrl: uploaded.secure_url
    });

  } catch (error) {
    console.error("❌ Cloudinary Upload Error:", error);

    // cleanup in case of error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: "Upload failed"
    });
  }
});


// ---------- Passport Setup ----------
app.use(passport.initialize());
app.use(passport.session());

// File upload setup using multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});


function requireLogin(req, res, next) {
  if (!res.locals.currentUser) {
    return res.status(401).json({
      type: "AUTH",
      message: "Login required"
    });
  }
  next();
}


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

// Create Model
const genz = mongoose.model("logins", userSchema);


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
  }
});

const Post = mongoose.model("Users", postSchema);

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

const Notification = mongoose.model("notifications", notificationSchema);

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

const Message = mongoose.model("messages", messageSchema);

// ✅ Optional middleware (JSON-based, SweetAlert friendly)
function requireLogin(req, res, next) {
  if (!res.locals.currentUser) {
    return res.status(401).json({
      success: false,
      type: "AUTH",
      message: "Please login to create a post."
    });
  }
  next();
}

router.post(
  "/submit",
  upload.array("images", 10),
  async (req, res) => {
    try {
      const {
        post_type,
        data,

        // Event fields
        event_title,
        event_location,
        event_mode,
        event_date,
        event_time,
        event_contact,
        event_link,
        event_description,

        // Hiring fields
        job_title,
        job_location,
        job_mode,
        job_contact,
        job_description,
        job_deadline,
        job_link
      } = req.body;

      // ❌ VALIDATION: REQUIRED FIELDS
      if (!post_type || !data) {
        return res.status(400).json({
          success: false,
          type: "VALIDATION",
          message: "Post type and content are required."
        });
      }

      // ❌ TEXT MODERATION (ADULT / NSFW / ABUSE)
      if (hasBannedText(data)) {
        return res.status(400).json({
          success: false,
          type: "CONTENT",
          message: "Your post violates community guidelines."
        });
      }

      // ❌ AUTH CHECK
      const currentUser = res.locals.currentUser;
      if (!currentUser) {
        return res.status(401).json({
          success: false,
          type: "AUTH",
          message: "Please login to create a post."
        });
      }

      const userId = currentUser._id;
      const userEmail = currentUser.email;
      const username = currentUser.username || null;
      const picture = currentUser.picture || null;
      const college = currentUser.college?.trim() || null;

      // ------------------------------
      // 📸 IMAGE UPLOAD (CLOUDINARY)
      // ------------------------------
      let imageurls = [];

      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const uploaded = await cloudinary.uploader.upload(file.path);
          imageurls.push(uploaded.secure_url);
          fs.unlinkSync(file.path);
        }
      }

      // ------------------------------
      // 🧱 BASE POST DATA
      // ------------------------------
      const postData = {
        postType: post_type,
        userId,
        username,
        userEmail,
        picture,
        college,
        data,
        imageurl: imageurls,
        status: "APPROVED" // moderation passed
      };

      // ------------------------------
      // 📅 EVENT POST FIELDS
      // ------------------------------
      if (post_type === "event") {
        Object.assign(postData, {
          event_title: event_title || null,
          event_location: event_location || null,
          event_mode: event_mode || null,
          event_date: event_date || null,
          event_time: event_time || null,
          event_contact: event_contact || null,
          event_link: event_link || null,
          event_description: event_description || null
        });
      }

      // ------------------------------
      // 💼 HIRING POST FIELDS
      // ------------------------------
      if (post_type === "hiring") {
        Object.assign(postData, {
          job_title: job_title || null,
          job_location: job_location || null,
          job_mode: job_mode || null,
          job_contact: job_contact || null,
          job_description: job_description || null,
          job_deadline: job_deadline || null,
          job_link: job_link || null
        });
      }

      // ------------------------------
      // 💾 SAVE POST
      // ------------------------------
      const newPost = new Post(postData);
      await newPost.save();

      await genz.findByIdAndUpdate(userId, {
        $inc: { postCount: 1 }
      });

      console.log(`✔ Post saved successfully (${post_type.toUpperCase()})`);

      // ✅ SUCCESS RESPONSE
      return res.json({
        success: true,
        message: "Post created successfully"
      });

    } catch (err) {
      console.error("✘ Save failed:", err);
      return res.status(500).json({
        success: false,
        type: "SERVER",
        message: "Error saving post. Please try again."
      });
    }
  }
);


io.on("connection", socket => {

  socket.on("joinRoom", room => {
    socket.join(room);
    console.log("Joined room:", room);
  });

  socket.on("sendMessage", async data => {
    console.log("MESSAGE RECEIVED:", data);

    // save to DB
    await Message.create({
      sender: data.sender,
      receiver: data.receiver,
      text: data.text
    });

    // send to both users
    io.to(data.room).emit("newMessage", data);
  });

});

// Routes


app.get("/home",(req,res) => {
    res.sendFile(path.join(__dirname, "home.html"));
});

app.get("/signup", (req, res) => {
    res.sendFile(path.join(__dirname, "sign.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "login.html"));
});
app.get("/upload",(req,res) => {
    res.sendFile(path.join(__dirname, "upload.html"));
});
app.get("/calender",(req,res) => {
    res.sendFile(path.join(__dirname, "calender.html"));
});
app.get("/roadmap",(req,res) => {
    res.sendFile(path.join(__dirname, "roadmap.html"));
});
app.get("/sitemap.xml",(req,res) => {
    res.sendFile(path.join(__dirname, "sitemap.xml"));
});
app.get("/robots.txt",(req,res) => {
    res.sendFile(path.join(__dirname, "robots.txt"));
});
app.get("/share/postId",(req,res) => {
    res.sendFile(path.join(__dirname, "resend.html"));
});
app.get("/aboutus",(req,res) => {
    res.sendFile(path.join(__dirname, "about.html"));
});
app.get("/notifications",(req,res) => {
    res.sendFile(path.join(__dirname, "notify.html"));
});


app.use(async (req, res, next) => {
  if (req.session?.userId) {
    res.locals.currentUser = await genz.findById(req.session.userId);
  } else {
    res.locals.currentUser = null;
  }
  next();
});

async function isFriend(req, res, next) {
  try {
    // 🔒 Check login FIRST
    if (!res.locals.currentUser) {
      console.log("❌ No currentUser in res.locals");
      return res.status(401).send("Please login to chat");
    }

    const userId = res.locals.currentUser._id.toString();
    const friendId = req.params.friendId;

    console.log("👉 Logged-in userId:", userId);
    console.log("👉 Requested friendId:", friendId);

    const user = await genz.findById(userId);

    if (!user) {
      console.log("❌ User not found in DB");
      return res.status(401).send("User not found");
    }

    console.log(
      "👉 Friends in DB:",
      user.friends.map(id => id.toString())
    );

    const isFriend = user.friends.some(
      id => id.toString() === friendId
    );

    console.log("✅ isFriend result:", isFriend);

    if (!isFriend) {
      return res.status(403).send("You can only chat with friends");
    }

    next();
  } catch (err) {
    console.error("🔥 isFriend error:", err);
    res.status(500).send("Server error");
  }
}


app.get("/chat/:friendId", isFriend, (req, res) => {
  res.sendFile(path.join(__dirname, "chat.html"));
});




app.get("/updateOldUsers", async (req, res) => {
  try {
    await genz.updateMany(
      {},
      {
        $set: {
          learningpath: null,
          instagram: null,
          linkedin: null,
          youtube: null,
          website: null,
          accountType: "public"
        }
      }
    );

    // Ensure arrays exist
    await genz.updateMany(
      {
        $or: [
          { friends: { $exists: false } },
          { friendRequestsSent: { $exists: false } },
          { friendRequestsReceived: { $exists: false } }
        ]
      },
      {
        $set: {
          friends: [],
          friendRequestsSent: [],
          friendRequestsReceived: []
        }
      }
    );

    res.send("✅ All old users updated successfully!");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error updating users");
  }
});

// =======================
// Traditional Signup
// =======================
app.post("/signup", async (req, res) => {
  try {
    const { name, username, age, phone, email, password, college, dream } = req.body;

    const lowerEmail = email.toLowerCase();
    const existingUser = await genz.findOne({ email: lowerEmail });

    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists. Try logging in." });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const picture = req.body.picture || null;

    const newUser = new genz({
      name,
      username: username || null,
      age,
      picture,
      phone,
      email: lowerEmail,
      password: hashedPassword,
      dream,
      college: college || null,
      accountType: req.body.accountType || "public"
    });

    await newUser.save();

    req.session.userId = newUser._id;
    req.session.username = newUser.name;
    req.session.email = newUser.email;

    await Session.create({
      name: newUser.name,
      username: newUser.username || "",
      college: newUser.college || "",
      email: newUser.email,
      userId: newUser._id,
      sessionId: req.sessionID,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
    });

    res.json({ success: true, redirectUrl: "/" });

  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ success: false, message: "Server error during signup." });
  }
});

// =======================
// Google Signup using Passport
// =======================

// Step 1: Start Google
  
// =======================
// Create Session (Reusable route)
// =======================
app.post("/create-session", async (req, res) => {
  try {
    const user = await genz.findById(req.session.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const sessionData = await Session.create({
      name: user.name,
      username: user.username || "",
      college: user.college || "",
      email: user.email,
      userId: user._id,
      sessionId: req.sessionID,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000) // 24 hours
    });

    res.json({ message: "Session created", session: sessionData });
  } catch (err) {
    console.error("Session creation error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

const SessionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "logins", required: true },
  email: { type: String, required: true },

  // ❌ required: true  →  ✅ optional
  username: { type: String, default: null },
  college: { type: String, default: null },

  sessionId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date }
});

const Session = mongoose.model("Session", SessionSchema);


router.post("/save/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Please log in first." });
    }

    // Fetch post
    const foundPost = await Post.findById(postId);
    if (!foundPost) {
      return res.status(404).json({ success: false, message: "Post not found." });
    }

    // ❌ Block saving for NON-EVENT posts
    if (foundPost.postType !== "event") {
      return res.json({
        success: false,
        message: "Only event posts can be saved."
      });
    }

    // Fetch user
    const user = await genz.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Prevent duplicates
    const alreadySaved = user.savedPosts.some(
      (p) => p.postId.toString() === foundPost._id.toString()
    );
    if (alreadySaved) {
      return res.json({ success: false, message: "Already saved." });
    }

    // Save EVENT post
    user.savedPosts.push({
      postId: foundPost._id,
      data: foundPost.data,
      imageurl: foundPost.imageurl,
      event_date: foundPost.event_date,
      createdAt: foundPost.createdAt,
      userEmail: foundPost.userEmail
    });

    await user.save();

    res.json({ success: true, message: "Event saved successfully!" });

  } catch (err) {
    console.error("❌ Save failed:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Routes
//app.use("/auth", authRoutes);

app.use(async (req, res, next) => {
  if (req.session.userId) {
    // Fetch the user from the genz collection
    const user = await genz.findById(req.session.userId);

    // Fetch the latest session record for this user (optional)
    const loginSession = await Session.findOne({ userId: req.session.userId }).sort({ createdAt: -1 });

    res.locals.currentUser = user || null;
    res.locals.loginSession = loginSession || null;
  } else {
    res.locals.currentUser = null;
    res.locals.loginSession = null;
  }
  next();
});


app.post("/posts/:id/like", async (req, res) => {
  try {
    const userId = req.body.userId; 
    const postId = req.params.id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    console.log("Like request => userId:", userId, "postId:", postId);
    console.log("Current likes before action:", post.likes);

    const alreadyLiked = post.likedBy.includes(userId);

    if (alreadyLiked) {
      post.likedBy.pull(userId);
      post.likes = post.likes - 1;
      console.log("User unliked. Updated likes:", post.likes);
    } else {
      post.likedBy.push(userId);
      post.likes = post.likes + 1;
      console.log("User liked. Updated likes:", post.likes);
    }

    await post.save();
    console.log("Likes after save:", post.likes);

    res.json({ likes: post.likes, liked: !alreadyLiked });
  } catch (err) {
  
console.error("Like error:", err.message);
    res.status(500).json({ error: err.message });
  }
});


app.post("/posts/:id/save", async (req, res) => {
  try {
    const { userId, email } = req.body;
    const postId = req.params.id;

    // Find user by ID or email (for Google users)
    const user = await genz.findById(userId) || await genz.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    console.log("Save request => user:", user.email, "postId:", postId);

    if (!Array.isArray(user.savedPosts)) user.savedPosts = [];
    if (!Array.isArray(post.savedBy)) post.savedBy = [];

    const alreadySaved = post.savedBy.some(id => id.toString() === user._id.toString());

    if (alreadySaved) {
      post.savedBy = post.savedBy.filter(id => id.toString() !== user._id.toString());
      post.saves = Math.max(0, post.saves - 1);
      user.savedPosts = user.savedPosts.filter(sp => sp.postId.toString() !== postId);
    } else {
      post.savedBy.push(user._id);
      post.saves += 1;
      user.savedPosts.push({
        postId,
        data: post.data,
        imageurl: post.imageurl,
        event_date: post.event_date,
        createdAt: post.createdAt,
        userEmail: post.userEmail,
      });
    }

    user.markModified("savedPosts");
    await user.save();
    await post.save();

    res.json({ saves: post.saves, saved: !alreadySaved });
  } catch (err) {
    console.error("Save error:", err.message);
    res.status(500).json({ error: err.message });
  }
});    

app.post("/posts/:id/share", async (req, res) => {
  try {
    const { userId } = req.body;
    const postId = req.params.id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const alreadyShared = post.sharedBy.some(id => id.toString() === userId);

    if (alreadyShared) {
      // Unshare
      post.sharedBy = post.sharedBy.filter(id => id.toString() !== userId);
      post.shares = Math.max(0, post.shares - 1);
    } else {
      // Share
      post.sharedBy.push(userId);
      post.shares += 1;
    }

    await post.save();

    res.json({
      shared: !alreadyShared,
      shares: post.shares
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//Friend Details

router.post("/friend/request/:userId", async (req, res) => {
  try {
    const senderId = res.locals.currentUser._id;
    const receiverId = req.params.userId;

    if (senderId.equals(receiverId)) {
      return res.status(400).json({ message: "You cannot add yourself" });
    }

    const sender = await genz.findById(senderId);
    const receiver = await genz.findById(receiverId);

    if (!receiver) {
      return res.status(404).json({ message: "User not found" });
    }

    // Already friends
    if (sender.friends.includes(receiverId)) {
      return res.status(400).json({ message: "Already friends" });
    }

    // Request already sent
    if (sender.friendRequestsSent.includes(receiverId)) {
      return res.status(400).json({ message: "Friend request already sent" });
    }

    // Already received request (auto-accept optional)
    if (sender.friendRequestsReceived.includes(receiverId)) {
      return res.status(400).json({ message: "User already sent you a request" });
    }

    sender.friendRequestsSent.push(receiverId);
    receiver.friendRequestsReceived.push(senderId);

    await sender.save();
    await receiver.save();
    
    await Notification.create({
  userId: receiverId,          // who receives notification
  fromUser: senderId,          // who sent request
  type: "FRIEND_REQUEST",
  message: "sent you a friend request",
  meta: {
    senderId
  }
});

    res.json({ success: true, message: "Friend request sent" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/friend/accept/:userId", async (req, res) => {
  try {
    const receiverId = res.locals.currentUser._id;
    const senderId = req.params.userId;

    const receiver = await genz.findById(receiverId);
    const sender = await genz.findById(senderId);

    if (!receiver.friendRequestsReceived.includes(senderId)) {
      return res.status(400).json({ message: "No friend request found" });
    }

    // Add both as friends
    receiver.friends.push(senderId);
    sender.friends.push(receiverId);

    // Remove requests
    receiver.friendRequestsReceived.pull(senderId);
    sender.friendRequestsSent.pull(receiverId);

    await receiver.save();
    await sender.save();
    
    await Notification.deleteMany({
  userId: receiverId,
  fromUser: senderId,
  type: "FRIEND_REQUEST"
});
    res.json({ success: true, message: "Friend request accepted" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/friend/reject/:userId", async (req, res) => {
  try {
    const receiverId = res.locals.currentUser._id;
    const senderId = req.params.userId;

    const receiver = await genz.findById(receiverId);
    const sender = await genz.findById(senderId);

    receiver.friendRequestsReceived.pull(senderId);
    sender.friendRequestsSent.pull(receiverId);

    await receiver.save();
    await sender.save();

    await Notification.deleteMany({
  userId: receiverId,
  fromUser: senderId,
  type: "FRIEND_REQUEST"
});
    res.json({ success: true, message: "Friend request rejected" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/friend/cancel/:userId", async (req, res) => {
  try {
    const senderId = res.locals.currentUser._id;
    const receiverId = req.params.userId;

    const sender = await genz.findById(senderId);
    const receiver = await genz.findById(receiverId);

    sender.friendRequestsSent.pull(receiverId);
    receiver.friendRequestsReceived.pull(senderId);

    await sender.save();
    await receiver.save();

    res.json({ success: true, message: "Friend request cancelled" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/friend/remove/:userId", async (req, res) => {
  try {
    const userId = res.locals.currentUser._id;
    const friendId = req.params.userId;

    const user = await genz.findById(userId);
    const friend = await genz.findById(friendId);

    user.friends.pull(friendId);
    friend.friends.pull(userId);

    await user.save();
    await friend.save();

    res.json({ success: true, message: "Friend removed" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/api/notifications", requireLogin, async (req, res) => {
  const userId = res.locals.currentUser._id;

  const notifications = await Notification.find({ userId })
    .populate("fromUser", "name picture")
    .sort({ createdAt: -1 })
    .limit(30);

  res.json(notifications);
});

router.get("/notifications/count", requireLogin, async (req, res) => {
  const userId = res.locals.currentUser._id;

  const count = await Notification.countDocuments({
    userId,
    isRead: false
  });

  res.json({ count });
});

router.post("/notifications/read/:id", requireLogin, async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, {
    isRead: true
  });

  res.json({ success: true });
});

app.get("/api/user/:id", async (req, res) => {
  try {
    const user = await genz.findById(
      req.params.id,
      "name picture"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to load user" });
  }
});

app.get("/api/me", (req, res) => {
  if (!res.locals.currentUser) {
    return res.status(401).json({ error: "Not logged in" });
  }
  res.json({ id: res.locals.currentUser._id.toString() });
});

router.get("/api/messages/:friendId", async (req, res) => {
  try {
    if (!res.locals.currentUser) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const userId = res.locals.currentUser._id;
    const friendId = req.params.friendId;

    // ✅ mark messages read
    await Message.updateMany(
      {
        sender: friendId,
        receiver: userId,
        isRead: false
      },
      { $set: { isRead: true } }
    );

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: friendId },
        { sender: friendId, receiver: userId }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: "Failed to load messages" });
  }
});

/* ---------------- CERTIFICATE PAGE (IMPORTANT: FIRST) ---------------- */
app.get("/certificate/:code", (req, res) => {
  res.sendFile(
    path.join(__dirname, "views", "collegenz-certificate.html")
  );
});

/* ---------------- API ROUTES ---------------- */
app.use("/api/collegenz/certificate", collegenzCertificateRoutes);



const transporter = nodemailer.createTransport({
  host: "smtp.zoho.in", // ✅ Use this for India data center
  port: 465,
  secure: true, // true for 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


// ✅ Verify transporter setup (optional, for debugging)
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter error:", error);
  } else {
    console.log("✅ Email transporter ready to send messages!");
  }
});

// 🕒 Schedule: every day at 9:00 AM
cron.schedule("0 9 * * *", async () => {
  console.log("🔍 Checking for next-day event reminders...");

  try {
    const users = await genz.find({ "savedPosts.event_date": { $exists: true } });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const start = new Date(tomorrow.setHours(0, 0, 0, 0));
    const end = new Date(tomorrow.setHours(23, 59, 59, 999));

    for (const user of users) {
      for (const post of user.savedPosts) {
        if (post.event_date && post.event_date >= start && post.event_date <= end) {
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: `Reminder: "${post.data}" is happening tomorrow!`,
            text: `Hey ${user.name},\n\nJust a reminder that your saved event "${post.data}" is scheduled for tomorrow (${new Date(post.event_date).toLocaleDateString()}).\n\nStay prepared!\n\n- Team CollegenZ`,
          };

          try {
            await transporter.sendMail(mailOptions);
            console.log(`✅ Reminder sent to ${user.email} for "${post.data}"`);
          } catch (err) {
            console.error(`❌ Failed to send reminder to ${user.email}:`, err.message);
          }
        }
      }
    }
  } catch (err) {
    console.error("❌ Reminder cron job failed:", err.message);
  }
});


router.get("/api/events", async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.json([]);

    const user = await genz.findById(userId);

    // Convert savedPosts → FullCalendar events
    const events = user.savedPosts
  .filter(p => p.event_date)
  .map(p => ({
    title: p.data,
    start: p.event_date.toISOString().split("T")[0], // only date part
    allDay: true,                                   // no time shown
    color: "#228B22",
    url: "/"
  }));

    res.json(events);
  } catch (err) {
    console.error("❌ API events fetch failed:", err.message);
    res.status(500).json([]);
  }
});

router.get("/calender", async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect("/login");

    const user = await genz.findById(userId).populate("savedPosts.postId");

    res.render("calender", { user }); // pass user with savedPosts
  } catch (err) {
    console.error("❌ Calendar fetch failed:", err.message);
    res.status(500).send("Server error");
  }
});


passport.use(
  new LocalStrategy(
    { usernameField: "login", passwordField: "password" },
    async (login, password, done) => {
      try {
        let user;

        // Check if input looks like an email
        if (login.includes("@")) {
          user = await genz.findOne({ email: login.toLowerCase() });
        } else {
          user = await genz.findOne({ username: login });
        }

        // If user not found
        if (!user) {
          return done(null, false, { message: "User not found" });
        }

        // If no password set (for Google users)
        if (!user.password) {
          return done(null, false, { message: "Use Google Sign-In for this account" });
        }

        // Compare passwords
        const isMatch = await bcryptjs.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// =======================
// 🔹 GOOGLE STRATEGY
// =======================
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.NODE_ENV === "production"
          ? "https://collegenz.in/auth/google/callback"
          : "http://localhost:3000/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        let user = await genz.findOne({ email });

        if (!user) {
          const baseName =
            profile.displayName?.replace(/\s+/g, "").toLowerCase() ||
            email.split("@")[0];
          const randomNum = Math.floor(Math.random() * 10000);
          const username = `${baseName}${randomNum}`;

          // 🆕 Create new user for first-time Google login
          user = await genz.create({
            name: profile.displayName,
            email,
            username,
            password: null,
            googleUser: true,
            college:null,
            picture: profile.photos?.[0]?.value || null, // ✅ stores profile photo
            likedPosts: [],
            savedPosts: [],
            dream: "Other",
            accountType: "public"
          });
        } else {
          // 🔁 Update existing Google user info
          user.picture = profile.photos?.[0]?.value || user.picture;
          user.name = profile.displayName || user.name;

          if (!user.username) {
            const baseName =
              profile.displayName?.replace(/\s+/g, "").toLowerCase() ||
              email.split("@")[0];
            const randomNum = Math.floor(Math.random() * 10000);
            user.username = `${baseName}${randomNum}`;
          }

          await user.save();
        }

        return done(null, user);
      } catch (err) {
        console.error("Google auth error:", err);
        return done(err, null);
      }
    }
  )
);

// =======================
// 🔹 SERIALIZATION
// =======================
passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await genz.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});


// Routes
/*router.post("/login", passport.authenticate("local"), (req, res) => {
  res.json({ success: true, redirectUrl: "/view" });
});*/

router.post("/login", (req, res, next) => {
  passport.authenticate("local", async (err, user, info) => {
    if (err) return next(err);
    if (!user)
      return res.status(400).json({
        success: false,
        message: info?.message || "Invalid credentials",
      });

    req.logIn(user, async (err) => {
      if (err) return next(err);

      try {
        // Store session in express-session
        req.session.userId = user._id;
        req.session.username = user.name;
        req.session.email = user.email;

        // Store in session collection
        await Session.create({
          name: user.name,
          username: user.username || "",
          college: user.college || "",
          email: user.email,
          userId: user._id,           // ✔ correct userId reference
          sessionId: req.sessionID,   // express-session ID
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        });

        return res.json({ success: true, redirectUrl: "/" });
      } catch (err) {
        console.error("Login session save error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
      }
    });
  })(req, res, next);
});

router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));


router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup" }),
  (req, res) => {
    req.session.userId = req.user._id; // ✅ store userId in session for profile access
    res.redirect("/");
  }
);

// ----------------------
// Share Script
// ----------------------
app.get("/share-script.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.send(`
    document.addEventListener("click", function(e) {
      const btn = e.target.closest(".share-btn");
      if (!btn) return;

      const postId = btn.getAttribute("data-id");
      const postUrl = "https://collegenz.in/share/" + postId;
      const shareText = "Check out this post on Collegenz! 🌱 " + postUrl;

      if (navigator.share) {
        navigator.share({
          title: "Collegenz Post",
          text: "Check out this post on Collegenz! 🌱",
          url: postUrl
        }).catch(err => console.log("Share canceled:", err));
      } else {
        const popup = document.createElement("div");
        popup.className = "share-popup";
        popup.style = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:15px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.3);z-index:9999;text-align:center;";

        popup.innerHTML =
          '<h5>Share this post</h5>' +
          '<a href="https://wa.me/?text=' + encodeURIComponent(shareText) + '" target="_blank">📱 WhatsApp</a><br>' +
          '<a href="https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(postUrl) + '" target="_blank">💼 LinkedIn</a><br>' +
          '<a href="https://twitter.com/intent/tweet?url=' + encodeURIComponent(postUrl) + '" target="_blank">🐦 Twitter</a><br>' +
          '<a href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(postUrl) + '" target="_blank">📘 Facebook</a><br>' +
          '<button class="close-share btn btn-success btn-sm mt-2">Close</button>';

        document.body.appendChild(popup);
        document.querySelector(".close-share").addEventListener("click", () => popup.remove());
      }
    });
  `);
});


// ----------------------
// API: Fetch Post Data
// ----------------------
app.get("/api/post/:postId", async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (err) {
    console.error("Error fetching post:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// ----------------------
// Share Page (HTML)
// ----------------------
app.get("/share/:postId", (req, res) => {
  res.sendFile(path.join(process.cwd(), "resend.html"));
});

app.delete("/deletepost/:id", async (req, res) => {
  try {
    const postId = req.params.id;

    // Delete post by ID
    const deletedPost = await Post.findByIdAndDelete(postId);

    if (!deletedPost) {
      console.log("❌ Post not found:", postId);
      return res.status(404).json({ message: "Post not found" });
    }

    console.log("✅ Post deleted:", postId);
    res.status(200).json({ message: "Post deleted successfully" });

  } catch (error) {
    console.error("❌ Error deleting post:", error);
    res.status(500).json({ message: "Server error while deleting post" });
  }
});

 
app.get("/profile", async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.redirect("/login");

    const user = await genz.findById(userId);
    if (!user) return res.status(404).send("<h3>User not found</h3>");

    res.send(`
  
           <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">
        <title>${user.name}'s Profile</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

        <style>
          body {
            background: #f8f9fa;
            font-family: 'Poppins', sans-serif;
          }
          .profile-wrapper {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 40px 20px; /* good for mobile + desktop */
  box-sizing: border-box;
}

.profile-container {
  width: 100%;
  max-width: 450px;  /* perfect card width */
  background: white;
  padding: 30px;
  border-radius: 20px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.1);
}
          .profile-img {
            width: 130px;
            height: 130px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid #228B22;
            cursor: pointer;
          }
          .form-control {
            border-radius: 10px;
          }
          .btn-save {
            background: #228B22;
            color: white;
            font-weight: 600;
            border-radius: 10px;
          }
          .btn-save:hover {
            background: #1b6f1b;
          }
          .upload-label {
            cursor: pointer;
            color: #228B22;
            text-decoration: underline;
            font-size: 0.9rem;
          }

    /* Edit button */
    .btn-edit,
    .btn-save {
      background: #228B22;
      color: white;
      font-weight: 600;
      border-radius: 10px;
      padding: 12px;
      width: 100%;
      border: none;
      cursor: pointer;
      margin-top: 15px;
    }

    .btn-edit:hover,
    .btn-save:hover {
      background: #1b6f1b;
    }

    /* Edit section sliding */
    #editSection {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.4s ease;
      margin-top: 20px;
    }

    .edit-input {
      width: 100%;
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid #ddd;
      background: #fafafa;
      font-size: 15px;
    }

    .edit-group {
      margin-bottom: 15px;
    }
      
/* === Sidebar (Default: Desktop layout) === */
.sidebar {
  width: 60px;
  background: #f1f1f1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0;
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  z-index: 2000;
  transition: all 0.3s ease-in-out;
  box-shadow: -2px 0 8px rgba(0,0,0,0.1);
}

.sidebar .icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.2rem;
  margin-top: 2rem;
}

.sidebar img {
  width: 45px;
  height: 45px;
  transition: transform 0.2s ease;
}

/* Slight zoom effect on hover */
.sidebar img:hover {
  transform: scale(1.1);
}
/* === Tablet Size (medium screens) === */
@media (max-width: 992px) {
  .sidebar img {
    width: 45px;
    height: 45px;
  }
}

/* === Mobile Layout: Sidebar becomes bottom nav === */
@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    height: 55px; /* slightly smaller bottom nav */
    flex-direction: row;
    justify-content: center;
    align-items: center;
    bottom: 0;
    top: auto;
    right: 0;
    left: 0;
    background: #f1f1f1;
    border-top: 1px solid #ddd;
    box-shadow: 0 -2px 8px rgba(0,0,0,0.1);
  }

  .sidebar .icon {
    flex-direction: row;
    justify-content: space-around;
    width: 100%;
    gap: 2rem; /* more spacing between icons */
    margin-top: 0;
    padding: 0 0.5rem; /* side padding */
  }

  .sidebar img {
    width: 45px; /* smaller icons for mobile */
    height: 45px;
  }

  header {
    margin-right: 0;
    margin-bottom: 65px; /* space for bottom nav */
    padding: 0.8rem 1rem; /* slightly smaller header*/
  }
}

/* === Extra Small Screens (very small phones) === */
@media (max-width: 480px) {
  .sidebar .icon {
    flex-wrap: wrap; /* allow icons to wrap if too many */
  }

  .sidebar img {
    width: 24px;
    height: 24px;
  }
}
   @media (max-width: 576px) {
    main h2 {
      font-size: 1.4rem;
    }
    main p {
      font-size: 0.9rem;
    }
    main .btn {
      width: 100%;
    }
  }

     .follow-stats h6 {
  font-weight: 600;
  font-size: 1rem;
}

.follow-stats small {
  font-size: 0.75rem;
  color: #777;
}
.social-links a {
  text-decoration: none !important;
  font-size: 24px;
  margin: 0 8px;
  color: #444;
}

.social-links a:hover {
  color: #000;
}

.account-row {
  padding: 15px 0;
  text-align: center; /* CENTER the text */
  border: none !important; /* REMOVE the line */
  margin-top: 10px;
}

.account-row a {
  color: #228B22;
  font-size: 17px;
  font-weight: 500;
  display: inline-block;   /* Keep it centered */
}

#accountTypeMenu {
  display: none;
  flex-direction: column;
  background: #fff;
  border: 1px solid #ddd;
  margin-top: 8px;
  border-radius: 10px;
  overflow: hidden;
}

#accountTypeMenu a {
  display: block;              /* 👈 IMPORTANT */
  padding: 12px 15px;
  text-decoration: none;
  color: black;
  border-bottom: 1px solid #eee;
}

#accountTypeMenu a:last-child {
  border-bottom: none;
}

#accountTypeMenu a:hover {
  background: #f6f6f6;
}

        </style>
      </head>

      <body>
      <div class="profile-wrapper">
        <div class="profile-container text-center">
          <form id="profileForm" enctype="multipart/form-data">
            <div class="mb-3">
              <img id="previewImage" 
     class="profile-img" 
     src="${user.picture ? user.picture : '/uploads/profilepic.jpg'}"  />
              <br>
              <label class="upload-label mt-2">
                Change Photo
                <input type="file" id="picture" name="picture" accept="image/ " style="display:none" onchange="previewProfile(event)">
              </label>
            </div>

            <h4 class="mt-3 mb-1">${user.name || "User"}</h4>
            <p class="text-muted mb-4">${user.email || ""}</p>

        <div class="follow-stats d-flex justify-content-center gap-4 mb-3">
  <div class="text-center">
    <h6 class="m-0">${user.followers?.length || 0}</h6>
    <small class="text-muted">Followers</small>
  </div>

  <div class="text-center">
    <h6 class="m-0">${user.following?.length || 0}</h6>
    <small class="text-muted">Following</small>
  </div>
  <div class="text-center">
    <h6 class="m-0">${user.points?.length || 0}</h6>
    <small class="text-muted">Points</small>
  </div>
</div>

<div class="social-links mt-3">

  ${user.instagram ? `
    <a href="${user.instagram}" target="_blank">
      <img src="/instagram.jpeg" width="28" height="28" style="border-radius:20%;" />
    </a>
  ` : ""}

  ${user.linkedin ? `
    <a href="${user.linkedin}" target="_blank">
      <img src="/linkedin.png" width="28" height="28" style="border-radius:20%;" />
    </a>
  ` : ""}

  ${user.website ? `
    <a href="${user.website}" target="_blank">
      <img src="/website.png" width="28" height="28" style="border-radius:50%;" />
    </a>
  ` : ""}

  ${user.youtube ? `
    <a href="${user.youtube}" target="_blank">
      <img src="/youtube.jpg" width="28" height="28" style="border-radius:10%;" />
    </a>
  ` : ""}

</div>
            
      <!-- Edit Button -->
      <button type="button" class="btn-edit" onclick="toggleEdit()">✏️ Edit Profile</button>

     <!-- ACCOUNT TYPE SINGLE ROW -->
<div class="account-row">
  <a href="#" onclick="openAccountTypeMenu(event)">
    <span id="selectedAccountType">
      ${(user.accountType || "public").charAt(0).toUpperCase() +
        (user.accountType || "public").slice(1)} account ⌄
    </span>
  </a>
</div>

<div id="accountTypeMenu" class="account-menu">
  <a onclick="chooseAccountType('personal')">Personal account</a>
  <a onclick="chooseAccountType('public')">Public account</a>
  <a onclick="chooseAccountType('business')">Business account</a>
</div>

<!-- ✔ Default should match schema default: PUBLIC -->
<input type="hidden" name="accountType" id="accountType" value="${user.accountType || 'public'}">

      <!-- EDIT SECTION (Hidden initially) -->
      <div id="editSection">
      

        <div class="edit-group">
          <input class="edit-input" id="username" name="username" 
                 value="${user.username || ''}" placeholder="Username">
        </div>

        <div class="edit-group">
          <input class="edit-input" id="phone" name="phone"
                 value="${user.phone || ''}" placeholder="Phone">
        </div>

        <div class="edit-group">
          <input class="edit-input" type="date" id="dob" name="dob"
                 value="${user.dob || ''}" placeholder="Date of Birth" >
        </div>

        <div class="edit-group">
          <input class="edit-input" id="college" name="college"
                 value="${user.college || ''}" placeholder="College">
        </div>

        <div class="edit-group">
          <input class="edit-input" id="dream" name="dream"
                 value="${user.dream || ''}" placeholder="Your dream">
        </div>

        <div class="edit-group">
          <textarea class="edit-input" id="bio" name="bio" rows="3"
                    placeholder="Write something...">${user.bio || ''}</textarea>
        </div>
        <div class="edit-group">
        <input class="edit-input" id="instagram" name="instagram"
         value="${user.instagram || ''}" placeholder="Instagram URL">
        </div>

        <div class="edit-group">
          <input class="edit-input" id="linkedin" name="linkedin"
         value="${user.linkedin || ''}" placeholder="LinkedIn URL">
        </div>

        <div class="edit-group">
          <input class="edit-input" id="youtube" name="youtube"
         value="${user.youtube || ''}" placeholder="Youtube URL">
        </div>

        <div class="edit-group">
  <input class="edit-input" id="website" name="website"
         value="${user.website || ''}" placeholder="Your Website URL (https://...)">
</div>

        <button type="button" class="btn-save" onclick="saveProfile()">💾 Save Changes</button>

      </div>
          </form>
        </div>
</div>
        <div class="sidebar">
          <div class="icon">
            <a href="/"><img src="/uploads/home.png" alt="Home"></a>
            <a href="/profile"><img src="/uploads/settings.png" alt="Settings"></a>
            <a href="/friends"><img src="/chaticon.png" alt="post"></a>
            <a href="/calender"><img src="/uploads/calender.png" alt="Calendar"></a>
          </div>
        </div>

      <script>

  // ========== PROFILE IMAGE PREVIEW ==========
  function previewProfile(event) {
    const reader = new FileReader();
    reader.onload = () => {
      document.getElementById('previewImage').src = reader.result;
    };
    reader.readAsDataURL(event.target.files[0]);
  }

  // ========== EDIT SECTION TOGGLE ==========
  function toggleEdit() {
    const section = document.getElementById('editSection');

    if (section.classList.contains("open")) {
      section.style.maxHeight = "0px";
      section.classList.remove("open");
    } else {
      section.style.maxHeight = section.scrollHeight + "px";
      section.classList.add("open");
    }
  }

  // ========== SAVE PROFILE + CLOSE EDIT SECTION ==========
  async function saveProfile() {
    const formData = new FormData(document.getElementById('profileForm'));

    try {
      const res = await axios.post('/updateProfile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('✅ ' + res.data.message);

      const section = document.getElementById("editSection");
      section.style.maxHeight = "0px";
      section.classList.remove("open");

    } catch (err) {
      console.error(err);
      alert('❌ Failed to update profile');
    }
  }

  // ========== ACCOUNT TYPE MENU (Instagram Style) ==========
function openAccountTypeMenu(event) {
  event.preventDefault();
  document.getElementById("accountTypeMenu").style.display = "block";
}

async function chooseAccountType(type) {
  // Update UI immediately
  document.getElementById("accountType").value = type;
  document.getElementById("selectedAccountType").innerText =
    type.charAt(0).toUpperCase() + type.slice(1) + " account";

  document.getElementById("accountTypeMenu").style.display = "none";

  // 🔥 AUTO-SAVE ACCOUNT TYPE
  const formData = new FormData();
  formData.append("accountType", type);

  try {
    await axios.post("/updateProfile", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });

    console.log("Account type updated successfully");
  } catch (err) {
    alert("❌ Failed to update account type");
    console.error(err);
  }
}

  // ========== LOAD SAVED TYPE ON STARTUP ==========
  window.addEventListener("DOMContentLoaded", () => {
    const savedType = document.getElementById("accountType").value || "personal";

    document.getElementById("selectedAccountType").innerText =
      savedType.charAt(0).toUpperCase() + savedType.slice(1) + " account";
  });

</script>
      </body>
      </html>
 
       
    `);
  } catch (err) {
    console.error("Error loading profile:", err);
    res.status(500).send("Server Error");
  }
});


app.post("/updateProfile", upload.single("picture"), async (req, res) => {
  const userId = req.session?.userId;
  if (!userId) return res.status(401).json({ error: "Not logged in" });

  try {
    let { phone, username, dob, dream, college, bio, instagram, linkedin, youtube, website, accountType} = req.body;
    let pictureUrl = null;

    // ----- 1️⃣ Make username lowercase + trim -----
    if (username) {
      username = username.toLowerCase().trim();
    }

    // ----- 2️⃣ Check if username already exists -----
    if (username) {
      const existingUser = await genz.findOne({
        username: username,
        _id: { $ne: userId }, // Exclude current user
      });

      if (existingUser) {
        return res.status(400).json({
          error: "Username already taken, choose another",
        });
      }
    }

    // ----- 3️⃣ Upload Image to Cloudinary -----
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path);
        pictureUrl = result.secure_url;
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error("Cloudinary upload error:", err);
      }
    }

    // ----- 4️⃣ Prepare update fields -----  
    const updateFields = {
      phone,
      username,
      dob,
      dream,
      college,
      bio,
      instagram,
      linkedin,
      youtube,
      website,
      accountType
    };

    if (pictureUrl) updateFields.picture = pictureUrl;

    // ----- 5️⃣ Update User -----
    const updatedUser = await genz.findByIdAndUpdate(
      userId,
      updateFields,
      { new: true }
    );

    // ----- 6️⃣ Sync Post Data -----
    await Post.updateMany(
      { userId: userId },
      {
        username: updatedUser.username,
        college: updatedUser.college,
        picture: updatedUser.picture,
      }
    );

    res.json({ success: true, message: "Profile & posts updated successfully" });

  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


app.get("/get-profile/:id", async (req, res) => {
  try {
    const profileUserId = req.params.id;
    const currentUserId = res.locals.currentUser?._id;

    const profileUser = await genz.findById(profileUserId)
      .select("-password"); // optional security

    if (!profileUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Default relationship state
    let relationship = {
      isFriend: false,
      requestSent: false,
      requestReceived: false
    };

    // If logged in → compute relationship
    if (currentUserId) {
      const currentUser = await genz.findById(currentUserId);

      relationship.isFriend =
        currentUser.friends?.some(id => id.equals(profileUserId));

      relationship.requestSent =
        currentUser.friendRequestsSent?.some(id => id.equals(profileUserId));

      relationship.requestReceived =
        currentUser.friendRequestsReceived?.some(id => id.equals(profileUserId));
    }

    res.json({
      ...profileUser.toObject(),
      relationship
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


app.get("/friends", async (req, res) => {
  const currentUser = res.locals.currentUser;
  if (!currentUser) return res.redirect("/login");

  // 1️⃣ Fetch friends basic info
  const friends = await genz.find(
    { _id: { $in: currentUser.friends } },
    "name picture"
  ).lean();

  // 2️⃣ Fetch last messages + unread counts
  for (let f of friends) {
    const lastMsg = await Message.findOne({
      $or: [
        { sender: currentUser._id, receiver: f._id },
        { sender: f._id, receiver: currentUser._id }
      ]
    }).sort({ createdAt: -1 });

    f.lastMessage = lastMsg?.text || "Tap to start chatting";
    f.lastMessageAt = lastMsg?.createdAt || null;

    f.unreadCount = await Message.countDocuments({
      sender: f._id,
      receiver: currentUser._id,
      isRead: { $ne: true }   // safe even if isRead not yet added
    });

    // UI-ready (you can wire socket later)
    f.isOnline = false;
  }

  let html = `
<!DOCTYPE html>
<html>
<head>
  <title>Chats</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <style>
    body {
      margin: 0;
      font-family: system-ui, sans-serif;
      background: #f8f9fa;
      color: #222;
    }

    .top {
      background: #228B22;
      color: white;
      padding: 14px;
      font-size: 18px;
      font-weight: 600;
    }

    .chat-list {
      background: #fff;
    }

    .chat-row {
      display: flex;
      gap: 12px;
      padding: 14px;
      text-decoration: none;
      color: #222;
      border-bottom: 1px solid #eee;
      align-items: center;
    }

    .chat-row:hover {
      background: #f4fdf4;
    }

    .avatar {
      position: relative;
    }

    .avatar img {
      width: 44px;
      height: 44px;
      border-radius: 50%;
    }

    .online-dot {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 10px;
      height: 10px;
      background: #228B22;
      border-radius: 50%;
      border: 2px solid #fff;
    }

    .chat-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .chat-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .chat-name {
      font-weight: 600;
      font-size: 15px;
    }

    .chat-time {
      font-size: 12px;
      color: #777;
    }

    .chat-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .chat-preview {
      font-size: 13px;
      color: #666;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 220px;
    }

    .unread-badge {
      background: #228B22;
      color: white;
      font-size: 11px;
      font-weight: 600;
      min-width: 18px;
      height: 18px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty {
      padding: 20px;
      text-align: center;
      color: #777;
    }

        /* === Sidebar (Default: Desktop layout) === */
.sidebar {
  width: 60px;
  background: #f1f1f1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0;
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  z-index: 2000;
  transition: all 0.3s ease-in-out;
  box-shadow: -2px 0 8px rgba(0,0,0,0.1);
}

.sidebar .icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.2rem;
  margin-top: 2rem;
}

.sidebar img {
  width: 45px;
  height: 45px;
  transition: transform 0.2s ease;
}

/* Slight zoom effect on hover */
.sidebar img:hover {
  transform: scale(1.1);
}
/* === Tablet Size (medium screens) === */
@media (max-width: 992px) {
  .sidebar img {
    width: 45px;
    height: 45px;
  }
}

/* === Mobile Layout: Sidebar becomes bottom nav === */
@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    height: 35px; /* slightly smaller bottom nav */
    flex-direction: row;
    justify-content: center;
    align-items: center;
    bottom: 0;
    top: auto;
    right: 0;
    left: 0;
    background: #f1f1f1;
    border-top: 1px solid #ddd;
    box-shadow: 0 -2px 8px rgba(0,0,0,0.1);
  }

  .sidebar .icon {
    flex-direction: row;
    justify-content: space-around;
    width: 100%;
    gap: 2rem; /* more spacing between icons */
    margin-top: 0;
    padding: 0 0.5rem; /* side padding */
  }

  .sidebar img {
    width: 45px; /* smaller icons for mobile */
    height: 45px;
  }

  header {
    margin-right: 0;
    margin-bottom: 65px; /* space for bottom nav */
    padding: 0.8rem 1rem; /* slightly smaller header*/
  }
}

/* === Extra Small Screens (very small phones) === */
@media (max-width: 480px) {
  .sidebar .icon {
    flex-wrap: wrap; /* allow icons to wrap if too many */
  }

  .sidebar img {
    width: 24px;
    height: 24px;
  }
}
   @media (max-width: 576px) {
    main h2 {
      font-size: 1.4rem;
    }
    main p {
      font-size: 0.9rem;
    }
    main .btn {
      width: 100%;
    }
  }
  </style>
</head>

<body>

  <div class="top">Chats</div>

  <div class="chat-list">
    ${
      friends.length === 0
        ? `<div class="empty">No friends yet</div>`
        : friends.map(f => `
            <a href="/chat/${f._id}" class="chat-row">
              <div class="avatar">
                <img src="${f.picture || '/uploads/profilepic.jpg'}">
                ${f.isOnline ? `<span class="online-dot"></span>` : ""}
              </div>

              <div class="chat-info">
                <div class="chat-top">
                  <span class="chat-name">${f.name}</span>
                  <span class="chat-time">
                    ${f.lastMessageAt ? new Date(f.lastMessageAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ""}
                  </span>
                </div>

                <div class="chat-bottom">
                  <span class="chat-preview">${f.lastMessage}</span>
                  ${
                    f.unreadCount > 0
                      ? `<span class="unread-badge">${f.unreadCount}</span>`
                      : ""
                  }
                </div>
              </div>
            </a>
          `).join("")
    }
  </div>
<div class="sidebar">
  <div class="icon">
    <a href="/"><img src="/uploads/home.png" alt="Home" ></a>
    <a href="/profile"><img src="/uploads/settings.png" alt="Settings" ></a>
    <a href="/friends"><img src="/chaticon.png" alt="post"></a>
    <a href="/calender"><img src="/uploads/calender.png" alt="Calendar" ></a>
  </div>
</div>
</body>
</html>
`;

  res.send(html);
});


app.post("/follow/:targetId", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const currentUserId = req.session.userId;
    const targetId = req.params.targetId;

    const user = await genz.findById(currentUserId);
    const target = await genz.findById(targetId);

    if (!user || !target) {
      return res.status(404).json({ error: "User not found" });
    }

    const isFollowing = user.following.includes(targetId);

    if (isFollowing) {
      user.following.pull(targetId);
      target.followers.pull(currentUserId);
    } else {
      user.following.push(targetId);
      target.followers.push(currentUserId);
    }

    await user.save();
    await target.save();

    res.json({ following: !isFollowing });

  } catch (err) {
    console.error("FOLLOW ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/follow-status/:targetId", async (req, res) => {
  if (!req.session.userId) {
    return res.json({ following: false });
  }

  const currentUser = await genz.findById(req.session.userId);
  const targetId = req.params.targetId;

  const following = currentUser.following.includes(targetId);

  res.json({ following });
});

app.get("/posts/filter", async (req, res) => {
  try {
    const { type } = req.query;

    let post;

    if (type === "event") {
      // 1️⃣ Get event posts first
      const events = await Post.find({ postType: "event" }).sort({ createdAt: -1 });

      // 2️⃣ Then get all other posts
      const others = await Post.find({ postType: { $ne: "event" } }).sort({ createdAt: -1 });

      // merge them → event first
      post = [...events, ...others];

      return res.json(post);
    }

    if (type === "hiring") {
      const hiring = await Post.find({ postType: "hiring" }).sort({ createdAt: -1 });
      const others = await Post.find({ postType: { $ne: "hiring" } }).sort({ createdAt: -1 });
      post = [...hiring, ...others];
      return res.json(post);
    }

    if (type === "recent") {
      post = await Post.find().sort({ createdAt: -1 });
      return res.json(post);
    }

    // Default (all posts)
    post = await Post.find().sort({ createdAt: -1 });
    res.json(post);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


// Protected Route
app.get("/dashboard", (req, res) => {
  if (!req.user) {
    return res.status(401).send("Unauthorized. Please log in.");
  }
  res.send(`Welcome ${req.user.email}`);
});

// Logout
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

//Bit blocking disable
app.use((req, res, next) => {
  const ua = req.headers["user-agent"] || "";

  // Allow Googlebot
  if (ua.includes("Googlebot")) return next();

  // Allow universal crawlers
  if (ua.match(/bot|crawl|spider|slurp|bing/i)) return next();

  next();
});

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(`User-agent: *
Allow: /

Sitemap: https://collegenz.in/sitemap.xml`);
});


app.get("/", async (req, res) => {

try {

    const { filter } = req.query;
    let posts;

    // EVENT FILTER → events first, others next
    if (filter === "event") {
      const events = await Post.find({ postType: "event" }).sort({ createdAt: -1 });
      const others = await Post.find({ postType: { $ne: "event" } }).sort({ createdAt: -1 });
      posts = [...events, ...others];
    }

    // HIRING FILTER → hiring first, others next
    else if (filter === "hiring") {
      const hiring = await Post.find({ postType: "hiring" }).sort({ createdAt: -1 });
      const others = await Post.find({ postType: { $ne: "hiring" } }).sort({ createdAt: -1 });
      posts = [...hiring, ...others];
    }

    // GENERAL FILTER → only general posts
    else if (filter === "general") {
      posts = await Post.find({ postType: "general" }).sort({ createdAt: -1 });
    }

    // LOST & FOUND FILTER
    else if (filter === "lostfound") {
      posts = await Post.find({ postType: "lostfound" }).sort({ createdAt: -1 });
    }

    // CONFESSION FILTER
    else if (filter === "confession") {
      posts = await Post.find({ postType: "confession" }).sort({ createdAt: -1 });
    }

    // RECENT FILTER → latest posts first
    else if (filter === "recent") {
      posts = await Post.find().sort({ createdAt: -1 });
    }

    // DEFAULT → all posts
    else {
      posts = await Post.find().sort({ createdAt: -1 });
    }

   
// ✅ Detect current login status

const currentUser = res.locals.currentUser ?? null;     // User info if logged in
const currentUserId = currentUser ? currentUser._id.toString() : null;
const loginSession = res.locals.loginSession ?? null;   // Session info if logged in
const isLoggedIn = Boolean(currentUser);                // true if logged in
const friendIds = currentUser
  ? currentUser.friends.map(id => id.toString())
  : [];
let friendsList = [];

if (currentUser && friendIds.length > 0) {
  friendsList = await genz.find(
    { _id: { $in: friendIds } },
    "name picture"
  );
}
const updatedPosts = posts.map((p) => {
  const postUserId = p.userId?.toString();

  return {
    ...p.toObject(),

    isFollowing: currentUser
      ? currentUser.following
          .map(id => id.toString())
          .includes(postUserId)
      : false,

    isFriend: currentUser
      ? friendIds.includes(postUserId)
      : false
  };
});


    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CollegenZ</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Open+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">


<link rel="icon" type="image/png" href="/favicon.png" sizes="32x32" />
<link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="shortcut icon" href="/favicon.ico" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<meta name="apple-mobile-web-app-title" content="CollegenZ" />
<link rel="manifest" href="/site.webmanifest" />

  <!-- ✅ SEO Meta Tags -->
  <meta name="description" content="CollegenZ is an AI-powered student platform that simplifies the college search process, helping learners connect, explore courses, compare institutions, and unlock opportunities across the globe.">
  <meta name="keywords" content="CollegenZ, college platform, student community, AI education,internship,education,events,hackathon,course,startup">
  <link rel="canonical" href="https://collegenz.in/">


  <!-- Open Graph -->
  <meta property="og:title" content="CollegenZ – AI-Powered College Platform">
  <meta property="og:description" content="Discover colleges, events, hackathons and opportunities powered by AI.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://collegenz.in/">
  <meta property="og:image" content="https://collegenz.in/logo.png">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="CollegenZ – AI-Powered College Platform">
  <meta name="twitter:description" content="Explore colleges, hackathons, events and opportunities with CollegenZ.">
  <meta name="twitter:image" content="https://collegenz.in/logo.png">

  <!-- ✅ Organization Schema (Required for Logo in Google Search) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "CollegenZ",
    "url": "https://collegenz.in",
    "logo": "https://collegenz.in/collegenzlogo.png",
    "sameAs": [
      "https://www.instagram.com/collegenz_in",
      "https://www.linkedin.com/company/collegenz"
    ],
    "description": "AI-powered platform for students to explore colleges, events, courses and hackathons."
  }
  </script>

  <!-- ✅ Sitelinks SearchBox (Helps Google show search bar under your website) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "url": "https://collegenz.in/",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://collegenz.in/search?q={search_term}",
      "query-input": "required name=search_term"
    }
  }
  </script>

  <!-- ✅ FAQ Schema (Rich Result Booster) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is CollegenZ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "CollegenZ is an AI-powered platform helping students explore colleges, events, hackathons, courses and opportunities worldwide."
        }
      },
      {
        "@type": "Question",
        "name": "Is CollegenZ free to use?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, CollegenZ is completely free for students."
        }
      }
    ]
  }
  </script>

  <!-- Optional: Breadcrumb Schema (Google likes this) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://collegenz.in/"
      }
    ]
  }
  </script>


  <style>
body {
  padding-bottom: 80px; /* adjust based on navbar height */
}

/* === Header === */
header {
  background: linear-gradient(135deg, #228B22, #006400);
  color: white;
  padding: 1rem 1.2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: fixed; /* changed from sticky to fixed */
  top: 0;
  left: 0;
  right: 0;
  z-index: 1100;
  margin-right: 60px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.common-btn {
  width: 100%;           /* full width on mobile */
  display: block;
  text-align: center;
  text-decoration: none;
  background: #228B22;
  color: white;
  padding: 5px;
  border: none;
  font-size: 18px;
  border-radius: 8px;
  margin-top: 15px;
  cursor: pointer;
}

/* Desktop and large screens */
@media (min-width: 768px) {
  .common-btn {
    width: auto;        /* shrink to content size */
    display: inline-block;
    padding-left: 5px;
    padding-right: 5px;
  }
}

/* Optional: Even better styling for large desktops */
@media (min-width: 1024px) {
  .common-btn {
    max-width: 300px;   /* or any size you prefer */
  }
}

/*welcome container*/
.font-style {
  font-family: inter, sans-serif;
}

.filter-bar {
  position: fixed;
  top: 70px; /* under header */
  left: 0;
  right: 0;
  z-index: 1000;
  background: white;
  padding: 8px 10px;
  display: flex;
  gap: 10px;
  overflow-x: auto;
  border-bottom: 1px solid #ddd;

  /* animation */
  transition: transform 0.35s ease, opacity 0.35s ease;
}

/* hide scrollbar */
.filter-bar::-webkit-scrollbar {
  display: none;
}

/* hidden default */
.hidden-bar {
  transform: translateY(-100%);
  opacity: 0;
  pointer-events: none;
}

/* visible */
.visible-bar {
  transform: translateY(0);
  opacity: 1;
  pointer-events: auto;
}

/* Filter Buttons */
.filter-btn {
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid #ccc;
  background: #f5f5f5;
  cursor: pointer;
  font-size: 14px;
}

.filter-btn.active {
  background: #0b8e33;
  color: white;
  border-color: #0b8e33;
}

/* ===========================
   MAIN CONTENT PUSH DOWN
=========================== */
main {
  padding-top: 100px;
}

.logo-link {
  font-family: 'Poppins', sans-serif;
  color: white;
  text-decoration: none;
  transition: 0.3s;
}

.logo-link:hover {
  opacity: 0.8;
}
/* === Sidebar (Default: Desktop layout) === */
.sidebar {
  width: 60px;
  background: #f1f1f1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0;
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  z-index: 2000;
  transition: all 0.3s ease-in-out;
  box-shadow: -2px 0 8px rgba(0,0,0,0.1);
}

.sidebar .icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.2rem;
  margin-top: 2rem;
}

.sidebar img {
  width: 45px;
  height: 45px;
  transition: transform 0.2s ease;
}

/* Slight zoom effect on hover */
.sidebar img:hover {
  transform: scale(1.1);
}

.share-popup {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
  padding: 15px;
  text-align: center;
  z-index: 9999;
  width: 90%;
  max-width: 300px;
}
.share-popup h5 {
  margin-bottom: 10px;
  color: #228B22;
  font-weight: bold;
}
.share-popup a {
  display: block;
  margin: 5px 0;
  color: #000;
  text-decoration: none;
}
.share-popup button {
  background: #228B22;
  color: #fff;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  margin-top: 8px;
}

/* === Tablet Size (medium screens) === */
@media (max-width: 992px) {
  .sidebar img {
    width: 45px;
    height: 45px;
  }
}

/* === Mobile Layout: Sidebar becomes bottom nav === */
@media (max-width: 768px) {
  .sidebar {
    width: 100%;
    height: 55px; /* slightly smaller bottom nav */
    flex-direction: row;
    justify-content: center;
    align-items: center;
    bottom: 0;
    top: auto;
    right: 0;
    left: 0;
    background: #f1f1f1;
    border-top: 1px solid #ddd;
    box-shadow: 0 -2px 8px rgba(0,0,0,0.1);
  }

  .sidebar .icon {
    flex-direction: row;
    justify-content: space-around;
    width: 100%;
    gap: 2rem; /* more spacing between icons */
    margin-top: 0;
    padding: 0 0.5rem; /* side padding */
  }

  .sidebar img {
    width: 45px; /* smaller icons for mobile */
    height: 45px;
  }

  header {
    margin-right: 0;
    margin-bottom: 65px; /* space for bottom nav */
    padding: 0.8rem 1rem; /* slightly smaller header*/ 
  }
}

/* === Extra Small Screens (very small phones) === */
@media (max-width: 480px) {
  .sidebar .icon {
    flex-wrap: wrap; /* allow icons to wrap if too many */
  }

  .sidebar img {
    width: 24px;
    height: 24px;
  }
}
   @media (max-width: 576px) {
    main h2 {
      font-size: 1.4rem;
    }
    main p {
      font-size: 0.9rem;
    }
    main .btn {
      width: 100%;
    }
  }

/* Hamburger icon */
.hamburger {
  font-size: 28px;
  cursor: pointer;
  color: white;
  display: block;
}

/* Slide-in Navbar */
.slide-nav {
  position: fixed;
  top: 0;
  right: -260px; /* hidden initially */
  width: 240px;
  height: 100vh;
  background-color: #ffffff;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.15);
  border-left: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  padding-top: 70px;
  transition: right 0.35s ease-in-out;
  z-index: 800;
}

.slide-nav a {
  padding: 14px 24px;
  text-decoration: none;
  color: #228B22;
  font-weight: 600;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.3s;
}

.slide-nav a:hover {
  background-color: #f6f6f6;
}

/* Active state (visible) */
.slide-nav.active {
  right: 0;
}

/* Overlay for mobile */
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.15); /* ✏️ make it lighter */
  display: none;
  z-index: 700; /* ✏️ lower than navbar */
}

.overlay.active {
  display: block;
}

/* Optional: Hide hamburger on large desktop if not needed */
@media (min-width: 992px) {
  .hamburger {
    display: block;
  }
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: center;    
  text-align: center;     
  padding: 10px 0;
  margin-bottom: 10px;
}

.user-info .profile-pic {
  width: 120px;
  height: 120px;
  border-radius: 50%;         /* Circle shape */
  border: 2px solid #228B22;  /* Green border */
  object-fit: cover;          /* Fit the image */
  margin-bottom: 10px;        /* Space below image */
}

.user-info h3 {
  margin: 4px 0;
  font-size: 18px;
  color: #228B22;
}

.user-info p {
  font-size: 14px;
  color: #666;
  margin: 0;
}
.profile-pic {
  width: 120px;
  height: 120px;
  border-radius: 50%;      /* makes it circular */
  object-fit: cover;       /* ensures it fits perfectly */
}


.postuser-info .postprofile-pic {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.user-details {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start !important;
  text-align: left !important;
}

.user-details strong {
  font-size: 1rem;
  color: #000;
  margin:0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.user-details p {
  font-size: 0.55rem;
  color: gray;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.post-caption {
    margin: 0 !important;
    padding: 0 !important;
    display: block;
}

.post-caption * {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
}

.post-caption {
    line-height: 0 !important;
}
.post-caption table {
    line-height: 1.4 !important;
}

.see-more-btn {
  color: #007bff;
  cursor: pointer;
  font-weight: 500;
  border: none;
  background: none;
}

.post-options {
    margin-left: auto;     /* Pushes dots all the way right */
    position: relative;
    top: 0;
    left: 0;
}


/* Hover (desktop only applies) */
.follow-btn:hover {
    background: #0069d9;
}


.follow-btn:active {
    transform: scale(0.96);     /* Click effect */
}

.following-btn {
    background: #e5e5e5;        /* Grey for following */
    color: #333;
}


.postuser-info {
    display: flex;
    align-items: center;
    justify-content: space-between; 
    width: 100%;
    gap: 10px;
}

.follow-container {
    display: flex;
    justify-content: flex-end; /* keep button right inside this div */
    width: auto;
    padding-left:50px;              /* auto size */
}

.postprofile-pic {
    width: 45px;
    height: 45px;
    border-radius: 50%;
    object-fit: cover;
}

.user-details {
    display: flex;
    flex-direction: column;
    margin-left: 8px;
    flex-grow: 1;        /* username stays left */
}

.follow-btn {
    width: 90px;
    padding: 6px 12px;
    font-size: 14px;
    border-radius: 8px;
    white-space: nowrap;
    border: 1px solid #228B22;
    cursor: pointer;
    transition: 0.2s;
    
    /* Default (not following) */
    background: #228B22;
    color: white;
}

/* After following */
.following {
    background: white;
    color: #228B22;
}

@media (max-width: 450px) {
    button.follow-btn {
        width: 70px;
        font-size: 12px;
        padding: 5px 8px;
    }
}

.details-caption {
    margin: 0 !important;
    padding: 0 !important;
}

.details-caption > *:not(table) {
    line-height: normal !important;
}


.details-caption table {
    line-height: 1.3 !important; /* restore readable table */
    margin: 0 !important;
}

.general-caption {
    margin-top: 8px !important;
    margin-bottom: 8px !important;
    line-height: 1.4 !important;
    padding: 0 5px !important;
}


.details-box {
    margin: 0 !important;
    padding: 0 !important;
}


.event-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background-color: #228B22; /* green */
  color: white;            /* text + star are white */
  padding: 3px 10px;
  font-size: 0.65rem;
  font-weight: 700;
  border-radius: 14px;     /* smooth round */
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  letter-spacing: 0.3px;
}

.hiring-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background-color: #228B22; /* green */
  color: white;            /* text + star are white */
  padding: 3px 10px;
  font-size: 0.65rem;
  font-weight: 700;
  border-radius: 14px;     /* smooth round */
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  letter-spacing: 0.3px;
}

.details-table th {
  width: 120px;
  font-weight: 600;
}

.view-btn-container {
    text-align: center;
    margin-top: 6px;
    margin-bottom: 6px;
}

.view-btn {
    background: none;
    border: none;
    color: #007bff;
    font-weight: 600;
    font-size: 15px;
}

.details-table {
    margin: 0 !important;
}

/* Remove border under first row when hidden */
.details-table tr:first-child td,
.details-table tr:first-child th {
    border-bottom: none !important;
}

/* When expanded -> restore border */
.details-expanded tr:first-child td,
.details-expanded tr:first-child th {
    border-bottom: 1px solid #dee2e6 !important;
}

.details-table th,
.details-table td {
    padding: 6px 4px !important;
}

.view-btn:hover {
  text-decoration: underline;
}

.profile-popup {
  display: none;
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.4);
  justify-content: center;
  align-items: center;
  z-index: 5000;
}

.profile-popup-content {
  background: #fff;
  width: 90%;
  max-width: 350px;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}

.close-popup {
  float: right;
  cursor: pointer;
  font-size: 22px;
}

.nav-notification {
  margin-left:12px; 
  position: relative;
  cursor: pointer;
}

.nav-notification i {
  font-size: 22px;
  color: #fff;
}

.notif-badge {
  position: absolute;
  top: -6px;
  right: -8px;
  background: #fff;
  color: #228B22;
  font-size: 11px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 50%;
  min-width: 18px;
  text-align: center;
}

.notif-dropdown {
  position: absolute;
  top: 45px;
  right: 0;
  width: 320px;
  max-height: 400px;
  overflow-y: auto;
  background: #fff;
  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
  border-radius: 8px;
  z-index: 1000;
}

.notif-header {
  padding: 10px;
  font-weight: bold;
  border-bottom: 1px solid #eee;
}

.notif-item {
  padding: 10px;
  display: flex;
  gap: 10px;
  cursor: pointer;
}

.notif-item.unread {
  background: #f5f7ff;
}

.notif-item:hover {
  background: #f0f0f0;
}

/* Floating Action Button */
.post-fab {
  position: fixed;
  bottom: 70px;        /* 🔥 FIXED position (above bottom nav) */
  right: 20px;

  width: 46px;
  height: 46px;

  background-color: #228B22;
  background-image: url("/posticon.png");
  background-repeat: no-repeat;
  background-position: center;
  background-size: 22px 22px;

  border-radius: 50%;
  box-shadow: 0 6px 16px rgba(0,0,0,0.3);

  z-index: 9999;
  overflow: hidden;

  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

/* Hover effect (NO movement) */
.post-fab:hover {
  transform: scale(1.06);
  box-shadow: 0 8px 22px rgba(0,0,0,0.35);
}

/* Mobile spacing */
@media (max-width: 480px) {
  .post-fab {
    bottom: 70px;
    right: 16px;
  }
}

.swal-title-custom {
  font-size: 18px !important;
}

.swal-text-custom {
  font-size: 13px !important;
}


</style>
</head>
 




</head>

<body>
 <header class="main-header">
  <h1 class="m-0">
    <a href="/aboutus" class="logo-link">CollegenZ</a>
  </h1>

  <!-- RIGHT ACTIONS -->
  <div class="header-actions">

    <!-- NOTIFICATIONS -->
    <a href="/notifications" class="nav-notification">
      <i class="bi bi-bell-fill"></i>
      <span class="notif-badge" id="notifBadge" style="display:none;">0</span>
    </a>

    <!-- HAMBURGER -->
    <div class="hamburger" id="hamburger">&#9776;</div>

  </div>
</header>


<div id="filterBar" class="filter-bar hidden-bar">
  <button class="filter-btn active" data-type="all">All</button>
  <button class="filter-btn" data-type="recent">Recent</button>
  <button class="filter-btn" data-type="event">Event</button>
  <button class="filter-btn" data-type="hiring">Hiring</button>
  <button class="filter-btn" data-type="general">General</button>
</div>
<!-- FILTER BAR END -->

<!-- Right Slide Navbar -->
<nav id="slideNav" class="slide-nav" onmouseleave="closeNav()">
  <!-- User info container (will be filled by JS) -->
    <div class="user-info">
  <img src="${isLoggedIn ? currentUser.picture : '/uploads/profilepic.jpg'}" class="profile-pic">
  <div class="details">
    <h3>${isLoggedIn ? currentUser.name : ""}</h3>
    <p>${isLoggedIn ? currentUser.email : ""}</p>
  </div>
</div>

  <hr>

  <a href="/login">Log In</a>
  <a href="/logout">Log Out</a>
</nav>

<!-- Overlay for mobile -->
<div class="overlay" id="overlay" onclick="closeNav()"></div>

  <main class="d-flex">
    <div class="container me-auto font-style">
      <!-- Join With Us Section -->
      <div class="card mb-4 p-3 font-style">
        <div>
          <h2>Welcome ${isLoggedIn ? currentUser.name : "to CollegenZ"}</h2>
          <p>${isLoggedIn ? "Welcome back! Explore new posts and connect with others." : "Represent your college with us"}</p>
          ${isLoggedIn ? `
            <a href="/upload"  class="common-btn">Create Post</a>
          ` : `
            <a href="/login" class="common-btn">
   Login now 
</a>

          `}
        </div>
        <div style="font-size: 2rem;"></div>
      </div>

<hr>
`;

// 🔹 Display all posts
posts.forEach((p, index) => {
  const isCurrentUser = currentUser && currentUser.email === p.userEmail;
  const images = Array.isArray(p.imageurl) ? p.imageurl : [p.imageurl];

  // Carousel Indicators (bottom dots)
  let indicators = "";
  images.forEach((_, i) => {
    indicators += `


      <button type="button" data-bs-target="#carousel-${index}" data-bs-slide-to="${i}"
        ${i === 0 ? "class='active' aria-current='true'" : ""}
        aria-label="Slide ${i + 1}"></button>
    `;
  });

  // Carousel Items
  let carouselItems = "";
  images.forEach((img, i) => {
    carouselItems += `
      <div class="carousel-item ${i === 0 ? "active" : ""}">
        <div class="position-relative">


          ${p.postType === "event" ? `
  <div class="event-badge">
    Event ★
  </div>
` : p.postType === "hiring" ? `
  <div class="hiring-badge">
    Hiring ★
  </div>
` : ""}

          <img src="${img}" class="d-block mx-auto img-fluid"
          style="border-radius:10px; width:100%; height:auto; max-height:600px; object-fit:contain; background:#f8f9fa;" alt="Post image">

          ${images.length > 1 ? `
            <div class="position-absolute top-0 end-0 bg-dark text-white px-2 py-1 m-2 rounded small opacity-75">
              ${i + 1} / ${images.length}
            </div>
          ` : ""}
        </div>
      </div>
    `;
  });

  // Carousel Structure
  let carousel = `
    <div id="carousel-${index}" class="carousel slide" data-bs-ride="carousel">
      ${images.length > 1 ? `<div class="carousel-indicators">${indicators}</div>` : ""}
      <div class="carousel-inner">${carouselItems}</div>
      ${images.length > 1 ? `
        <button class="carousel-control-prev" type="button" data-bs-target="#carousel-${index}" data-bs-slide="prev">
          <span class="carousel-control-prev-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Previous</span>
        </button>
        <button class="carousel-control-next" type="button" data-bs-target="#carousel-${index}" data-bs-slide="next">
          <span class="carousel-control-next-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Next</span>
        </button>
      ` : ""}
    </div>
  `;

  // ✅ Move this part *inside* the loop
  html += `
       <div class="card mb-3 p-3 text-center" style="max-width: 700px; margin: 20px auto; border-radius: 15px;">
    <div class="postuser-info">
      
        <img src="${p.picture || '/uploads/profilepic.jpg'}" class="postprofile-pic">
        <div class="user-details">
          <strong 
  class="open-profile" 
  data-user="${p.userId}" 
  style="cursor:pointer; color:black;">
  ${p.username ? p.username : p.userEmail}
</strong>
          <p class="mb-0">${p.college ? p.college : p.name}</p>
        </div>
      
      <!-- Three Dots Menu (only for the post owner) -->
      
      
      ${isCurrentUser ? `
  <div class="dropdown post-options">
    <button class="btn btn-sm" type="button" data-bs-toggle="dropdown" aria-expanded="false">
      <i class="bi bi-three-dots-vertical"></i>
    </button>
    <ul class="dropdown-menu dropdown-menu-end">
      <li><button class="dropdown-item delete-post-btn" data-id="${p._id}">🗑 Delete Post</button></li>
    </ul>
  </div>
` : `
  <!-- Follow Button -->
<button class="follow-btn"
        data-target="${p.userId}">
    Follow
</button>
`}
    </div>




    <!-- Post Images -->
    <div class="my-3">${carousel}</div>

    <!-- POST CAPTION OUTPUT -->
  <div class="post-caption ${p.postType === "general" ? "general-caption" : "details-caption"}" id="caption-${p._id}">

  ${
    p.postType === "general"
      ?

      // --------------------------
      //   GENERAL POST (SEE MORE)
      // --------------------------
      (p.data.length > 100
        ? `${p.data.slice(0, 100)}
             <span class="dots">...</span>
            <span class="more-text" style="display:none;">${p.data.slice(100)}</span>
            <button class="see-more-btn" onclick="toggleCaption('${p._id}')">See More</button>`
        : p.data)

      :

      // --------------------------
      //   EVENT POST (COLLAPSIBLE TABLE)
      // --------------------------
      p.postType === "event"
?
`
<div class="details-box" id="details-${p._id}">

  <!-- ✅ TITLE ONLY (VISIBLE WHEN COLLAPSED) -->
  <div
    class="row-${p._id}"
    style="
      font-weight:600;
      text-align:center;
      margin-bottom:8px;
    ">
    ${p.data || "-"}
  </div>

  <table class="table details-table">
    <tbody>

      <!-- ❗ Title row is NOW hidden -->
      <tr class="hidden-row row-${p._id}" style="display:none;">
        <th>Title</th>
        <td style="text-align:center;">${p.data || "-"}</td>
      </tr>

      <tr class="hidden-row row-${p._id}" style="display:none;">
        <th>Date</th><td>${p.event_date || "-"}</td>
      </tr>

      <tr class="hidden-row row-${p._id}" style="display:none;">
        <th>Time</th><td>${p.event_time || "-"}</td>
      </tr>

      <tr class="hidden-row row-${p._id}" style="display:none;">
        <th>Mode</th><td>${p.event_mode || "-"}</td>
      </tr>

      <tr class="hidden-row row-${p._id}" style="display:none;">
        <th>Location</th><td>${p.event_location || "-"}</td>
      </tr>

      <tr class="hidden-row row-${p._id}" style="display:none;">
        <th>Contact</th><td>${p.event_contact || "-"}</td>
      </tr>

      <tr class="hidden-row row-${p._id}" style="display:none;">
        <th>Description</th>
        <td>
          ${
            p.event_description && p.event_description.length > 100
              ? `${p.event_description.slice(0, 100)}
                   <span class="dots">...</span>
                   <span class="more-text" style="display:none;">
                     ${p.event_description.slice(100)}
                   </span>
                   <button class="see-more-btn"
                     onclick="toggleCaption('${p._id}')">
                     See More
                   </button>`
              : (p.event_description || "-")
          }
        </td>
      </tr>

      <tr class="hidden-row row-${p._id}" style="display:none;">
        <th>Reg. Link</th>
        <td>
          <a
  href="${p.job_link?.startsWith('http') ? p.job_link : 'https://' + p.job_link}"
  target="_blank"
>
  Open Link
</a>
        </td>
      </tr>

    </tbody>
  </table>

  <!-- Button remains unchanged -->
  <div class="view-btn-container">
    <button class="view-btn"
      onclick="toggleDetails('${p._id}')">
      View Details
    </button>
  </div>

</div>
`
:

      // --------------------------
      //   HIRING POST (COLLAPSIBLE TABLE)
      // --------------------------
      `
<div class="details-box" id="details-${p._id}">

  <!-- ✅ TITLE ONLY (VISIBLE WHEN COLLAPSED) -->
  <div
    class="row-${p._id}"
    style="
      display:block;
      font-weight:600;
      text-align:center;
      margin-bottom:8px;
    ">
    ${p.data || "-"}
  </div>

  <table class="table details-table">
    <tbody>

      <!-- ❗ Title row hidden initially -->
      <tr class="hidden-row row-${p._id}" style="display:none;">
        <th>Title</th>
        <td>${p.data || "-"}</td>
      </tr>

      <tr class="hidden-row row-${p._id}" style="display:none;">
        <th>Location</th>
        <td>${p.job_location || "-"}</td>
      </tr>

      <tr class="hidden-row row-${p._id}" style="display:none;">
        <th>Mode</th>
        <td>${p.job_mode || "-"}</td>
      </tr>

      <tr class="hidden-row row-${p._id}" style="display:none;">
        <th>Contact</th>
        <td>${p.job_contact || "-"}</td>
      </tr>

      <tr class="hidden-row row-${p._id}" style="display:none;">
        <th>Description</th>
        <td>
          ${
            p.job_description && p.job_description.length > 100
              ? `${p.job_description.slice(0, 100)}
                   <span class="dots">...</span>
                   <span class="more-text" style="display:none;">
                     ${p.job_description.slice(100)}
                   </span>
                   <button class="see-more-btn"
                     onclick="toggleCaption('${p._id}')">
                     See More
                   </button>`
              : (p.job_description || "-")
          }
        </td>
      </tr>

      <tr class="hidden-row row-${p._id}" style="display:none;">
        <th>Deadline</th>
        <td>${p.job_deadline || "-"}</td>
      </tr>

      <tr class="hidden-row row-${p._id}" style="display:none;">
        <th>Apply Link</th>
        <td>
          <a 
  href="${p.job_link?.startsWith('http') ? p.job_link : 'https://' + p.job_link}" 
  target="_blank"
>
  Apply
</a>
        </td>
      </tr>

    </tbody>
  </table>

  <div class="view-btn-container">
    <button class="view-btn" onclick="toggleDetails('${p._id}')">
      View Details
    </button>
  </div>

</div>
`
  }

</div>

      <div class="mt-3 d-flex justify-content-center align-items-center gap-4">
        <button class="btn btn-link btn-sm like-btn" data-id="${p._id}" style="color: gray; font-size: 1.2rem;" ${!isLoggedIn ? "disabled" : ""}>
          <i class="bi bi-heart"></i>
        </button>
        <span class="like-count" id="like-count-${p._id}">${p.likes || 0}</span>

        <button 
  class="btn btn-link btn-sm save-btn" 
  data-id="${p._id}"
  style="color: gray; font-size: 1.2rem;"
  ${!isLoggedIn || !p.userId ? "disabled" : ""}
>
  <i class="bi bi-bookmark"></i>
</button>

<span class="save-count" id="save-count-${p._id}">
  ${p.saves || 0}
</span>

        <button class="btn btn-link btn-sm share-btn" data-id="${p._id}" style="color: gray; font-size: 1.2rem;">
          <i class="bi bi-share"></i>
        </button>
        <span class="share-count" id="share-count-${p._id}">${p.shares || 0}</span>
      </div>
    </div>
  `;
}); // ✅ Now the loop properly wraps everything
    
    

    // 🔹 Sidebar & Scripts
    html += `
    </div>
  </main>

<div id="profilePopup" class="profile-popup">
  <div class="profile-popup-content">
      <span class="close-popup">&times;</span>

      <div id="profileData" style="text-align:center; padding:10px;">
        Loading...
      </div>
  </div>
</div>

<a href="/upload" class="post-fab" title="Create Post"></a>

  <!-- Sidebar -->
  <!-- Sidebar / Bottom Navigation -->
<div class="sidebar">
  <div class="icon">

    <a href="/"><img src="/uploads/home.png" alt="Home" ></a>
    <a href="/profile"><img src="/uploads/settings.png" alt="Settings" ></a>
    <a href="/friends"><img src="/chaticon.png" alt="post"></a>
    <a href="/calender"><img src="/uploads/calender.png" alt="Calendar" ></a>
  </div>
</div>

<script>
  window.IS_LOGGED_IN = ${isLoggedIn}; // true or false
</script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

  
<script>
const hamburger = document.getElementById("hamburger");
const slideNav = document.getElementById("slideNav");
const overlay = document.getElementById("overlay");

function openNav() {
  slideNav.classList.add("active");
  overlay.classList.add("active");
}

function closeNav() {
  slideNav.classList.remove("active");
  overlay.classList.remove("active");
}

// Toggle navbar on hamburger click
hamburger.addEventListener("click", () => {
  if (slideNav.classList.contains("active")) {
    closeNav();
  } else {
    openNav();
  }
});

// Optional: Close navbar when pressing ESC key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeNav();
});
</script>



    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script src="/share-script.js"></script>
  <script src="/script.js"></script>
  <link rel="stylesheet" href="/script.css">
  <script>


    const currentUserId = "${isLoggedIn ? currentUser._id : ""}";
    const currentUserEmail = "${isLoggedIn ? currentUser.email : ""}";

    document.addEventListener("click", async function(e) {
      // ✅ Like button
      if (e.target.closest(".like-btn")) {
        if (!currentUserId) return alert("Please login to like posts!");

        const btn = e.target.closest(".like-btn");
        const postId = btn.getAttribute("data-id");
        const icon = btn.querySelector("i");
        const countEl = document.getElementById("like-count-" + postId);

        const res = await fetch("/posts/" + postId + "/like", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUserId })
        });
        const data = await res.json();

        if (data.liked) {
          icon.classList.replace("bi-heart", "bi-heart-fill");
          icon.style.color = "#228B22";
        } else {
          icon.classList.replace("bi-heart-fill", "bi-heart");
          icon.style.color = "gray";
        }
        countEl.textContent = data.likes;
      }

      
    
      // ✅ Save button
      if (e.target.closest(".save-btn")) {
        if (!currentUserId) return alert("Please login to save posts!");

        const btn = e.target.closest(".save-btn");
        const postId = btn.getAttribute("data-id");
        const icon = btn.querySelector("i");
        const countEl = document.getElementById("save-count-" + postId);

        const res = await fetch("/posts/" + postId + "/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUserId })
        });

        const data = await res.json();

        if (data.saved) {
          icon.classList.replace("bi-bookmark", "bi-bookmark-fill");
          icon.style.color = "#228B22";
        } else {
          icon.classList.replace("bi-bookmark-fill", "bi-bookmark");
          icon.style.color = "gray";
        }

        if (data.saves !== undefined) {
          countEl.textContent = data.saves;
        }
      }

       // ✅ Share button
if (e.target.closest(".share-btn")) {
  if (!currentUserId) return alert("Please login to share posts!");

  const btn = e.target.closest(".share-btn");
  const postId = btn.getAttribute("data-id");
  const icon = btn.querySelector("i");
  const countEl = document.getElementById("share-count-" + postId);

  const res = await fetch("/posts/" + postId + "/share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: currentUserId })
  });

  const data = await res.json();

  if (data.shared) {
    icon.style.color = "#228B22";
  } else {
    icon.style.color = "gray";
  }

  countEl.textContent = data.shares;
}       

    });

//filter option
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const type = btn.getAttribute("data-type");

    // Reload page with filter
    if (type === "all") {
      window.location.href = "/";
    } else {
      window.location.href = "/?filter=" + type;
    }
  });
});

//filter bar scroll
window.addEventListener("scroll", () => {
    const filterBar = document.getElementById("filterBar");
    const showAfter = window.innerHeight * 0.25; // 25% scroll

    if (window.scrollY > showAfter) {
        filterBar.classList.remove("hidden-bar");
        filterBar.classList.add("visible-bar");
    } else {
        filterBar.classList.add("hidden-bar");
        filterBar.classList.remove("visible-bar");
    }
});


const chatToggle = document.getElementById("chatToggle");
const chatDropdown = document.getElementById("chatDropdown");

chatToggle.onclick = () => {
  chatDropdown.style.display =
    chatDropdown.style.display === "block" ? "none" : "block";
};

// Close when clicking outside
document.addEventListener("click", e => {
  if (!e.target.closest(".chat-menu")) {
    chatDropdown.style.display = "none";
  }
});
</script>
</body>
</html>
`;
   
    res.send(html);
  
  } catch (err) {
    console.error("❌ Fetch failed:", err.message);
    res.status(500).send("Failed to load data");
  }
});

// Connect the router
app.use("/", router);


const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
