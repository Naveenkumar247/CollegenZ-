const express = require("express");
const axios = require("axios");

const router = express.Router();

const API_KEY = process.env.NEWS_API_KEY;

// Simple cache (to avoid hitting API too often)
let cache = null;
let lastFetch = 0;

router.get("/news", async (req, res) => {
  try {
    const { category = "technology" } = req.query;

    // 5-minute cache
    if (cache && Date.now() - lastFetch < 5 * 60 * 1000) {
      return res.json(cache);
    }

    const response = await axios.get("https://newsdata.io/api/1/news", {
      params: {
        apikey: API_KEY,
        country: "in",
        language: "en",
        category: category,
      },
    });

    cache = response.data.results;
    lastFetch = Date.now();

    res.json(cache);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

module.exports = router;
