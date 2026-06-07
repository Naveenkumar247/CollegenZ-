const express = require("express");
const router = express.Router();
const User = require("../models/primary/User");

// ==========================================
// 1. SPECIFIC ROUTE: /api/dashboard/me
// (Must be defined first!)
// ==========================================
router.get("/me", async (req, res) => {
  try {
    // Check if Passport successfully authenticated the user session
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized. No active session found." });
    }

    const user = await User.findById(req.user._id).select("name email zrole internshipProfiles picture");
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User profile records missing." });
    }

    return res.status(200).json({
      name: user.name,
      email: user.email,
      zrole: user.zrole, 
      picture: user.picture,
      metricsList: user.internshipProfiles
    });
  } catch (error) {
    console.error("Error on /dashboard/me:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 2. GENERIC PARAMETER ROUTE: /api/dashboard/:id
// (Evaluates only if the request wasn't /me)
// ==========================================
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("name email zrole internshipProfiles picture");
    
    if (!user) {
      return res.status(404).json({ success: false, message: "Requested tracking profile not found." });
    }

    return res.status(200).json({
      name: user.name,
      email: user.email,
      zrole: user.zrole, 
      picture: user.picture,
      metricsList: user.internshipProfiles
    });
  } catch (error) {
    console.error("Error on /dashboard/:id:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
