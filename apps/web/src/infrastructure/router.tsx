import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppLayout } from '@/shared/layouts/app-layout';
import { ProtectedRoute } from '@/shared/components/protected-route';

// ─── Lazy-loaded feature pages ───
const LoginPage           = lazy(() => import('@/features/auth/pages/login-page'));
const DashboardPage       = lazy(() => import('@/features/dashboard/pages/dashboard-page'));
const PatientListPage     = lazy(() => import('@/features/patients/pages/patient-list-page'));
const PatientFormPage     = lazy(() => import('@/features/patients/pages/patient-form-page'));
const PatientDetailPage   = lazy(() => import('@/features/patients/pages/patient-detail-page'));
const FamilyGroupListPage = lazy(() => import('@/features/patients/pages/family-group-list-page'));
const ConsultationPage    = lazy(() => import('@/features/consultation/consultation-mode-page'));
const StaffListPage       = lazy(() => import('@/features/staff/pages/staff-list-page'));
const StaffFormPage       = lazy(() => import('@/features/staff/pages/staff-form-page'));

// ─── Appointments ───
const AppointmentListPage = lazy(() => import('@/features/appointments/pages/appointment-list-page'));
const CalendarPage        = lazy(() => import('@/features/appointments/pages/calendar-page'));
const TokenQueuePage      = lazy(() => import('@/features/appointments/pages/token-queue-page'));

// ─── Medical Cases ───
const MedicalCaseListPage = lazy(() => import('@/features/medical-case/pages/case-list-page'));
const MedicalCaseDetailPage = lazy(() => import('@/features/medical-case/pages/case-detail-page'));

// ─── Packages & Memberships ───
const PackagePlansPage    = lazy(() => import('@/features/packages/pages/package-plans-page'));
const PackageTrackingPage = lazy(() => import('@/features/packages/pages/package-tracking-page'));

// ─── Operations & CRM ───
const OperationsDashboard = lazy(() => import('@/features/operations/pages/operations-dashboard'));

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
            
            {/* Patients Module */}
            <Route path="/patients" element={<PatientListPage />} />
            <Route path="/patients/add" element={<PatientFormPage />} />
            <Route path="/patients/:regid" element={<PatientDetailPage />} />
            <Route path="/patients/:regid/edit" element={<PatientFormPage />} />
            <Route path="/family-groups" element={<FamilyGroupListPage />} />
            
            {/* Staff Module */}
            <Route path="/staff" element={<StaffListPage />} />
            <Route path="/staff/add" element={<StaffFormPage />} />
            <Route path="/staff/:id/edit" element={<StaffFormPage />} />

            {/* Appointments */}
            <Route path="/appointments"          element={<AppointmentListPage />} />
            <Route path="/appointments/calendar" element={<CalendarPage />} />
            <Route path="/appointments/queue"    element={<TokenQueuePage />} />

            {/* Medical Cases */}
            <Route path="/medical-cases"        element={<MedicalCaseListPage />} />
            <Route path="/medical-cases/:regid" element={<MedicalCaseDetailPage />} />

            {/* Packages & Memberships */}
            <Route path="/packages"           element={<PackagePlansPage />} />
            <Route path="/packages/tracking"  element={<PackageTrackingPage />} />

            {/* Operations Hub */}
            <Route path="/operations"         element={<OperationsDashboard />} />
          </Route>

          {/* Full-screen (protected) */}
          <Route path="/consultation/:visitId" element={<ConsultationPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
