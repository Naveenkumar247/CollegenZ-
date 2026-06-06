const express = require('express');
const router = express.Router();
const User = require('../models/primary/User');

// Gateway bridge to check authentication and redirect based on role
router.get('/gateway', async (req, res) => {
  try {
    // Assuming your common auth saves user details in req.user or req.session.user
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized. Please complete common auth first." });
    }

    const user = await User.findById(req.user._id).select('zrole');

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Direct them to the dashboard view with their role context
    return res.status(200).json({
      redirectUrl: `/dashboard.html?id=${user._id}`,
      zrole: user.zrole
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
