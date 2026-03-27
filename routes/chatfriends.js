const express = require("express");
const router = express.Router();
const mongoose = require("mongoose"); // Required to validate the ObjectId
const genz = require("../models/primary/User"); 
const Message = require("../models/primary/Message");

// --------------------------------------------------
// 1. FETCH FRIENDS LIST & UNREAD COUNTS
// --------------------------------------------------
router.get("/api/friends", async (req, res) => {
  try {
    const currentUser = res.locals.currentUser;
    if (!currentUser) return res.status(401).json({ error: "Not logged in" });

    // Fallback to empty array if friends list is undefined
    const friendIds = currentUser.friends || [];

    const friends = await genz.find(
      { _id: { $in: friendIds } },
      "name picture"
    ).lean();

    for (let f of friends) {
      const lastMsg = await Message.findOne({
        $or: [
          { sender: currentUser._id, receiver: f._id },
          { sender: f._id, receiver: currentUser._id }
        ]
      }).sort({ createdAt: -1 });

      f.lastMessage = lastMsg?.text || "Tap to start chatting";
      f.lastMessageAt = lastMsg?.createdAt || null;
      
      // Count how many messages the friend sent that the current user hasn't read
      f.unreadCount = await Message.countDocuments({
        sender: f._id,
        receiver: currentUser._id,
        isRead: { $ne: true } 
      });
      f.isOnline = false; 
    }

    res.json(friends);
  } catch (error) {
    console.error("Friends API Error:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

// --------------------------------------------------
// 2. MARK MESSAGES AS READ (CRASH-PROOF)
// --------------------------------------------------
router.post("/api/messages/mark-read", async (req, res) => {
  try {
    const currentUser = res.locals.currentUser;
    const { friendId } = req.body;

    if (!currentUser) return res.status(401).json({ error: "Not logged in" });
    if (!friendId) return res.status(400).json({ error: "Friend ID required" });

    // SAFETY CHECK: Verify it is a real 24-character MongoDB ID
    // This stops the server from crashing if it receives "messages" or undefined
    if (!mongoose.Types.ObjectId.isValid(friendId)) {
        return res.status(400).json({ error: "Invalid Friend ID format" });
    }

    // Find all unread messages sent BY the friend TO the current user, and mark true
    await Message.updateMany(
      { 
        sender: friendId, 
        receiver: currentUser._id, 
        isRead: { $ne: true } 
      },
      { $set: { isRead: true } }
    );

    res.json({ success: true, message: "Messages marked as read" });
  } catch (error) {
    console.error("Mark Read Error:", error);
    res.status(500).json({ error: "Server Error" });
  }
});

// Add this below your other routes in chatfriends.js

router.get("/api/messages/unread-total", async (req, res) => {
  try {
    const currentUser = res.locals.currentUser;
    // If not logged in, just return 0 silently instead of throwing an error
    if (!currentUser) return res.json({ unreadTotal: 0 });

    // Count EVERY message where the current user is the receiver AND it's unread
    const totalUnread = await Message.countDocuments({
      receiver: currentUser._id,
      isRead: { $ne: true }
    });

    res.json({ unreadTotal: totalUnread });
  } catch (error) {
    console.error("Total unread count error:", error);
    res.status(500).json({ error: "Server Error" });
  }
});


module.exports = router;
