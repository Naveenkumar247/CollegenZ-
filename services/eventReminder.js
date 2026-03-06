const cron = require("node-cron");
const nodemailer = require("nodemailer");
const genz = require("../models/primary/User"); // adjust path if needed

/* ================= EMAIL TRANSPORT ================= */

const transporter = nodemailer.createTransport({
  host: "smtp.zoho.in",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* ================= VERIFY EMAIL ================= */

transporter.verify((error) => {
  if (error) {
    console.error("❌ Email transporter error:", error);
  } else {
    console.log("✅ Email transporter ready to send messages!");
  }
});


console.log("📨 Event reminder service started");


/* ================= CRON JOB ================= */
/* Runs every day at 9:00 AM */

cron.schedule("0 9 * * *", async () => {

  console.log("🔍 Checking for next-day event reminders...");

  try {

    const users = await genz.find({
      "savedPosts.event_date": { $exists: true }
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const start = new Date(tomorrow.setHours(0,0,0,0));
    const end = new Date(tomorrow.setHours(23,59,59,999));

    for (const user of users) {

      for (const post of user.savedPosts) {

        if (
          post.event_date &&
          post.event_date >= start &&
          post.event_date <= end
        ) {

          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: `Reminder: "${post.data}" is happening tomorrow!`,
            text:
`Hey ${user.name},

Just a reminder that your saved event "${post.data}" is happening tomorrow.

📅 Date: ${new Date(post.event_date).toDateString()}

Visit CollegenZ to see more details:
https://collegenz.in

Best,
CollegenZ Team`
          };

          try {

            await transporter.sendMail(mailOptions);

            console.log(
              `✅ Reminder sent to ${user.email} for "${post.data}"`
            );

          } catch (err) {

            console.error(
              `❌ Failed to send reminder to ${user.email}:`,
              err.message
            );

          }

        }

      }

    }

  } catch (err) {

    console.error(
      "❌ Reminder cron job failed:",
      err.message
    );

  }

});
