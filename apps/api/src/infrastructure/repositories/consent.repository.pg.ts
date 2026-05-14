import { eq, and } from 'drizzle-orm';
import { type DbClient, consentRecords } from '@mmc/database';
import { type ConsentRepository, type ConsentRecord, type GrantConsentDto } from '../../domains/consent/ports/consent.repository.js';

export class ConsentRepositoryPg implements ConsentRepository {
  constructor(private readonly db: DbClient) {}

  async grant(data: GrantConsentDto): Promise<ConsentRecord> {
    const existing = await this.db
      .select()
      .from(consentRecords)
      .where(
        and(
          eq(consentRecords.patientRegid, data.patientRegid),
          eq(consentRecords.consentType, data.consentType)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await this.db
        .update(consentRecords)
        .set({
          granted: data.granted,
          grantedAt: data.granted ? new Date() : existing[0]!.grantedAt,
          revokedAt: data.granted ? null : new Date(),
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          consentVersion: data.consentVersion,
          updatedAt: new Date(),
        })
        .where(eq(consentRecords.id, existing[0]!.id))
        .returning();

      if (!updated) {
        throw new Error('Failed to update consent record');
      }
      return updated;
    }

    const [inserted] = await this.db
      .insert(consentRecords)
      .values({
        patientRegid: data.patientRegid,
        consentType: data.consentType,
        purpose: data.purpose,
        granted: data.granted,
        grantedAt: data.granted ? new Date() : null,
        revokedAt: data.granted ? null : new Date(),
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        consentVersion: data.consentVersion,
      })
      .returning();

    if (!inserted) {
      throw new Error('Failed to insert consent record');
    }
    return inserted;
  }

  async revoke(patientRegid: number, consentType: string): Promise<void> {
    await this.db
      .update(consentRecords)
      .set({
        granted: false,
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(consentRecords.patientRegid, patientRegid),
          eq(consentRecords.consentType, consentType)
        )
      );
  }

  async findByPatient(patientRegid: number): Promise<ConsentRecord[]> {
    return await this.db
      .select()
      .from(consentRecords)
      .where(eq(consentRecords.patientRegid, patientRegid))
      .orderBy(consentRecords.consentType);
  }

  async check(patientRegid: number, consentType: string): Promise<boolean> {
    const records = await this.db
      .select({ granted: consentRecords.granted })
      .from(consentRecords)
      .where(
        and(
          eq(consentRecords.patientRegid, patientRegid),
          eq(consentRecords.consentType, consentType)
        )
      )
      .limit(1);
    
    return records.length > 0 ? !!records[0]!.granted : false;
  }
}
