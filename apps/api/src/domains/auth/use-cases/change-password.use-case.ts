import bcrypt from 'bcryptjs';
import type { UserRepository } from '../ports/user.repository';
import { type Result, ok, fail } from '../../../shared/result';

export class ChangePasswordUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userId: number, current: string, newPass: string): Promise<Result<void>> {
    const user = await this.userRepository.findById(userId);
    if (!user) return fail('User not found', 'NOT_FOUND');

    const passwordHash = await this.userRepository.getUserPassword(user.email);
    if (!passwordHash) return fail('Could not verify current password', 'UNAUTHORIZED');

    const isMatch = await bcrypt.compare(current, passwordHash);
    if (!isMatch) {
      return fail('Current password is incorrect', 'UNAUTHORIZED');
    }

    if (newPass.length < 8) {
      return fail('New password must be at least 8 characters', 'VALIDATION');
    }

    const newHash = await bcrypt.hash(newPass, 10);
    await this.userRepository.updatePassword(userId, newHash);

    return ok(undefined);
  }
}
