const express = require("express");
const router = express.Router();
const genz = require("../models/primary/User");

router.post("/:targetId", async (req, res) => {
  try {
    if (!req.session.userId) return res.status(401).json({ error: "Not logged in" });

    const currentUserId = req.session.userId;
    const targetId = req.params.targetId;
    
    // Fetch both users at the same time for better performance
    const [user, target] = await Promise.all([
      genz.findById(currentUserId),
      genz.findById(targetId)
    ]);

    if (!user || !target) return res.status(404).json({ error: "User not found" });

    const isFollowing = user.following.includes(targetId);

    if (isFollowing) {
      user.following.pull(targetId);
      target.followers.pull(currentUserId);
    } else {
      user.following.push(targetId);
      target.followers.push(currentUserId);
    }

    // CRITICAL FIX: Save both simultaneously to prevent mobile timeout errors
    await Promise.all([user.save(), target.save()]);

    res.json({ following: !isFollowing });
  } catch (err) {
    console.error("FOLLOW ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/status/:targetId", async (req, res) => {
  try {
    if (!req.session.userId) return res.json({ following: false });

    const currentUser = await genz.findById(req.session.userId);
    const following = currentUser.following.includes(req.params.targetId);

    res.json({ following });
  } catch (err) {
    console.error("STATUS ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
