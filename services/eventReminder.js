const cron = require("node-cron");
const genz = require("../models/primary/User");
const { resend } = require("./mailService"); // Import the resend instance from your mail service

console.log("📨 Event reminder service started");

/* ================= CRON JOB ================= */
/* Runs every day at 9:00 AM */
cron.schedule("0 9 * * *", async () => {
  console.log("🔍 Checking for next-day event reminders...");

  try {
    // 1. Find users who have events saved
    const users = await genz.find({
      "savedPosts.event_date": { $exists: true }
    });

    // 2. Define "Tomorrow" range
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const start = new Date(tomorrow.setHours(0, 0, 0, 0));
    const end = new Date(tomorrow.setHours(23, 59, 59, 999));

    for (const user of users) {
      for (const post of user.savedPosts) {
        
        // 3. Check if any saved post happens tomorrow
        if (
          post.event_date &&
          post.event_date >= start &&
          post.event_date <= end
        ) {
          
          try {
            // 4. Send via Resend API (No SMTP timeouts!)
            const { data, error } = await resend.emails.send({
              from: "CollegenZ <notifications@collegenz.in>",
              to: user.email,
              subject: `Reminder: "${post.data}" is happening tomorrow!`,
              html: `
                <div style="font-family: sans-serif; line-height: 1.5;">
                  <h3 style="color: #228B22;">Event Reminder</h3>
                  <p>Hey ${user.name || 'Student'},</p>
                  <p>Just a reminder that your saved event "<b>${post.data}</b>" is happening tomorrow.</p>
                  <p>📅 <b>Date:</b> ${new Date(post.event_date).toDateString()}</p>
                  <br>
                  <a href="https://collegenz.in" style="background: #228B22; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View on CollegenZ</a>
                  <p style="margin-top: 20px; font-size: 12px; color: #888;">Best, <br> CollegenZ Team</p>
                </div>
              `
            });

            if (error) {
              console.error(`❌ Resend error for ${user.email}:`, error);
            } else {
              console.log(`✅ Reminder sent to ${user.email} (ID: ${data.id})`);
            }

          } catch (sendErr) {
            console.error(`❌ Failed to trigger Resend for ${user.email}:`, sendErr.message);
          }
        }
      }
    }
  } catch (err) {
    console.error("❌ Reminder cron job failed:", err.message);
  }
});
