const express = require("express");
const router = express.Router();
const fs = require("fs");

const Featured = require("../models/primary/Featured");
const upload = require("../middlewares/upload");
const cloudinary = require("../utils/cloudinary");

/* ===============================
   ⭐ FEATURED POST SUBMIT
================================ */

router.post("/featured-submit", upload.array("images", 5), async (req, res) => {
  try {
    console.log("➡️ FEATURED SUBMIT ROUTE HIT");

    const currentUser = res.locals.currentUser;
    console.log("👤 CURRENT USER:", currentUser?.email);

    const { post_type, data, featured_order, featured_until } = req.body;

    if (!post_type || !data) {
      return res.status(400).send("Post type and content are required");
    }

    // ✅ ADMIN CHECK
    if (!currentUser || currentUser.role?.toLowerCase() !== "admin") {
      console.log("⛔ NOT ADMIN");
      return res.status(403).send("Admins only");
    }

    let imageurls = [];

    if (req.files?.length) {
      for (const file of req.files) {
        const uploaded = await cloudinary.uploader.upload(file.path);
        imageurls.push(uploaded.secure_url);
        fs.unlinkSync(file.path);
      }
    }

    if (!imageurls.length) {
      return res.status(400).send("At least one image is required");
    }

    const featuredPost = new Featured({
      postType: post_type,
      data,
      imageurl: imageurls,
      userId: currentUser._id,
      username: currentUser.username,
      isFeatured: true,
      featuredOrder: Number(featured_order) || 0,
      featuredUntil: featured_until ? new Date(featured_until) : null,
    });

    await featuredPost.save();

    console.log("⭐ FEATURED POST SAVED:", featuredPost._id.toString());

    res.redirect("/");
  } catch (err) {
    console.error("❌ FEATURED SUBMIT FAILED:", err);
    res.status(500).send("Featured post submit failed");
  }
});

module.exports = router;
