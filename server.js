
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
app.use('/view', express.static('assets'));

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
  age: { type: Number, default: null },
  phone: { type: String, default: null },
  email: { type: String, required: true, unique: true },
  password: { type: String, default: null },

  dream: {
    type: String,
    enum: ["Doctor", "Engineering", "Lawyer", "Entertainment & Arts", "Developer"],
    default: null,
  },

  googleUser: { type: Boolean, default: false },
  picture: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },

  // 👇 NEW: Posts user has liked
  likedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Users", default: [] }],

  // 👇 Already existing savedPosts, just improved for clarity
  savedPosts: [{
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Users" },
    data: String,
    imageurl: [{ type: String }],
    event_date: Date,
    createdAt: { type: Date, default: Date.now },
    userEmail: String
  }],

  // 👇 Optional: track total likes/saves for profile analytics
  totalLikes: { type: Number, default: 0 },
  totalSaves: { type: Number, default: 0 },
});

// Create Model
const genz = mongoose.model("logins", userSchema);



// ----- Post Schema -----
const postSchema = new mongoose.Schema({
  data: String,
  imageurl: [String],
  createdAt: { type: Date, default: Date.now },
  event_date: Date,
  userEmail: String,
  likes: { type: Number, default: 0 },
  likedBy: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: "logins" }],
    default: [],
    set: arr => [...new Set(arr.map(id => id.toString()))]
  },
  saves: { type: Number, default: 0 },
  savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "logins" }]
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
  const { data, event_date } = req.body;
  const userEmail = res.locals.currentUser?.email || null; // ✅ from logged-in user

  if (!data || !userEmail) {
    return res.send("<h3>No data or user info received</h3>");
  }

  try {
    let imageurls = [];

    // ✅ Upload each file to Cloudinary
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path);
        imageurls.push(result.secure_url); // Store Cloudinary URL
        fs.unlinkSync(file.path); // Delete local temp file
      }
    }

    // ✅ Save post with Cloudinary image URLs
    const newPost = new Post({
      data,
      imageurl: imageurls, // ✅ store array of Cloudinary URLs
      event_date,
      userEmail,
    });

    await newPost.save();
    console.log("✔ Post with Cloudinary images saved successfully!");
    res.redirect("/view");
  } catch (err) {
    console.error("✘ Save failed:", err.message);
    res.status(500).send("Error saving to database");
  }
});


// Routes


app.get("/",(req,res) => {
    res.sendFile(path.join(__dirname, "home.html"));
});

app.get("/signin", (req, res) => {
    res.sendFile(path.join(__dirname, "sign.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "login.html"));
});
app.get("/submit",(req,res) => {
    res.sendFile(path.join(__dirname, "form.html"));
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
app.get("/profile",(req,res) => {
    res.sendFile(path.join(__dirname, "profile.html"));
});
app.get("/sitemap.xml",(req,res) => {
    res.sendFile(path.join(__dirname, "sitemap.xml"));
});
app.get("/robots.txt",(req,res) => {
    res.sendFile(path.join(__dirname, "robots.txt"));
});
app.get("/post/postId",(req,res) => {
    res.sendFile(path.join(__dirname, "resend.html"));
});




// =======================
// Traditional Signup
// =======================
app.post("/signin", async (req, res) => {
  try {
    const { name, age, phone, email, password, dream } = req.body;

    const lowerEmail = email.toLowerCase();
    const existingUser = await genz.findOne({ email: lowerEmail });

    if (existingUser)
      return res.status(400).json({ message: "User already exists. Try logging in." });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new genz({
      name,
      age,
      phone,
      email: lowerEmail,
      password: hashedPassword,
      dream,
      googleUser: false, // mark as traditional signup
    });

    await newUser.save();

    res.json({ message: "Signup successful! You can now log in.", redirect: "/login" });
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
  passport.authenticate("google", { failureRedirect: "/signin" }),
  async (req, res) => {
    try {
      // Check if user exists
      let user = await genz.findOne({ email: req.user.email });

      // If not, create a new user with optional fields
      if (!user) {
        user = new genz({
          name: req.user.name,
           email: req.user.email,
          password: null,
          age: null,
          phone: null,
          dream: null,
          googleUser: true,
        });
        await user.save();
      }

      // Store session
      req.session.userId = user._id;
      req.session.username = user.name;
      req.session.email = user.email;

      res.redirect("/view"); // redirect to dashboard after Google signup
    } catch (err) {
      console.error("Google signup error:", err);
      res.redirect("/signin");
    }
  }
);

	
const SessionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "logins", required: true },
  email: { type: String, required: true },
  sessionId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date }
});

const Session = mongoose.model("Session", SessionSchema);

router.post("/save/:id", async (req, res) => {
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


// Local Strategy
passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const user = await genz.findOne({ email: email.toLowerCase() });
      if (!user) return done(null, false, { message: "User not found" });

      const isMatch = await bcryptjs.compare(password, user.password);
      if (!isMatch) return done(null, false, { message: "Incorrect password" });

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);


// Passport serialization
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await genz.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,

      // ✅ Automatically switch callback based on environment
      callbackURL:
        process.env.NODE_ENV === "production"
          ? "https://collegenz.site/auth/google/callback"
          : "http://localhost:3000/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value.toLowerCase();

        let user = await genz.findOne({ email });

        // 🆕 Create user if not found (for first-time Google login)
        if (!user) {
          user = await genz.create({
            name: profile.displayName,
            email,
            password: null,
            googleUser: true,
            picture: profile.photos?.[0]?.value || null,
            likedPosts: [],
            savedPosts: [],
          });
        } else {
          // 🔄 Ensure picture and name stay updated
          user.picture = profile.photos?.[0]?.value || user.picture;
          user.name = profile.displayName || user.name;
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

// Routes
router.post("/login", passport.authenticate("local"), (req, res) => {
  res.json({ success: true, redirectUrl: "/view" });
});

router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signin" }),
  (req, res) => {
    res.redirect("/view");
  }
);

app.get("/share-script.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.send(`
    document.addEventListener("click", function(e) {
      const btn = e.target.closest(".share-btn");
      if (!btn) return;

      const postId = btn.getAttribute("data-id");
      const postUrl = "https://collegenz.site" + "/post/" + postId;
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


/*app.get("/post/:postId", async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).send("<h3>Post not found</h3>");
    }

    // ✅ Detect environment
    const domain = process.env.DOMAIN || "http://localhost:3000";
    const postUrl = `${domain}/post/${post._id}`;

    // ✅ Handle single or multiple Cloudinary images
    let carouselHTML = "";
    if (Array.isArray(post.imageurl) && post.imageurl.length > 1) {
      carouselHTML = `
        <div id="carousel-${post._id}" class="carousel slide" data-bs-ride="carousel">
          <div class="carousel-inner">
            ${post.imageurl
              .map(
                (img, i) => `
                <div class="carousel-item ${i === 0 ? "active" : ""}">
                  <img src="${img}" class="d-block w-100" style="border-radius:10px;">
                </div>`
              )
              .join("")}
          </div>
          <button class="carousel-control-prev" type="button" data-bs-target="#carousel-${post._id}" data-bs-slide="prev">
            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
          </button>
          <button class="carousel-control-next" type="button" data-bs-target="#carousel-${post._id}" data-bs-slide="next">
            <span class="carousel-control-next-icon" aria-hidden="true"></span>
          </button>
        </div>`;
    } else if (post.imageurl && post.imageurl.length > 0) {
      const img = Array.isArray(post.imageurl) ? post.imageurl[0] : post.imageurl;
      carouselHTML = `<img src="${img}" class="img-fluid" style="border-radius:10px;">`;
    }

    // ✅ HTML page for shared post
    res.setHeader("Content-Type", "text/html");
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${post.title || "Collegenz Post"}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
          <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
          <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
          <script src="/share-script.js"></script>
          <style>
            body {
              font-family: Arial, sans-serif;
              background: #f8f9fa;
              padding: 20px;
            }
            .card {
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              border: none;
            }
            .btn-link {
              text-decoration: none;
            }
            .bi {
              font-size: 1.4rem;
            }
          </style>
        </head>
        <body>
          <div class="card mb-3 p-3 text-center" style="max-width: 700px; margin: 40px auto; border-radius: 15px;">
            <strong>${post.userEmail || "Unknown User"}</strong>
            <div class="my-3">${carouselHTML}</div>
            <p>${post.data || ""}</p>

            <div class="mt-3 d-flex justify-content-center align-items-center gap-4">
              <button class="btn btn-link btn-sm like-btn" style="color: gray;">
                <i class="bi bi-heart"></i>
              </button>
              <span>${post.likes || 0}</span>

              <button class="btn btn-link btn-sm save-btn" style="color: gray;">
                <i class="bi bi-bookmark"></i>
              </button>
              <span>${post.saves || 0}</span>

              <button class="btn btn-link btn-sm share-btn" data-id="${post._id}" style="color: gray;">
                <i class="bi bi-share"></i>
              </button>
            </div>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error("Error loading shared post:", err);
    res.status(500).send("<h3>Server error while loading post.</h3>");
  }
});*/

app.get("/post/:postId", async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).send("Post not found");

    res.sendFile(path.join(__dirname, "resend.html"));
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});



// API route to fetch post data
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
        res.send("Logged out");
    });
});

// VIEW: all data route
router.get("/view", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });

   
// ✅ Detect current login status
const currentUser = res.locals.currentUser ?? null;     // User info if logged in
const loginSession = res.locals.loginSession ?? null;   // Session info if logged in
const isLoggedIn = Boolean(currentUser);                // true if logged in
    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>CollegeZ</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  
  <style>
/* === Header === */
header {
  background-color: #228B22;
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
  z-index: 1000;
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
    width: 40px;
    height: 40px;
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
    width: 35px; /* smaller icons for mobile */
    height: 35px;
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
  <header>
  <h1 class="m-0">CollegenZ</h1>
  <input type="text" class="form-control w-25" placeholder="Search...">
</header>

  <main class="d-flex" style="margin-top: 50px;">
    <div class="container me-auto">
      <!-- Join With Us Section -->
      <div class="card mb-4 p-3 d-flex flex-row justify-content-between align-items-center">
        <div>
          <h2>Welcome ${isLoggedIn ? currentUser.name : ""}</h2>
          <p>${isLoggedIn ? "Welcome back! Explore new posts and connect with others." : "Represent your college with us"}</p>
          ${isLoggedIn ? `
            <a href="/upload" class="btn btn-success">Create Post</a>
          ` : `
            <a href="/login" class="btn btn-primary">Join Now</a>
          `}
        </div>
        <div style="font-size: 2rem;">👤➕</div>
      </div>

      <hr>`;

    // 🔹 Display all posts
posts.forEach((p, index) => {
  const images = Array.isArray(p.imageurl) ? p.imageurl : [p.imageurl];

  // Carousel Indicators (bottom dots) — only if multiple images
  let indicators = "";
  images.forEach((_, i) => {
    indicators += `
      <button type="button" data-bs-target="#carousel-${index}" data-bs-slide-to="${i}" 
        ${i === 0 ? "class='active' aria-current='true'" : ""} 
        aria-label="Slide ${i + 1}"></button>
    `;
  });

  // Carousel Items (images)
  let carouselItems = "";
  images.forEach((img, i) => {
    carouselItems += `
      <div class="carousel-item ${i === 0 ? "active" : ""}">
        <div class="position-relative">
          <img src="${img}" class="d-block mx-auto img-fluid"
     style="border-radius:10px; width:100%; height:auto; max-height:600px; object-fit:contain; background:#f8f9fa;" alt="Post image">

          <!-- Slide Number: ONLY for multi-image posts -->
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

      <!-- Indicators: ONLY for multi-image posts -->
      ${images.length > 1 ? `
        <div class="carousel-indicators">
          ${indicators}
        </div>
      ` : ""}

      <div class="carousel-inner">
        ${carouselItems}
      </div>

      <!-- Prev/Next controls: ONLY for multi-image posts -->
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

  // Full Card Layout for Post
  html += `
    <div class="card mb-3 p-3 text-center" style="max-width: 700px; margin: 20px auto; border-radius: 15px;">
      <strong>${p.userEmail}</strong>
      <div class="my-3">${carousel}</div>
      <p>${p.data}</p>
      <!-- Like & Save Buttons -->
      <div class="mt-3 d-flex justify-content-center align-items-center gap-4">
        <button class="btn btn-link btn-sm like-btn" data-id="${p._id}" style="color: gray; font-size: 1.2rem;" ${!isLoggedIn ? "disabled" : ""}>
          <i class="bi bi-heart"></i>
        </button>
        <span class="like-count" id="like-count-${p._id}">${p.likes || 0}</span>

        <button class="btn btn-link btn-sm save-btn" data-id="${p._id}" style="color: gray; font-size: 1.2rem;" ${!isLoggedIn ? "disabled" : ""}>
          <i class="bi bi-bookmark"></i>
        </button>
        <span class="save-count" id="save-count-${p._id}">${p.saves || 0}</span>

         <!-- ✅ Share Button -->
      <button class="btn btn-link btn-sm share-btn" data-id="${p._id}" style="color: gray; font-size: 1.2rem;">
        <i class="bi bi-share"></i>
      </button>
      </div>
    </div>
  `;
});
    // 🔹 Sidebar & Scripts
    html += `
    </div>
  </main>

  <!-- Sidebar -->
  <!-- Sidebar / Bottom Navigation -->
<div class="sidebar">
  <div class="icon">
    <a href="/view"><img src="/uploads/home.png" alt="Home" ></a>
    <a href="/login"><img src="/uploads/settings.png" alt="Settings" ></a>
    <a href="/upload"><img src="/uploads/add.png" alt="Add" ></a>
    <a href="/calender"><img src="/uploads/calender.png" alt="Calendar" ></a>
  </div>
</div>
  <script src="/share-script.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script>
    const currentUserId = "${isLoggedIn ? currentUser._id : ""}";

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

        const res = await fetch("/save/" + postId, {
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
