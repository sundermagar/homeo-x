import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ProtectedRoute } from '@/shared/components/protected-route';
import { AppLayout } from '@/shared/layouts/app-layout';

// ─── Lazy-loaded feature pages ───

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

// Medical Cases
const MedicalCaseListPage   = lazy(() => import('@/features/medical-case/pages/case-list-page'));
const MedicalCaseDetailPage = lazy(() => import('@/features/medical-case/pages/case-detail-page'));

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
const SmsTemplatesPage = lazy(() => import('@/features/communications/pages/sms-templates-page'));
const GroupSmsPage     = lazy(() => import('@/features/communications/pages/group-sms-page'));
const SmsReportsPage    = lazy(() => import('@/features/communications/pages/sms-reports-page'));
const WhatsAppPage      = lazy(() => import('@/features/communications/pages/whatsapp-page'));

// Analytics & Reports
const DashboardAnalyticsPage = lazy(() => import('@/features/analytics/pages/dashboard-analytics-page').then(m => ({ default: m.DashboardAnalyticsPage })));
const ReportsPage            = lazy(() => import('@/features/analytics/pages/reports-page').then(m => ({ default: m.ReportsPage })));

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
            
            {/* ─── Patient Module Integration ─── */}
            <Route path="/patients"             element={<PatientListPage />} />
            <Route path="/patients/add"         element={<PatientFormPage />} />
            <Route path="/patients/:regid"      element={<PatientDetailPage />} />
            <Route path="/patients/:regid/edit" element={<PatientFormPage />} />
            <Route path="/family-groups"       element={<FamilyGroupListPage />} />

            {/* ─── Appointments ─── */}
            <Route path="/appointments"          element={<AppointmentListPage />} />
            <Route path="/appointments/calendar" element={<CalendarPage />} />
            <Route path="/appointments/queue"    element={<TokenQueuePage />} />

            {/* ─── Medical Cases ─── */}
            <Route path="/medical-cases"        element={<MedicalCaseListPage />} />
            <Route path="/medical-cases/:regid" element={<MedicalCaseDetailPage />} />

            {/* ─── Packages & Memberships ─── */}
            <Route path="/packages"          element={<PackagePlansPage />} />
            <Route path="/packages/tracking" element={<PackageTrackingPage />} />

            {/* ─── Communications ─── */}
            <Route path="/communications/sms"         element={<GroupSmsPage />} />
            <Route path="/communications/templates"   element={<SmsTemplatesPage />} />
            <Route path="/communications/reports"     element={<SmsReportsPage />} />
            <Route path="/communications/whatsapp"   element={<WhatsAppPage />} />
            <Route path="/communications"             element={<GroupSmsPage />} />

            {/* ─── Analytics ─── */}
            <Route path="/analytics"         element={<DashboardAnalyticsPage />} />
            <Route path="/analytics/reports" element={<ReportsPage />} />

            {/* ─── Billing & Payments ─── */}
            <Route path="/billing"        element={<BillingListPage />} />
            <Route path="/billing/create" element={<BillingFormPage />} />
            <Route path="/payments"       element={<PaymentsPage />} />

            {/* ─── Platform & Multi-tenancy ─── */}
            <Route path="/platform/clinics"   element={<ClinicsPage />} />
            <Route path="/platform/accounts"  element={<AccountsPage />} />
          </Route>

          {/* Full-screen (no layout shell) */}
          <Route path="/consultation/:visitId" element={<ConsultationPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
