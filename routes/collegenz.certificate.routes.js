const express = require("express");
const Certificate = require("../models/Certificate.js");

const router = express.Router();

router.get("/:code", async (req, res) => {
  try {
    console.log("Requested code:", req.params.code);

    const cert = await Certificate.findOne({ code: req.params.code });

    if (!cert) {
      return res.status(404).json({ error: "Invalid Certificate" });
    }

    res.json(cert);
  } catch (err) {
    console.error("Certificate API error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
