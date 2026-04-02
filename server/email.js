const nodemailer = require('nodemailer');

let transporter = null;
let transporterPromise = null;

async function getTransporter() {
  if (transporter) return transporter;

  // Prevent multiple concurrent initialization attempts
  if (transporterPromise) return transporterPromise;

  transporterPromise = (async () => {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT) || 587,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Create a test account for development
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('Using Ethereal test email account:', testAccount.user);
    }

    return transporter;
  })();

  try {
    return await transporterPromise;
  } catch (err) {
    transporterPromise = null; // Allow retry on failure
    throw err;
  }
}

async function sendSigningRequest(signer, document) {
  const transport = await getTransporter();
  const signUrl = `${process.env.APP_URL || 'http://localhost:5173'}/sign/${signer.token}`;

  const info = await transport.sendMail({
    from: `"DocSign" <${process.env.FROM_EMAIL || 'noreply@docsign.app'}>`,
    to: signer.email,
    subject: `Signature requested: ${document.title}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #6d28d9;">Signature Requested</h2>
        <p>Hi ${signer.name},</p>
        <p><strong>${document.owner_name}</strong> has requested your signature on <strong>"${document.title}"</strong>.</p>
        <p style="margin: 24px 0;">
          <a href="${signUrl}" style="background: #6d28d9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
            Review & Sign Document
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link: ${signUrl}</p>
      </div>
    `,
  });

  console.log('Signing request sent:', nodemailer.getTestMessageUrl(info) || info.messageId);
  return info;
}

async function sendCompletionNotice(recipient, document, allSigners) {
  const transport = await getTransporter();
  const viewUrl = `${process.env.APP_URL || 'http://localhost:5173'}/document/${document.id}`;

  const signerList = allSigners
    .map(s => `<li>${s.name} (${s.email}) - signed ${new Date(s.signed_at).toLocaleDateString()}</li>`)
    .join('');

  const info = await transport.sendMail({
    from: `"DocSign" <${process.env.FROM_EMAIL || 'noreply@docsign.app'}>`,
    to: recipient.email,
    subject: `Completed: All signatures collected for "${document.title}"`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #16a34a;">All Signatures Collected!</h2>
        <p>Hi ${recipient.name},</p>
        <p>All parties have signed <strong>"${document.title}"</strong>.</p>
        <h3>Signers:</h3>
        <ul>${signerList}</ul>
        <p style="margin: 24px 0;">
          <a href="${viewUrl}" style="background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
            View & Download Document
          </a>
        </p>
      </div>
    `,
  });

  console.log('Completion notice sent:', nodemailer.getTestMessageUrl(info) || info.messageId);
  return info;
}

module.exports = { sendSigningRequest, sendCompletionNotice };
