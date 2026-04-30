export interface IcdCode {
  id: number;
  code: string;
  version: string;
  description: string;
  chapter?: string | null;
  category?: string | null;
  isActive: boolean | null;
}

export interface LoincCode {
  id: number;
  loincNum: string;
  component: string;
  property?: string | null;
  system?: string | null;
  scale?: string | null;
  method?: string | null;
  units?: string | null;
  description: string;
}

export interface ProcedureCode {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  category?: string | null;
  standard?: string | null;
  isActive: boolean | null;
}

export interface ITerminologyRepository {
  searchIcdCodes(query: string, limit?: number): Promise<IcdCode[]>;
  searchLoincCodes(query: string, limit?: number): Promise<LoincCode[]>;
  searchProcedureCodes(query: string, limit?: number): Promise<ProcedureCode[]>;
  
  getIcdByCode(code: string): Promise<IcdCode | undefined>;
  getLoincByNum(loincNum: string): Promise<LoincCode | undefined>;
  getProcedureByCode(code: string): Promise<ProcedureCode | undefined>;
}
