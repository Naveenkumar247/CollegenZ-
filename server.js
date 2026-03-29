require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const passportroutes = require("./config/passport");
const bcryptjs = require("bcryptjs");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const LocalStrategy = require("passport-local").Strategy;
const multer = require("multer");
const router = express.Router();
const cron = require("node-cron");
const nodemailer = require("nodemailer");
const sessionSecret = process.env.SESSION_SECRET;
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
console.log("✅ Socket.io initialized");
const genz = require("./models/primary/User");
const Post = require("./models/primary/Post");
const Notification = require("./models/primary/Notification");
const Message = require("./models/primary/Message");

const Certificate = require("./models/secondary/Certificate");
const collegenzCertificateRoutes = require("./routes/collegenz.certificate.routes.js");
const adminRoutes = require("./routes/admin.certificate.routes.js");
console.log("✅ Socket.io initialized");
const currentUser = require("./middlewares/currentUser");
const profileRoutes = require("./routes/profile.routes");
const postActions = require("./routes/postActions");
const postsRoute = require("./routes/posts");
const shareRoutes = require("./routes/share.routes");
const friendRoutes = require("./routes/friends");
const followRoutes = require("./routes/follows");
const newsRoutes = require("./routes/news");
const chatFriendsRouter = require("./routes/chatfriends"); 
const webpush = require('web-push');
const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

webpush.setVapidDetails(
  'mailto:naveenkumar@collegenz..in', // Required identifier
  publicVapidKey,
  privateVapidKey
);




// --------------------
// DB CONNECT
// --------------------
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxPoolSize: 5
})
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ Mongo error:", err));

// --------------------
// BODY PARSER
// --------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --------------------
// STATIC FILES
// --------------------
app.use("/uploads", express.static("uploads"));
app.use("/", express.static("assets"));
app.use(express.static("public"));
// --------------------
// SESSION (🔥 MUST BE BEFORE PASSPORT)
// --------------------
app.use(
  session({
    name: "collegenz.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 24 * 60 * 60, // 1 day
    }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: false, // set true in production (HTTPS)
    },
  })
);

// --------------------
// PASSPORT (🔥 AFTER SESSION)
// --------------------
require("./config/passport"); // <-- strategy setup
app.use(passport.initialize());
app.use(passport.session());
app.use(currentUser);

// --------------------
// ROUTES (🔥 AFTER PASSPORT)
// --------------------
// API FIRST
app.use("/api/posts", postsRoute);
app.use("/posts", postActions);

// Pages AFTER
app.use("/", require("./routes/auth"));
app.use("/", require("./routes/session"));
app.use("/", require("./routes/featured"));
app.use("/", require("./routes/featured-page"));
app.use("/", require("./routes/upload"));
app.use("/", require("./routes/featured-api"));
app.use("/", require("./routes/profile"));
app.use("/", profileRoutes);
app.use("/", require("./routes/home"));
app.use("/", shareRoutes);
app.use("/", require("./routes/share.routes.js"));
app.use("/", require("./routes/user.api"));
app.use("/", require("./routes/me.api"));
app.use("/friend", friendRoutes);
app.use("/follow", followRoutes);
app.use("/", chatFriendsRouter);
app.use("/api", newsRoutes);
require("./services/autoDelete");
require("./services/eventReminder");

// --------------------
// SERVER START
// --------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});


// File upload setup using multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});



io.on("connection", (socket) => {
  console.log("New Socket Connection:", socket.id);

  socket.on("joinRoom", (room) => {
    socket.join(room);
  });

  socket.on("sendMessage", async (data) => {
    try {
      // 1. Save to DB
      const newMessage = await Message.create({
        sender: data.sender,
        receiver: data.receiver,
        text: data.text
      });

      // 2. Emit to the room (includes the database ID and Timestamp)
      io.to(data.room).emit("newMessage", {
        ...data,
        _id: newMessage._id,
        createdAt: newMessage.createdAt
      });
    } catch (err) {
      console.error("Socket Message Error:", err);
    }
  });

  socket.on("typing", (room) => {
    socket.to(room).emit("typing");
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
app.get("/shorts", (req, res) => {
    res.sendFile(path.join(__dirname, "shorts.html"));
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
app.get("/admin/certificate", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "admin.html"));
});
app.get("/admin/featured", (req, res) => {
  res.sendFile(path.join(__dirname, "featured-submit.html"));
});
app.get("/messages", (req, res) => {
  res.sendFile(path.join(__dirname, "chatfriends.html")); 
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
          friendRequestsReceived: [],
          pushSubscription: null
        }
      }
    );

    res.send("✅ All old users updated successfully!");
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Error updating users");
  }
});


io.on("connection", socket => {
  console.log("✅ User connected to socket:", socket.id);

  socket.on("joinRoom", room => {
    socket.join(room);
    console.log("Room Joined:", room);
  });

  socket.on("sendMessage", async data => {
    try {
      // 1. Save to Database
      const newMessage = await Message.create({
        sender: data.sender,
        receiver: data.receiver,
        text: data.text
      });

      // 2. Real-time emit to the specific room
      // We include the timestamp and ID from the DB
      io.to(data.room).emit("newMessage", {
        ...data,
        createdAt: newMessage.createdAt,
        _id: newMessage._id
      });

      // 3. Trigger Web Push Notification
      const receiver = await genz.findById(data.receiver);
      
      // Only send if the user has a subscription stored
      if (receiver && receiver.pushSubscription) {
        const payload = JSON.stringify({
          title: "CollegenZ",
          body: `New message: ${data.text.substring(0, 30)}${data.text.length > 30 ? '...' : ''}`,
          url: `/chat/${data.sender}`
        });

        const webpush = require('web-push'); // Ensure this is required at the top
        webpush.sendNotification(receiver.pushSubscription, payload)
          .catch(err => console.error("❌ Push Notification Error:", err));
      }

    } catch (err) {
      console.error("🔥 Error saving/sending message:", err);
    }
  });

  socket.on("typing", (room) => {
    socket.to(room).emit("typing");
  });
});


// Add this near your other routes
app.get("/api/config", (req, res) => {
  res.json({
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY
  });
});



app.get("/friends", (req, res) => {
  // IMPORTANT: Adjust the path below based on where you saved chatfriends.html!
  // If it's in a folder called 'public' or 'views', add that to the path.join.
  res.sendFile(path.join(__dirname, "chatfriends.html")); 
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


// Add this near your other routes in server.js
app.get("/api/messages/:friendId", async (req, res) => {
  try {
    // res.locals.currentUser comes from your existing middleware
    if (!res.locals.currentUser) return res.status(401).json([]);

    const myId = res.locals.currentUser._id;
    const friendId = req.params.friendId;

    const history = await Message.find({
      $or: [
        { sender: myId, receiver: friendId },
        { sender: friendId, receiver: myId }
      ]
    }).sort({ createdAt: 1 }); // Oldest first

    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load messages" });
  }
});



/* ---------------- CERTIFICATE PAGE (IMPORTANT: FIRST) ---------------- */
app.get("/certificate/:code", (req, res) => {
  res.sendFile(
    path.join(__dirname, "views", "collegenz-certificate.html")
  );
});


/* Admin page */
app.get("/admin/certificate", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "admin.html"));
});

/* Routes */
app.use("/api/collegenz/certificate", collegenzCertificateRoutes);
app.use("/api/admin/certificate", adminRoutes);




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
// ----------------------
// 1. Share Page (Shows Loading UI & Meta Tags for WhatsApp)
// ----------------------
app.get("/share/:postId", async (req, res) => {
  try {
    // Note: Make sure 'Post' is imported at the top of server.js!
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).send("Post not found");
    }

    const image = Array.isArray(post.imageurl) ? post.imageurl[0] : post.imageurl;
    const caption = post.data ? post.data.substring(0, 150) + "..." : "Check this post on CollegenZ";
    const url = "https://collegenz.in/share/" + post._id;

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta property="og:title" content="CollegenZ">
          <meta property="og:description" content="${caption}">
          <meta property="og:image" content="${image}">
          <meta property="og:url" content="${url}">
          <meta name="twitter:card" content="summary_large_image">
          <style>
              body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; background-color: #f4f6f9; font-family: sans-serif; }
              .loader-card { background: white; padding: 40px; border-radius: 20px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
              .spinner { width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #007bff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px auto; }
              @keyframes spin { to { transform: rotate(360deg); } }
          </style>
          <script>
              // This smoothly redirects to the actual post viewer page!
              setTimeout(() => {
                  window.location.href = "/view/${post._id}"; 
              }, 1500);
          </script>
      </head>
      <body>
          <div class="loader-card">
              <div class="spinner"></div>
              <h2>CollegenZ</h2>
              <p>Taking you to the post...</p>
          </div>
      </body>
      </html>
    `);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating share link");
  }
});

// ----------------------
// 2. View Post Page (Serves resend.html)
// ----------------------
app.get("/view/:postId", (req, res) => {
  const path = require("path");
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

