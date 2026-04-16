  Expense,
  ExpenseWithHead,
  ExpenseHead,
} from '@mmc/types';
  CreateExpenseInput,
  UpdateExpenseInput,
  ListExpensesQuery,
  CreateExpenseHeadInput,
  UpdateExpenseHeadInput,
} from '@mmc/validation';

/**
 * AdditionalChargeRepository Port
 */
export interface AdditionalChargeRepository {
  findById(id: number): Promise<AdditionalChargeWithPatient | null>;
  findAll(params: ListAdditionalChargesQuery): Promise<{
    data: AdditionalChargeWithPatient[];
    total: number;
  }>;
  create(data: CreateAdditionalChargeInput): Promise<AdditionalCharge>;
  update(id: number, data: UpdateAdditionalChargeInput): Promise<AdditionalCharge | null>;
  softDelete(id: number): Promise<boolean>;
}

/**
 * DayChargeRepository Port
 */
export interface DayChargeRepository {
  findById(id: number): Promise<DayCharge | null>;
  findAll(): Promise<DayCharge[]>;
  create(data: CreateDayChargeInput): Promise<DayCharge>;
  update(id: number, data: UpdateDayChargeInput): Promise<DayCharge | null>;
  softDelete(id: number): Promise<boolean>;
}

/**
 * DepositRepository Port — unified for both Bank and Cash deposits
 */
export interface DepositRepository {
  findById(id: number, type: 'Bank' | 'Cash'): Promise<BankDeposit | CashDeposit | null>;
  findAllByType(type: 'Bank' | 'Cash', params: ListDepositsQuery): Promise<{
    data: (BankDeposit | CashDeposit)[];
    total: number;
  }>;
  createBankDeposit(data: CreateBankDepositInput): Promise<BankDeposit>;
  createCashDeposit(data: CreateCashDepositInput): Promise<CashDeposit>;
  updateBankDeposit(id: number, data: UpdateBankDepositInput): Promise<BankDeposit | null>;
  updateCashDeposit(id: number, data: UpdateCashDepositInput): Promise<CashDeposit | null>;
  softDelete(id: number, type: 'Bank' | 'Cash'): Promise<boolean>;
}

/**
 * ExpenseRepository Port
 */
export interface ExpenseRepository {
  findById(id: number): Promise<ExpenseWithHead | null>;
  findAll(params: ListExpensesQuery): Promise<{
    data: ExpenseWithHead[];
    total: number;
  }>;
  create(data: CreateExpenseInput): Promise<Expense>;
  update(id: number, data: UpdateExpenseInput): Promise<Expense | null>;
  softDelete(id: number): Promise<boolean>;

  // Expense Heads
  listHeads(): Promise<ExpenseHead[]>;
  findHeadById(id: number): Promise<ExpenseHead | null>;
  createHead(data: CreateExpenseHeadInput): Promise<ExpenseHead>;
  updateHead(id: number, data: UpdateExpenseHeadInput): Promise<ExpenseHead | null>;
  deleteHead(id: number): Promise<boolean>;
}
