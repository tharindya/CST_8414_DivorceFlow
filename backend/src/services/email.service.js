const nodemailer = require("nodemailer");

function createTransporter() {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP environment variables are missing");
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE).toLowerCase() === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

async function sendCaseInviteEmail({ to, caseTitle, inviteCode, inviteLink }) {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  const transporter = createTransporter();

  await transporter.sendMail({
    from,
    to,
    subject: `Invitation to collaborate on "${caseTitle}"`,
    text: [
      `You have been invited to collaborate on the divorce agreement "${caseTitle}".`,
      "",
      `Open this link to join: ${inviteLink}`,
      `Invite code: ${inviteCode}`,
      "",
      "If you do not have an account yet, register first, then open the invitation link again.",
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>DivorceFlow Invitation</h2>
        <p>You have been invited to collaborate on the divorce agreement:</p>
        <p><strong>${caseTitle}</strong></p>
        <p>
          <a href="${inviteLink}">Click here to open the invitation</a>
        </p>
        <p><strong>Invite code:</strong> ${inviteCode}</p>
        <p>If you do not have an account yet, register first, then open the invitation link again.</p>
      </div>
    `,
  });
}

module.exports = {
  sendCaseInviteEmail,
};