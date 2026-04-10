import { 
  MedicalCaseRepository, 
  MedicalCase, 
  FullCaseData 
} from '../../../domains/medical-case/ports/medical-case.repository';

const MOCK_CASES: any[] = [
  { id: 1, regid: 10, patientName: 'John Doe', first_name: 'John', surname: 'Doe', gender: 'M', age: 45, phone: '9876543210', status: 'Active', condition: 'Type 2 Diabetes' },
  { id: 2, regid: 11, patientName: 'Jane Smith', first_name: 'Jane', surname: 'Smith', gender: 'F', age: 32, phone: '9876543211', status: 'Active', condition: 'Chronic Gastritis' },
];

export class MockMedicalCaseRepository implements MedicalCaseRepository {
  async findById(id: number): Promise<MedicalCase | null> {
    return MOCK_CASES.find(c => c.id === id) || null;
  }

  async findByRegId(regid: number): Promise<MedicalCase[]> {
    return MOCK_CASES.filter(c => c.regid === regid);
  }

  async findMany(filters: { search?: string; page?: number; limit?: number }) {
    let data = [...MOCK_CASES];
    if (filters.search) {
      const s = filters.search.toLowerCase();
      data = data.filter(c => c.patientName.toLowerCase().includes(s));
    }
    return { data, total: data.length };
  }

  async create(data: any) { return 1; }
  async update(id: number, data: any) { return; }

  async getUnifiedCaseData(regid: number): Promise<FullCaseData | null> {
    const case_ = MOCK_CASES.find(c => c.regid === regid);
    if (!case_) return null;

    return {
      medicalCase: case_,
      vitals: [
        { id: 1, visitId: case_.id, heightCm: 175, weightKg: 82, bmi: 26.8, temperatureF: 98.6, pulseRate: 72, systolicBp: 120, diastolicBp: 80, oxygenSaturation: 98, recordedAt: new Date() }
      ],
      soap: [
        { id: 1, visitId: case_.id, subjective: 'Patient reports mild fatigue and increased thirst.', objective: 'HbA1c: 7.2%, Fasting Glucose: 140 mg/dL.', assessment: 'Under-controlled Type 2 Diabetes.', plan: 'Adjust dosage of metformin, emphasize low-carb diet.', followUp: '2 weeks' }
      ],
      homeo: { id: 1, regid: case_.regid, thermal: 'Hot', constitutional: 'Psoric', miasm: 'Sycotic' },
      notes: [
        { id: 1, regid: regid, notes: 'Patient is compliant with medication but struggling with diet.', notesType: 'Progress', dateval: new Date().toISOString() }
      ],
      examination: [
        { id: 1, regid: regid, findings: 'No peripheral neuropathy detected.', bpSystolic: 122, bpDiastolic: 81, examinationDate: new Date().toISOString() }
      ],
      images: [
        { id: 1, regid: regid, picture: 'https://via.placeholder.com/300', description: 'Left foot inspection' }
      ],
      investigations: [
        { id: 1, regid: regid, type: 'Lab', data: 'CBC, Lipid Profile', investDate: new Date().toISOString() }
      ],
      prescriptions: [
        { id: 1, regid: regid, dateval: new Date().toISOString(), instructions: 'Metformin 500mg once daily after dinner', days: 30 }
      ],
    } as any;
  }

  async saveVitals() {}
  async getVitals() { return null; }
  async saveSoapNotes() {}
  async getSoapNotes() { return null; }
  async saveHomeoDetails() {}
  async getHomeoDetails() { return null; }
  async saveNote() {}
  async deleteNote() {}
  async saveExamination() {}
  async deleteExamination() {}
  async saveImage() { return 1; }
  async deleteImage() {}
  async saveInvestigation() {}
  async deleteInvestigation() {}
  async savePrescription() {}
  async deletePrescription() {}
}
