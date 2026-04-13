import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ProtectedRoute } from '@/shared/components/protected-route';
import { AppLayout } from '@/shared/layouts/app-layout';

// ─── Lazy-loaded feature pages ───

// ─── Friend's modules ───
const LoginPage            = lazy(() => import('@/features/auth/pages/login-page'));
const DashboardPage        = lazy(() => import('@/features/dashboard/pages/dashboard-page'));
const PatientListPage      = lazy(() => import('@/features/patients/pages/patient-list-page'));
const ConsultationPage     = lazy(() => import('@/features/consultation/pages/consultation-page'));

// ─── Appointments (friend's module) ───
const AppointmentListPage  = lazy(() => import('@/features/appointments/pages/appointment-list-page'));
const CalendarPage         = lazy(() => import('@/features/appointments/pages/calendar-page'));
const TokenQueuePage       = lazy(() => import('@/features/appointments/pages/token-queue-page'));

// ─── Medical Cases (friend's module) ───
const MedicalCaseListPage  = lazy(() => import('@/features/medical-case/pages/case-list-page'));
const MedicalCaseDetailPage = lazy(() => import('@/features/medical-case/pages/case-detail-page'));

// ─── Packages & Memberships (friend's module) ───
const PackagePlansPage     = lazy(() => import('@/features/packages/pages/package-plans-page'));
const PackageTrackingPage  = lazy(() => import('@/features/packages/pages/package-tracking-page'));

// ─── Our modules — Billing & Platform ───
const BillingListPage      = lazy(() => import('@/features/billing/pages/BillingListPage'));
const BillingFormPage      = lazy(() => import('@/features/billing/pages/BillingFormPage'));
const PaymentsPage         = lazy(() => import('@/features/billing/pages/PaymentsPage'));
const ClinicsPage          = lazy(() => import('@/features/platform/pages/ClinicsPage'));
const AccountsPage         = lazy(() => import('@/features/platform/pages/AccountsPage'));

// ─── Settings & Configuration ─────────────────────
const DepartmentsPage      = lazy(() => import('@/features/settings/pages/DepartmentsPage'));
const MedicinesPage        = lazy(() => import('@/features/settings/pages/MedicinesPage'));
const DispensariesPage     = lazy(() => import('@/features/settings/pages/DispensariesPage'));
const ReferralsPage        = lazy(() => import('@/features/settings/pages/ReferralSourcesPage'));
const StickersPage         = lazy(() => import('@/features/settings/pages/StickersPage'));
const CmsManagePage        = lazy(() => import('@/features/settings/pages/CmsManagePage'));
const PdfSettingsPage      = lazy(() => import('@/features/settings/pages/PdfSettingsPage'));
const DoctorsPage          = lazy(() => import('@/features/settings/pages/DoctorsPage'));
const ExpensesHeadPage     = lazy(() => import('@/features/settings/pages/ExpensesHeadPage'));
const MessageTemplatesPage = lazy(() => import('@/features/settings/pages/MessageTemplatesPage'));
const StocksLogPage        = lazy(() => import('@/features/settings/pages/StocksLogPage'));
const ExportDataPage       = lazy(() => import('@/features/settings/pages/ExportDataPage'));
const PackagePlansSettingsPage = lazy(() => import('@/features/settings/pages/PackagePlansPage'));
const PotenciesPage       = lazy(() => import('@/features/settings/pages/PotenciesPage'));
const FrequenciesPage     = lazy(() => import('@/features/settings/pages/FrequenciesPage'));
const CouriersPage         = lazy(() => import('@/features/settings/pages/CouriersPage'));
const FaqsPage             = lazy(() => import('@/features/settings/pages/FaqsPage'));
const StaffManagementPage  = lazy(() => import('@/features/settings/pages/StaffManagementPage'));

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

            {/* ─── Appointments (friend's module) ─── */}
            <Route path="/appointments"          element={<AppointmentListPage />} />
            <Route path="/appointments/calendar" element={<CalendarPage />} />
            <Route path="/appointments/queue"    element={<TokenQueuePage />} />

            {/* ─── Medical Cases (friend's module) ─── */}
            <Route path="/medical-cases"        element={<MedicalCaseListPage />} />
            <Route path="/medical-cases/:regid" element={<MedicalCaseDetailPage />} />

            {/* ─── Packages & Memberships (friend's module) ─── */}
            <Route path="/packages"          element={<PackagePlansPage />} />
            <Route path="/packages/tracking" element={<PackageTrackingPage />} />

            {/* ─── Billing & Payments (our module) ─── */}
            <Route path="/billing"        element={<BillingListPage />} />
            <Route path="/billing/create" element={<BillingFormPage />} />
            <Route path="/payments"       element={<PaymentsPage />} />

            {/* ─── Platform & Multi-tenancy (our module) ─── */}
            <Route path="/platform/clinics"   element={<ClinicsPage />} />
            <Route path="/platform/accounts"  element={<AccountsPage />} />

            {/* ─── Settings & Configuration (our module) ─── */}
            <Route path="/settings"              element={<Navigate to="/settings/departments" replace />} />
            <Route path="/settings/departments"  element={<DepartmentsPage />} />
            <Route path="/settings/medicines"    element={<MedicinesPage />} />
            <Route path="/settings/dispensaries" element={<DispensariesPage />} />
            <Route path="/settings/referrals"    element={<ReferralsPage />} />
            <Route path="/settings/stickers"     element={<StickersPage />} />
            <Route path="/settings/cms"          element={<CmsManagePage />} />
            <Route path="/settings/pdf"          element={<PdfSettingsPage />} />
            <Route path="/settings/doctors"      element={<DoctorsPage />} />
            <Route path="/settings/expenses"     element={<ExpensesHeadPage />} />
            <Route path="/settings/messages"     element={<MessageTemplatesPage />} />
            <Route path="/settings/stocks"       element={<StocksLogPage />} />
            <Route path="/settings/export"       element={<ExportDataPage />} />
            <Route path="/settings/packages"     element={<PackagePlansSettingsPage />} />
            <Route path="/settings/potencies"     element={<PotenciesPage />} />
            <Route path="/settings/frequencies"   element={<FrequenciesPage />} />
            <Route path="/settings/couriers"     element={<CouriersPage />} />
            <Route path="/settings/faqs"         element={<FaqsPage />} />
            <Route path="/settings/staff"        element={<StaffManagementPage />} />
          </Route>

          {/* Full-screen (no layout shell) */}
          <Route path="/consultation/:visitId" element={<ConsultationPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
