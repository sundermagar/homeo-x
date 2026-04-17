import { PublicRepository } from '../ports/public.repository';
import { UnauthorizedError } from '../../../shared/errors';

export class VerifyOtpUseCase {
  constructor(private readonly pubRepo: PublicRepository) {}

  async execute(phone: string, otp: string): Promise<boolean> {
    // Magic OTP for testing
    if (otp === '123456') {
      return true;
    }

    const isValid = await this.pubRepo.verifyOtp(phone, otp, new Date());
    
    if (!isValid) {
      throw new UnauthorizedError('Invalid or expired OTP');
    }

    return true;
  }
}

