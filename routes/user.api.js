const express = require("express");
const router = express.Router();
const User = require("../models/primary/User");

/* GET MINI PROFILE */
router.get("/api/user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("username email picture bio college");

    if (!user)
      return res.status(404).json({ error: "User not found" });

    res.json(user);

  } catch (err) {
    console.error("USER FETCH ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
