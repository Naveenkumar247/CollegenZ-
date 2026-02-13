const express = require("express");
const router = express.Router();

const Post = require("../models/primary/Post");
const genz = require("../models/primary/User");

/* ================= LIKE ================= */

router.post("/posts/:id/like", async (req, res) => {

  if (!req.session.userId)
    return res.json({ error: "login" });

  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.json({ error: "Post not found" });

    const uid = req.session.userId.toString();

    if (!post.likedBy) post.likedBy = [];

    const liked = post.likedBy.includes(uid);

    if (liked) {
      post.likedBy.pull(uid);
      post.likes--;
    } else {
      post.likedBy.push(uid);
      post.likes++;
    }

    await post.save();

    res.json({ likes: post.likes, liked: !liked });

  } catch (err) {
    console.error("LIKE ERROR:", err);
    res.json({ error: "server" });
  }
});


/* ================= SAVE ================= */

router.post("/posts/:id/save", async (req, res) => {

  if (!req.session.userId)
    return res.json({ error: "login" });

  try {
    const post = await Post.findById(req.params.id);
    const user = await genz.findById(req.session.userId);

    if (!post || !user) return res.json({ error: "not found" });

    if (!post.savedBy) post.savedBy = [];
    if (!user.savedPosts) user.savedPosts = [];

    const uid = user._id.toString();

    const saved = post.savedBy.includes(uid);

    if (saved) {
      post.savedBy.pull(uid);
      post.saves--;
      user.savedPosts = user.savedPosts.filter(p => p.postId != post.id);
    } else {
      post.savedBy.push(uid);
      post.saves++;
      user.savedPosts.push({ postId: post.id });
    }

    await post.save();
    await user.save();

    res.json({ saves: post.saves, saved: !saved });

  } catch (err) {
    console.error("SAVE ERROR:", err);
    res.json({ error: "server" });
  }
});


/* ================= SHARE ================= */

router.post("/posts/:id/share", async (req, res) => {

  if (!req.session.userId)
    return res.json({ error: "login" });

  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.json({ error: "not found" });

    if (!post.sharedBy) post.sharedBy = [];

    const uid = req.session.userId.toString();
    const shared = post.sharedBy.includes(uid);

    if (shared) {
      post.sharedBy.pull(uid);
      post.shares--;
    } else {
      post.sharedBy.push(uid);
      post.shares++;
    }

    await post.save();

    res.json({ shares: post.shares, shared: !shared });

  } catch (err) {
    console.error("SHARE ERROR:", err);
    res.json({ error: "server" });
  }
});

module.exports = router;
