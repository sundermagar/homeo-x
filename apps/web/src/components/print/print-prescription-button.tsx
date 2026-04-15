import { Printer } from 'lucide-react';
import { Button } from '../ui/button';
import { printHtml } from '../../lib/print';
import { generatePrescriptionHtml } from '../../lib/print-templates';
import { useConsultationSummary } from '../../hooks/use-consultations';
import { calculateAge } from '../../lib/format';
import type { PrescriptionPrintData } from '../../lib/print-templates';

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

  const handlePrint = () => {
    // Determine data source: inline (in-memory) data takes priority over API data
    const useInline = inlineData && (
      (inlineData.soapData?.subjective || inlineData.soapData?.assessment) ||
      (inlineData.rxItems && inlineData.rxItems.length > 0)
    );

    if (!useInline && !summary) return;

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

      printData = {
        clinic: { name: 'MMC Clinic' },
        doctor: { name: 'Doctor' },
        patient: {
          name: patientName,
          age: patientAge,
          gender: inlineData.patient?.gender,
          mrn: inlineData.patient?.mrn,
          phone: inlineData.patient?.phone,
        },
        visit: {
          visitNumber: (visit as any).visitNumber || visit.id?.slice(-6).toUpperCase() || visitId.slice(-6).toUpperCase(),
          date: (visit as any).completedAt || (visit as any).startedAt || (visit as any).checkedInAt || new Date().toISOString(),
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
        })),
        advice: inlineData.advice,
        followUp: inlineData.followUp,
        prescriptionStrategy: 'REMEDY',
      };
    } else {
      // ─── Build from API summary (original logic) ───
      const clinic = { name: 'MMC Clinic' };

      const doctor = {
        name: summary!.doctor
          ? `${summary!.doctor.firstName} ${summary!.doctor.lastName}`
          : 'Doctor',
        qualification: summary!.doctor?.qualifications ?? undefined,
        registrationNumber: summary!.doctor?.registrationNumber ?? undefined,
      };

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

      // Get medications from prescriptions
      const medications = summary!.prescriptions?.flatMap((rx: any) =>
        rx.items.map((item: any) => ({
          name: item.medicationName,
          genericName: item.genericName,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          route: item.route,
          instructions: item.instructions,
          quantity: item.quantity,
        })),
      ) ?? [];

      printData = {
        clinic,
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
