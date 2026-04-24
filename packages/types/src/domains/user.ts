import type { Role } from '../enums';

export interface User {
  id: number;
  email: string;
  name: string;
  type: Role;
  contextId: number;
  roleId: number;
  roleName: string;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  clinicName?: string;
}

export interface AuthTokenPayload {
  id: number;
  email: string;
  name: string;
  type: Role;
  contextId: number;
  roleId: number;
  roleName: string;
  clinicName?: string;
}

export interface Permission {
  id: number;
  name: string;
  slug: string;
  module: string;
}

export interface RoleWithPermissions {
  id: number;
  name: string;
  permissions: Permission[];
}
