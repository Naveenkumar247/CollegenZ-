const express = require("express");
const router = express.Router();
const passport = require("passport");

const genz = require("../models/primary/User");
const Session = require("../models/primary/Session");
const { hashPassword } = require("../utils/password");

const { sendLoginAlert } = require("../services/mailService"); // ✅ ADD

/* ======================
   SIGNUP
====================== */
router.post("/signup", async (req, res) => {
  try {
    const { name, username, email, password, college, dream } = req.body;

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

    res.json({ success: true, redirectUrl: "/" });

  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ success: false });
  }
});


/* ======================
   LOGIN
====================== */
router.post("/login", (req, res, next) => {

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

      const ip =
        req.headers["x-forwarded-for"] || req.socket.remoteAddress;

      const device = req.headers["user-agent"];

      sendLoginAlert({
        email: user.email,
        username: user.username || user.name,
        ip,
        device
      }).catch(err =>
        console.error("Login alert failed:", err)
      );

      res.json({ success: true, redirectUrl: "/" });

    });

  })(req, res, next);

});


/* ======================
   GOOGLE AUTH
====================== */

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);


router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup" }),
  (req, res) => {

    req.session.userId = req.user._id;

    const ip =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    const device = req.headers["user-agent"];

    sendLoginAlert({
      email: req.user.email,
      username: req.user.username || req.user.name,
      ip,
      device
    }).catch(console.error);

    res.redirect("/");
  }
);

module.exports = router;
