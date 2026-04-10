import type { IKnowledgeRepository } from '../ports/knowledge.repository';
import type { DictionaryItem, LibraryResource } from '@mmc/types';
import type { CreateDictionaryInput, CreateLibraryResourceInput } from '@mmc/validation';

export class KnowledgeService {
  constructor(private readonly knowledgeRepo: IKnowledgeRepository) {}

  async defineTerm(tenantId: string, input: CreateDictionaryInput): Promise<DictionaryItem> {
    return this.knowledgeRepo.createDictionaryEntry(tenantId, input);
  }

  async getMasterDictionary(tenantId: string): Promise<DictionaryItem[]> {
    return this.knowledgeRepo.listDictionary(tenantId);
  }

  async uploadResource(tenantId: string, input: CreateLibraryResourceInput): Promise<LibraryResource> {
    return this.knowledgeRepo.createLibraryResource(tenantId, input);
  }

  async browseLibrary(tenantId: string): Promise<LibraryResource[]> {
    return this.knowledgeRepo.listLibraryResources(tenantId);
  }
}
