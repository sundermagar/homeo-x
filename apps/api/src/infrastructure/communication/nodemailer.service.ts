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
      logger.error({
        message: err.message,
        code: err.code,
        command: err.command,
        response: err.response,
        stack: err.stack
      }, 'SMTP connection failed:');
      logger.warn('Emails will be skipped until SMTP is fixed.');
    }
  }

  async sendEmail(data: SendEmailDto): Promise<boolean> {
    await this.connectionPromise;
    if (!this.isConnected) {
      logger.warn(`Email to ${data.to} skipped: SMTP is not connected.`);
      return false;
    }

    try {
      logger.info(`Attempting to send email to ${data.to}...`);
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.MAIL_USER || '"Kreed.health System" <noreply@managemyclinic.in>',
        to: data.to,
        subject: data.subject,
        text: data.text,
        html: data.html,
        attachments: data.attachments,
      });

      logger.info(`Email sent successfully: ${info.messageId}`);
      return true;
    } catch (err: any) {
      logger.error({
        message: err.message,
        code: err.code,
        stack: err.stack
      }, `Failed to send email to ${data.to}:`);
      return false;
    }
  }

  async sendWelcomeCredentials(to: string, name: string, role: string, pass: string, isClinic: boolean = false): Promise<boolean> {
    const loginUrl = process.env.APP_URL || 'https://managemyclinic.in';
    const title = isClinic ? 'Clinic Organization Setup Complete' : 'Welcome to Kreed.health';
    const roleText = isClinic ? 'Clinic Administrator' : role;
    
    return this.sendEmail({
      to,
      subject: `Your Credentials - Kreed.health`,
      text: `Hello ${name},\n\nYour account as ${roleText} has been created.\n\nLogin URL: ${loginUrl}/login\nEmail: ${to}\nPassword: ${pass}\n\nPlease change your password after logging in.`,
      html: `
        <div style="background-color: #f8fafc; padding: 40px 20px; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
            <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: -0.02em; font-weight: 800;">Kreed<span style="color: rgba(255,255,255,0.7)">.health</span></h1>
            </div>
            <div style="padding: 40px; color: #1e293b; line-height: 1.6;">
              <h2 style="margin-top: 0; color: #0f172a; font-size: 20px; font-weight: 700;">${title}</h2>
              <p>Hello <strong>${name}</strong>,</p>
              <p>Your account has been successfully created. You have been assigned the role of <strong>${roleText}</strong> on the Kreed.health hospital portal.</p>
              
              <div style="background: #f1f5f9; padding: 20px; border-radius: 10px; margin: 25px 0;">
                <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b; text-transform: uppercase; font-weight: 600;">Your Login Credentials</p>
                <div style="margin-bottom: 8px;"><strong>Login URL:</strong> <a href="${loginUrl}/login" style="color: #2563eb; text-decoration: none;">${loginUrl}/login</a></div>
                <div style="margin-bottom: 8px;"><strong>Email (User ID):</strong> ${to}</div>
                <div><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-size: 16px;">${pass}</code></div>
              </div>
              
              <div style="text-align: center; margin: 35px 0;">
                <a href="${loginUrl}/login" style="background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);">Login Now</a>
              </div>
              
              <p style="font-size: 14px; color: #64748b;">
                <strong>Security Note:</strong> Please change your password immediately after logging in for the first time.
              </p>
              
              <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0;">
              
              <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-bottom: 0;">
                © 2026 HomeoX Platform / Kreed.health System. All rights reserved.<br>
                Secure Healthcare Infrastructure
              </p>
            </div>
          </div>
        </div>
      `
    });
  }
}

export const emailService = new NodemailerServiceAdapter();
