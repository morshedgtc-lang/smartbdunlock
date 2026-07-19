import nodemailer from 'nodemailer'
import { config } from './config'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  connectionTimeout: config.email.smtpTimeout,
  greetingTimeout: config.email.greetingTimeout,
  socketTimeout: config.email.socketTimeout,
})

interface SendOtpEmailParams {
  to: string
  name: string
  otp: string
}

export async function sendOtpEmail({ to, name, otp }: SendOtpEmailParams): Promise<boolean> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('[EMAIL] Gmail credentials not configured, skipping send')
    return false
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a1a;font-family:'Segoe UI',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a1a;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;letter-spacing:1px;">SmartBDUnlock</h1>
          <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Email Verification</p>
        </td></tr>
        <tr><td style="padding:40px 32px;">
          <p style="color:#e2e8f0;font-size:16px;margin:0 0 8px;">Hi ${name},</p>
          <p style="color:#94a3b8;font-size:14px;margin:0 0 24px;">Use the code below to verify your email address:</p>
          <div style="background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
            <span style="color:#a5b4fc;font-size:36px;font-weight:bold;letter-spacing:8px;font-family:'Courier New',monospace;">${otp}</span>
          </div>
          <p style="color:#94a3b8;font-size:13px;margin:0 0 8px;">This code expires in <strong style="color:#e2e8f0;">10 minutes</strong>.</p>
          <p style="color:#94a3b8;font-size:13px;margin:0;">If you didn't request this, please ignore this email.</p>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.05);text-align:center;">
          <p style="color:#475569;font-size:12px;margin:0;">© ${new Date().getFullYear()} SmartBDUnlock. All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    await transporter.sendMail({
      from: `"SmartBDUnlock" <${process.env.GMAIL_USER}>`,
      to,
      subject: 'Your SmartBDUnlock Verification Code',
      html,
    })
    return true
  } catch (err) {
    console.error('[EMAIL] Failed to send OTP:', err)
    return false
  }
}

interface SendAdminNotificationParams {
  name: string
  email: string
  username: string | null
  userId: string
}

export async function sendAdminApprovalNotification({ name, email, username, userId }: SendAdminNotificationParams): Promise<boolean> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return false
  if (!process.env.ADMIN_EMAIL) {
    console.warn('[EMAIL] ADMIN_EMAIL not configured')
    return false
  }

  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a1a;font-family:'Segoe UI',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a1a;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#f59e0b,#f97316);padding:24px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:20px;">🔔 New User Registration</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          <table width="100%" cellpadding="8" cellspacing="0" style="color:#e2e8f0;font-size:14px;">
            <tr><td style="color:#94a3b8;width:120px;">Name</td><td>${name}</td></tr>
            <tr><td style="color:#94a3b8;">Username</td><td>${username || 'N/A'}</td></tr>
            <tr><td style="color:#94a3b8;">Email</td><td>${email}</td></tr>
            <tr><td style="color:#94a3b8;">User ID</td><td><strong>${userId}</strong></td></tr>
          </table>
          <p style="color:#94a3b8;font-size:14px;margin:24px 0 0;">Log in to the admin panel to approve or reject this user.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  try {
    await transporter.sendMail({
      from: `"SmartBDUnlock" <${process.env.GMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `[Action Required] New User: ${name} (${username})`,
      html,
    })
    return true
  } catch (err) {
    console.error('[EMAIL] Failed to send admin notification:', err)
    return false
  }
}
