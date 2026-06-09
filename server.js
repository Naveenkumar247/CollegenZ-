require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const multer = require("multer");
const cron = require("node-cron");
const nodemailer = require("nodemailer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const webpush = require('web-push');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --------------------
// DATABASE MODELS
// --------------------
const genz = require("./models/primary/User");
const Post = require("./models/primary/Post");
const Notification = require("./models/primary/Notification");
const Message = require("./models/primary/Message");
const Certificate = require("./models/secondary/Certificate");

// --------------------
// ROUTE IMPORTS
// --------------------
const collegenzCertificateRoutes = require("./routes/collegenz.certificate.routes.js");
const adminRoutes = require("./routes/admin.certificate.routes.js");
const profileRoutes = require("./routes/profile.routes");
const postActions = require("./routes/postActions");
const postsRoute = require("./routes/posts");
const shareRoutes = require("./routes/share.routes");
const friendRoutes = require("./routes/friends");
const followRoutes = require("./routes/follows");
const newsRoutes = require("./routes/news");
const chatFriendsRouter = require("./routes/chatfriends"); 
const dashboardRoutes = require('./routes/dashboard');

// --------------------
// CUSTOM MIDDLEWARES
// --------------------
const currentUser = require("./middlewares/currentUser");

// --------------------
// WEB PUSH CONFIGURATION
// --------------------
const publicVapidKey = process.env.VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;

webpush.setVapidDetails(
  'mailto:naveenkumar@collegenz.in', 
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
// BODY PARSER & HEADERS
// --------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

// --------------------
// STATIC FILES
// --------------------
app.use("/uploads", express.static("uploads"));
app.use("/", express.static("assets"));
app.use(express.static("public"));

// --------------------
// SESSION CONFIGURATION
// --------------------
app.use(
  session({
    name: "collegenz.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 24 * 60 * 60, 
    }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", 
      sameSite: "lax",
    },
    proxy: true, 
  })
);

// --------------------
// PASSPORT & CONTEXT AUTH
// --------------------
require("./config/passport"); 
app.use(passport.initialize());
app.use(passport.session());
app.use(currentUser);

// Fallback session matching tracking local setup
app.use(async (req, res, next) => {
  if (req.session?.userId) {
    res.locals.currentUser = await genz.findById(req.session.userId);
  } else {
    res.locals.currentUser = null;
  }
  next();
});

// Verification Guard Middleware
async function isFriend(req, res, next) {
  try {
    if (!res.locals.currentUser) {
      console.log("❌ No currentUser in res.locals");
      return res.status(401).send("Please login to chat");
    }

    const userId = res.locals.currentUser._id.toString();
    const friendId = req.params.friendId;

    const user = await genz.findById(userId);
    if (!user) {
      return res.status(401).send("User not found");
    }

    const isFriend = user.friends.some(id => id.toString() === friendId);
    if (!isFriend) {
      return res.status(403).send("You can only chat with friends");
    }

    next();
  } catch (err) {
    console.error("🔥 isFriend error:", err);
    res.status(500).send("Server error");
  }
}

// Multer Storage Infrastructure Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// --------------------
// BACKEND API ROUTES
// --------------------
app.use("/api/posts", postsRoute);
app.use("/posts", postActions);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/collegenz/certificate", collegenzCertificateRoutes);
app.use("/api/admin/certificate", adminRoutes);

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

// Services
require("./services/autoDelete");
require("./services/eventReminder");

// --------------------
// VIEW PAGES ENGINE (HTML DELIVERIES)
// --------------------
app.get("/home", (req, res) => res.sendFile(path.join(__dirname, "home.html")));
app.get("/signup", (req, res) => res.sendFile(path.join(__dirname, "sign.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "login.html")));
app.get("/upload", (req, res) => res.sendFile(path.join(__dirname, "upload.html")));
app.get("/shorts", (req, res) => res.sendFile(path.join(__dirname, "shorts.html")));
app.get("/roadmap", (req, res) => res.sendFile(path.join(__dirname, "roadmap.html")));
app.get("/aboutus", (req, res) => res.sendFile(path.join(__dirname, "about.html")));
app.get("/notifications", (req, res) => res.sendFile(path.join(__dirname, "notify.html")));
app.get("/messages", (req, res) => res.sendFile(path.join(__dirname, "chatfriends.html"))); 
app.get("/friends", (req, res) => res.sendFile(path.join(__dirname, "chatfriends.html"))); 
app.get("/admin/featured", (req, res) => res.sendFile(path.join(__dirname, "featured-submit.html")));
app.get("/admin/certificate", (req, res) => res.sendFile(path.join(__dirname, "views", "admin.html")));
app.get("/certificate/:code", (req, res) => res.sendFile(path.join(__dirname, "views", "collegenz-certificate.html")));

app.get('/internship-login', (req, res) => res.sendFile(path.join(__dirname, 'internship-login.html')));
app.get('/internship-signup', (req, res) => res.sendFile(path.join(__dirname, 'internship-signup.html')));
app.get('/virtualroom', (req, res) => res.sendFile(path.join(__dirname,'src', 'meeting.html')));
app.get("/admin/roles", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "admin-roles.html"));
});


app.get("/dashboard", (req, res) => {
  if (!req.user) {
    return res.redirect("/internship-login");
  }
  res.sendFile(path.join(__dirname, "dashboard.html"));
});

app.get("/chat/:friendId", isFriend, (req, res) => {
  res.sendFile(path.join(__dirname, "chat.html"));
});

// --------------------
// UTILITY & METRIC ROUTING API
// --------------------
app.get("/api/config", (req, res) => {
  res.json({ vapidPublicKey: process.env.VAPID_PUBLIC_KEY });
});

app.get("/api/user/:id", async (req, res) => {
  try {
    const user = await genz.findById(req.params.id, "name picture");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to load user" });
  }
});

app.get("/api/messages/:friendId", async (req, res) => {
  try {
    if (!res.locals.currentUser) return res.status(401).json([]);
    const myId = res.locals.currentUser._id;
    const friendId = req.params.friendId;

    const history = await Message.find({
      $or: [
        { sender: myId, receiver: friendId },
        { sender: friendId, receiver: myId }
      ]
    }).sort({ createdAt: 1 });

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Failed to load messages" });
  }
});

app.get("/api/post/:postId", async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/share/:postId", async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).send("Post not found");

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
              setTimeout(() => { window.location.href = "/view/${post._id}"; }, 1500);
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
    res.status(500).send("Error generating share link");
  }
});

app.get("/view/:postId", (req, res) => {
  res.sendFile(path.join(process.cwd(), "resend.html"));
});

app.delete("/deletepost/:id", async (req, res) => {
  try {
    const deletedPost = await Post.findByIdAndDelete(req.params.id);
    if (!deletedPost) return res.status(404).json({ message: "Post not found" });
    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error while deleting post" });
  }
});

app.get("/get-profile/:id", async (req, res) => {
  try {
    const profileUserId = req.params.id;
    const currentUserId = res.locals.currentUser?._id;
    const profileUser = await genz.findById(profileUserId).select("-password");

    if (!profileUser) return res.status(404).json({ error: "User not found" });

    let relationship = { isFriend: false, requestSent: false, requestReceived: false };

    if (currentUserId) {
      const currentUser = await genz.findById(currentUserId);
      relationship.isFriend = currentUser.friends?.some(id => id.equals(profileUserId));
      relationship.requestSent = currentUser.friendRequestsSent?.some(id => id.equals(profileUserId));
      relationship.requestReceived = currentUser.friendRequestsReceived?.some(id => id.equals(profileUserId));
    }

    res.json({ ...profileUser.toObject(), relationship });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Feed Filtering System Interface
app.get("/posts/filter", async (req, res) => {
  try {
    const { type } = req.query;
    let post;

    if (type === "event") {
      const events = await Post.find({ postType: "event" }).sort({ createdAt: -1 });
      const others = await Post.find({ postType: { $ne: "event" } }).sort({ createdAt: -1 });
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

    post = await Post.find().sort({ createdAt: -1 });
    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DB Migration / Schema Patching Route
app.get("/updateOldUsers", async (req, res) => {
  try {
    await genz.updateMany({}, {
      $set: { learningpath: null, instagram: null, linkedin: null, youtube: null, website: null, accountType: "public" }
    });
    await genz.updateMany({
      $or: [
        { friends: { $exists: false } },
        { friendRequestsSent: { $exists: false } },
        { friendRequestsReceived: { $exists: false } }
      ]
    }, {
      $set: { friends: [], friendRequestsSent: [], friendRequestsReceived: [], pushSubscription: null }
    });
    res.send("✅ All old users updated successfully!");
  } catch (err) {
    res.status(500).send("❌ Error updating users");
  }
});

// Logout Router
app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// --------------------
// SEO CRAWLER HANDLERS
// --------------------
app.use((req, res, next) => {
  const ua = req.headers["user-agent"] || "";
  if (ua.includes("Googlebot") || ua.match(/bot|crawl|spider|slurp|bing/i)) return next();
  next();
});

app.get("/sitemap.xml", (req, res) => res.sendFile(path.join(__dirname, "sitemap.xml")));
app.get("/calender", (req, res) => res.sendFile(path.join(__dirname, "calender.html")));

app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(`User-agent: *
Allow: /

Sitemap: https://collegenz.in/sitemap.xml`);
});

// --------------------
// INTEGRATED SOCKET.IO ENGINE
// --------------------
io.on("connection", (socket) => {
  console.log("✅ User connected to socket:", socket.id);

  socket.on("joinRoom", (room) => {
    socket.join(room);
    console.log("🏠 Room Joined:", room);
  });

  socket.on("sendMessage", async (data) => {
    try {
      const newMessage = await Message.create({
        sender: data.sender,
        receiver: data.receiver,
        text: data.text
      });

      io.to(data.room).emit("newMessage", {
        ...data,
        _id: newMessage._id,
        createdAt: newMessage.createdAt
      });

      const receiver = await genz.findById(data.receiver);
      if (receiver && receiver.pushSubscription) {
        const payload = JSON.stringify({
          title: "CollegenZ",
          body: `New message: ${data.text.substring(0, 30)}${data.text.length > 30 ? '...' : ''}`,
          url: `/chat/${data.sender}`
        });

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

// --------------------
// SERVER BOOTSTRAP
// --------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
