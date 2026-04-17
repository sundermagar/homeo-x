import { PublicRepository } from '../ports/public.repository';
// import { SmsService } from '../../communication/ports/sms.service';

export class SendOtpUseCase {
  constructor(private readonly pubRepo: PublicRepository) {}

  async execute(phone: string): Promise<boolean> {
    const otp = '123456'; // Use fixed OTP for testing as requested
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    await this.pubRepo.createOtp(phone, otp, expiresAt);

    // Call SMS Gateway - For now we just log it as in legacy
    console.log(`[TEST-MODE] OTP for ${phone} is ${otp}`);

    return true;
  }
}
