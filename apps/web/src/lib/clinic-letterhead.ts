// @ts-nocheck
/**
 * Single source of truth for the clinic letterhead.
 *
 * Both the on-screen prescription review and the printed/downloaded
 * prescription pull from this module, so editing the letterhead in any
 * supported source (meta tags, auth store, localStorage) updates both.
 *
 * Resolution order (first non-empty wins):
 *   1. <meta name="clinic-..."> tags  — env-baked branding
 *   2. localStorage 'mmc-clinic-letterhead' — manual override / preview
 *   3. auth store user.* fields — tenant-owned profile data
 *   4. Fallbacks so output never looks empty.
 */

import { useAuthStore } from '@/shared/stores/auth-store';

const STORAGE_KEY = 'mmc-clinic-letterhead';

export interface ClinicLetterhead {
  name: string;
  tagline?: string;
  logoUrl?: string;
  address?: string;
  address2?: string;
  phone?: string;
  timing?: string;
  email?: string;
  website?: string;
  registrationNo?: string;
  gstin?: string;
  accentColor?: string;
  footer?: string;
}

export interface DoctorLetterhead {
  name: string;
  qualification?: string;
  registrationNumber?: string;
}

function readMeta(key: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const el = document.querySelector<HTMLMetaElement>(`meta[name="clinic-${key}"]`);
  return el?.content || undefined;
}

function readStored(): Record<string, any> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Persist a letterhead override to localStorage (used by clinic settings UI). */
export function saveClinicLetterheadOverride(patch: Partial<ClinicLetterhead>): void {
  if (typeof window === 'undefined') return;
  const existing = readStored();
  const next = { ...existing, ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('clinic-letterhead-updated'));
  } catch {
    /* storage full / disabled — silently ignore */
  }
}

export function clearClinicLetterheadOverride(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('clinic-letterhead-updated'));
  } catch { /* ignore */ }
}

/** Build the clinic letterhead from a given user record (or the auth-store snapshot). */
export function buildClinicLetterhead(user?: any): ClinicLetterhead {
  const stored = readStored();
  const u = user ?? (() => {
    try { return useAuthStore.getState().user; } catch { return null; }
  })();

  return {
    name:           readMeta('name')         || stored.name           || u?.clinicName         || 'Homeopathy Clinic',
    tagline:        readMeta('tagline')      || stored.tagline        || u?.clinicTagline      || 'Classical Homeopathy · Holistic Care',
    logoUrl:        readMeta('logo')         || stored.logoUrl        || u?.clinicLogo         || undefined,
    address:        readMeta('address')      || stored.address        || u?.clinicAddress      || undefined,
    phone:          readMeta('phone')        || stored.phone          || u?.clinicPhone        || undefined,
    email:          readMeta('email')        || stored.email          || u?.clinicEmail        || undefined,
    website:        readMeta('website')      || stored.website        || u?.clinicWebsite      || undefined,
    registrationNo: readMeta('registration') || stored.registrationNo || u?.clinicRegistration || undefined,
    gstin:          readMeta('gstin')        || stored.gstin          || u?.clinicGstin        || undefined,
    accentColor:    readMeta('accent')       || stored.accentColor    || u?.clinicAccent       || '#2563EB',
    footer:         readMeta('footer')       || stored.footer         || u?.clinicFooter
                    || 'This prescription is generated electronically and is valid as a clinical record.',
  };
}

/** Build the doctor letterhead from the current user record. */
export function buildDoctorLetterhead(user?: any, override?: Partial<DoctorLetterhead>): DoctorLetterhead {
  const u = user ?? (() => {
    try { return useAuthStore.getState().user; } catch { return null; }
  })();

  const fullName = u
    ? `${u.firstName || ''} ${u.lastName || ''}`.trim()
    : '';

  return {
    name: override?.name || fullName || 'Doctor',
    qualification: override?.qualification ?? u?.qualifications ?? u?.qualification,
    registrationNumber: override?.registrationNumber ?? u?.registrationNumber,
  };
}

/** Imperative getters for non-React code paths (event handlers, utilities). */
export function getClinicLetterhead(): ClinicLetterhead {
  return buildClinicLetterhead();
}

export function getDoctorLetterhead(override?: Partial<DoctorLetterhead>): DoctorLetterhead {
  return buildDoctorLetterhead(undefined, override);
}

// ─── React hooks ───────────────────────────────────────────────────────────
// Re-render the consumer when the underlying letterhead source changes.

import { useEffect, useState } from 'react';

function useLetterheadVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion(v => v + 1);

    // Custom in-app event (saveClinicLetterheadOverride)
    window.addEventListener('clinic-letterhead-updated', bump);
    // Cross-tab updates to localStorage
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) bump();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('clinic-letterhead-updated', bump);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return version;
}

export function useClinicLetterhead(): ClinicLetterhead {
  const user = useAuthStore(s => s.user);
  const version = useLetterheadVersion();
  // version is read so the hook re-evaluates on letterhead override changes
  void version;
  return buildClinicLetterhead(user);
}

export function useDoctorLetterhead(override?: Partial<DoctorLetterhead>): DoctorLetterhead {
  const user = useAuthStore(s => s.user);
  return buildDoctorLetterhead(user, override);
}
