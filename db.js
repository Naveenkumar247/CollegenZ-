const mongoose = require("mongoose");

/* Primary DB */
const primaryDB = mongoose.createConnection(process.env.MONGO_URI);

primaryDB.on("connected", () => {
  console.log("✅ Primary MongoDB Connected");
});

primaryDB.on("error", (err) => {
  console.error("❌ Primary MongoDB Error:", err.message);
});

/* Secondary DB */
const secondaryDB = mongoose.createConnection(process.env.MONGODB_URI2);

secondaryDB.on("connected", () => {
  console.log("✅ Secondary MongoDB Connected");
});

secondaryDB.on("error", (err) => {
  console.error("❌ Secondary MongoDB Error:", err.message);
});

module.exports = { primaryDB, secondaryDB };
