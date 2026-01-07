const express = require("express");
const Certificate = require("../models/Certificate");

const router = express.Router();

/* Create or Update certificate */
router.post("/save", async (req, res) => {
  const { code, name, organization, issueDate } = req.body;

  const cert = await Certificate.findOneAndUpdate(
    { code },
    { name, organization, issueDate },
    { upsert: true, new: true }
  );

  res.json({ message: "Certificate saved", cert });
});

module.exports = router;
