import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { AuthTokenPayload, Role } from '@mmc/types';
import { appConfig } from '../../../shared/config/app-config.js';
import { type Result, ok, fail } from '../../../shared/result.js';
import type { PatientRepositoryPg } from '../../../infrastructure/repositories/patient.repository.pg.js';

export interface LoginResult {
  token: string;
  user: AuthTokenPayload & { permissions: Record<string, boolean> };
}

export class PatientLoginUseCase {
  constructor(private readonly patientRepo: PatientRepositoryPg) { }

  async execute(email: string, password: string): Promise<Result<LoginResult>> {
    const passwordHash = await this.patientRepo.getPatientPassword(email);

    if (!passwordHash) {
      return fail('Invalid credentials', 'UNAUTHORIZED');
    }

    const isMatch = await bcrypt.compare(password, passwordHash);

    if (!isMatch) {
      return fail('Invalid credentials', 'UNAUTHORIZED');
    }

    const patient = await this.patientRepo.findByEmail(email);
    if (!patient) {
      return fail('Patient account not found', 'UNAUTHORIZED');
    }

    const payload: AuthTokenPayload = {
      id: patient.id,
      email: patient.email || '',
      name: `${patient.firstName} ${patient.surname}`.trim(),
      type: 'Patient' as Role, // Cast to Role
      contextId: 0,
      roleId: 0,
      roleName: 'Patient',
    };

    const token = jwt.sign(payload, appConfig.jwt.secret as jwt.Secret, {
      expiresIn: appConfig.jwt.expiresIn as any,
    });

    return ok({
      token,
      user: {
        ...payload,
        permissions: {
          canAccessDashboard: true,
          canAccessQuickAccess: false,
          canViewPatientDetail: false,
          canCreatePatient: false,
          canEditPatient: false,
          canDeletePatient: false,
          canViewBilling: false,
          canViewExpenses: false,
          canViewAnalytics: false,
          canViewDoctors: false,
          canManageUsers: false,
          canManageSettings: false,
          canViewPackageHistory: false,
          canNewPatientBtn: false,
        },
      },
    });
  }
}
