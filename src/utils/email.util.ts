/**
 * Email Utility - Email sending functionality
 * Provides email sending capabilities with nodemailer
 * Handles OTP email delivery with professional HTML templates
 */

import nodemailer from 'nodemailer';
import { ApiError } from './ApiError';

/**
 * Create and configure email transporter
 * @returns Configured nodemailer transporter
 * @throws ApiError if email configuration is missing
 */
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new ApiError(500, "Email configuration is missing", [], "EMAIL_CONFIG_MISSING");
  }
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * Send OTP email with professional HTML template
 * @param email - Recipient email address
 * @param otp - One-time password to send
 * @param userName - Optional user name for personalization
 * @throws ApiError if email sending fails
 */
export const sendOTPEmail = async (email: string, otp: string, userName?: string): Promise<void> => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'BruteForce - Secure Password Reset',
      html: `
      <!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BruteForce | Secure Access</title>
</head>

<body
    style="margin:0; padding:0; background-color:#050505; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#050505;">
        <tr>
            <td align="center" style="padding: 40px 10px;">

                <div
                    style="max-width: 440px; background: linear-gradient(145deg, #111111 0%, #0a0a0a 100%); border: 1px solid #222; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">


                    <div style="padding: 40px 30px;">

                        <div style="text-align:center; margin-bottom:28px;">

                            <div style="
    display:inline-block;
    padding:12px 22px;
    border-radius:14px;

    background:linear-gradient(135deg, rgba(204,255,0,0.08), rgba(204,255,0,0.02));
    border:1px solid rgba(204,255,0,0.15);

  ">

                                <span style="
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      font-size:24px;
      font-weight:900;
      letter-spacing:-0.5px;

      color:#ccff00;
      text-transform:uppercase;
    ">
                                    Brute<span style="color:#ffffff;">Force</span>
                                </span>

                            </div>

                        </div>

                        <div style="text-align: center;">
                            <h2 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0 0 10px 0;">Verify
                                your identity</h2>
                            <p style="color: #999; font-size: 15px; line-height: 1.5; margin: 0 0 30px 0;">
                                Hey <span style="color: #ccff00; font-weight: 600;">${userName || "User"}</span>, use
                                the code below to complete your password reset.
                            </p>
                        </div>

                        <div
                            style="background: #1a1a1a; border-radius: 16px; padding: 30px; margin-bottom: 30px; border: 1px dashed #333; text-align: center;">
                            <span
                                style="display: block; color: #666; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 15px;">Your
                                One-Time Code</span>
                            <div
                                style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; color: #ffffff; letter-spacing: 12px; margin-left: 12px;">
                                ${otp}
                            </div>
                        </div>

                        <div style="text-align: center; margin-bottom: 30px;">
                            <p style="color: #555; font-size: 12px; margin: 0;">
                                This code expires in <span style="color: #888; font-weight: 600;">10 minutes</span>.
                            </p>
                        </div>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                            style="background: rgba(255, 50, 50, 0.05); border-radius: 12px;">
                            <tr>
                                <td style="padding: 15px; text-align: center;">
                                    <p style="color: #ff5f5f; font-size: 12px; margin: 0; font-weight: 500;">
                                        ⚠️ Never share this code with anyone, including BruteForce staff.
                                    </p>
                                </td>
                            </tr>
                        </table>

                    </div>

                    <div style="padding: 0 30px 40px 30px; text-align: center;">
                        <p style="color: #444; font-size: 12px; margin-bottom: 20px;">
                            If you didn't request this, you can safely ignore this email.
                        </p>
                        <div style="height: 1px; background: #222; margin-bottom: 20px;"></div>
                        <p style="color: #444; font-size: 11px; margin: 0;">
                            &copy; 2026 BruteForce Security Systems Inc.<br>
                            123 Cyber Suite, Digital Way.
                        </p>
                    </div>

                </div>

            </td>
        </tr>
    </table>

</body>

</html>
`
    };

    await transporter.sendMail(mailOptions);
    // Email sent successfully
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to send OTP email";
    throw new ApiError(500, `Email sending failed: ${errorMessage}`, [], "EMAIL_SEND_ERROR");
  }
};