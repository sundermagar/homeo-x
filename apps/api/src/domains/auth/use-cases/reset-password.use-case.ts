import bcrypt from 'bcryptjs';
import { UserRepositoryPG } from '../../../infrastructure/repositories/user.repository.pg.js';
import { UnauthorizedError } from '../../../shared/errors.js';

export class ResetPasswordUseCase {
  constructor(private userRepository: UserRepositoryPG) {}

  async execute(email: string, token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedError('Invalid request or token expired');
    }

    if (!user.resetOtp || !user.resetOtpExpiry) {
      throw new UnauthorizedError('Invalid request or token expired');
    }

    if (new Date() > new Date(user.resetOtpExpiry)) {
      throw new UnauthorizedError('Token has expired. Please request a new one.');
    }

    const isValidToken = await bcrypt.compare(token, user.resetOtp);
    if (!isValidToken) {
      throw new UnauthorizedError('Invalid request or token expired');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // This method needs to exist or be created: updatePasswordAndClearOtp
    await this.userRepository.updatePasswordAndClearOtp(user.id, hashedNewPassword);

    return { 
      success: true, 
      message: 'Password reset successfully' 
    };
  }
}
