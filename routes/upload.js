const express = require("express");
const router = express.Router();
const fs = require("fs");

const Post = require("../models/primary/Post");
const genz = require("../models/primary/User");
const cloudinary = require("../utils/cloudinary");
const upload = require("../middlewares/upload");

// ===============================
// 📤 POST UPLOAD ROUTE
// ===============================
router.post(
  "/submit",
  upload.array("images", 10),
  async (req, res) => {
    try {
      const {
        post_type,
        data,

        // Event fields
        event_title,
        event_location,
        event_mode,
        event_date,
        event_time,
        event_contact,
        event_link,
        event_description,

        // Hiring fields
        job_title,
        job_location,
        job_mode,
        job_contact,
        job_description,
        job_deadline,
        job_link
      } = req.body;

      // ❌ VALIDATION: REQUIRED FIELDS
      if (!post_type || !data) {
        return res.status(400).json({
          success: false,
          type: "VALIDATION",
          message: "Post type and content are required."
        });
      }

      // ❌ TEXT MODERATION
      if (hasBannedText(data)) {
        return res.status(400).json({
          success: false,
          type: "CONTENT",
          message: "Your post violates community guidelines."
        });
      }

      // ❌ AUTH CHECK
      const currentUser = res.locals.currentUser;
      if (!currentUser) {
        return res.status(401).json({
          success: false,
          type: "AUTH",
          message: "Please login to create a post."
        });
      }

      const userId = currentUser._id;
      const userEmail = currentUser.email;
      const username = currentUser.username || null;
      const picture = currentUser.picture || null;
      const college = currentUser.college?.trim() || null;

      // ------------------------------
      // 📸 IMAGE UPLOAD (CLOUDINARY)
      // ------------------------------
      let imageurls = [];

      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const uploaded = await cloudinary.uploader.upload(file.path);
          imageurls.push(uploaded.secure_url);
          fs.unlinkSync(file.path);
        }
      }

      // ------------------------------
      // 🧱 BASE POST DATA
      // ------------------------------
      const postData = {
        postType: post_type,
        userId,
        username,
        userEmail,
        picture,
        college,
        data,
        imageurl: imageurls,
        status: "APPROVED"
      };

      // ------------------------------
      // 📅 EVENT POST FIELDS
      // ------------------------------
      if (post_type === "event") {
        Object.assign(postData, {
          event_title: event_title || null,
          event_location: event_location || null,
          event_mode: event_mode || null,
          event_date: event_date || null,
          event_time: event_time || null,
          event_contact: event_contact || null,
          event_link: event_link || null,
          event_description: event_description || null
        });
      }

      // ------------------------------
      // 💼 HIRING POST FIELDS
      // ------------------------------
      if (post_type === "hiring") {
        Object.assign(postData, {
          job_title: job_title || null,
          job_location: job_location || null,
          job_mode: job_mode || null,
          job_contact: job_contact || null,
          job_description: job_description || null,
          job_deadline: job_deadline || null,
          job_link: job_link || null
        });
      }

      // ------------------------------
      // 💾 SAVE POST
      // ------------------------------
      const newPost = new Post(postData);
      await newPost.save();

      await genz.findByIdAndUpdate(userId, {
        $inc: { postCount: 1 }
      });

      console.log(`✔ Post saved successfully (${post_type.toUpperCase()})`);

      return res.json({
        success: true,
        message: "Post created successfully"
      });

    } catch (err) {
      console.error("✘ Save failed:", err);
      return res.status(500).json({
        success: false,
        type: "SERVER",
        message: "Error saving post. Please try again."
      });
    }
  }
);

module.exports = router;
