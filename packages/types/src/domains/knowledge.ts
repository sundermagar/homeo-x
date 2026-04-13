export interface DictionaryItem {
  id: number;
  title?: string | null;
  text?: string | null;
  comments?: string | null;
  crossRef?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryResource {
  id: number;
  title: string;
  author?: string | null;
  resourceType?: string | null;
  url?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecordEntry {
  id: number;
  regid?: number | null;
  comment?: string | null;
  doctorname?: string | null;
  mobile?: string | null;
  recordtype?: string | null;
  recorddate?: string | null;
  calltime?: string | null;
  instructions?: string | null;
  createdAt: string;
  updatedAt: string;
}
