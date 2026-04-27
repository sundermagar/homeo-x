import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/shared/components/protected-route';
import { RoleGuard } from '@/shared/components/role-guard';
import { AppLayout } from '@/shared/layouts/app-layout';

const Loading = () => <div style={{ padding: 40, textAlign: 'center', opacity: 0.5 }}>Loading...</div>;

// Common Feature Modules
const LoginPage = lazy(() => import('@/features/auth/pages/login-page'));
const DashboardPage = lazy(() => import('@/features/dashboard/pages/dashboard-page'));
// Multi-stage consultation flow (Patient info → Conversation → Totality → Repertory → Prescription)
const ConsultationPage = lazy(() => import('@/features/consultation/consultation-mode-page'));

// Patient Module (Selective merge from shiva)
const PatientListPage = lazy(() => import('@/features/patients/pages/patient-list-page'));
const PatientFormPage = lazy(() => import('@/features/patients/pages/patient-form-page'));
const PatientDetailPage = lazy(() => import('@/features/patients/pages/patient-detail-page'));
const FamilyGroupListPage = lazy(() => import('@/features/patients/pages/family-group-list-page'));

// Appointments
const AppointmentListPage = lazy(() => import('@/features/appointments/pages/appointment-list-page'));
const CalendarPage = lazy(() => import('@/features/appointments/pages/calendar-page'));
const TokenQueuePage = lazy(() => import('@/features/appointments/pages/token-queue-page'));
const StaffListPage = lazy(() => import('@/features/staff/pages/staff-list-page'));
const StaffFormPage = lazy(() => import('@/features/staff/pages/staff-form-page'));

// Medical Cases
const MedicalCaseListPage = lazy(() => import('@/features/medical-case/pages/case-list-page'));
const MedicalCaseDetailPage = lazy(() => import('@/features/medical-case/pages/case-detail-page'));
const VitalsCheckPage = lazy(() => import('@/features/medical-case/pages/vitals-check-page'));
const AiRemedyChartStandalone = lazy(() => import('@/features/medical-case/components/ai-remedy-view').then(m => ({ default: m.AiRemedyView })));
const AiConsultantPage = lazy(() => import('@/features/medical-case/pages/ai-consultant-page'));

// Packages & Memberships
const PackagePlansPage = lazy(() => import('@/features/packages/pages/package-plans-page'));
const PackageTrackingPage = lazy(() => import('@/features/packages/pages/package-tracking-page'));

// Billing & Payments
const BillingListPage = lazy(() => import('@/features/billing/pages/BillingListPage'));
const BillingFormPage = lazy(() => import('@/features/billing/pages/BillingFormPage'));
const PaymentsPage = lazy(() => import('@/features/billing/pages/PaymentsPage'));
const AdditionalChargesPage = lazy(() => import('@/features/billing/pages/AdditionalChargesPage'));
const DayChargesPage = lazy(() => import('@/features/billing/pages/DayChargesPage'));
const DepositsPage = lazy(() => import('@/features/billing/pages/DepositsPage'));
const ExpensesPage = lazy(() => import('@/features/billing/pages/ExpensesPage'));

// Platform & Multi-tenancy
const ClinicsPage = lazy(() => import('@/features/platform/pages/ClinicsPage'));
const AccountsPage = lazy(() => import('@/features/platform/pages/AccountsPage'));
const DoctorsPage = lazy(() => import('@/features/platform/pages/DoctorsPage'));
const DoctorDetailPage = lazy(() => import('@/features/platform/pages/DoctorDetailPage'));
const EmployeesPage = lazy(() => import('@/features/platform/pages/EmployeesPage'));
const ReceptionistsPage = lazy(() => import('@/features/platform/pages/ReceptionistsPage'));
const ClinicAdminsPage = lazy(() => import('@/features/platform/pages/ClinicAdminsPage'));
const AccountManagersPage = lazy(() => import('@/features/platform/pages/AccountManagersPage'));

// ─── Settings & Configuration ─────────────────────
const DepartmentsPage = lazy(() => import('@/features/settings/pages/DepartmentsPage'));
const MedicinesPage = lazy(() => import('@/features/settings/pages/MedicinesPage'));
const DispensariesPage = lazy(() => import('@/features/settings/pages/DispensariesPage'));
const ReferralsPage = lazy(() => import('@/features/settings/pages/ReferralSourcesPage'));
const StickersPage = lazy(() => import('@/features/settings/pages/StickersPage'));
const CmsManagePage = lazy(() => import('@/features/settings/pages/CmsManagePage'));
const PdfSettingsPage = lazy(() => import('@/features/settings/pages/PdfSettingsPage'));
const ExpensesHeadPage = lazy(() => import('@/features/settings/pages/ExpensesHeadPage'));
const MessageTemplatesPage = lazy(() => import('@/features/settings/pages/MessageTemplatesPage'));
const StocksLogPage = lazy(() => import('@/features/settings/pages/StocksLogPage'));
const ExportDataPage = lazy(() => import('@/features/settings/pages/ExportDataPage'));
const PackagePlansSettingsPage = lazy(() => import('@/features/settings/pages/PackagePlansPage'));
const PotenciesPage = lazy(() => import('@/features/settings/pages/PotenciesPage'));
const FrequenciesPage = lazy(() => import('@/features/settings/pages/FrequenciesPage'));
const CouriersPage = lazy(() => import('@/features/settings/pages/CouriersPage'));
const FaqsPage = lazy(() => import('@/features/settings/pages/FaqsPage'));
const StaffManagementPage = lazy(() => import('@/features/settings/pages/StaffManagementPage'));

// Communications
const SmsTemplatesPage = lazy(() => import('@/features/communications/pages/sms-templates-page'));
const GroupSmsPage = lazy(() => import('@/features/communications/pages/group-sms-page'));
const SmsReportsPage = lazy(() => import('@/features/communications/pages/sms-reports-page'));
const WhatsAppPage = lazy(() => import('@/features/communications/pages/whatsapp-page'));

// Analytics & Reports
const DashboardAnalyticsPage = lazy(() => import('@/features/analytics/pages/dashboard-analytics-page').then(m => ({ default: m.DashboardAnalyticsPage })));
const ReportsPage = lazy(() => import('@/features/analytics/pages/reports-page').then(m => ({ default: m.ReportsPage })));

// Settings
const RolesPermissionsPage = lazy(() => import('@/features/settings/pages/roles-permissions-page').then(m => ({ default: m.RolesPermissionsPage })));

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
            <Route path="/patients" element={<PatientListPage />} />
            <Route path="/patients/add" element={<PatientFormPage />} />
            <Route path="/patients/:regid" element={<PatientDetailPage />} />
            <Route path="/patients/:regid/edit" element={<PatientFormPage />} />
            <Route path="/family-groups" element={<FamilyGroupListPage />} />

            {/* ─── Appointments ─── */}
            <Route path="/appointments" element={<AppointmentListPage />} />
            <Route path="/appointments/calendar" element={<CalendarPage />} />
            <Route path="/appointments/queue" element={<TokenQueuePage />} />

            {/* ─── Staff Module ─── */}
            <Route path="/staff" element={<RoleGuard allowed={['SuperAdmin', 'Admin']}><StaffListPage /></RoleGuard>} />
            <Route path="/staff/add" element={<RoleGuard allowed={['SuperAdmin', 'Admin']}><StaffFormPage /></RoleGuard>} />
            <Route path="/staff/:id/edit" element={<RoleGuard allowed={['SuperAdmin', 'Admin']}><StaffFormPage /></RoleGuard>} />

            {/* ─── Medical Cases ─── */}
            <Route path="/medical-cases" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor']}><MedicalCaseListPage /></RoleGuard>} />
            <Route path="/medical-cases/:regid" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor']}><MedicalCaseDetailPage /></RoleGuard>} />
            <Route path="/vitals-check" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor']}><VitalsCheckPage /></RoleGuard>} />
            <Route path="/ai-remedy-chart" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor']}><AiRemedyChartStandalone /></RoleGuard>} />
            <Route path="/ai-analysis" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor']}><AiConsultantPage /></RoleGuard>} />

            {/* ─── Packages & Memberships ─── */}
            <Route path="/packages" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><PackagePlansPage /></RoleGuard>} />
            <Route path="/packages/tracking" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><PackageTrackingPage /></RoleGuard>} />

            {/* ─── Communications ─── */}
            <Route path="/communications/sms" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><GroupSmsPage /></RoleGuard>} />
            <Route path="/communications/templates" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><SmsTemplatesPage /></RoleGuard>} />
            <Route path="/communications/reports" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><SmsReportsPage /></RoleGuard>} />
            <Route path="/communications/whatsapp" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><WhatsAppPage /></RoleGuard>} />
            <Route path="/communications" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><GroupSmsPage /></RoleGuard>} />

            {/* ─── Analytics ─── */}
            <Route path="/analytics" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor']}><DashboardAnalyticsPage /></RoleGuard>} />
            <Route path="/analytics/reports" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor']}><ReportsPage /></RoleGuard>}>
              <Route index element={<Navigate to="financial" replace />} />
              <Route path="financial" element={<div />} />
              <Route path="dues" element={<div />} />
              <Route path="birthdays" element={<div />} />
              <Route path="references" element={<div />} />
            </Route>
            <Route path="/analytics/export" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor']}><ExportDataPage /></RoleGuard>} />
            <Route path="/analytics/stocks" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor']}><StocksLogPage /></RoleGuard>} />

            {/* ─── Billing & Payments ─── */}
            <Route path="/billing" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor', 'Receptionist']}><BillingListPage /></RoleGuard>} />
            <Route path="/billing/create" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor', 'Receptionist']}><BillingFormPage /></RoleGuard>} />
            <Route path="/billing/additional-charges" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Receptionist']}><AdditionalChargesPage /></RoleGuard>} />
            <Route path="/billing/day-charges" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Receptionist']}><DayChargesPage /></RoleGuard>} />
            <Route path="/billing/deposits" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Receptionist']}><DepositsPage /></RoleGuard>} />
            <Route path="/billing/expenses" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Receptionist']}><ExpensesPage /></RoleGuard>} />
            <Route path="/payments" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor', 'Receptionist']}><PaymentsPage /></RoleGuard>} />

            {/* ─── Platform & Multi-tenancy ─── */}
            {/* ─── Platform & Multi-tenancy ─── */}
            <Route path="/platform/staff" element={<Navigate to="/platform/doctors" replace />} />
            <Route path="/platform/staff/doctor" element={<Navigate to="/platform/doctors" replace />} />
            <Route path="/platform/staff/employee" element={<Navigate to="/platform/employees" replace />} />
            <Route path="/platform/staff/receptionist" element={<Navigate to="/platform/receptionists" replace />} />
            <Route path="/platform/staff/clinicadmin" element={<Navigate to="/platform/clinicadmins" replace />} />
            <Route path="/platform/staff/account" element={<Navigate to="/platform/account-managers" replace />} />
            <Route path="/platform/doctors" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><DoctorsPage /></RoleGuard>} />
            <Route path="/platform/doctors/:id" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor']}><DoctorDetailPage /></RoleGuard>} />
            <Route path="/platform/employees" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><EmployeesPage /></RoleGuard>} />
            <Route path="/platform/receptionists" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><ReceptionistsPage /></RoleGuard>} />
            <Route path="/platform/clinicadmins" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><ClinicAdminsPage /></RoleGuard>} />
            <Route path="/platform/account-managers" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><AccountManagersPage /></RoleGuard>} />
            <Route path="/platform/clinics" element={<RoleGuard allowed={['SuperAdmin', 'Admin']}><ClinicsPage /></RoleGuard>} />
            <Route path="/platform/accounts" element={<RoleGuard allowed={['SuperAdmin', 'Admin']}><AccountsPage /></RoleGuard>} />

            {/* ─── Operations Hub ─── */}
            <Route
              path="/operations"
              element={
                <RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin', 'Doctor']}>
                  <OperationsDashboard />
                </RoleGuard>
              }
            />

            {/* ─── Settings ─── */}
            <Route path="/settings" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><Navigate to="/settings/departments" replace /></RoleGuard>} />
            <Route path="/settings/departments" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><DepartmentsPage /></RoleGuard>} />
            <Route path="/settings/medicines" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><MedicinesPage /></RoleGuard>} />
            <Route path="/settings/dispensaries" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><DispensariesPage /></RoleGuard>} />
            <Route path="/settings/referrals" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><ReferralsPage /></RoleGuard>} />
            <Route path="/settings/stickers" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><StickersPage /></RoleGuard>} />
            <Route path="/settings/cms" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><CmsManagePage /></RoleGuard>} />
            <Route path="/settings/pdf" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><PdfSettingsPage /></RoleGuard>} />
            <Route path="/settings/expenses" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><ExpensesHeadPage /></RoleGuard>} />
            <Route path="/settings/messages" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><MessageTemplatesPage /></RoleGuard>} />
            {/* <Route path="/settings/stocks" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><StocksLogPage /></RoleGuard>} /> */}
            {/* <Route path="/settings/export"       element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><ExportDataPage /></RoleGuard>} /> */}
            <Route path="/settings/packages" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><PackagePlansSettingsPage /></RoleGuard>} />
            <Route path="/settings/potencies" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><PotenciesPage /></RoleGuard>} />
            <Route path="/settings/frequencies" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><FrequenciesPage /></RoleGuard>} />
            <Route path="/settings/couriers" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><CouriersPage /></RoleGuard>} />
            <Route path="/settings/faqs" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><FaqsPage /></RoleGuard>} />
            <Route path="/settings/staff" element={<RoleGuard allowed={['SuperAdmin', 'Admin', 'Clinicadmin']}><StaffManagementPage /></RoleGuard>} />
            <Route path="/settings/roles" element={<RoleGuard allowed={['SuperAdmin', 'Admin']}><RolesPermissionsPage /></RoleGuard>} />
          </Route>

          {/* Full-screen (no layout shell) */}
          <Route path="/consultation/:visitId" element={<RoleGuard allowed={['Admin', 'Clinicadmin', 'Doctor']}><ConsultationPage /></RoleGuard>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}