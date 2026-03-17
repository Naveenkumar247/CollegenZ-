const { Resend } = require("resend");

// Initialize Resend with your API key from your .env file
const resend = new Resend(process.env.RESEND_API_KEY);

/* ================= LOGIN ALERT ================= */

async function sendLoginAlert(user) {
  try {
    const { data, error } = await resend.emails.send({
      // Make sure the domain matches your verified domain in Resend
      from: "CollegenZ Security <security@collegenz.in>", 
      to: user.email,
      subject: "New Login Detected on Your CollegenZ Account",
      text: `Hello ${user.username || user.name},

Your CollegenZ account was just logged in.

If this was you, you can ignore this message.

If this wasn't you, please secure your account immediately.

Login time: ${new Date().toString()}

Visit CollegenZ:
https://collegenz.in

— CollegenZ Security`
    });

    if (error) {
      console.error("❌ Failed to send login alert via Resend:", error);
      return;
    }

    console.log(`📩 Login alert sent to ${user.email} (ID: ${data.id})`);

  } catch (err) {
    console.error("❌ Unexpected error sending login alert:", err.message);
  }
}

module.exports = {
  sendLoginAlert
};
