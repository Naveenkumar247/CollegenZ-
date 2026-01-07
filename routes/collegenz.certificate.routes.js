const express = require("express");
const Certificate = require("../models/Certificate");

const router = express.Router();

router.get("/:code", async (req, res) => {
  const cert = await Certificates.findOne({ code: req.params.code });

  if (!cert) {
    return res.status(404).json({ error: "Invalid Certificate" });
  }

  res.json(cert);
});

module.exports = router;
