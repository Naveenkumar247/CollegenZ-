const mongoose = require("mongoose");

/* ===== Validate ENV ===== */
if (!process.env.MONGO_URI) {
  throw new Error("❌ MONGO_URI is not defined");
}

if (!process.env.MONGODB_URI2) {
  throw new Error("❌ MONGODB_URI2 is not defined");
}

/* ===== Primary DB ===== */
const primaryDB = mongoose.createConnection(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

primaryDB.on("connected", () => {
  console.log("✅ Primary MongoDB Connected");
});

primaryDB.on("error", (err) => {
  console.error("❌ Primary MongoDB Error:", err.message);
});

/* ===== Secondary DB (Certificates) ===== */
const secondaryDB = mongoose.createConnection(process.env.MONGODB_URI2, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

secondaryDB.on("connected", () => {
  console.log("✅ Secondary MongoDB Connected");
});

secondaryDB.on("error", (err) => {
  console.error("❌ Secondary MongoDB Error:", err.message);
});

module.exports = { primaryDB, secondaryDB };
