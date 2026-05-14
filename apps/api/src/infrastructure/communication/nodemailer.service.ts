import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { EmailService, SendEmailDto } from '../../domains/communication/ports/email.service.js';
import { appConfig } from '../../shared/config/app-config.js';
import { createLogger } from '../../shared/logger.js';

const logger = createLogger('nodemailer-service');

export class NodemailerServiceAdapter implements EmailService {
  private transporter: Transporter;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void>;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || process.env.MAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || process.env.MAIL_PORT) || 587,
      secure: (process.env.SMTP_SECURE || process.env.MAIL_ENCRYPTION) === 'true' || process.env.MAIL_PORT === '465', 
      auth: {
        user: process.env.SMTP_USER || process.env.MAIL_USER,
        pass: process.env.SMTP_PASS || process.env.MAIL_PASS,
      },
    });

    logger.info(`Initializing SMTP with host: ${process.env.SMTP_HOST || process.env.MAIL_HOST || 'smtp.gmail.com'}, port: ${Number(process.env.SMTP_PORT || process.env.MAIL_PORT) || 587}`);
    this.connectionPromise = this.verifyConnection();
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
    await this.connectionPromise;
    if (!this.isConnected) {
      logger.warn(`Email to ${data.to} skipped because SMTP is not connected.`);
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.MAIL_USER || '"Kreed.health System" <noreply@managemyclinic.in>',
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

export const emailService = new NodemailerServiceAdapter();
