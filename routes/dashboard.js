const express = require("express");
const router = express.Router();
const User = require("../models/primary/User");

// GET dashboard metrics handler
router.get("/:id", async (req, res) => {
  try {
    let targetId;

    if (req.params.id === "me") {
      // If no valid user session is discovered, respond with an explicit 401 status code
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized active session token." });
      }
      targetId = req.user._id;
    } else {
      targetId = req.params.id;
    }

    const user = await User.findById(targetId).select("name email zrole internshipProfiles picture");
    
    if (!user) {
      return res.status(404).json({ message: "Profile track tracking records missing." });
    }

    return res.status(200).json({
      name: user.name,
      email: user.email,
      zrole: user.zrole,
      picture: user.picture,
      metricsList: user.internshipProfiles
    });
  } catch (error) {
    // This catches Mongoose validation crashes (e.g. trying to cast "me" as a regular ObjectId)
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
