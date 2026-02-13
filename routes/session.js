// routes/session.js
const express = require("express");
const router = express.Router();

const genz = require("../models/primary/User");      // your user model
const Session = require("../models/primary/Session");

/* ==========================
   CREATE SESSION (REUSABLE)
========================== */
router.post("/create-session", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await genz.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const sessionDoc = await Session.create({
      name: user.name,
      username: user.username || null,
      college: user.college || null,
      email: user.email,
      userId: user._id,
      sessionId: req.sessionID,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    console.log("🟢 Session stored:", sessionDoc.sessionId);

    res.json({
      success: true,
      message: "Session created",
      session: sessionDoc,
    });
  } catch (err) {
    console.error("❌ Session creation error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
