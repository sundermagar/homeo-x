import bcrypt from 'bcryptjs';
import { UnauthorizedError, NotFoundError, BadRequestError } from '../../../shared/errors';
import type { UserRepository } from '../ports/user.repository';
import { type Result, ok } from '../../../shared/result';

export class ChangePasswordUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(userId: number, current: string, newPass: string): Promise<Result<void>> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const passwordHash = await this.userRepository.getUserPassword(user.email);
    if (!passwordHash) throw new UnauthorizedError('Could not verify current password');

    const isMatch = await bcrypt.compare(current, passwordHash);
    if (!isMatch) {
      throw new BadRequestError('Current password is incorrect');
    }

    if (newPass.length < 8) {
      throw new BadRequestError('New password must be at least 8 characters');
    }

    const newHash = await bcrypt.hash(newPass, 10);
    await this.userRepository.updatePassword(userId, newHash);

    return ok(undefined);
  }
}
