const express = require("express");
const router = express.Router();
const genz = require("../models/primary/User"); 
const Message = require("../models/primary/Message");

// Require your models here: genz, Message

router.get("/api/friends", async (req, res) => {
  try {
    const currentUser = res.locals.currentUser;
    if (!currentUser) return res.status(401).json({ error: "Not logged in" });

    const friends = await genz.find(
      { _id: { $in: currentUser.friends } },
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
      f.unreadCount = await Message.countDocuments({
        sender: f._id,
        receiver: currentUser._id,
        isRead: { $ne: true } 
      });
      f.isOnline = false;
    }

    res.json(friends);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;
