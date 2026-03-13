const express = require("express");
const router = express.Router();
const genz = require("../models/primary/User");
const Notification = require("../models/primary/Notification");

router.post("/request/:userId", async (req, res) => {
  try {
    const senderId = res.locals.currentUser._id;
    const receiverId = req.params.userId;

    if (senderId.equals(receiverId)) {
      return res.status(400).json({ message: "You cannot add yourself" });
    }

    const sender = await genz.findById(senderId);
    const receiver = await genz.findById(receiverId);

    if (!receiver) return res.status(404).json({ message: "User not found" });
    if (sender.friends.includes(receiverId)) return res.status(400).json({ message: "Already friends" });
    if (sender.friendRequestsSent.includes(receiverId)) return res.status(400).json({ message: "Friend request already sent" });
    if (sender.friendRequestsReceived.includes(receiverId)) return res.status(400).json({ message: "User already sent you a request" });

    sender.friendRequestsSent.push(receiverId);
    receiver.friendRequestsReceived.push(senderId);

    await sender.save();
    await receiver.save();

    await Notification.create({
      userId: receiverId,
      fromUser: senderId,
      type: "FRIEND_REQUEST",
      message: "sent you a friend request",
      meta: { senderId }
    });

    res.json({ success: true, message: "Friend request sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/accept/:userId", async (req, res) => {
  try {
    const receiverId = res.locals.currentUser._id;
    const senderId = req.params.userId;
    const receiver = await genz.findById(receiverId);
    const sender = await genz.findById(senderId);

    if (!receiver.friendRequestsReceived.includes(senderId)) {
      return res.status(400).json({ message: "No friend request found" });
    }

    receiver.friends.push(senderId);
    sender.friends.push(receiverId);
    receiver.friendRequestsReceived.pull(senderId);
    sender.friendRequestsSent.pull(receiverId);

    await receiver.save();
    await sender.save();
    await Notification.deleteMany({ userId: receiverId, fromUser: senderId, type: "FRIEND_REQUEST" });

    res.json({ success: true, message: "Friend request accepted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/reject/:userId", async (req, res) => {
  try {
    const receiverId = res.locals.currentUser._id;
    const senderId = req.params.userId;
    const receiver = await genz.findById(receiverId);
    const sender = await genz.findById(senderId);

    receiver.friendRequestsReceived.pull(senderId);
    sender.friendRequestsSent.pull(receiverId);

    await receiver.save();
    await sender.save();
    await Notification.deleteMany({ userId: receiverId, fromUser: senderId, type: "FRIEND_REQUEST" });

    res.json({ success: true, message: "Friend request rejected" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/cancel/:userId", async (req, res) => {
  try {
    const senderId = res.locals.currentUser._id;
    const receiverId = req.params.userId;
    const sender = await genz.findById(senderId);
    const receiver = await genz.findById(receiverId);

    sender.friendRequestsSent.pull(receiverId);
    receiver.friendRequestsReceived.pull(senderId);

    await sender.save();
    await receiver.save();

    res.json({ success: true, message: "Friend request cancelled" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/remove/:userId", async (req, res) => {
  try {
    const userId = res.locals.currentUser._id;
    const friendId = req.params.userId;
    const user = await genz.findById(userId);
    const friend = await genz.findById(friendId);

    user.friends.pull(friendId);
    friend.friends.pull(userId);

    await user.save();
    await friend.save();

    res.json({ success: true, message: "Friend removed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
