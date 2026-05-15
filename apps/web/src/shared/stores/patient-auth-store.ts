import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PatientUser {
  id: number;
  regid: number;
  name: string;
  phone: string;
  email: string;
}

interface PatientAuthState {
  token: string | null;
  patient: PatientUser | null;
  isAuthenticated: boolean;
  setAuth: (token: string, patient: PatientUser) => void;
  logout: () => void;
}

export const usePatientAuthStore = create<PatientAuthState>()(
  persist(
    (set) => ({
      token: null,
      patient: null,
      isAuthenticated: false,
      setAuth: (token, patient) => set({ token, patient, isAuthenticated: true }),
      logout: () => set({ token: null, patient: null, isAuthenticated: false }),
    }),
    { name: 'mmc-patient-auth' },
  ),
);
