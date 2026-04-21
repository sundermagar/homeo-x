/**
 * Platform domain types — Organizations and Account Managers.
 * Mirrors the legacy 'organizations' and 'accounts' tables.
 */

export interface Organization {
  id:           number;
  name:         string;
  email:        string;
  phone:        string;
  address:      string;
  website:      string;
  assignedTo:   number;
  connectSince: string;
  city:         string;
  description:  string;
  adminEmail?:  string;
  adminPassword?: string;
  deletedAt?:   string | null;
  createdAt:    string;
  updatedAt:    string;
}

/** Account managers — one per clinic admin. Password is never returned from the API. */
export interface Account {
  id:          number;
  name:        string;
  email:       string;
  mobile:      string;
  mobile2:     string;
  gender:      string;
  city:        string;
  address:     string;
  about:       string;
  designation: string;
  clinicId:    number | null;
  deletedAt?:  string | null;
  createdAt:   string;
}

export interface CreateOrganizationInput {
  name:         string;
  email?:       string;
  phone?:       string;
  address?:     string;
  website?:     string;
  assignedTo?:  number;
  connectSince?: string;
  city?:        string;
  description?: string;
  adminEmail?:  string;
  adminPassword?: string;
}

export type UpdateOrganizationInput = Partial<CreateOrganizationInput>;

export interface CreateAccountInput {
  name:        string;
  email:       string;
  password:    string;
  gender?:     string;
  mobile?:     string;
  mobile2?:    string;
  city?:       string;
  address?:    string;
  about?:      string;
  designation?: string;
  clinicId?:   number;
}

export type UpdateAccountInput = Partial<Omit<CreateAccountInput, 'password'>>;
