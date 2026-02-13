const express = require("express");
const path = require("path");
const router = express.Router();

router.get("/featured-upload", (req, res) => {
  res.sendFile(path.join(__dirname, "../featured-submit.html"));
});

module.exports = router;
