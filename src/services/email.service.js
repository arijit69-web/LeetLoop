const nodemailer = require("nodemailer");
const env = require("../config/env");

const hasSmtpConfig = () => {
  return Boolean(env.smtp.host && env.smtp.port && env.smtp.user && env.smtp.pass && env.smtp.from);
};

const createTransporter = () => {
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });
};

const buildEmail = ({ groupedDueRevisions, username, today }) => {
  const intervalKeys = Object.keys(groupedDueRevisions)
    .map(Number)
    .sort((a, b) => a - b);

  const sectionsHtml = intervalKeys
    .map((interval) => {
      const items = groupedDueRevisions[interval];
      const list = items
        .map((revision) => {
          const problem = revision.problemId;
          return `<li><a href="https://leetcode.com/problems/${problem.titleSlug}/">${problem.title}</a></li>`;
        })
        .join("");

      return `<h3>${interval}-Day Review</h3><ul>${list}</ul>`;
    })
    .join("");

  const sectionsText = intervalKeys
    .map((interval) => {
      const items = groupedDueRevisions[interval];
      const lines = items
        .map((revision) => {
          const problem = revision.problemId;
          return `- ${problem.title}: https://leetcode.com/problems/${problem.titleSlug}/`;
        })
        .join("\n");

      return `${interval}-Day Review\n${lines}`;
    })
    .join("\n\n");

  const subject = `LeetLoop Revision Reminder - ${today}`;

  return {
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.4;">
        <h2>LeetLoop Revision Reminder</h2>
        <p>Hi ${username}, here are your due revisions for ${today}.</p>
        ${sectionsHtml}
      </div>
    `,
    text: `LeetLoop Revision Reminder\n\nHi ${username}, here are your due revisions for ${today}.\n\n${sectionsText}`,
  };
};

const sendDueRevisionEmail = async ({ to, username, groupedDueRevisions }) => {
  if (!hasSmtpConfig()) {
    return { sent: false, reason: "SMTP not configured" };
  }

  try {
    const transporter = createTransporter();
    const today = new Date().toISOString().slice(0, 10);
    const email = buildEmail({ groupedDueRevisions, username, today });

    await transporter.sendMail({
      from: env.smtp.from,
      to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });

    return { sent: true };
  } catch (error) {
    if (error && error.code === "EAUTH") {
      return {
        sent: false,
        reason: "SMTP authentication failed. Check SMTP_USER and SMTP_PASS.",
        code: error.code,
      };
    }

    return {
      sent: false,
      reason: error && error.message ? error.message : "Email send failed",
      code: error && error.code ? error.code : "EMAIL_ERROR",
    };
  }
};

module.exports = {
  sendDueRevisionEmail,
};
