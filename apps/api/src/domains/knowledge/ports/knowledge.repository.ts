import type { DictionaryItem, LibraryResource } from '@mmc/types';
import type { CreateDictionaryInput, CreateLibraryResourceInput } from '@mmc/validation';

export interface IKnowledgeRepository {
  createDictionaryEntry(tenantId: string, data: CreateDictionaryInput): Promise<DictionaryItem>;
  listDictionary(tenantId: string): Promise<DictionaryItem[]>;
  createLibraryResource(tenantId: string, data: CreateLibraryResourceInput): Promise<LibraryResource>;
  listLibraryResources(tenantId: string): Promise<LibraryResource[]>;
}
