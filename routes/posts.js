const express = require("express");
const router = express.Router();
const Post = require("../models/primary/Post");

router.get("/", async (req, res) => {

  console.log("🔥 /api/posts hit");

  try {

    const posts = await Post.find({})
      .populate("userId", "username") // 🔥 THIS LINE FIXES EVERYTHING
      .sort({ createdAt: -1 });

    console.log("POSTS FETCHED:", posts.length);

    res.json({ posts });

  } catch (err) {
    console.error("FETCH ERROR:", err);
    res.status(500).json({ posts: [] });
  }
});

module.exports = router;
