const express = require('express');
const router = express.Router();
const User = require('../models/primary/User');

// @route   GET /api/dashboard/:id
router.get('/:id', async (req, res) => {
  try {
    // 💡 DYNAMIC RECOVERY: Check if the frontend is requesting the logged-in user session
    let targetId;
    
    if (req.params.id === 'me') {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized. Missing active session tokens." });
      }
      targetId = req.user._id;
    } else {
      targetId = req.params.id; // Falls back to normal lookup if an explicit ID is passed (e.g., for Mentors tracking students)
    }

    const user = await User.findById(targetId).select('name email zrole internshipProfiles picture');
    
    if (!user) {
      return res.status(404).json({ message: "User profile track details not found." });
    }

    return res.status(200).json({
      name: user.name,
      email: user.email, // Passing email context safely to fill your screenshot layout badge
      zrole: user.zrole, 
      picture: user.picture,
      metricsList: user.internshipProfiles
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});


module.exports = router;
