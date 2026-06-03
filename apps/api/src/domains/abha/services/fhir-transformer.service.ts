import { v4 as uuidv4 } from 'uuid';

/**
 * Transforms Homeo-X medical case data into an ABDM-compliant FHIR R4 Document Bundle.
 */
export class FhirTransformerService {
  /**
   * Generates a FHIR R4 Bundle for a given medical case/consultation
   */
  public generatePrescriptionBundle(
    patientData: {
      abhaId: string;
      name: string;
      gender: string;
      dob?: Date | null;
    },
    practitionerData: {
      id: string;
      name: string;
      qualification?: string;
    },
    prescriptionData: {
      date: Date;
      notes?: string;
      medicines: Array<{
        name: string;
        potency?: string;
        frequency?: string;
        duration?: string;
        instructions?: string;
      }>;
    },
    custodianData?: {
      id: string;
      name: string;
    }
  ): Record<string, any> {
    const bundleId = uuidv4();
    const patientResourceId = uuidv4();
    const practitionerResourceId = uuidv4();
    const encounterResourceId = uuidv4();
    const compositionResourceId = uuidv4();

    const dateStr = prescriptionData.date.toISOString();

    const bundle = {
      resourceType: 'Bundle',
      id: bundleId,
      meta: {
        lastUpdated: dateStr,
        profile: [
          'https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle',
        ],
      },
      identifier: {
        system: 'http://hip.in',
        value: bundleId,
      },
      type: 'document',
      timestamp: dateStr,
      entry: [] as any[],
    };

    const organizationResourceId = uuidv4();

    // 1. Composition Resource (Must be first in a Document Bundle)
    const compositionResource: any = {
      resourceType: 'Composition',
      id: compositionResourceId,
      identifier: {
        system: 'https://ndhm.in/phr',
        value: compositionResourceId,
      },
      status: 'final',
      type: {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: '440545006',
            display: 'Prescription record',
          },
        ],
      },
      subject: {
        reference: `urn:uuid:${patientResourceId}`,
      },
      encounter: {
        reference: `urn:uuid:${encounterResourceId}`,
      },
      date: dateStr,
      author: [
        {
          reference: `urn:uuid:${practitionerResourceId}`,
          display: practitionerData.name,
        },
      ],
      title: 'Prescription',
      section: [
        {
          title: 'Medications',
          code: {
            coding: [
              {
                system: 'http://snomed.info/sct',
                code: '721912009',
                display: 'Medication summary document',
              },
            ],
          },
          entry: [] as any[],
        },
      ],
    };

    if (custodianData) {
      compositionResource.custodian = {
        reference: `urn:uuid:${organizationResourceId}`,
        display: custodianData.name,
      };
    }

    bundle.entry.push({
      fullUrl: `urn:uuid:${compositionResourceId}`,
      resource: compositionResource,
    });

    // 2. Patient Resource
    bundle.entry.push({
      fullUrl: `urn:uuid:${patientResourceId}`,
      resource: {
        resourceType: 'Patient',
        id: patientResourceId,
        identifier: [
          {
            type: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
                  code: 'MR',
                  display: 'Medical record number',
                },
              ],
            },
            system: 'https://healthid.ndhm.gov.in',
            value: patientData.abhaId,
          },
        ],
        name: [
          {
            text: patientData.name,
          },
        ],
        gender: patientData.gender.toLowerCase() === 'm' ? 'male' : patientData.gender.toLowerCase() === 'f' ? 'female' : 'other',
        birthDate: patientData.dob ? patientData.dob.toISOString().split('T')[0] : undefined,
      },
    });

    // 3. Practitioner Resource
    bundle.entry.push({
      fullUrl: `urn:uuid:${practitionerResourceId}`,
      resource: {
        resourceType: 'Practitioner',
        id: practitionerResourceId,
        identifier: [
          {
            type: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
                  code: 'MD',
                  display: 'Medical License number',
                },
              ],
            },
            system: 'https://ndhm.in',
            value: practitionerData.id,
          },
        ],
        name: [
          {
            text: practitionerData.name,
          },
        ],
      },
    });

    // 4. Encounter Resource
    bundle.entry.push({
      fullUrl: `urn:uuid:${encounterResourceId}`,
      resource: {
        resourceType: 'Encounter',
        id: encounterResourceId,
        status: 'finished',
        class: {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
          code: 'AMB',
          display: 'ambulatory',
        },
        subject: {
          reference: `urn:uuid:${patientResourceId}`,
        },
        period: {
          start: dateStr,
        },
      },
    });

    // 5. MedicationRequest Resources
    for (const medicine of prescriptionData.medicines) {
      const medReqId = uuidv4();
      const medReqResource = {
        fullUrl: `urn:uuid:${medReqId}`,
        resource: {
          resourceType: 'MedicationRequest',
          id: medReqId,
          status: 'active',
          intent: 'order',
          medicationCodeableConcept: {
            text: `${medicine.name} ${medicine.potency || ''}`.trim(),
          },
          subject: {
            reference: `urn:uuid:${patientResourceId}`,
          },
          encounter: {
            reference: `urn:uuid:${encounterResourceId}`,
          },
          authoredOn: dateStr,
          requester: {
            reference: `urn:uuid:${practitionerResourceId}`,
          },
          dosageInstruction: [
            {
              text: `${medicine.frequency || ''} for ${medicine.duration || ''}. ${medicine.instructions || ''}`.trim(),
            },
          ],
        },
      };
      bundle.entry.push(medReqResource);

      // Link it to the composition section
      bundle.entry[0].resource.section[0].entry.push({
        reference: `urn:uuid:${medReqId}`,
      });
    }

    // 6. Organization Resource (if custodianData exists)
    if (custodianData) {
      bundle.entry.push({
        fullUrl: `urn:uuid:${organizationResourceId}`,
        resource: {
          resourceType: 'Organization',
          id: organizationResourceId,
          identifier: [
            {
              system: 'https://ndhm.in/hfr',
              value: custodianData.id,
            },
          ],
          name: custodianData.name,
        },
      });
    }

    return bundle;
  }
}
