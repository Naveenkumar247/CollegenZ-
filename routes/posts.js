const express = require("express");
const router = express.Router();
const Post = require("../models/primary/Post");

router.get("/", async (req, res) => {

  console.log("🔥 /api/posts hit");

  try {

    const count = await Post.countDocuments();
    console.log("TOTAL POSTS IN DB:", count);

    const posts = await Post.find({});

    console.log("POSTS FETCHED:", posts.length);

    res.json({ posts });

  } catch (err) {
    console.error("FETCH ERROR:", err);
    res.status(500).json({ posts: [] });
  }
});

module.exports = router;
