
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



// ✅ Upload image to Cloudinary
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    // Upload image to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path);
    
    // Delete local file after upload
    fs.unlinkSync(req.file.path);

    // Send URL back to client (to store in MongoDB)
    res.json({
      success: true,
      imageUrl: result.secure_url,
    });
  } catch (error) {
    console.error("❌ Cloudinary Upload Error:", error);
    res.status(500).json({ success: false, message: "Upload failed" });
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



// ----- User Schema -----
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, default: null},
  age: { type: Number, default: null },
  phone: { type: String, default: null },
  email: { type: String, required: true, unique: true },
  password: { type: String, default: null },

  dob: { type: String, default: null }, // 👈 Date of Birth added
  college: { type: String, required:false, default: null },
  bio: { type: String, default: null },
  picture: { type: String, default:"https://collegenz.in/uploads/profilepic.jpg" },
  dream: {
    type: String,
    default: null,
  },
  googleUser: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  followers: [
  { type: mongoose.Schema.Types.ObjectId, ref: "logins" }
  ],

  following: [
  { type: mongoose.Schema.Types.ObjectId, ref: "logins" }
  ],
  // 👇 Posts user has liked
  likedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Posts", default: [] }],

  // 👇 Saved posts
  savedPosts: [
    {
      postId: { type: mongoose.Schema.Types.ObjectId, ref: "Posts" },
      data: String,
      imageurl: [{ type: String }],
      event_date: Date,
      createdAt: { type: Date, default: Date.now },
      userEmail: String,
    },
  ],

  // 👇 Number of posts created by the user
  postCount: { type: Number, default: 0 },

  // 👇 Rank (temporary random, future algorithm will update)
  rank: { type: Number, default: () => Math.floor(Math.random() * 10000) },
  // 👇 Optional analytics fields
  totalLikes: { type: Number, default: 0 },
  totalSaves: { type: Number, default: 0 },
});

// Create Model
const genz = mongoose.model("logins", userSchema);



// ----- Post Schema -----
/*const postSchema = new mongoose.Schema({
  username:{type:String,default:null},
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "logins", required: true },
  data: String,
  imageurl: [String],
  createdAt: { type: Date, default: Date.now },
  event_date: Date,
  userEmail: String,
  picture: { type: String, default: null },
  college: { type: String, required:false, default: null },
  likes: { type: Number, default: 0 },
  likedBy: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "logins" }],
    default: [],
    set: arr => [...new Set(arr.map(id => id.toString()))]
  },
  saves: { type: Number, default: 0 },
  savedBy: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "logins" }],
    default: [],
    set: arr => [...new Set(arr.map(id => id.toString()))]
  },
    // --- Shares (NEW) ---
  shares: { type: Number, default: 0 },
  sharedBy: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "logins" }],
    default: [],
    set: arr => [...new Set(arr.map(id => id.toString()))]
  }
});*/


const postSchema = new mongoose.Schema({
  postType: {
    type: String,
    enum: ["event", "general"],
    default: "general"
  },

  username: { type: String, default: null },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "logins", required: true },
  data: String,
  imageurl: [String],
  createdAt: { type: Date, default: Date.now },

  // Event-only fields (optional)
  event_date: { type: Date, default: null },
  saves: { type: Number, default: 0 },
  savedBy: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "logins" }],
    default: [],
    set: arr => [...new Set(arr.map(id => id.toString()))]
  },

  // Common fields
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



// POST form handler
function requireLogin(req, res, next) {
  if (!res.locals.currentUser) {
    return res.redirect('/login');
  }
  next();
}

router.post("/submit", upload.array("images", 10), async (req, res) => {
  try {
    const { data, event_date, event_location, category, post_type } = req.body;

    if (!data || !post_type) {
      return res.send("<h3>Missing fields</h3>");
    }

    const currentUser = res.locals.currentUser;
    if (!currentUser) {
      return res.send("<h3>User not logged in</h3>");
    }

    const userId = currentUser._id;
    const userEmail = currentUser.email;
    const username = currentUser.username || null;
    const picture = currentUser.picture || null;
    const college = currentUser.college?.trim() || null;

    // Upload images
    let imageurls = [];
    if (req.files?.length > 0) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path);
        imageurls.push(result.secure_url);
        fs.unlinkSync(file.path);
      }
    }

    // Build post
    const postData = {
      postType: post_type,   // <-- FIXED
      userId,
      username,
      userEmail,
      picture,
      college,
      data,
      imageurl: imageurls
    };

    // If event post, add event fields
    if (post_type === "event") {
      postData.event_date = event_date || null;
      postData.event_location = event_location || null;
    }

    const newPost = new Post(postData);
    await newPost.save();

    await genz.findByIdAndUpdate(userId, { $inc: { postCount: 1 } });

    console.log("✔ Post saved successfully!", post_type === "event" ? "(EVENT POST)" : "(GENERAL POST)");

    res.redirect("/");
  } catch (err) {
    console.error("✘ Save failed:", err);
    res.status(500).send("Error saving to database");
  }
});


/*router.post("/submit", upload.array("images", 10), async (req, res) => {
    
    const { data, event_date, event_location, category, post_type } = req.body;
  const postType = post_type;

  if (!data || !postType) {
    return res.send("<h3>Missing fields</h3>");
  }

    const currentUser = res.locals.currentUser || null;
    const userId = req.session.userId || null;

    if (!data || !currentUser) {
        return res.send("<h3>No data or user info received</h3>");
    }

    const userEmail = currentUser.email;
    const username = currentUser.username || null;
    const picture = currentUser.picture || null;
    const college = currentUser.college?.trim() || null;

    try {
        let imageurls = [];

        // Upload images
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const result = await cloudinary.uploader.upload(file.path);
                imageurls.push(result.secure_url);
                fs.unlinkSync(file.path);
            }
        }

        // Detect post type
        const isEventPost = event_date && event_date.trim() !== "";

        // Build post object
        const postData = {
            postType: req.body.post_type,
            userId,
            username,
            data,
            imageurl: imageurls,
            userEmail,
            college,
            picture
        };

        // Add only if event post
        if (isEventPost) {
            postData.event_date = event_date;
        }

        const newPost = new Post(postData);

        // Save post
        await newPost.save();

        // Update user's post count
        await genz.findByIdAndUpdate(userId, { $inc: { postCount: 1 } });

        console.log("✔ Post saved successfully!", isEventPost ? "(EVENT POST)" : "(GENERAL POST)");
        res.redirect("/");

    } catch (err) {
        console.error("✘ Save failed:", err.message);
        res.status(500).send("Error saving to database");
    }
});

router.post("/submit", upload.array("images", 10), async (req, res) => {
  const { data, event_date } = req.body;

  const currentUser = res.locals.currentUser || null;
  const userId = req.session.userId || null;
  const userEmail = currentUser?.email || null;
  const username = currentUser?.username || null;
  const picture = currentUser?.picture || null; // ✅ define picture here
  const college = currentUser?.college?.trim() || null;

  if (!data || !userEmail) {
    return res.send("<h3>No data or user info received</h3>");
  }

  try {
    let imageurls = [];

    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path);
        imageurls.push(result.secure_url);
        fs.unlinkSync(file.path);
      }
    }

    const newPost = new Post({
      userId,
      username: username || null,
      data,
      imageurl: imageurls,
      event_date,
      userEmail,
      college,
      picture, // ✅ now defined properly
    });

    await newPost.save();
    await genz.findByIdAndUpdate(userId, { $inc: { postCount: 1 }});

    console.log("✔ Post with Cloudinary images saved successfully!");
    res.redirect("/");
  } catch (err) {
    console.error("✘ Save failed:", err.message);
    res.status(500).send("Error saving to database");
  }
});*/



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

// =======================
// Traditional Signup
// =======================
app.post("/signup", async (req, res) => {
  try {
    const { name, username, age, phone, email, password, college, dream } = req.body;

    const lowerEmail = email.toLowerCase();
    const existingUser = await genz.findOne({ email: lowerEmail });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists. Try logging in." });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

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
    });

    await newUser.save();

    // Store session
    req.session.userId = newUser._id;
    req.session.username = newUser.name;
    req.session.email = newUser.email;

    // Create session doc
    await Session.create({
      name: newUser.name,
      username: newUser.username || "",
      college: newUser.college || "",
      email: newUser.email,
      userId: newUser._id,        // ✔ correct user id stored
      sessionId: req.sessionID,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hrs
    });

    res.redirect("/");
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error during signup." });
  }
});

// =======================
// Google Signup using Passport
// =======================

// Step 1: Start Google signup
app.get("/auth/google-signup", passport.authenticate("google", { scope: ["profile", "email"] }));

// Step 2: Google callback
app.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup" }),
  async (req, res) => {
    try {
      let user = await genz.findOne({ email: req.user.email });

      // If user does not exist → create new one
      if (!user) {
        user = new genz({
          name: req.user.name,
          email: req.user.email,
          username: null,
          password: null,
          college: null,
          age: null,
          phone: null,
          dream: null,
          googleUser: true,
          picture: true,
        });

        await user.save();
      }

      // Store express-session
      req.session.userId = user._id;
      req.session.username = user.name;
      req.session.email = user.email;

      // Create session record
      await Session.create({
        name: user.name,
        username: user.username || "",
        college: user.college || "",
        email: user.email,
        userId: user._id,        // ✔ correct
        sessionId: req.sessionID,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24)
      });

      res.redirect("/");
    } catch (err) {
      console.error("Google signup error:", err);
      res.redirect("/signup");
    }
  }
);
  
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

/*router.post("/save/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.session.userId; // must be set at login

    console.log("👉 Save attempt:", { postId, userId });

    if (!userId) {
      return res.status(401).json({ success: false, message: "Please log in first." });
    }

    // Find the post
    const foundPost = await Post.findById(postId);
    if (!foundPost) {
      return res.status(404).json({ success: false, message: "Post not found." });
    }

    // Find the user
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

    // Add new saved post
    user.savedPosts.push({
      postId: foundPost._id,
      data: foundPost.data,
      imageurl: foundPost.imageurl,
      event_date: foundPost.event_date,
      createdAt: foundPost.createdAt,
      userEmail: foundPost.userEmail
    });

    await user.save();

    console.log("✅ Post saved for user:", user.email, user.savedPosts);

    res.json({ success: true, message: "Post saved successfully!" });
  } catch (err) {
    console.error("❌ Save failed:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
  });*/

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

    // ❌ Block saving for general posts
    if (!foundPost.userId || !foundPost.username || !foundPost.userEmail) {
      return res.json({
        success: false,
        message: "Saving is disabled for General Posts."
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

    // Save post
    user.savedPosts.push({
      postId: foundPost._id,
      data: foundPost.data,
      imageurl: foundPost.imageurl,
      event_date: foundPost.event_date,
      createdAt: foundPost.createdAt,
      userEmail: foundPost.userEmail
    });

    await user.save();

    res.json({ success: true, message: "Post saved successfully!" });
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
    url: "/view"
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
            userId,
            email,
            username,
            password: null,
            googleUser: true,
            college:null,
            picture: profile.photos?.[0]?.value || null, // ✅ stores profile photo
            likedPosts: [],
            savedPosts: [],
            dream: "Other",
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

/*router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup" }),
  (req, res) => {
    res.redirect("/view");
  }
);*/

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
        <title>${user.name}'s Profile</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

        <style>
          body {
            background: #f8f9fa;
            font-family: 'Poppins', sans-serif;
          }
          .profile-container {
            max-width: 600px;
            margin: 60px auto;
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
            color: #007bff;
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

        </style>
      </head>

      <body>
        <div class="profile-container text-center">
          <form id="profileForm" enctype="multipart/form-data">
            <div class="mb-3">
              <img id="previewImage" 
     class="profile-img" 
     src="${user.picture ? user.picture : '/uploads/profilepic.jpg'}"  />
              <br>
              <label class="upload-label mt-2">
                Change Photo
                <input type="file" id="picture" name="picture" accept="image/" style="display:none" onchange="previewProfile(event)">
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
</div>

            
      <!-- Edit Button -->
      <button type="button" class="btn-edit" onclick="toggleEdit()">✏️ Edit Profile</button>

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
                 value="${user.dob || ''}">
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

        <button type="button" class="btn-save" onclick="saveProfile()">💾 Save Changes</button>

      </div>
          </form>
        </div>

        <div class="sidebar">
          <div class="icon">
            <a href="/"><img src="/uploads/home.png" alt="Home"></a>
            <a href="/profile"><img src="/uploads/settings.png" alt="Settings"></a>
            <a href="/upload"><img src="/uploads/add.png" alt="Add"></a>
            <a href="/calender"><img src="/uploads/calender.png" alt="Calendar"></a>
          </div>
        </div>

        <script>
         
            function previewProfile(event) {
      const reader = new FileReader();
      reader.onload = () => {
        document.getElementById('previewImage').src = reader.result;
      };
      reader.readAsDataURL(event.target.files[0]);
    }

    function toggleEdit() {
      const section = document.getElementById('editSection');

      if (section.style.maxHeight && section.style.maxHeight !== "0px") {
        section.style.maxHeight = "0px";
      } else {
        section.style.maxHeight = section.scrollHeight + "px";
      }
    }

    async function saveProfile() {
      const formData = new FormData(document.getElementById('profileForm'));

      try {
        const res = await axios.post('/updateProfile', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('✅ ' + res.data.message);
      } catch (err) {
        console.error(err);
        alert('❌ Failed to update profile');
      }
    }
          
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
    const { phone, username, dob, dream, college, bio } = req.body;
    let pictureUrl = null;

    // 🔹 Upload to Cloudinary only if a file is selected
    if (req.file) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path);
        pictureUrl = result.secure_url;
        fs.unlinkSync(req.file.path); // delete temp file
      } catch (err) {
        console.error("Cloudinary upload error:", err);
      }
    }

    // 🔹 Prepare update object
    const updateFields = { phone, username, dob, dream, college, bio };
    if (pictureUrl) updateFields.picture = pictureUrl;

    // 🔹 Update user
    const updatedUser = await genz.findByIdAndUpdate(userId, updateFields, { new: true });

    // 🔹 Sync username + college + picture in all posts
    if (updatedUser?.email) {
      await Post.updateMany(
        { userEmail: updatedUser.email },
        {
          username: updatedUser.username,
          college: updatedUser.college,
          picture: updatedUser.picture,
        }
      );
    }

    res.json({ success: true, message: "Profile & posts updated successfully" });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: "Server error" });
  }
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



// VIEW: all data route
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });

   
// ✅ Detect current login status

const currentUser = res.locals.currentUser ?? null;     // User info if logged in
const currentUserId = currentUser ? currentUser._id.toString() : null;
const loginSession = res.locals.loginSession ?? null;   // Session info if logged in
const isLoggedIn = Boolean(currentUser);                // true if logged in
const updatedPosts = posts.map((p) => {
  return {
    ...p.toObject(),
    isFollowing: currentUser
      ? currentUser.following.map(id => id.toString()).includes(p.userId?.toString())
      : false
  };
});
console.log("POST USER IDs:", posts.map(p => p.userId));


    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CollegenZ</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">

  <link rel="icon" type="image/png" href="/favicon-32x32.png" sizes="32x32" />
<link rel="icon" type="image/png" href="/favicon-16x16.png" sizes="16x16" />
<link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />  

  <!-- ✅ SEO Meta Tags -->
  <meta name="description" content="CollegenZ is an AI-powered platform that helps students connects easily around the world">
  <meta name="keywords" content="CollegenZ, college platform, student community, AI education,internship,education,events,hackathon,course,startup">
  <link rel="canonical" href="https://collegenz.in/">

  <!-- ✅ Open Graph (for link previews on WhatsApp, LinkedIn, etc.) -->
  <meta property="og:title" content="CollegenZ – AI-Powered College Platform">
  <meta property="og:description" content="Discover and connect with colleges using AI. Explore the world of knowledge and growth">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://collegenz.in/">
  <meta property="og:image" content="https://collegenz.in/logo.png">

  <!-- ✅ Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="CollegenZ – AI-Powered College Platform">
  <meta name="twitter:description" content="Explore colleges and hackathons worldwide with Collegenz">
  <meta name="twitter:image" content="https://collegenz.in/logo.png">

  <!-- ✅ Schema Markup for Google -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "CollegenZ",
    "url": "https://collegenz.in/",
    "logo": "https://collegenz.in/logo.png",
    "description": "AI-powered platform for students to discover colleges and hackathons globally"
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
  position: sticky;
  top: 0;
  z-index: 1100;
  margin-right: 60px; /* space for desktop sidebar */
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}
.logo-link {
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
  font-size: 0.95rem;
  line-height: 1.4;
  color: #222;
  white-space: pre-wrap;
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

</style>
</head>
 




</head>

<body>
    <header>
    <h1 class="m-0">
    <a href="/aboutus" class="logo-link">CollegenZ</a>
  </h1>
  <!-- Hamburger Menu Icon -->
  <div class="hamburger" id="hamburger">&#9776;</div>
</header>

<!-- Right Slide Navbar -->
<nav id="slideNav" class="slide-nav" onmouseleave="closeNav()">
  <!-- User info container (will be filled by JS) -->
    <div class="user-info">
  <img src=${isLoggedIn ? currentUser.picture : ""||"/uploads/profilepic.jpg" }  class="profile-pic">
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

  <main class="d-flex" style="margin-top: 50px;">
    <div class="container me-auto">
      <!-- Join With Us Section -->
      <div class="card mb-4 p-3 d-flex flex-row justify-content-between align-items-center">
        <div>
          <h2>Welcome ${isLoggedIn ? currentUser.name : ""}</h2>
          <p>${isLoggedIn ? "Welcome back! Explore new posts and connect with others." : "Represent your college with us"}</p>
          ${isLoggedIn ? `
            <a href="/upload"  class="btn" style="background: #228B22;color:white;">Create Post</a>
          ` : `
            <a href="/login"  class="btn" style="background: #228B22;color:white;">Join Now</a>
          `}
        </div>
        <div style="font-size: 2rem;"></div>
      </div>

      <hr>`;


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
          <strong>${p.username ? p.username : p.userEmail}</strong>
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

    <!-- Post Caption -->
    <p class="post-caption" id="caption-${p._id}">
  ${p.data.length > 100 
    ? `${p.data.slice(0, 100)}<span class="dots">...</span><span class="more-text" style="display:none;">${p.data.slice(100)}</span> <button class="see-more-btn btn btn-link p-0" data-id="${p._id}">See more</button>` 
    : p.data}
</p>

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

  <!-- Sidebar -->
  <!-- Sidebar / Bottom Navigation -->
<div class="sidebar">
  <div class="icon">
    <a href="/"><img src="/uploads/home.png" alt="Home" ></a>

    <a href="/profile"><img src="/uploads/settings.png" alt="Settings" ></a>
    <a href="/upload"><img src="/uploads/add.png" alt="Add" ></a>
    <a href="/calender"><img src="/uploads/calender.png" alt="Calendar" ></a>
  </div>
</div>
  
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


// Start the server
app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
