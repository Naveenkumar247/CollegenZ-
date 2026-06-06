const express = require("express");
const router = express.Router();
const passport = require("passport");

const genz = require("../models/primary/User");
const Session = require("../models/primary/Session");
const { hashPassword } = require("../utils/password");

const { sendLoginAlert } = require("../services/mailService");

// Enforce strict target routing isolation based on exact origin parameters
const getStrictRedirectTarget = (origin) => {
  if (origin === "internship") {
    return "/internship-login"; // Strictly forces internship routing checkpoint
  }
  return "/"; // Strictly forces standard platform home page route
};

/* ======================
   SIGNUP
====================== */
router.post("/signup", async (req, res) => {
  try {
    const { name, username, email, password, college, dream, origin } = req.body;

    const lowerEmail = email.toLowerCase();
    const exists = await genz.findOne({ email: lowerEmail });

    if (exists)
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });

    const hashedPassword = await hashPassword(password);

    const user = await genz.create({
      name,
      username,
      email: lowerEmail,
      password: hashedPassword,
      college,
      dream,
      accountType: "public",
    });

    req.session.userId = user._id;

    await Session.create({
      userId: user._id,
      email: user.email,
      sessionId: req.sessionID,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Enforce strict redirect boundary on sign up
    res.json({ success: true, redirectUrl: getStrictRedirectTarget(origin) });

  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ success: false });
  }
});


/* ======================
   LOGIN
====================== */
router.post("/login", (req, res, next) => {
  // Read target platform flag explicitly sent from the specific login page form
  const { origin } = req.body; 

  passport.authenticate("local", async (err, user, info) => {

    if (!user)
      return res
        .status(400)
        .json({ success: false, message: info?.message });

    req.logIn(user, async () => {

      req.session.userId = user._id;

      await Session.create({
        userId: user._id,
        email: user.email,
        sessionId: req.sessionID,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      /* ======================
         LOGIN ALERT EMAIL
      ====================== */
      const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const device = req.headers["user-agent"];

      sendLoginAlert({
        email: user.email,
        username: user.username || user.name,
        ip,
        device
      }).catch(err =>
        console.error("Login alert failed:", err)
      );

      // Return the strictly bounded URL context back to the frontend AJAX processor
      res.json({ success: true, redirectUrl: getStrictRedirectTarget(origin) });

    });

  })(req, res, next);
});


/* ======================
   GOOGLE AUTH
====================== */

// Intercept standard Google trigger to preserve the strict origin environment state
router.get(
  "/auth/google",
  (req, res, next) => {
    // Read context query (?origin=internship) or default strictly to general platform tracking
    const origin = req.query.origin === "internship" ? "internship" : "general";
    
    passport.authenticate("google", { 
      scope: ["profile", "email"],
      state: origin // Send to Google security handshake ecosystem
    })(req, res, next);
  }
);


router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup" }),
  (req, res) => {

    req.session.userId = req.user._id;

    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const device = req.headers["user-agent"];

    sendLoginAlert({
      email: req.user.email,
      username: req.user.username || req.user.name,
      ip,
      device
    }).catch(console.error);

    // Retrieve original authorization context string returned from Google
    const origin = req.query.state === "internship" ? "internship" : "general";

    // Perform strict separation mapping redirect
    res.redirect(getStrictRedirectTarget(origin));
  }
);

module.exports = router;
