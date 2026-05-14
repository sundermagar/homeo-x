import { Printer } from 'lucide-react';
import { Button } from '../ui/button';
import { printHtml } from '../../lib/print';
import { generatePrescriptionHtml } from '../../lib/print-templates';
import { useConsultationSummary } from '../../hooks/use-consultations';
import { calculateAge } from '../../lib/format';
import { getClinicLetterhead, getDoctorLetterhead } from '../../lib/clinic-letterhead';
import type { PrescriptionPrintData } from '../../lib/print-templates';
import { useOrganizations } from '../../features/platform/hooks/use-organizations';
import { usePdfSettings } from '../../features/settings/hooks/use-settings';
import { useAuthStore } from '@/shared/stores/auth-store';

interface PrintPrescriptionButtonProps {
  visitId: string;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  className?: string;
  label?: string;
  /** If provided, this data is used directly instead of fetching from API */
  inlineData?: {
    soapData?: {
      subjective?: string;
      objective?: string;
      assessment?: string;
      plan?: string;
    };
    rxItems?: Array<{
      medicationName: string;
      genericName?: string;
      dosage: string;
      frequency: string;
      duration: string;
      route?: string;
      instructions?: string;
      quantity?: number;
    }>;
    advice?: string;
    followUp?: string;
    visit?: {
      id: string;
      visitNumber?: string;
      specialty?: string;
      chiefComplaint?: string;
      startedAt?: string;
      completedAt?: string;
      checkedInAt?: string;
    };
    patient?: {
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string;
      gender?: string;
      mrn?: string;
      phone?: string;
    } | null;
  };
}

export function PrintPrescriptionButton({
  visitId,
  variant = 'outline',
  size = 'sm',
  className,
  label = 'Print Rx',
  inlineData,
}: PrintPrescriptionButtonProps) {
  const { data: summary, isLoading } = useConsultationSummary(visitId);
  const { data: orgs = [] } = useOrganizations();
  const { data: pdfSettings = [] } = usePdfSettings();
  const user = useAuthStore(s => s.user);

  const handlePrint = () => {
    // Determine data source: inline (in-memory) data takes priority over API data
    const useInline = inlineData && (
      (inlineData.soapData?.subjective || inlineData.soapData?.assessment) ||
      (inlineData.rxItems && inlineData.rxItems.length > 0)
    );

    if (!useInline && !summary) return;

    // Retrieve active organization and pdf settings
    const myOrg: any = orgs.find(o => o.id === user?.contextId) || orgs[0];
    const defaultTemplate = pdfSettings.find((s: any) => s.isDefault) || pdfSettings[0];

    // Merge latest org data into clinic letterhead
    const baseClinic = getClinicLetterhead();
    const clinic = {
      ...baseClinic,
      name: myOrg?.name || baseClinic.name,
      tagline: myOrg?.tagLine || baseClinic.tagline,
      logoUrl: myOrg?.logo || baseClinic.logoUrl,
      address: myOrg?.address || baseClinic.address,
      address2: myOrg?.address2 || baseClinic.address2,
      phone: myOrg?.phone || baseClinic.phone,
      timing: myOrg?.timing || baseClinic.timing,
      email: myOrg?.email || baseClinic.email,
      website: myOrg?.website || baseClinic.website,
      registrationNo: myOrg?.registration || baseClinic.registrationNo,
      headerHtml: defaultTemplate?.headerHtml,
      footerHtml: defaultTemplate?.footerHtml,
    };

    let printData: PrescriptionPrintData;

    if (useInline) {
      // ─── Build from in-memory consultation state ───
      const patientName = inlineData.patient
        ? `${inlineData.patient.firstName || ''} ${inlineData.patient.lastName || ''}`.trim() || 'Patient'
        : 'Patient';

      const patientAge = inlineData.patient?.dateOfBirth
        ? String(calculateAge(inlineData.patient.dateOfBirth))
        : undefined;

      const visit = inlineData.visit || { id: visitId };

      const visitDate = (visit as any).completedAt || (visit as any).startedAt || (visit as any).checkedInAt || (visit as any).createdAt || new Date().toISOString();

      printData = {
        clinic: clinic as any,
        doctor: getDoctorLetterhead(),
        patient: {
          name: patientName,
          age: patientAge,
          gender: inlineData.patient?.gender,
          mrn: inlineData.patient?.mrn || (inlineData.patient as any)?.regid?.toString() || (inlineData.patient as any)?.id?.toString(),
          phone: inlineData.patient?.phone,
        },
        visit: {
          visitNumber: (visit as any).visitNumber || (visit as any).id?.toString?.()?.slice(-6)?.toUpperCase?.() || visitId.slice(-6).toUpperCase(),
          date: visitDate,
          specialty: (visit as any).specialty,
          chiefComplaint: (visit as any).chiefComplaint,
        },
        soap: inlineData.soapData
          ? {
            subjective: inlineData.soapData.subjective,
            objective: inlineData.soapData.objective,
            assessment: inlineData.soapData.assessment,
            plan: inlineData.soapData.plan,
          }
          : undefined,
        diagnosis: inlineData.soapData?.assessment
          ? { assessment: inlineData.soapData.assessment }
          : undefined,
        medications: (inlineData.rxItems || []).map(item => ({
          name: item.medicationName,
          genericName: item.genericName,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          route: item.route,
          instructions: item.instructions,
          quantity: item.quantity,
          date: visitDate,
        })),
        advice: inlineData.advice,
        followUp: inlineData.followUp,
        prescriptionStrategy: 'REMEDY',
      };
    } else {
      // ─── Build from API summary (original logic) ───
      const apiDoctorName = summary!.doctor
        ? `${summary!.doctor.firstName} ${summary!.doctor.lastName}`.trim()
        : '';

      // Prefer the API summary's doctor (the visit's actual physician), but
      // fall back to the shared letterhead source so missing fields stay consistent.
      const doctor = getDoctorLetterhead({
        name: apiDoctorName || undefined,
        qualification: summary!.doctor?.qualifications ?? undefined,
        registrationNumber: summary!.doctor?.registrationNumber ?? undefined,
      });

      const patientName = summary!.patient
        ? `${summary!.patient.firstName} ${summary!.patient.lastName}`
        : 'Patient';

      const patientAge = summary!.patient?.dateOfBirth
        ? String(calculateAge(summary!.patient.dateOfBirth))
        : undefined;

      const patient = {
        name: patientName,
        age: patientAge,
        gender: summary!.patient?.gender,
        mrn: summary!.patient?.mrn,
        phone: summary!.patient?.phone,
      };

      // Read advice and follow-up from dedicated SOAP fields
      const advice: string | undefined = summary!.soap?.advice ?? undefined;
      const followUp: string | undefined = summary!.soap?.followUp ?? undefined;
      let labOrders: string[] | undefined;

      if (summary!.soap?.plan) {
        const plan = summary!.soap.plan;
        const labMatch = plan.match(/Lab Orders:\s*(.+)/);
        if (labMatch && labMatch[1]) labOrders = labMatch[1].split(',').map((s: string) => s.trim());
      }

      // Get medications from prescriptions.
      // The /summary endpoint returns `prescriptions` as a FLAT array of legacy
      // prescription rows ({ remedy, potency, frequency, duration, instructions }).
      // It also accepts the older nested shape ({ items: [{ medicationName, dosage, ... }] })
      // for back-compat — handle both.
      const visitDate = summary!.visit.completedAt || summary!.visit.startedAt || summary!.visit.checkedInAt || (summary!.visit as any).createdAt || new Date().toISOString();

      const medications = (summary!.prescriptions ?? []).flatMap((rx: any) => {
        // Back-compat: nested-items shape
        if (Array.isArray(rx?.items) && rx.items.length > 0) {
          return rx.items.map((item: any) => ({
            name: item.medicationName ?? item.remedy ?? item.name,
            genericName: item.genericName,
            dosage: item.dosage ?? item.potency,
            frequency: item.frequency,
            duration: item.duration,
            route: item.route,
            instructions: item.instructions,
            quantity: item.quantity,
            date: item.created_at ?? item.date ?? visitDate,
          }));
        }
        // Flat row shape from the legacy `prescriptions` table
        return [{
          name: rx?.medicationName ?? rx?.remedy ?? rx?.name ?? '',
          genericName: rx?.genericName,
          dosage: rx?.dosage ?? rx?.potency,
          frequency: rx?.frequency,
          duration: rx?.duration,
          route: rx?.route,
          instructions: rx?.instructions,
          quantity: rx?.quantity,
          date: rx?.created_at ?? rx?.date ?? visitDate,
        }];
      }).filter((m: any) => m.name);

      printData = {
        clinic: clinic as any,
        doctor,
        patient,
        visit: {
          visitNumber: summary!.visit.visitNumber || summary!.visit.id.slice(-6).toUpperCase(),
          date: summary!.visit.completedAt || summary!.visit.startedAt || summary!.visit.checkedInAt,
          specialty: summary!.visit.specialty,
          chiefComplaint: summary!.visit.chiefComplaint,
        },
        vitals: summary!.vitals
          ? {
            heightCm: summary!.vitals.heightCm ?? undefined,
            weightKg: summary!.vitals.weightKg ?? undefined,
            bmi: summary!.vitals.bmi ?? undefined,
            temperatureF: summary!.vitals.temperatureF ?? undefined,
            pulseRate: summary!.vitals.pulseRate ?? undefined,
            systolicBp: summary!.vitals.systolicBp ?? undefined,
            diastolicBp: summary!.vitals.diastolicBp ?? undefined,
            oxygenSaturation: summary!.vitals.oxygenSaturation ?? undefined,
          }
          : undefined,
        diagnosis: summary!.soap
          ? {
            icdCodes: summary!.soap.icdCodes,
            assessment: summary!.soap.assessment ?? undefined,
          }
          : undefined,
        soap: summary!.soap
          ? {
            subjective: summary!.soap.subjective ?? undefined,
            objective: summary!.soap.objective ?? undefined,
            assessment: summary!.soap.assessment ?? undefined,
            plan: summary!.soap.plan ?? undefined,
          }
          : undefined,
        medications,
        labOrders,
        advice,
        followUp,
        prescriptionNotes: summary!.prescriptions?.[0]?.notes ?? undefined,
        prescriptionStrategy: (summary!.prescriptionStrategy as PrescriptionPrintData['prescriptionStrategy']) ?? undefined,
      };
    }

    const html = generatePrescriptionHtml(printData);
    printHtml(html, { title: `Prescription - ${printData.patient.name}` });
  };

  // Enable button if we have inline data OR API summary
  const hasData = !!(inlineData && (
    (inlineData.soapData?.subjective || inlineData.soapData?.assessment) ||
    (inlineData.rxItems && inlineData.rxItems.length > 0)
  )) || !!summary;

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handlePrint}
      disabled={isLoading && !hasData}
    >
      <Printer className="h-4 w-4 mr-1" />
      {label}
    </Button>
  );
}
