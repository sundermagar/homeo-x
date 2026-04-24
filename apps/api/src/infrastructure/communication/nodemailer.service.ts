import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { EmailService, SendEmailDto } from '../../domains/communication/ports/email.service';
import { appConfig } from '../../shared/config/app-config';
import { createLogger } from '../../shared/logger';

const logger = createLogger('nodemailer-service');

export class NodemailerServiceAdapter implements EmailService {
  private transporter: Transporter;
  private isConnected: boolean = false;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    this.verifyConnection();
  }

  private async verifyConnection() {
    try {
      await this.transporter.verify();
      this.isConnected = true;
      logger.info('Nodemailer SMTP connection established successfully.');
    } catch (err: any) {
      this.isConnected = false;
      logger.warn(`SMTP connection failed: ${err.message}. Emails will be skipped.`);
    }
  }

  async sendEmail(data: SendEmailDto): Promise<boolean> {
    if (!this.isConnected) {
      logger.warn(`Email to ${data.to} skipped because SMTP is not connected.`);
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Kreed.health System" <noreply@managemyclinic.in>',
        to: data.to,
        subject: data.subject,
        text: data.text,
        html: data.html,
        attachments: data.attachments,
      });

      logger.info(`Message sent: ${info.messageId}`);
      return true;
    } catch (err: any) {
      logger.error(`Failed to send email to ${data.to}: ${err.message}`);
      return false;
    }
  }
}
