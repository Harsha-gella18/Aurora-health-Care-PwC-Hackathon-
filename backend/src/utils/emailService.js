let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch {
  console.log('nodemailer not installed — email features disabled. Run: npm install nodemailer');
}

const getTransporter = () => {
  if (!nodemailer || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: false,
    },
  });
};

const verifyEmailConfig = async () => {
  const user = process.env.EMAIL_USER || '(not set)';
  const passSet = !!process.env.EMAIL_PASS;
  const transporter = getTransporter();
  if (!transporter) {
    return { ok: false, reason: 'Transporter not created — EMAIL_USER or EMAIL_PASS missing', user, passSet };
  }
  try {
    await transporter.verify();
    return { ok: true, user };
  } catch (err) {
    return { ok: false, reason: err.message, code: err.code, user, passSet };
  }
};

const sendTestEmail = async (toEmail) => {
  const transporter = getTransporter();
  if (!transporter) return { ok: false, reason: 'Email not configured' };

  try {
    const info = await transporter.sendMail({
      from: `"Aurora Health" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: 'Aurora Health — Test Email',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#0d9488,#06b6d4);padding:24px 28px">
            <h1 style="color:#fff;margin:0;font-size:20px">Aurora Health</h1>
            <p style="color:#ccfbf1;margin:4px 0 0;font-size:13px">Email System Test</p>
          </div>
          <div style="padding:24px 28px">
            <p style="color:#374151;font-size:14px">This is a test email from <strong>Aurora Health</strong>.</p>
            <p style="color:#6b7280;font-size:13px">If you received this, the email system is working correctly.</p>
            <div style="background:#f0fdfa;border-radius:10px;padding:14px;margin:16px 0;text-align:center">
              <p style="margin:0;color:#0d9488;font-weight:600;font-size:14px">Email delivery confirmed</p>
              <p style="margin:4px 0 0;color:#5eead4;font-size:11px">${new Date().toLocaleString()}</p>
            </div>
          </div>
          <div style="background:#f9fafb;padding:12px 28px;text-align:center;font-size:11px;color:#9ca3af">
            Aurora Health System — Automated Test
          </div>
        </div>`,
    });
    return { ok: true, messageId: info.messageId, to: toEmail };
  } catch (err) {
    return { ok: false, reason: err.message, code: err.code, to: toEmail };
  }
};

const sendConsultationEmail = async (patientEmail, patientName, caseData, pdfPath) => {
  const billing = caseData.billing || {};
  const billingRows = (billing.items || [])
    .map(i => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.description}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${(i.amount || 0).toFixed(2)}</td></tr>`)
    .join('');

  const prescRows = (caseData.prescriptions || [])
    .map(p => `<tr><td style="padding:6px;border-bottom:1px solid #eee">${p.medication_name}</td><td style="padding:6px">${p.dosage}</td><td style="padding:6px">${p.frequency}</td><td style="padding:6px">${p.duration}</td></tr>`)
    .join('');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#0d9488,#06b6d4);padding:28px 32px">
        <h1 style="color:#fff;margin:0;font-size:22px">Aurora Health</h1>
        <p style="color:#ccfbf1;margin:6px 0 0;font-size:14px">Consultation Summary</p>
      </div>
      <div style="padding:28px 32px">
        <p style="color:#374151;font-size:15px">Dear <strong>${patientName}</strong>,</p>
        <p style="color:#6b7280;font-size:14px">Your case <strong>"${caseData.title}"</strong> has been processed. Below is your consultation summary.</p>

        ${caseData.diagnosis ? `
        <div style="background:#f0fdfa;border-radius:12px;padding:16px;margin:16px 0">
          <p style="margin:0;font-size:13px;color:#0d9488;font-weight:600">Diagnosis</p>
          <p style="margin:6px 0 0;color:#134e4a;font-size:14px">${caseData.diagnosis}</p>
          ${caseData.symptoms?.length ? `<p style="margin:4px 0 0;color:#14b8a6;font-size:12px">Symptoms: ${caseData.symptoms.join(', ')}</p>` : ''}
        </div>` : ''}

        ${prescRows ? `
        <h3 style="color:#374151;font-size:15px;margin:20px 0 8px">Prescribed Medications</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;color:#374151">
          <tr style="background:#f3f4f6"><th style="padding:8px;text-align:left">Medicine</th><th style="padding:8px">Dosage</th><th style="padding:8px">Frequency</th><th style="padding:8px">Duration</th></tr>
          ${prescRows}
        </table>` : ''}

        ${billingRows ? `
        <h3 style="color:#374151;font-size:15px;margin:20px 0 8px">Billing Summary</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;color:#374151">
          <tr style="background:#f3f4f6"><th style="padding:8px;text-align:left">Item</th><th style="padding:8px;text-align:right">Amount</th></tr>
          ${billingRows}
          <tr style="font-weight:bold;background:#f0fdf4"><td style="padding:10px">Total</td><td style="padding:10px;text-align:right">$${(billing.total || 0).toFixed(2)}</td></tr>
        </table>` : ''}

        ${caseData.consultation_document ? `
        <h3 style="color:#374151;font-size:15px;margin:20px 0 8px">Consultation Document</h3>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;font-size:13px;color:#374151;white-space:pre-wrap">${caseData.consultation_document}</div>
        ` : ''}

        <p style="color:#6b7280;font-size:13px;margin:24px 0 0">Thank you for choosing Aurora Health. Please follow up as recommended by your doctor.</p>
      </div>
      <div style="background:#f9fafb;padding:16px 32px;text-align:center;font-size:11px;color:#9ca3af">
        This is an automated email from Aurora Health System.
      </div>
    </div>`;

  const transporter = getTransporter();
  if (!transporter) {
    console.log('Email not configured or nodemailer not installed — skipping');
    return false;
  }

  try {
    const fs = require('fs');
    const mailOptions = {
      from: `"Aurora Health" <${process.env.EMAIL_USER}>`,
      to: patientEmail,
      subject: `Consultation Summary — ${caseData.title}`,
      html,
    };

    if (pdfPath && fs.existsSync(pdfPath)) {
      mailOptions.attachments = [{
        filename: `Consultation-Summary-${caseData.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        path: pdfPath,
        contentType: 'application/pdf',
      }];
    }

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${patientEmail}${pdfPath ? ' (with PDF)' : ''}`);
    return true;
  } catch (err) {
    console.error('Email send failed:', err.message);
    return false;
  }
};

module.exports = { sendConsultationEmail, verifyEmailConfig, sendTestEmail };
