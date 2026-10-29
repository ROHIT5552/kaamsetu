import { config } from '../config/index.js';

export interface EmailProvider {
  sendOtp(email: string, otp: string): Promise<boolean>;
}

export class ConsoleEmailProvider implements EmailProvider {
  async sendOtp(email: string, otp: string): Promise<boolean> {
    console.log(`\n========================================`);
    console.log(`[EMAIL PROVIDER - CONSOLE DEV]`);
    console.log(`To: ${email}`);
    console.log(`Subject: Your KaamSetu Verification Code`);
    console.log(`Body: Hello! Your 6-digit OTP verification code is: ${otp}. It expires in 10 minutes.`);
    console.log(`========================================\n`);
    return true;
  }
}

export class ResendEmailProvider implements EmailProvider {
  private apiKey: string;
  private from: string;

  constructor(apiKey: string, from: string) {
    this.apiKey = apiKey;
    this.from = from;
  }

  async sendOtp(email: string, otp: string): Promise<boolean> {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: email,
          subject: `${otp} is your KaamSetu verification code`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 12px;">
              <h2 style="color: #14232b; margin-top: 0;">Kaam<span style="color: #ffc21a;">Setu</span></h2>
              <p style="font-size: 16px; color: #5b6b72;">Here is your verification code to access your account:</p>
              <div style="background-color: #f1f3f2; padding: 16px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #14232b; border-radius: 8px;">
                ${otp}
              </div>
              <p style="font-size: 14px; color: #5b6b72; margin-top: 20px;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
            </div>
          `,
        }),
      });

      return res.ok;
    } catch (err) {
      console.error('Failed to send email via Resend:', err);
      return false;
    }
  }
}

export const emailProvider: EmailProvider = config.RESEND_API_KEY
  ? new ResendEmailProvider(config.RESEND_API_KEY, config.MAIL_FROM)
  : new ConsoleEmailProvider();
