import type { ITerminologyRepository } from '../ports/terminology.repository.js';

export class TerminologyService {
  constructor(private readonly repo: ITerminologyRepository) {}

  async searchIcd(query: string, limit?: number) {
    if (!query || query.length < 2) return [];
    return this.repo.searchIcdCodes(query, limit);
  }

  async searchLoinc(query: string, limit?: number) {
    if (!query || query.length < 2) return [];
    return this.repo.searchLoincCodes(query, limit);
  }

  async searchProcedure(query: string, limit?: number) {
    if (!query || query.length < 2) return [];
    return this.repo.searchProcedureCodes(query, limit);
  }

  async searchSnomed(query: string, limit?: number) {
    if (!query || query.length < 2) return [];
    return this.repo.searchSnomedConcepts(query, limit);
  }

  async getIcdDetails(code: string) {
    return this.repo.getIcdByCode(code);
  }

  async getLoincDetails(loincNum: string) {
    return this.repo.getLoincByNum(loincNum);
  }

  async getProcedureDetails(code: string) {
    return this.repo.getProcedureByCode(code);
  }

  async getSnomedDetails(conceptId: string) {
    return this.repo.getSnomedByConceptId(conceptId);
  }
}
