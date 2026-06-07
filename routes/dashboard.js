const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Import your existing models
const User = require('../models/primary/User');
const Post = require('../models/primary/Post');
const Message = require('../models/primary/Message');

/**
 * @route   GET /api/dashboard/:id
 * @desc    Fetch statistical metrics and tracking data for a specific user
 * @access  Protected/Internal
 */
router.get('/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        // 1. Validation: Ensure it's a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ 
                success: false, 
                error: "Invalid user identifier format" 
            });
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);

        // 2. Execute parallel DB operations to keep dashboard response times ultra-fast
        const [userProfile, totalPostsCount, postsMetrics, chatMetrics] = await Promise.all([
            // Fetch core user social metrics
            User.findById(userId, 'name friends friendRequestsReceived friendRequestsSent accountType views'),

            // Count total posts published by this user
            Post.countDocuments({ author: userObjectId }),

            // Aggregate likes across all posts created by this user
            Post.aggregate([
                { $match: { author: userObjectId } },
                {
                    $group: {
                        _id: null,
                        totalLikes: { $sum: { $size: { $ifNull: ["$likes", []] } } },
                        totalShares: { $sum: { $ifNull: ["$shareCount", 0] } }
                    }
                }
            ]),

            // Count chat interactions for messaging activity mapping
            Message.aggregate([
                {
                    $match: {
                        $or: [
                            { sender: userObjectId },
                            { receiver: userObjectId }
                        ]
                    }
                },
                {
                    $group: {
                        _id: null,
                        sent: {
                            $sum: { $cond: [{ $eq: ["$sender", userObjectId] }, 1, 0] }
                        },
                        received: {
                            $sum: { $cond: [{ $eq: ["$receiver", userObjectId] }, 1, 0] }
                        }
                    }
                }
            ])
        ]);

        // 3. Check if target user exists
        if (!userProfile) {
            return res.status(404).json({ 
                success: false, 
                error: "User analytics profile not found" 
            });
        }

        // 4. Extract safe defaults from aggregation pipeline arrays
        const postStats = postsMetrics[0] || { totalLikes: 0, totalShares: 0 };
        const messageStats = chatMetrics[0] || { sent: 0, received: 0 };

        // 5. Structure payload neatly for your glassmorphic UI components
        const dashboardData = {
            profile: {
                name: userProfile.name,
                accountType: userProfile.accountType,
                profileViews: userProfile.views || 0
            },
            networking: {
                connectionsCount: userProfile.friends ? userProfile.friends.length : 0,
                pendingRequestsReceived: userProfile.friendRequestsReceived ? userProfile.friendRequestsReceived.length : 0,
                pendingRequestsSent: userProfile.friendRequestsSent ? userProfile.friendRequestsSent.length : 0
            },
            engagement: {
                totalPosts: totalPostsCount,
                totalLikesReceived: postStats.totalLikes,
                totalSharesTriggered: postStats.totalShares
            },
            activity: {
                messagesSent: messageStats.sent,
                messagesReceived: messageStats.received,
                totalInteractions: messageStats.sent + messageStats.received
            }
        };

        // Send structured JSON to feed your charts/counters
        res.status(200).json({
            success: true,
            data: dashboardData
        });

    } catch (err) {
        console.error("🔥 Dashboard Aggregation Error:", err);
        res.status(500).json({ 
            success: false, 
            error: "Internal dashboard database calculation error" 
        });
    }
});

module.exports = router;
