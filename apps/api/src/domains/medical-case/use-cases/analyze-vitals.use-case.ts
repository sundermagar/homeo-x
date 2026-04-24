import { type DbClient, growthReferences } from '@mmc/database';
import { and, eq } from 'drizzle-orm';
import { AppError } from '../../../shared/errors';

export class AnalyzeVitalsUseCase {
  constructor(private readonly db: DbClient) { }

  async execute(input: { dob: string, gender: string, heightCm: number, weightKg: number }) {
    const { dob, gender, heightCm, weightKg } = input;

    if (!dob || typeof dob !== 'string') {
      throw new AppError(400, 'Date of birth is required', 'INVALID_DOB');
    }

    const birthDate = new Date(dob);
    if (Number.isNaN(birthDate.getTime())) {
      throw new AppError(400, 'Invalid date of birth format', 'INVALID_DOB');
    }

    if (!['M', 'F'].includes(gender)) {
      throw new AppError(400, 'Gender must be M or F', 'INVALID_GENDER');
    }

    if (!Number.isFinite(heightCm) || heightCm <= 0) {
      throw new AppError(400, 'Height must be a positive number', 'INVALID_HEIGHT');
    }

    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      throw new AppError(400, 'Weight must be a positive number', 'INVALID_WEIGHT');
    }

    // Calculate age in months (matching legacy iterative logic)
    const today = new Date();
    let months = 0;
    let d = new Date(birthDate);
    while (true) {
      d.setMonth(d.getMonth() + 1);
      if (d > today) break;
      months++;
    }

    // Human-readable age (matching legacy format)
    const diff = today.getTime() - birthDate.getTime();
    const ageYears = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
    const ageMonths = Math.floor((diff % (365.25 * 24 * 3600 * 1000)) / (30.44 * 24 * 3600 * 1000));
    const ageDays = Math.floor((diff % (30.44 * 24 * 3600 * 1000)) / (24 * 3600 * 1000));
    const ageDisplay = `${ageYears} years ${ageMonths} months ${ageDays} days`;

    // Fetch ideal reference (matching legacy query)
    const [reference] = await this.db
      .select()
      .from(growthReferences)
      .where(and(eq(growthReferences.months, months), eq(growthReferences.gender, gender)))
      .limit(1)
      .catch(() => []);

    const actualHeight = heightCm;
    const actualWeight = weightKg;
    const expectedHeight = reference?.idealHeightCm ? parseFloat(reference.idealHeightCm) : null;
    const expectedWeight = reference?.idealWeightKg ? parseFloat(reference.idealWeightKg) : null;

    let heightAnalysis = null, heightStatus = null;
    let weightAnalysis = null, weightStatus = null;

    if (expectedHeight) {
      const hDiff = actualHeight - expectedHeight;
      if (hDiff < 0) {
        heightStatus = 'short';
        heightAnalysis = `Short by ${Math.abs(hDiff).toFixed(2)} CM as per age`;
      } else {
        heightStatus = 'tall';
        heightAnalysis = `Taller by ${hDiff.toFixed(2)} CM as per age`;
      }
    }

    if (expectedWeight) {
      const wDiff = actualWeight - expectedWeight;
      if (wDiff < 0) {
        weightStatus = 'less';
        weightAnalysis = `Weight is less by ${Math.abs(wDiff).toFixed(2)} KG as per age`;
      } else {
        weightStatus = 'more';
        weightAnalysis = `Weight is more by ${wDiff.toFixed(2)} KG as per age`;
      }
    }

    const bmi = actualHeight > 0 ? actualWeight / Math.pow(actualHeight / 100, 2) : 0;

    return {
      success: true,
      result: {
        ageDisplay,
        months,
        actualHeight,
        actualWeight,
        expectedHeight,
        expectedWeight,
        heightAnalysis,
        heightStatus,
        weightAnalysis,
        weightStatus,
        bmi: parseFloat(bmi.toFixed(2)),
      }
    };
  }
}
