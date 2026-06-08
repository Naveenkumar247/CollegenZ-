const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Import your correct User model
const User = require('../models/primary/User');

/**
 * @route   GET /api/dashboard/:id
 * @desc    Fetch internship workspace tracking profiles (Supports Intern & Mentor roles)
 * @access  Protected
 */
router.get('/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        // 1. Validation: Ensure a valid MongoDB ObjectId is processed
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ 
                success: false, 
                error: "Invalid user workspace token format" 
            });
        }

        // 2. Fetch the target profile record directly from the database collection
        const userProfile = await User.findById(userId);

        if (!userProfile) {
            return res.status(404).json({ 
                success: false, 
                error: "Workspace profile not found." 
            });
        }

        // 💡 Log for active console trace debugging
        console.log(`📡 Dispatching Workspace Data for: ${userProfile.email} | Role: "${userProfile.zrole}"`);

        // 3. Map database array definitions cleanly into the frontend metricsList blueprint
        const formattedMetrics = (userProfile.internshipProfiles || []).map(profile => ({
            companyName: profile.companyName || "CollegenZ Track",
            status: profile.status || "ACTIVE",
            startDate: profile.startDate || "N/A",
            endDate: profile.endDate || "N/A",
            deadlineDate: profile.deadlineDate || "N/A",
            progress: profile.progress || 0,
            
            // Intern View Card Properties
            noOfTask: profile.noOfTask || 0,
            noOfCompletedTask: profile.noOfCompletedTask || 0,
            noOfPendingTask: profile.noOfPendingTask || 0,
            nameOfMentor: profile.nameOfMentor || "System Admin",
            
            // Mentor View Card Properties
            noOfStudents: profile.noOfStudents || 0,
            noOfTaskAssigned: profile.noOfTaskAssigned || 0,
            noOfTaskPending: profile.noOfTaskPending || 0
        }));

        // 4. Return the exact dataset requested by your dashboard interface engines
        res.status(200).json({
            success: true,
            data: {
                _id: userProfile._id,
                name: userProfile.name,
                email: userProfile.email,
                picture: userProfile.picture,
                zrole: userProfile.zrole || 'intern', // Emits "mentor" or "intern" dynamically
                metricsList: formattedMetrics // Feeds your swipe-carousel perfectly
            }
        });

    } catch (err) {
        console.error("🔥 Workspace Metrics Compilation Failure:", err);
        res.status(500).json({ 
            success: false, 
            error: "Internal dashboard calculation mistake." 
        });
    }
});

module.exports = router;
