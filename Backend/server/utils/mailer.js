const nodemailer = require("nodemailer");

// Create reusable transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,  // true for 465, false for 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Send a payment receipt email.
 * @param {Object} options
 * @param {string} options.to        - Recipient email
 * @param {string} options.userName  - Recipient name
 * @param {string} options.courseName - Course purchased
 * @param {number} options.amount    - Amount paid
 * @param {string} options.currency  - Currency (INR)
 * @param {string} options.orderId   - Order ID
 * @param {string} options.transactionId - Transaction ID
 * @param {string} options.date      - Payment date
 */
async function sendPaymentReceipt(options) {
    const {
        to, userName, courseName, amount, currency,
        orderId, transactionId, date,
    } = options;

    const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #1D4ED8, #3B82F6); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✅ Payment Successful!</h1>
            <p style="color: #BFDBFE; margin-top: 8px; font-size: 14px;">LiveLearn Plus</p>
        </div>
        <div style="padding: 30px;">
            <p style="font-size: 16px; color: #374151;">Hi <strong>${userName}</strong>,</p>
            <p style="font-size: 14px; color: #6B7280;">Thank you for enrolling! Here's your payment receipt:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr style="border-bottom: 1px solid #f3f4f6;">
                    <td style="padding: 10px 0; color: #6B7280; font-size: 14px;">Course</td>
                    <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #111827; font-size: 14px;">${courseName}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                    <td style="padding: 10px 0; color: #6B7280; font-size: 14px;">Amount Paid</td>
                    <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #059669; font-size: 14px;">${currency} ${amount}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                    <td style="padding: 10px 0; color: #6B7280; font-size: 14px;">Order ID</td>
                    <td style="padding: 10px 0; text-align: right; font-family: monospace; color: #111827; font-size: 14px;">${orderId}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f3f4f6;">
                    <td style="padding: 10px 0; color: #6B7280; font-size: 14px;">Transaction ID</td>
                    <td style="padding: 10px 0; text-align: right; font-family: monospace; color: #111827; font-size: 14px;">${transactionId}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #6B7280; font-size: 14px;">Date</td>
                    <td style="padding: 10px 0; text-align: right; color: #111827; font-size: 14px;">${date}</td>
                </tr>
            </table>
            
            <p style="font-size: 13px; color: #9CA3AF; text-align: center; margin-top: 20px;">
                This is a simulated payment for demonstration purposes only.<br>
                No real charges were applied.
            </p>
        </div>
        <div style="background: #F9FAFB; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #9CA3AF; margin: 0;">© 2026 LiveLearn Plus. All rights reserved.</p>
        </div>
    </div>`;

    const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"LiveLearn Plus" <noreply@livelearnplus.com>',
        to,
        subject: `✅ Payment Receipt — ${courseName} | LiveLearn Plus`,
        html: htmlContent,
    });

    console.log("Receipt email sent:", info.messageId);
    return info;
}

module.exports = { sendPaymentReceipt };
