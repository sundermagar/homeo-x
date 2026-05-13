import { UserRepositoryPG } from '../../../infrastructure/repositories/user.repository.pg.js';
import { emailService } from '../../../infrastructure/communication/nodemailer.service.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { NotFoundError } from '../../../shared/errors.js';

export class ForgotPasswordUseCase {
  constructor(private userRepository: UserRepositoryPG) {}

  async execute(email: string): Promise<{ success: boolean; message: string; simulatedOtp?: string }> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new NotFoundError('User');
    }

    // Generate a secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(rawToken, 10);
    
    // Set expiry to 15 minutes from now
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 15);

    // Update user record with the token
    await this.userRepository.updateResetOtp(user.id, hashedToken, expiry);

    // Determine frontend URL based on environment
    const isProduction = process.env.NODE_ENV === 'production';
    const frontendUrl = isProduction 
      ? (process.env.APP_URL || 'https://managemyclinic.in') 
      : 'http://localhost:5173';
      
    const resetLink = `${frontendUrl}/login?token=${rawToken}&email=${encodeURIComponent(email)}`;

    // Send the email using the shared service
    await emailService.sendEmail({
      to: email,
      subject: 'Password Reset Request - Kreed.health',
      text: `You requested a password reset. Click the following link to reset your password: ${resetLink}`,
      html: `
        <div style="background-color: #f8fafc; padding: 40px 20px; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
            <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: -0.02em; font-weight: 800;">Kreed<span style="color: rgba(255,255,255,0.7)">.health</span></h1>
            </div>
            <div style="padding: 40px; color: #1e293b; line-height: 1.6;">
              <h2 style="margin-top: 0; color: #0f172a; font-size: 20px; font-weight: 700;">Password Reset Request</h2>
              <p>Hello,</p>
              <p>We received a request to reset the password for your account on the <strong>Kreed.health</strong> hospital portal. Click the button below to choose a new, secure password:</p>
              
              <div style="text-align: center; margin: 35px 0;">
                <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3);">Reset My Password</a>
              </div>
              
              <p style="font-size: 14px; color: #64748b; background: #f1f5f9; padding: 12px; border-radius: 8px;">
                <strong>Security Note:</strong> This link will expire in <strong>15 minutes</strong>. If you did not request this password reset, please ignore this email or contact your hospital administrator.
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

    return { 
      success: true, 
      message: 'If the email exists, a reset link has been sent.', 
    };
  }
}
