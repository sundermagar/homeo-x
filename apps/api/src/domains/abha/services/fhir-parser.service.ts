import { createLogger } from '../../../shared/logger.js';

const logger = createLogger('fhir-parser');

export interface ParsedMedicalRecord {
  patientName: string;
  doctorName: string;
  date: string;
  hospitalName: string;
  diagnoses: string[];
  medications: Array<{
    name: string;
    dosage?: string;
  }>;
}

/**
 * Service to parse decrypted FHIR R4 Document Bundles 
 * received from external hospitals via ABDM into a simple format
 * that the Homeo-X UI can easily display.
 */
export class FhirParserService {
  /**
   * Parses a FHIR R4 Bundle (type: 'document')
   */
  public parseBundle(fhirBundleStr: string): ParsedMedicalRecord {
    try {
      const bundle = JSON.parse(fhirBundleStr);
      
      if (bundle.resourceType !== 'Bundle' || bundle.type !== 'document') {
        throw new Error('Provided JSON is not a FHIR Document Bundle');
      }

      const result: ParsedMedicalRecord = {
        patientName: 'Unknown Patient',
        doctorName: 'Unknown Doctor',
        hospitalName: 'External Hospital',
        date: bundle.timestamp || new Date().toISOString(),
        diagnoses: [],
        medications: [],
      };

      const entries = bundle.entry || [];

      for (const entry of entries) {
        const resource = entry.resource;
        if (!resource) continue;

        switch (resource.resourceType) {
          case 'Patient':
            if (resource.name && resource.name.length > 0) {
              result.patientName = resource.name[0].text || result.patientName;
            }
            break;

          case 'Practitioner':
            if (resource.name && resource.name.length > 0) {
              result.doctorName = resource.name[0].text || result.doctorName;
            }
            break;

          case 'Organization':
            if (resource.name) {
              result.hospitalName = resource.name;
            }
            break;

          case 'Condition':
            if (resource.code && resource.code.text) {
              result.diagnoses.push(resource.code.text);
            } else if (resource.code && resource.code.coding && resource.code.coding.length > 0) {
              result.diagnoses.push(resource.code.coding[0].display);
            }
            break;

          case 'MedicationRequest':
            let medName = 'Unknown Medication';
            if (resource.medicationCodeableConcept && resource.medicationCodeableConcept.text) {
              medName = resource.medicationCodeableConcept.text;
            }

            let dosage = '';
            if (resource.dosageInstruction && resource.dosageInstruction.length > 0) {
              dosage = resource.dosageInstruction[0].text || '';
            }

            result.medications.push({
              name: medName,
              dosage,
            });
            break;
        }
      }

      return result;

    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to parse FHIR bundle');
      throw new Error(`Failed to parse FHIR bundle: ${err.message}`);
    }
  }
}
