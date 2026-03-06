const nodemailer = require("nodemailer");

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

/* ================= VERIFY ================= */

transporter.verify((err) => {
  if (err) {
    console.error("❌ Email transporter error:", err);
  } else {
    console.log("✅ Email transporter ready to send messages!");
  }
});

/* ================= LOGIN ALERT ================= */

async function sendLoginAlert(user) {
  try {

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "New Login Detected on Your CollegenZ Account",
      text:
`Hello ${user.username || user.name},

Your CollegenZ account was just logged in.

If this was you, you can ignore this message.

If this wasn't you, please secure your account immediately.

Login time: ${new Date().toString()}

Visit CollegenZ:
https://collegenz.in

— CollegenZ Security`
    };

    await transporter.sendMail(mailOptions);

    console.log(`📩 Login alert sent to ${user.email}`);

  } catch (err) {
    console.error("❌ Failed to send login alert:", err.message);
  }
}

module.exports = {
  sendLoginAlert
};
