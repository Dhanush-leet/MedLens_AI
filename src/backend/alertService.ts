import twilio from 'twilio';
import nodemailer from 'nodemailer';

interface AlertParams {
  name: string;
  phone: string;
  email?: string;
  summary: string;
  timestamp: string;
}

export class AlertService {
  public static async sendAlert(params: AlertParams): Promise<{ type: 'sms' | 'email' | 'mock'; status: 'sent' | 'failed'; details?: string }> {
    const { name, phone, email, summary, timestamp } = params;
    const messageText = `MedLens AI Alert: ${name} may need urgent medical attention. Reported symptoms: ${summary}. Time: ${timestamp}. This is an automated message from a health-check tool — please check in directly.`;

    // 1. Try Twilio SMS if credentials exist
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_FROM_NUMBER;

    if (twilioSid && twilioToken && twilioFrom) {
      try {
        console.log(`[Alert Service] Attempting Twilio SMS to ${phone}...`);
        const client = twilio(twilioSid, twilioToken);
        await client.messages.create({
          body: messageText,
          from: twilioFrom,
          to: phone
        });
        console.log(`[Alert Service] Twilio SMS sent successfully.`);
        return { type: 'sms', status: 'sent' };
      } catch (err: any) {
        console.error(`[Alert Service] Twilio SMS failed:`, err);
        // Fall through to email
      }
    }

    // 2. Try SMTP Email fallback
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || 'alerts@medlens.ai';

    if (email && smtpHost && smtpUser && smtpPass) {
      try {
        console.log(`[Alert Service] Attempting SMTP Email to ${email}...`);
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        await transporter.sendMail({
          from: smtpFrom,
          to: email,
          subject: `MedLens AI Alert: Emergency Status for ${name}`,
          text: messageText
        });

        console.log(`[Alert Service] SMTP Email sent successfully.`);
        return { type: 'email', status: 'sent' };
      } catch (err: any) {
        console.error(`[Alert Service] SMTP Email failed:`, err);
      }
    }

    // 3. Fallback: Mock logging
    console.log(`[Alert Service] [MOCK ALERT] Sending alert for ${name} to ${phone} (Email: ${email || 'none'})`);
    console.log(`[Alert Service] [MOCK MSG] "${messageText}"`);
    return { type: 'mock', status: 'sent', details: 'No active Twilio or SMTP credentials found. Alert logged to console.' };
  }
}
