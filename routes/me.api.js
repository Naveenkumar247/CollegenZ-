const express = require("express");
const router = express.Router();

/* ======================
   CURRENT LOGGED USER
====================== */
router.get("/api/me", (req, res) => {

  if (!req.user) {
    return res.json({
      isLoggedIn: false,
      user: null
    });
  }

  res.json({
    isLoggedIn: true,
    user: {
      _id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      picture: req.user.picture || "/uploads/profilepic.jpg",
      // CRITICAL FIX: Send the following array to the frontend
      following: req.user.following || [] 
    }
  });

});

module.exports = router;
