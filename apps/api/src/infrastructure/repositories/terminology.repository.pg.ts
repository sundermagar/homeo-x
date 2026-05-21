import { sql, ilike, or } from 'drizzle-orm';
import type { DbClient } from '@mmc/database';
import { icdCodes, loincCodes, procedureCodes, snomedConcepts } from '@mmc/database/schema';
import { createLogger } from '../../shared/logger.js';
import type { ITerminologyRepository, IcdCode, LoincCode, ProcedureCode, SnomedConcept } from '../../domains/clinical-terminology/ports/terminology.repository.js';

export class TerminologyRepositoryPg implements ITerminologyRepository {
  private readonly logger = createLogger('terminology-repository-pg');

  constructor(private readonly db: DbClient) {}

  async searchIcdCodes(query: string, limit = 20): Promise<IcdCode[]> {
    const q = `%${query}%`;
    const results = await this.db.select()
      .from(icdCodes)
      .where(or(
        ilike(icdCodes.code, q),
        ilike(icdCodes.description, q)
      ))
      .limit(limit);
    return results;
  }

  async searchLoincCodes(query: string, limit = 20): Promise<LoincCode[]> {
    const q = `%${query}%`;
    const results = await this.db.select()
      .from(loincCodes)
      .where(or(
        ilike(loincCodes.loincNum, q),
        ilike(loincCodes.component, q),
        ilike(loincCodes.description, q)
      ))
      .limit(limit);
    return results;
  }

  async searchProcedureCodes(query: string, limit = 20): Promise<ProcedureCode[]> {
    const q = `%${query}%`;
    const results = await this.db.select()
      .from(procedureCodes)
      .where(or(
        ilike(procedureCodes.code, q),
        ilike(procedureCodes.name, q),
        ilike(procedureCodes.description, q)
      ))
      .limit(limit);
    return results;
  }

  async searchSnomedConcepts(query: string, limit = 20): Promise<SnomedConcept[]> {
    const q = `%${query}%`;
    console.log(`[TerminologyRepo] Searching for "${query}"...`);
    
    try {
      // 1. Try Drizzle search
      const results = await this.db.select()
        .from(snomedConcepts)
        .where(or(
          ilike(snomedConcepts.term, q),
          ilike(snomedConcepts.fsn, q)
        ))
        .limit(limit);

      console.log(`[TerminologyRepo] Drizzle found ${results.length} results`);

      if (results.length > 0) {
        return results.map(r => ({ ...r, conceptId: String(r.conceptId) })) as unknown as SnomedConcept[];
      }

      // 2. Fallback: Raw SQL search in public schema
      console.log(`[TerminologyRepo] Falling back to raw SQL search in public schema...`);
      const rawResults = await this.db.execute(sql`
        SELECT id, concept_id, fsn, term, concept_type, active 
        FROM public.snomed_concepts 
        WHERE term ILIKE ${q} OR fsn ILIKE ${q}
        LIMIT ${limit}
      `);

      console.log(`[TerminologyRepo] Raw SQL found ${rawResults.length} results`);
      
      const mapped = (rawResults as any[]).map(r => ({
        id: r.id,
        conceptId: String(r.concept_id || r.conceptId),
        fsn: r.fsn,
        term: r.term,
        conceptType: r.concept_type || r.conceptType,
        active: r.active
      }));

      return mapped as unknown as SnomedConcept[];
    } catch (err) {
      console.error('[TerminologyRepo] SNOMED search failed:', err);
      return [];
    }
  }

  async getIcdByCode(code: string): Promise<IcdCode | undefined> {
    const results = await this.db.select().from(icdCodes).where(ilike(icdCodes.code, code)).limit(1);
    return results[0];
  }

  async getLoincByNum(loincNum: string): Promise<LoincCode | undefined> {
    const results = await this.db.select().from(loincCodes).where(ilike(loincCodes.loincNum, loincNum)).limit(1);
    return results[0];
  }

  async getProcedureByCode(code: string): Promise<ProcedureCode | undefined> {
    const results = await this.db.select().from(procedureCodes).where(ilike(procedureCodes.code, code)).limit(1);
    return results[0];
  }

  async getSnomedByConceptId(conceptId: string): Promise<SnomedConcept | undefined> {
    const id = parseInt(conceptId);
    if (isNaN(id)) return undefined;
    const results = await this.db.select().from(snomedConcepts).where(sql`${snomedConcepts.conceptId} = ${id}`).limit(1);
    if (!results[0]) return undefined;
    return { ...results[0], conceptId: String(results[0].conceptId) } as unknown as SnomedConcept;
  }
}
