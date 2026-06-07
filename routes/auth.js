const express = require("express");
const router = express.Router();
const passport = require("passport");

const genz = require("../models/primary/User");
const Session = require("../models/primary/Session");
const { hashPassword } = require("../utils/password");
const { sendLoginAlert } = require("../services/mailService");

// Enforce strict routing destinations based on login origin
const getStrictRedirectTarget = (origin, userId) => {
  if (origin === "internship") {
    return `/dashboard?id=${userId}`; // Bypasses gateway, goes directly to dashboard view
  }
  return "/"; // Standard platform landing page
};

/* ======================
   INTERNSHIP & COMMON SIGNUP
====================== */
router.post("/signup", async (req, res) => {
  try {
    const { name, username, email, password, college, dream, origin } = req.body;
    const lowerEmail = email.toLowerCase();
    
    // Check if the user document already exists
    let user = await genz.findOne({ email: lowerEmail });
    const hashedPassword = await hashPassword(password);

    if (user) {
      // 💡 NEW PLAN LOGIC: If a mentor added the email pre-emptively, the password field is null.
      // The intern can "Sign Up" to claim this account by assigning their custom password.
      if (!user.password) {
        user.password = hashedPassword;
        if (name) user.name = name;
        if (username) user.username = username.toLowerCase().trim();
        if (college) user.college = college;
        if (dream) user.dream = dream;
        
        // Ensure they have an active role status updated away from "user"
        if (origin === "internship" && user.zrole === "user") {
          user.zrole = "intern";
        }
        
        await user.save();
      } else {
        return res.status(400).json({ success: false, message: "User already exists. Please log in." });
      }
    } else {
      // Standard brand-new user generation
      user = await genz.create({
        name: name || "Intern User",
        username: username ? username.toLowerCase().trim() : `user_${Date.now()}`,
        email: lowerEmail,
        password: hashedPassword,
        college: college || null,
        dream: dream || null,
        accountType: "public",
        zrole: origin === "internship" ? "intern" : "user",
        // Seed an initial empty internship array block to guarantee frontend tracking variables compile
        internshipProfiles: origin === "internship" ? [{
          companyName: "CodeAlpha",
          status: "ACTIVE",
          startDate: "09.06.2026",
          endDate: "09.07.2026",
          deadlineDate: "09.08.2026",
          progress: 0,
          noOfTask: 0,
          noOfCompletedTask: 0,
          noOfPendingTask: 0,
          nameOfMentor: "Assigned via Portal"
        }] : []
      });
    }

    // Set Session Key
    req.session.userId = user._id;

    await Session.create({
      userId: user._id,
      email: user.email,
      sessionId: req.sessionID,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    res.json({ success: true, redirectUrl: getStrictRedirectTarget(origin, user._id) });

  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ success: false, message: "Server error during registration." });
  }
});

/* ======================
   INTERNSHIP & COMMON LOGIN
====================== */
router.post("/login", (req, res, next) => {
  const { origin } = req.body; 

  passport.authenticate("local", async (err, user, info) => {
    if (!user) {
      return res.status(400).json({ success: false, message: info?.message || "Invalid credentials." });
    }

    req.logIn(user, async () => {
      req.session.userId = user._id;

      await Session.create({
        userId: user._id,
        email: user.email,
        sessionId: req.sessionID,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      // Send Login Alert
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const device = req.headers["user-agent"];

      sendLoginAlert({
        email: user.email,
        username: user.username || user.name,
        ip,
        device
      }).catch(err => console.error("Login alert failed:", err));

      res.json({ success: true, redirectUrl: getStrictRedirectTarget(origin, user._id) });
    });
  })(req, res, next);
});

/* ======================
   GOOGLE AUTH STRATEGIES
====================== */
router.get("/auth/google", (req, res, next) => {
  const origin = req.query.origin === "internship" ? "internship" : "general";
  passport.authenticate("google", { 
    scope: ["profile", "email"],
    state: origin 
  })(req, res, next);
});

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup" }),
  async (req, res) => {
    req.session.userId = req.user._id;

    const origin = req.query.state === "internship" ? "internship" : "general";

    // 💡 AUTOMATIC PROVISIONING: Anyone joining via internship link gets authenticated immediately.
    // If they have a blank 'user' role status, we change it to 'intern' and assign a base tracking profile.
    if (origin === "internship" && (!req.user.internshipProfiles || req.user.internshipProfiles.length === 0)) {
      await genz.findByIdAndUpdate(req.user._id, {
        zrole: "intern",
        internshipProfiles: [{
          companyName: "CodeAlpha",
          status: "ACTIVE",
          startDate: "09.06.2026",
          endDate: "09.07.2026",
          deadlineDate: "09.08.2026",
          progress: 10,
          noOfTask: 4,
          noOfCompletedTask: 0,
          noOfPendingTask: 4,
          nameOfMentor: "Amir"
        }]
      });
    }

    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const device = req.headers["user-agent"];
    sendLoginAlert({
      email: req.user.email,
      username: req.user.username || req.user.name,
      ip,
      device
    }).catch(console.error);

    res.redirect(getStrictRedirectTarget(origin, req.user._id));
  }
);

module.exports = router;
