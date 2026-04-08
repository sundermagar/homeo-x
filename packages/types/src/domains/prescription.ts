export interface PrescriptionItem {
  id: number;
  regid: number;
  remedyId: number | null;
  remedyName: string;
  potencyId: number | null;
  potencyName: string | null;
  frequencyId: number | null;
  frequency: string | null;
  days: number | null;
  instructions: string | null;
  deletedAt: Date | null;
}
