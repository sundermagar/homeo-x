import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { AuthTokenPayload, Role } from '@mmc/types';
import { appConfig } from '../../../shared/config/app-config';
import { UnauthorizedError } from '../../../shared/errors';
import type { UserRepository } from '../ports/user.repository';
import { type Result, ok } from '../../../shared/result';

export interface LoginResult {
  token: string;
  user: AuthTokenPayload & { permissions: Record<string, boolean> };
}

export class LoginUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(email: string, password: string): Promise<Result<LoginResult>> {
    // ─── Demo Bypass (No Database Connection Required) ──────────────────────────
    if (email === 'doctor@homeox.com' && password === 'password123') {
      const payload: AuthTokenPayload = {
        id: 2, // Matches seeded user ID
        email: 'doctor@homeox.com',
        name: 'Demo Doctor (Offline Mode)',
        type: 'Doctor' as any,
        contextId: 1, 
        roleId: 2, 
        roleName: 'Doctor',
      };

      const token = jwt.sign(payload, appConfig.jwt.secret as jwt.Secret, {
        expiresIn: '24h',
      });

      return ok({
        token,
        user: {
          ...payload,
          permissions: this.calculatePermissions('Doctor', []),
        },
      });
    }

    // ─── Standard Database Authentication ───────────────────────────────────────
    const passwordHash = await this.userRepository.getUserPassword(email);
    if (!passwordHash) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    const permissions = await this.userRepository.getUserPermissions(user.roleId);

    const payload: AuthTokenPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      type: user.type,
      contextId: user.contextId,
      roleId: user.roleId,
      roleName: user.roleName,
    };

    const token = jwt.sign(payload, appConfig.jwt.secret as jwt.Secret, {
      expiresIn: appConfig.jwt.expiresIn as any,
    });

    const mergedPermissions = this.calculatePermissions(user.type as any, permissions);

    return ok({
      token,
      user: {
        ...payload,
        permissions: mergedPermissions,
      },
    });
  }

  private calculatePermissions(role: string, dbPermissions: string[]) {
    const p = new Set(dbPermissions);
    
    // Using simple strings to avoid enum dependency circularity if any, 
    // but Role enum from @mmc/types is preferred.
    return {
      canAccessDashboard: true,
      canAccessQuickAccess: true,
      canViewPatientDetail: ['Admin', 'ClinicAdmin', 'Doctor'].includes(role) || p.has('PATIENT_VIEW'),
      canCreatePatient: ['Admin', 'ClinicAdmin', 'Doctor', 'Receptionist'].includes(role) || p.has('PATIENT_CREATE'),
      canEditPatient: ['Admin', 'ClinicAdmin', 'Doctor', 'Receptionist'].includes(role) || p.has('PATIENT_EDIT'),
      canDeletePatient: ['Admin', 'ClinicAdmin'].includes(role) || p.has('PATIENT_DELETE'),
      canViewBilling: ['Admin', 'ClinicAdmin', 'Account', 'Receptionist'].includes(role) || p.has('BILLING_VIEW'),
      canViewExpenses: ['Admin', 'ClinicAdmin', 'Account'].includes(role) || p.has('EXPENSES_VIEW'),
      canViewAnalytics: ['Admin', 'ClinicAdmin'].includes(role) || p.has('ANALYTICS_VIEW'),
      canViewDoctors: ['Admin', 'ClinicAdmin'].includes(role) || p.has('DOCTOR_VIEW'),
      canManageUsers: ['Admin'].includes(role) || p.has('USER_MANAGE'),
      canManageSettings: ['Admin', 'ClinicAdmin'].includes(role) || p.has('SETTINGS_MANAGE'),
      canViewPackageHistory: ['Admin', 'Doctor', 'Receptionist'].includes(role) || p.has('PACKAGE_HISTORY_VIEW'),
      canNewPatientBtn: ['Admin', 'ClinicAdmin', 'Receptionist'].includes(role) || p.has('PATIENT_NEW_BTN'),
    };
  }
}
