/**
 * FHIR R4 Generator Service
 * 
 * Converts HomeoX internal medical records (case_datas, medicalcases, prescriptions)
 * into FHIR R4-compliant JSON Bundles for ABDM Health Information Exchange.
 * 
 * Resources generated: Bundle, Composition, Patient, Encounter, Condition,
 * MedicationRequest, Practitioner, Organization.
 * 
 * Spec: https://www.hl7.org/fhir/R4/
 * ABDM Profile: https://nrces.in/ndhm/fhir/r4/index.html
 */

import { createLogger } from '../../shared/logger.js';

const logger = createLogger('fhir-generator');

// ─── Input Interfaces ────────────────────────────────────────────────────────

export interface FhirPatientData {
  regid: number;
  abhaId: string;
  firstName: string;
  surname?: string;
  gender?: string;       // 'M' | 'F' | 'Other'
  dob?: string;          // YYYY-MM-DD
  mobile?: string;
}

export interface FhirPractitionerData {
  id: number;
  name: string;
  hprId?: string;        // ABDM HPR ID
  qualification?: string;
}

export interface FhirOrganizationData {
  id: number;
  name: string;
  hfrId?: string;        // ABDM HFR ID
  address?: string;
  phone?: string;
}

export interface FhirMedicationData {
  medicine: string;
  potency?: string;
  frequency?: string;
  days?: string;
  issue?: string;         // Indication/complaint
}

export interface FhirEncounterData {
  visitId: number;
  visitDate: string;      // ISO date
  diagnosis?: string;
  complaint?: string;
  investigation?: string;
  medications: FhirMedicationData[];
  patient: FhirPatientData;
  practitioner: FhirPractitionerData;
  organization: FhirOrganizationData;
}

// ─── FHIR Generator ─────────────────────────────────────────────────────────

export class FhirGeneratorService {

  /**
   * Generate a complete FHIR R4 Bundle (type: document) for a single clinical encounter.
   * This is the primary output format required by ABDM for HIP data sharing.
   */
  generatePrescriptionBundle(encounter: FhirEncounterData): object {
    const bundleId = `bundle-${encounter.visitId}-${Date.now()}`;
    const timestamp = new Date().toISOString();

    // Build individual resources
    const patientResource = this.buildPatientResource(encounter.patient);
    const practitionerResource = this.buildPractitionerResource(encounter.practitioner);
    const organizationResource = this.buildOrganizationResource(encounter.organization);
    const encounterResource = this.buildEncounterResource(encounter);
    const conditionResources = this.buildConditionResources(encounter);
    const medicationResources = this.buildMedicationRequestResources(encounter);

    // Build the Composition (document manifest)
    const compositionResource = this.buildCompositionResource(
      encounter,
      patientResource,
      practitionerResource,
      organizationResource,
      encounterResource,
      conditionResources,
      medicationResources,
    );

    // Assemble the Bundle
    const bundle = {
      resourceType: 'Bundle',
      id: bundleId,
      meta: {
        lastUpdated: timestamp,
        profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle'],
      },
      identifier: {
        system: 'https://mmc.homeox.in',
        value: bundleId,
      },
      type: 'document',
      timestamp,
      entry: [
        { fullUrl: compositionResource.fullUrl, resource: compositionResource.resource },
        { fullUrl: patientResource.fullUrl, resource: patientResource.resource },
        { fullUrl: practitionerResource.fullUrl, resource: practitionerResource.resource },
        { fullUrl: organizationResource.fullUrl, resource: organizationResource.resource },
        { fullUrl: encounterResource.fullUrl, resource: encounterResource.resource },
        ...conditionResources.map(c => ({ fullUrl: c.fullUrl, resource: c.resource })),
        ...medicationResources.map(m => ({ fullUrl: m.fullUrl, resource: m.resource })),
      ],
    };

    logger.info({ visitId: encounter.visitId, entries: bundle.entry.length }, 'Generated FHIR R4 Bundle');
    return bundle;
  }

  // ─── Resource Builders ───────────────────────────────────────────────────

  private buildPatientResource(patient: FhirPatientData) {
    const id = `Patient/${patient.regid}`;
    return {
      fullUrl: id,
      resource: {
        resourceType: 'Patient',
        id: String(patient.regid),
        meta: {
          profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/Patient'],
        },
        identifier: [
          {
            type: {
              coding: [{
                system: 'https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-identifier-type-code',
                code: 'ABHA',
                display: 'Ayushman Bharat Health Account (ABHA) ID',
              }],
            },
            system: 'https://healthid.ndhm.gov.in',
            value: patient.abhaId,
          },
        ],
        name: [{
          text: `${patient.firstName || ''} ${patient.surname || ''}`.trim(),
          given: [patient.firstName || ''],
          family: patient.surname || '',
        }],
        gender: this.mapGender(patient.gender),
        ...(patient.dob ? { birthDate: patient.dob } : {}),
        ...(patient.mobile ? {
          telecom: [{ system: 'phone', value: patient.mobile, use: 'mobile' }],
        } : {}),
      },
    };
  }

  private buildPractitionerResource(practitioner: FhirPractitionerData) {
    const id = `Practitioner/${practitioner.id}`;
    return {
      fullUrl: id,
      resource: {
        resourceType: 'Practitioner',
        id: String(practitioner.id),
        meta: {
          profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/Practitioner'],
        },
        identifier: practitioner.hprId ? [{
          type: {
            coding: [{
              system: 'https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-identifier-type-code',
              code: 'HPR',
              display: 'Healthcare Professional Registry ID',
            }],
          },
          system: 'https://doctor.ndhm.gov.in',
          value: practitioner.hprId,
        }] : [],
        name: [{ text: practitioner.name }],
        ...(practitioner.qualification ? {
          qualification: [{
            code: {
              text: practitioner.qualification,
            },
          }],
        } : {}),
      },
    };
  }

  private buildOrganizationResource(org: FhirOrganizationData) {
    const id = `Organization/${org.id}`;
    return {
      fullUrl: id,
      resource: {
        resourceType: 'Organization',
        id: String(org.id),
        meta: {
          profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/Organization'],
        },
        identifier: org.hfrId ? [{
          type: {
            coding: [{
              system: 'https://nrces.in/ndhm/fhir/r4/CodeSystem/ndhm-identifier-type-code',
              code: 'HFR',
              display: 'Health Facility Registry ID',
            }],
          },
          system: 'https://facility.ndhm.gov.in',
          value: org.hfrId,
        }] : [],
        name: org.name,
        ...(org.phone ? {
          telecom: [{ system: 'phone', value: org.phone }],
        } : {}),
        ...(org.address ? {
          address: [{ text: org.address }],
        } : {}),
      },
    };
  }

  private buildEncounterResource(encounter: FhirEncounterData) {
    const id = `Encounter/${encounter.visitId}`;
    return {
      fullUrl: id,
      resource: {
        resourceType: 'Encounter',
        id: String(encounter.visitId),
        meta: {
          profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/Encounter'],
        },
        status: 'finished',
        class: {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
          code: 'AMB',
          display: 'ambulatory',
        },
        subject: { reference: `Patient/${encounter.patient.regid}` },
        participant: [{
          individual: { reference: `Practitioner/${encounter.practitioner.id}` },
        }],
        period: {
          start: encounter.visitDate,
          end: encounter.visitDate,
        },
        serviceProvider: { reference: `Organization/${encounter.organization.id}` },
      },
    };
  }

  private buildConditionResources(encounter: FhirEncounterData) {
    const conditions: { fullUrl: string; resource: object }[] = [];

    if (encounter.diagnosis) {
      // Split comma-separated diagnoses
      const diagnosisList = encounter.diagnosis.split(',').map(d => d.trim()).filter(Boolean);
      diagnosisList.forEach((diag, idx) => {
        const id = `Condition/${encounter.visitId}-${idx}`;
        conditions.push({
          fullUrl: id,
          resource: {
            resourceType: 'Condition',
            id: `${encounter.visitId}-${idx}`,
            meta: {
              profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/Condition'],
            },
            code: {
              text: diag,
              // NOTE: In production, map to SNOMED CT codes
              // coding: [{ system: 'http://snomed.info/sct', code: '...', display: diag }]
            },
            subject: { reference: `Patient/${encounter.patient.regid}` },
            encounter: { reference: `Encounter/${encounter.visitId}` },
            recordedDate: encounter.visitDate,
            clinicalStatus: {
              coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                code: 'active',
              }],
            },
          },
        });
      });
    }

    // Add complaint as a separate condition if present
    if (encounter.complaint && encounter.complaint !== encounter.diagnosis) {
      const id = `Condition/${encounter.visitId}-complaint`;
      conditions.push({
        fullUrl: id,
        resource: {
          resourceType: 'Condition',
          id: `${encounter.visitId}-complaint`,
          code: { text: encounter.complaint },
          category: [{
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/condition-category',
              code: 'problem-list-item',
              display: 'Problem List Item',
            }],
          }],
          subject: { reference: `Patient/${encounter.patient.regid}` },
          encounter: { reference: `Encounter/${encounter.visitId}` },
          recordedDate: encounter.visitDate,
        },
      });
    }

    return conditions;
  }

  private buildMedicationRequestResources(encounter: FhirEncounterData) {
    return encounter.medications.map((med, idx) => {
      const id = `MedicationRequest/${encounter.visitId}-${idx}`;

      // Build the medication name including potency (homeopathic-specific)
      const medicationName = med.potency
        ? `${med.medicine} ${med.potency}`
        : med.medicine;

      return {
        fullUrl: id,
        resource: {
          resourceType: 'MedicationRequest',
          id: `${encounter.visitId}-${idx}`,
          meta: {
            profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/MedicationRequest'],
          },
          status: 'active',
          intent: 'order',
          medicationCodeableConcept: {
            text: medicationName,
            // NOTE: In production, map to standard drug codes
            // coding: [{ system: 'http://snomed.info/sct', code: '...', display: medicationName }]
          },
          subject: { reference: `Patient/${encounter.patient.regid}` },
          encounter: { reference: `Encounter/${encounter.visitId}` },
          authoredOn: encounter.visitDate,
          requester: { reference: `Practitioner/${encounter.practitioner.id}` },
          ...(med.frequency || med.days ? {
            dosageInstruction: [{
              text: [med.frequency, med.days ? `for ${med.days} days` : ''].filter(Boolean).join(', '),
              ...(med.frequency ? {
                timing: { code: { text: med.frequency } },
              } : {}),
            }],
          } : {}),
          ...(med.issue ? {
            reasonCode: [{ text: med.issue }],
          } : {}),
        },
      };
    });
  }

  private buildCompositionResource(
    encounter: FhirEncounterData,
    patient: any,
    practitioner: any,
    organization: any,
    encounterRes: any,
    conditions: any[],
    medications: any[],
  ) {
    const id = `Composition/${encounter.visitId}`;
    return {
      fullUrl: id,
      resource: {
        resourceType: 'Composition',
        id: String(encounter.visitId),
        meta: {
          profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/PrescriptionRecord'],
        },
        status: 'final',
        type: {
          coding: [{
            system: 'http://snomed.info/sct',
            code: '440545006',
            display: 'Prescription record',
          }],
        },
        subject: { reference: patient.fullUrl },
        date: encounter.visitDate,
        author: [{ reference: practitioner.fullUrl }],
        title: `Prescription Record - ${encounter.visitDate}`,
        custodian: { reference: organization.fullUrl },
        encounter: { reference: encounterRes.fullUrl },
        section: [
          ...(conditions.length > 0 ? [{
            title: 'Diagnosis / Chief Complaint',
            entry: conditions.map(c => ({ reference: c.fullUrl })),
          }] : []),
          ...(medications.length > 0 ? [{
            title: 'Medications',
            entry: medications.map(m => ({ reference: m.fullUrl })),
          }] : []),
          ...(encounter.investigation ? [{
            title: 'Investigation',
            text: {
              status: 'additional',
              div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>${encounter.investigation}</p></div>`,
            },
          }] : []),
        ],
      },
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private mapGender(gender?: string): string {
    if (!gender) return 'unknown';
    const g = gender.toLowerCase();
    if (g === 'm' || g === 'male') return 'male';
    if (g === 'f' || g === 'female') return 'female';
    return 'other';
  }
}

// Singleton
export const fhirGenerator = new FhirGeneratorService();
