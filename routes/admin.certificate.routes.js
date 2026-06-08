// Add this to your existing routes/admin.certificate.routes.js file
const express = require('express');
const router = express.Router();
const User = require('../../models/primary/User'); // Adjust path to your User model if needed

/**
 * @route   POST /api/admin/certificate/update-role
 * @desc    Admin endpoint to change a user's role to mentor
 * @access  Private/Admin
 */
router.post('/update-role', async (req, res) => {
    try {
        const { email, role } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: "Email address is required." });
        }

        const targetRole = role || 'mentor';

        // Update the user document directly in MongoDB
        const updatedUser = await User.findOneAndUpdate(
            { email: email.toLowerCase().trim() },
            { $set: { zrole: targetRole } },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, error: "No user found with that email address." });
        }

        return res.status(200).json({
            success: true,
            message: `Successfully upgraded ${updatedUser.email} to ${updatedUser.zrole}.`
        });

    } catch (err) {
        console.error("🔥 Role Update API Error:", err);
        return res.status(500).json({ success: false, error: "Internal server database error." });
    }
});

module.exports = router;
