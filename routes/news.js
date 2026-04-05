const express = require("express");
const axios = require("axios");

const router = express.Router();

// Make sure dotenv is loaded in your main server file (e.g., app.js), 
// or uncomment the line below if this is a standalone file.
// require('dotenv').config(); 

const API_KEY = process.env.NEWS_API_KEY;

// Improved cache: Store by category (e.g., { "technology": { data: [...], timestamp: 123... } })
let cache = {};

router.get("/news", async (req, res) => {
  try {
    // Check if API key exists to prevent silent failures
    if (!API_KEY) {
      console.error("CRITICAL: NEWS_API_KEY is missing from environment variables.");
      return res.status(500).json({ error: "Server configuration error." });
    }

    const { category = "technology" } = req.query;

    // 5-minute cache check for the specific category requested
    const cachedCategory = cache[category];
    if (cachedCategory && Date.now() - cachedCategory.timestamp < 5 * 60 * 1000) {
      console.log(`Serving '${category}' news from cache...`);
      return res.json(cachedCategory.data);
    }

    console.log(`Fetching fresh '${category}' news from API...`);
    const response = await axios.get("https://newsdata.io/api/1/news", {
      params: {
        apikey: API_KEY,
        country: "in",
        language: "en",
        category: category,
      },
    });

    // Save the fresh data and current time to the cache for this category
    cache[category] = {
      data: response.data.results,
      timestamp: Date.now(),
    };

    res.json(cache[category].data);

  } catch (error) {
    // --- IMPROVED ERROR HANDLING ---
    // This will tell you EXACTLY what is going wrong in your server console.
    
    if (error.response) {
      // The request was made and the server responded with a status code outside of the 2xx range
      console.error("API Error Status:", error.response.status);
      console.error("API Error Data:", error.response.data);
      
      // Optionally forward the exact status code to the frontend instead of a blanket 500
      res.status(error.response.status).json({ 
        error: "Failed to fetch news from provider.",
        details: error.response.data // Note: You can remove 'details' in production to hide API secrets
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response received from News API:", error.request);
      res.status(503).json({ error: "News provider is currently unavailable." });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Axios Setup Error:", error.message);
      res.status(500).json({ error: "Internal server error fetching news." });
    }
  }
});

module.exports = router;
