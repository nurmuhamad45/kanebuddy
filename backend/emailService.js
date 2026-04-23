const nodemailer = require("nodemailer");
require("dotenv").config();

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.ethereal.email",
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER || "mock_user",
    pass: process.env.EMAIL_PASS || "mock_pass",
  },
});

async function sendActivationEmail(email, name, token) {
  const activationUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/#activate=${token}`;
  
  const mailOptions = {
    from: `"KaneBuddy Support" <${process.env.EMAIL_USER || "noreply@kanebuddy.com"}>`,
    to: email,
    subject: "Aktivasi Akun KaneBuddy Anda",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
        <h2 style="color: #f97316;">Halo, ${name}!</h2>
        <p>Terima kasih telah bergabung dengan KaneBuddy. Satu langkah lagi untuk mulai mengelola keuangan Anda dengan lebih pintar.</p>
        <p>Silakan klik tombol di bawah ini untuk mengaktifkan akun Anda:</p>
        <a href="${activationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #f97316; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Aktifkan Akun Sekarang</a>
        <p>Atau copy dan paste link berikut ke browser Anda:</p>
        <p style="color: #64748b; font-size: 14px;">${activationUrl}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        <p style="color: #94a3b8; font-size: 12px;">Jika Anda tidak merasa melakukan pendaftaran, silakan abaikan email ini.</p>
      </div>
    `,
  };

  try {
    // If it's a mock mode (no real credentials), we just log it
    if (!process.env.EMAIL_USER || process.env.EMAIL_USER === "mock_user") {
      console.log("\n--- [MOCK EMAIL SENT] ---");
      console.log(`To: ${email}`);
      console.log(`Link: ${activationUrl}`);
      console.log("-------------------------\n");
      return true;
    }

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

module.exports = { sendActivationEmail };
