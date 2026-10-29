import { config } from '../config/index.js';

export interface SmsProvider {
  sendOtp(phone: string, otp: string): Promise<boolean>;
}

export class ConsoleSmsProvider implements SmsProvider {
  async sendOtp(phone: string, otp: string): Promise<boolean> {
    console.log(`\n========================================`);
    console.log(`[SMS PROVIDER - CONSOLE DEV]`);
    console.log(`To: +91-${phone}`);
    console.log(`Message: Your KaamSetu OTP verification code is ${otp}. Valid for 10 minutes.`);
    console.log(`========================================\n`);
    return true;
  }
}

export class Msg91SmsProvider implements SmsProvider {
  private authKey: string;
  private templateId?: string;

  constructor(authKey: string, templateId?: string) {
    this.authKey = authKey;
    this.templateId = templateId;
  }

  async sendOtp(phone: string, otp: string): Promise<boolean> {
    try {
      const formattedPhone = phone.startsWith('91') ? phone : `91${phone}`;
      const url = new URL('https://control.msg91.com/api/v5/otp');
      url.searchParams.append('template_id', this.templateId || '');
      url.searchParams.append('mobile', formattedPhone);
      url.searchParams.append('authkey', this.authKey);
      url.searchParams.append('otp', otp);

      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      return res.ok;
    } catch (err) {
      console.error('Failed to send SMS via MSG91:', err);
      return false;
    }
  }
}

export const smsProvider: SmsProvider = config.MSG91_AUTH_KEY
  ? new Msg91SmsProvider(config.MSG91_AUTH_KEY, config.MSG91_TEMPLATE_ID)
  : new ConsoleSmsProvider();
