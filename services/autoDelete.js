const cron = require("node-cron");
const Post = require("../models/primary/Post");

console.log("🟢 autoDeletion service loaded");
/*
  Runs every 5 minutes
  ─────────────────────
  */ 
cron.schedule("*/1 * * * *", async () => {

  console.log("🧹 Checking expired posts...");

  try {

    const now = new Date();

    /* ================= EVENT POSTS ================= */

    const expiredEvents = await Post.deleteMany({
      postType: "event",
      event_date: { $lt: now }
    });

    if (expiredEvents.deletedCount > 0) {
      console.log(`🗑 Deleted ${expiredEvents.deletedCount} expired event posts`);
    }


    /* ================= HIRING POSTS ================= */

    const expiredHiring = await Post.deleteMany({
      postType: "hiring",
      job_deadline: { $lt: now }
    });

    if (expiredHiring.deletedCount > 0) {
      console.log(`🗑 Deleted ${expiredHiring.deletedCount} expired hiring posts`);
    }

  } catch (err) {
    console.error("❌ Auto delete error:", err);
  }

});
