import { UserRepositoryPG } from '../../../infrastructure/repositories/user.repository.pg.js';
import bcrypt from 'bcryptjs';

export class ResetPasswordWithOtpUseCase {
  constructor(private userRepository: UserRepositoryPG) {}

  async verifyOtp(email: string, otp: string): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return { success: false, message: 'Invalid or expired OTP.' };
    }

    const otpData = await this.userRepository.getResetOtp(email);
    if (!otpData || !otpData.resetOtp || !otpData.resetOtpExpiry) {
      return { success: false, message: 'Invalid or expired OTP.' };
    }

    if (new Date() > otpData.resetOtpExpiry) {
      return { success: false, message: 'OTP has expired. Please request a new one.' };
    }

    const isValid = await bcrypt.compare(otp, otpData.resetOtp);
    if (!isValid) {
      return { success: false, message: 'Invalid OTP.' };
    }

    // OTP is valid. In a full system, you might return a temporary token here.
    return { success: true, message: 'OTP verified successfully.' };
  }

  async execute(email: string, otp: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    // Re-verify the OTP to ensure security at the time of reset
    const verification = await this.verifyOtp(email, otp);
    if (!verification.success) {
      return verification;
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return { success: false, message: 'User not found.' };
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.updatePassword(user.id, hashedNewPassword);
    await this.userRepository.clearResetOtp(user.id);

    return { success: true, message: 'Password updated successfully.' };
  }
}
