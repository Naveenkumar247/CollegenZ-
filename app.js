/const express = require("express");
const { MongoClient } = require("mongodb");
const path = require("path");

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const uri = "mongodb+srv://Naveenkumar:mushroom%23nk24@collegenz.yjjzybn.mongodb.net/?retryWrites=true&w=majority&appName=Collegenz";
const client = new MongoClient(uri);

let collection;

async function connectDB() {
  try {
    await client.connect();
    const db = client.db("CollegenzDB");
    collection = db.collection("users");
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ DB Connection error:", err);
  }
}

app.post("/submit", async (req, res) => {
  app.send("hi")
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  try {
    await collection.insertOne({ username, createdAt: new Date() });
    res.status(200).json({ message: "Data saved successfully!" });
  } catch (error) {
    console.error("Insert error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  connectDB();
});
