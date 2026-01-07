const express = require("express");
const Certificate = require("../models/Certificate.js");

const router = express.Router();

/* Create or Update certificate */
router.post("/save", async (req, res) => {
  try {
    const { code, name, organization, issueDate } = req.body;

    if (!code) {
      return res.status(400).json({ error: "code is required" });
    }

    const cleanCode = code.trim();

    const updateData = {};
    if (name) updateData.name = name;
    if (organization) updateData.organization = organization;
    if (issueDate) updateData.issueDate = issueDate;

    const cert = await Certificate.findOneAndUpdate(
      { code: cleanCode },
      updateData,
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    res.json({ message: "Certificate saved", cert });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
