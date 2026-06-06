const express = require('express');
const router = express.Router();
const User = require('../../models/primary/User'); // Path to your logins schema file

// @route   GET /api/dashboard/:id
// @desc    GET all parallel dashboards for a specific user or mentor
// @access  Public / Private (Depending on your middleware status)
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('name zrole internshipProfiles picture');
    
    if (!user) {
      return res.status(404).json({ message: "User profile not found." });
    }

    return res.status(200).json({
      name: user.name,
      zrole: user.zrole, 
      picture: user.picture,
      metricsList: user.internshipProfiles // Array containing n parallel internships
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;

