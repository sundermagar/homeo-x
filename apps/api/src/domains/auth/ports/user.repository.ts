import type { User } from '@mmc/types';

export interface UserRepository {
  findById(id: number): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  getUserPassword(email: string): Promise<string | null>;
  updatePassword(userId: number, passwordHash: string): Promise<void>;
  getUserPermissions(roleId: number): Promise<string[]>;
}
