const express = require("express");
const router = express.Router();
const User = require("../models/primary/User");

// GET dashboard metrics handler
router.get('/:id', async (req, res) => {
  try {
    let targetId;

    if (req.params.id === 'me') {
      // If the user isn't logged in, Passport sets req.user to undefined
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Unauthorized session." });
      }
      targetId = req.user._id; // Use logged-in user's ID securely
    } else {
      targetId = req.params.id; // Fallback for specific lookups
    }

    // Now it's safe to query Mongoose
    const user = await User.findById(targetId).select('name email zrole internshipProfiles picture');
    
    if (!user) {
      return res.status(404).json({ success: false, message: "Profile track not found." });
    }

    return res.status(200).json({
      name: user.name,
      email: user.email,
      zrole: user.zrole, 
      picture: user.picture,
      metricsList: user.internshipProfiles
    });
  } catch (error) {
    console.error("Dashboard route error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});


module.exports = router;
