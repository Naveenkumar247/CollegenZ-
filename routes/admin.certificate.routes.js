const express = require('express');
const router = express.Router();
const User = require('../models/primary/User'); // Path fixed to single dot climb out

/**
 * @route   POST /api/admin/certificate/assign-track
 * @desc    Assign a new internship tracking profile to an intern's account by email
 * @access  Private/Mentor
 */
router.post('/assign-track', async (req, res) => {
    try {
        const { 
            email, 
            companyName, 
            startDate, 
            endDate, 
            noOfTask, 
            noOfTaskAssigned, 
            noOfTaskPending, 
            nameOfMentor 
        } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: "Target intern email is required." });
        }

        // Calculate initial dynamic progress percentage safely
        const total = parseInt(noOfTask) || 0;
        const assigned = parseInt(noOfTaskAssigned) || 0;
        const completed = total - parseInt(noOfTaskPending || 0);
        const progressPercentage = total > 0 ? Math.max(0, Math.min(100, (completed / total) * 100)) : 0;

        // Construct the subdocument profile tracking structure matching your user schema
        const newTrackProfile = {
            companyName: companyName || "CodeAlpha",
            status: "ACTIVE",
            startDate: startDate || "Pending",
            endDate: endDate || "Pending",
            deadlineDate: endDate || "N/A",
            progress: progressPercentage,
            noOfTask: total,
            noOfCompletedTask: Math.max(0, completed),
            noOfPendingTask: parseInt(noOfTaskPending) || 0,
            nameOfMentor: nameOfMentor || "System Admin",
            noOfStudents: 1, 
            noOfTaskAssigned: assigned,
            noOfTaskPending: parseInt(noOfTaskPending) || 0
        };

        // Locate the target student by their email and push the new track into their internshipProfiles array
        const updatedUser = await User.findOneAndUpdate(
            { email: email.toLowerCase().trim() },
            { 
                $push: { internshipProfiles: newTrackProfile },
                $set: { zrole: "intern" } // Ensures their portal switches to intern view space layout rules
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, error: "No student account found registered with that email address." });
        }

        return res.status(200).json({ 
            success: true, 
            message: "Internship track deployed and allocated successfully!",
            track: newTrackProfile
        });

    } catch (err) {
        console.error("🔥 Assign Track API System Error:", err);
        return res.status(500).json({ success: false, error: "Internal server error pushing track profiles." });
    }
});

// Keep your other routes like /update-role below it...
module.exports = router;
