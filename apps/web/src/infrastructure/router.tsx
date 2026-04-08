import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ProtectedRoute } from '@/shared/components/protected-route';
import { AppLayout } from '@/shared/layouts/app-layout';

// ─── Lazy-loaded feature pages ───
const LoginPage = lazy(() => import('@/features/auth/pages/login-page'));
const DashboardPage = lazy(() => import('@/features/dashboard/pages/dashboard-page'));
const PatientListPage = lazy(() => import('@/features/patients/pages/patient-list-page'));
const ConsultationPage = lazy(() => import('@/features/consultation/pages/consultation-page'));

const Loading = () => <div style={{ padding: 40, textAlign: 'center', opacity: 0.5 }}>Loading...</div>;

export function AppRouter() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/patients" element={<PatientListPage />} />
            {/* Add feature routes as they're migrated */}
          </Route>

          {/* Full-screen (no layout shell) */}
          <Route path="/consultation/:visitId" element={<ConsultationPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
