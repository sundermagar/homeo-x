import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ProtectedRoute } from '@/shared/components/protected-route';
import { RoleGuard } from '@/shared/components/role-guard';
import { AppLayout } from '@/shared/layouts/app-layout';

const Loading = () => <div style={{ padding: 40, textAlign: 'center', opacity: 0.5 }}>Loading...</div>;

// Common Feature Modules
const LoginPage            = lazy(() => import('@/features/auth/pages/login-page'));
const DashboardPage        = lazy(() => import('@/features/dashboard/pages/dashboard-page'));
const ConsultationPage     = lazy(() => import('@/features/consultation/pages/consultation-page'));

// Patient Module (Selective merge from shiva)
const PatientListPage      = lazy(() => import('@/features/patients/pages/patient-list-page'));
const PatientFormPage      = lazy(() => import('@/features/patients/pages/patient-form-page'));
const PatientDetailPage    = lazy(() => import('@/features/patients/pages/patient-detail-page'));
const FamilyGroupListPage  = lazy(() => import('@/features/patients/pages/family-group-list-page'));

// Appointments
const AppointmentListPage  = lazy(() => import('@/features/appointments/pages/appointment-list-page'));
const CalendarPage         = lazy(() => import('@/features/appointments/pages/calendar-page'));
const TokenQueuePage       = lazy(() => import('@/features/appointments/pages/token-queue-page'));
const StaffListPage        = lazy(() => import('@/features/staff/pages/staff-list-page'));
const StaffFormPage        = lazy(() => import('@/features/staff/pages/staff-form-page'));

// Medical Cases
const MedicalCaseListPage   = lazy(() => import('@/features/medical-case/pages/case-list-page'));
const MedicalCaseDetailPage = lazy(() => import('@/features/medical-case/pages/case-detail-page'));
const VitalsCheckPage       = lazy(() => import('@/features/medical-case/pages/vitals-check-page'));

// Packages & Memberships
const PackagePlansPage     = lazy(() => import('@/features/packages/pages/package-plans-page'));
const PackageTrackingPage  = lazy(() => import('@/features/packages/pages/package-tracking-page'));

// Billing & Payments
const BillingListPage      = lazy(() => import('@/features/billing/pages/BillingListPage'));
const BillingFormPage      = lazy(() => import('@/features/billing/pages/BillingFormPage'));
const PaymentsPage         = lazy(() => import('@/features/billing/pages/PaymentsPage'));

// Platform & Multi-tenancy
const ClinicsPage          = lazy(() => import('@/features/platform/pages/ClinicsPage'));
const AccountsPage         = lazy(() => import('@/features/platform/pages/AccountsPage'));

// Communications
const SmsTemplatesPage     = lazy(() => import('@/features/communications/pages/sms-templates-page'));
const GroupSmsPage         = lazy(() => import('@/features/communications/pages/group-sms-page'));
const SmsReportsPage       = lazy(() => import('@/features/communications/pages/sms-reports-page'));
const WhatsAppPage         = lazy(() => import('@/features/communications/pages/whatsapp-page'));

// Analytics & Reports
const DashboardAnalyticsPage = lazy(() => import('@/features/analytics/pages/dashboard-analytics-page').then(m => ({ default: m.DashboardAnalyticsPage })));
const ReportsPage            = lazy(() => import('@/features/analytics/pages/reports-page').then(m => ({ default: m.ReportsPage })));

// Settings
const RolesPermissionsPage  = lazy(() => import('@/features/settings/pages/roles-permissions-page').then(m => ({ default: m.RolesPermissionsPage })));

// Operations & CRM
const OperationsDashboard = lazy(() => import('@/features/operations/pages/operations-dashboard'));

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

            {/* ─── Patient Module ─── */}
            <Route path="/patients"             element={<PatientListPage />} />
            <Route path="/patients/add"         element={<PatientFormPage />} />
            <Route path="/patients/:regid"      element={<PatientDetailPage />} />
            <Route path="/patients/:regid/edit" element={<PatientFormPage />} />
            <Route path="/family-groups"       element={<FamilyGroupListPage />} />

            {/* ─── Appointments ─── */}
            <Route path="/appointments"          element={<AppointmentListPage />} />
            <Route path="/appointments/calendar" element={<CalendarPage />} />
            <Route path="/appointments/queue"    element={<TokenQueuePage />} />

            {/* ─── Staff Module ─── */}
            <Route path="/staff"           element={<RoleGuard allowed={['SuperAdmin', 'Admin']}><StaffListPage /></RoleGuard>} />
            <Route path="/staff/add"       element={<RoleGuard allowed={['SuperAdmin', 'Admin']}><StaffFormPage /></RoleGuard>} />
            <Route path="/staff/:id/edit"  element={<RoleGuard allowed={['SuperAdmin', 'Admin']}><StaffFormPage /></RoleGuard>} />

            {/* ─── Medical Cases ─── */}
            <Route path="/medical-cases"        element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor']}><MedicalCaseListPage /></RoleGuard>} />
            <Route path="/medical-cases/:regid" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor']}><MedicalCaseDetailPage /></RoleGuard>} />
            <Route path="/vitals-check"        element={<VitalsCheckPage />} />

            {/* ─── Packages & Memberships ─── */}
            <Route path="/packages"          element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><PackagePlansPage /></RoleGuard>} />
            <Route path="/packages/tracking" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><PackageTrackingPage /></RoleGuard>} />

            {/* ─── Communications ─── */}
            <Route path="/communications/sms"       element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><GroupSmsPage /></RoleGuard>} />
            <Route path="/communications/templates" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><SmsTemplatesPage /></RoleGuard>} />
            <Route path="/communications/reports"   element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><SmsReportsPage /></RoleGuard>} />
            <Route path="/communications/whatsapp"  element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><WhatsAppPage /></RoleGuard>} />
            <Route path="/communications"           element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><GroupSmsPage /></RoleGuard>} />

            {/* ─── Analytics ─── */}
            <Route path="/analytics"         element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor']}><DashboardAnalyticsPage /></RoleGuard>} />
            <Route path="/analytics/reports" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor']}><ReportsPage /></RoleGuard>} />

            {/* ─── Billing & Payments ─── */}
            <Route path="/billing"        element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor']}><BillingListPage /></RoleGuard>} />
            <Route path="/billing/create" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor']}><BillingFormPage /></RoleGuard>} />
            <Route path="/payments"       element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor']}><PaymentsPage /></RoleGuard>} />

            {/* ─── Platform & Multi-tenancy ─── */}
            <Route path="/platform/clinics"  element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><ClinicsPage /></RoleGuard>} />
            <Route path="/platform/accounts" element={<RoleGuard allowed={['SuperAdmin', 'Admin']}><AccountsPage /></RoleGuard>} />

            {/* ─── Operations Hub ─── */}
            <Route path="/operations"        element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor']}><OperationsDashboard /></RoleGuard>} />

            {/* ─── Settings ─── */}
            <Route path="/settings" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><RolesPermissionsPage /></RoleGuard>} />
          </Route>

          {/* Full-screen (no layout shell) */}
          <Route path="/consultation/:visitId" element={<RoleGuard allowed={['Admin', 'Clinicadmin', 'Doctor']}><ConsultationPage /></RoleGuard>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}