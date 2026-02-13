const express = require("express");
const router = express.Router();
const Featured = require("../models/primary/Featured");

router.get("/api/featured", async (req, res) => {
  try {
    const featured = await Featured
      .find()
      .sort({ featuredOrder: 1, createdAt: -1 });

    res.json({ featured });
  } catch (err) {
    res.status(500).json({ error: "Featured fetch failed" });
  }
});

module.exports = router;
