const express = require("express");
const router = express.Router();
const webpush = require("web-push");
const genz = require("../models/primary/User"); 

// ... (Your existing /signup and /login routes stay exactly the same) ...

/* ======================
   SAVE SUBSCRIPTION & SEND WELCOME PUSH
====================== */
router.post("/subscribe", async (req, res) => {
  try {
    const { subscription, type, userId } = req.body;

    if (!subscription || !userId) {
      return res.status(400).json({ success: false, message: "Missing data" });
    }

    // 1. Save the subscription to the user's database record
    await genz.findByIdAndUpdate(userId, { pushSubscription: subscription });

    // 2. Determine the message
    let title = "CollegenZ";
    let body = "Welcome to CollegenZ!";

    if (type === "signup") {
      body = "Thanks for choosing CollegenZ! 🎉";
    } else if (type === "login") {
      body = "Welcome back to CollegenZ! 👋";
    }

    // 3. Create the payload
    const payload = JSON.stringify({
      title: title,
      body: body,
      url: "/" 
    });

    // 4. Send the notification
    await webpush.sendNotification(subscription, payload);
    console.log(`✅ Push sent successfully for ${type}`);

    res.status(200).json({ success: true });

  } catch (err) {
    console.error("❌ Push Notification Error:", err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
