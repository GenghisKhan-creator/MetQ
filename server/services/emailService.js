const nodemailer = require('nodemailer');

// Create transporter — uses Gmail by default; swap for SendGrid/SES in production
const createTransporter = () => {
    if (process.env.EMAIL_HOST) {
        // Custom SMTP (production)
        return nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT || '587'),
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
    }
    // Development: use Ethereal (catch-all test mailbox)
    return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
            user: process.env.ETHEREAL_USER || 'ethereal_user',
            pass: process.env.ETHEREAL_PASS || 'ethereal_pass',
        },
    });
};

const brandedTemplate = (title, bodyHtml) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #1a365d, #2b6cb0); padding: 40px 40px 32px; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; letter-spacing: -0.5px; }
    .header p { color: #bee3f8; margin: 8px 0 0; font-size: 13px; }
    .body { padding: 40px; }
    .greeting { font-size: 20px; font-weight: 700; color: #1a202c; margin-bottom: 8px; }
    .text { color: #4a5568; line-height: 1.7; font-size: 15px; margin-bottom: 24px; }
    .card { background: #f8fafc; border-radius: 16px; padding: 24px; margin: 24px 0; border: 1px solid #e2e8f0; }
    .card-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .card-row:last-child { border-bottom: none; }
    .card-row .label { color: #718096; font-weight: 600; }
    .card-row .value { color: #1a202c; font-weight: 700; }
    .badge { display: inline-block; padding: 4px 14px; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
    .badge-blue { background: #ebf8ff; color: #2b6cb0; }
    .badge-red { background: #fff5f5; color: #c53030; }
    .badge-green { background: #f0fff4; color: #276749; }
    .badge-orange { background: #fffaf0; color: #c05621; }
    .btn { display: inline-block; background: #1a365d; color: #fff; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 14px; text-decoration: none; letter-spacing: 0.05em; margin-top: 8px; }
    .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 40px; font-size: 12px; color: #a0aec0; text-align: center; }
    .logo { font-weight: 900; color: #fff; font-size: 20px; letter-spacing: -0.5px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">MetQ.</div>
      <h1>${title}</h1>
      <p>Smart Queue &amp; Appointment Management</p>
    </div>
    <div class="body">
      ${bodyHtml}
    </div>
    <div class="footer">
      This is an automated message from MetQ Health System. Please do not reply directly to this email.<br/>
      &copy; ${new Date().getFullYear()} MetQ. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

// Send appointment confirmation email
const sendAppointmentConfirmation = async ({ to, patientName, doctorName, hospitalName, appointmentDate, startTime, urgency }) => {
    const transporter = createTransporter();

    const urgencyBadge = urgency === 'Critical'
        ? '<span class="badge badge-red">Critical</span>'
        : urgency === 'Moderate'
            ? '<span class="badge badge-orange">Moderate</span>'
            : '<span class="badge badge-blue">Routine</span>';

    const formattedDate = new Date(appointmentDate).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const body = `
      <p class="greeting">Hi ${patientName},</p>
      <p class="text">Your appointment has been successfully scheduled. Here are your booking details:</p>
      <div class="card">
        <div class="card-row"><span class="label">Hospital</span><span class="value">${hospitalName}</span></div>
        <div class="card-row"><span class="label">Doctor</span><span class="value">Dr. ${doctorName}</span></div>
        <div class="card-row"><span class="label">Date</span><span class="value">${formattedDate}</span></div>
        <div class="card-row"><span class="label">Time</span><span class="value">${startTime}</span></div>
        <div class="card-row"><span class="label">Priority</span><span class="value">${urgencyBadge}</span></div>
      </div>
      <p class="text">Please arrive <strong>10 minutes before</strong> your scheduled time. If you need to reschedule, please do so at least 2 hours before your appointment.</p>
      <a href="${process.env.APP_URL || 'http://localhost:5173'}/queue" class="btn">Track Your Queue →</a>
    `;

    const mailOptions = {
        from: `"MetQ Health" <${process.env.EMAIL_FROM || 'noreply@metq.com'}>`,
        to,
        subject: `✅ Appointment Confirmed — Dr. ${doctorName} on ${formattedDate}`,
        html: brandedTemplate('Appointment Confirmed', body),
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email] Confirmation sent to ${to}. Preview: ${nodemailer.getTestMessageUrl(info)}`);
        return { success: true, previewUrl: nodemailer.getTestMessageUrl(info) };
    } catch (err) {
        console.error('[Email] Failed to send confirmation:', err.message);
        return { success: false, error: err.message };
    }
};

// Send appointment cancellation email
const sendCancellationNotice = async ({ to, patientName, doctorName, appointmentDate, startTime }) => {
    const transporter = createTransporter();

    const formattedDate = new Date(appointmentDate).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const body = `
      <p class="greeting">Hi ${patientName},</p>
      <p class="text">Your appointment has been cancelled as requested. Details of the cancelled booking:</p>
      <div class="card">
        <div class="card-row"><span class="label">Doctor</span><span class="value">Dr. ${doctorName}</span></div>
        <div class="card-row"><span class="label">Date</span><span class="value">${formattedDate}</span></div>
        <div class="card-row"><span class="label">Time</span><span class="value">${startTime}</span></div>
        <div class="card-row"><span class="label">Status</span><span class="value"><span class="badge badge-red">Cancelled</span></span></div>
      </div>
      <p class="text">If you need to rebook, you can schedule a new appointment through the MetQ portal at any time.</p>
      <a href="${process.env.APP_URL || 'http://localhost:5173'}/book" class="btn">Book New Appointment →</a>
    `;

    const mailOptions = {
        from: `"MetQ Health" <${process.env.EMAIL_FROM || 'noreply@metq.com'}>`,
        to,
        subject: `❌ Appointment Cancelled — Dr. ${doctorName} on ${formattedDate}`,
        html: brandedTemplate('Appointment Cancelled', body),
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email] Cancellation notice sent to ${to}. Preview: ${nodemailer.getTestMessageUrl(info)}`);
        return { success: true, previewUrl: nodemailer.getTestMessageUrl(info) };
    } catch (err) {
        console.error('[Email] Failed to send cancellation notice:', err.message);
        return { success: false, error: err.message };
    }
};

// Send queue "you're next" notification
const sendQueueTurnNotification = async ({ to, patientName, doctorName }) => {
    const transporter = createTransporter();

    const body = `
      <p class="greeting">Hi ${patientName},</p>
      <p class="text" style="font-size:18px;font-weight:700;color:#276749;">🟢 It's your turn!</p>
      <p class="text"><strong>Dr. ${doctorName}</strong> is ready to see you now. Please proceed to the consultation room immediately.</p>
      <a href="${process.env.APP_URL || 'http://localhost:5173'}/queue" class="btn">View Queue Status →</a>
    `;

    const mailOptions = {
        from: `"MetQ Health" <${process.env.EMAIL_FROM || 'noreply@metq.com'}>`,
        to,
        subject: `🔔 It's Your Turn — Dr. ${doctorName} is Ready`,
        html: brandedTemplate("It's Your Turn!", body),
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email] Turn notification sent to ${to}.`);
        return { success: true };
    } catch (err) {
        console.error('[Email] Failed to send turn notification:', err.message);
        return { success: false };
    }
};

module.exports = { sendAppointmentConfirmation, sendCancellationNotice, sendQueueTurnNotification };
