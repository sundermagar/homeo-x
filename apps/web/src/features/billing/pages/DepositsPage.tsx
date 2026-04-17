import React, { useState } from 'react';
import { PlusCircle, X, RefreshCw, Trash2, Edit2, Search, Building, Banknote } from 'lucide-react';
import { useBankDeposits, useCashDeposits, useCreateBankDeposit, useCreateCashDeposit, useDeleteBankDeposit, useDeleteCashDeposit } from '../hooks/use-accounts';
import type { BankDeposit, CashDeposit } from '@mmc/types';
import type { CreateBankDepositInput, CreateCashDepositInput, ListDepositsQuery } from '@mmc/validation';
import '../../platform/styles/platform.css';

const EMPTY_BANK_FORM = { depositDate: new Date().toISOString().split('T')[0], amount: '', remark: '', submitted: 'No' as const };
const EMPTY_CASH_FORM = { depositDate: new Date().toISOString().split('T')[0], amount: '', remark: '', submitted: 'No' as const };

export default function DepositsPage() {
  const [activeTab, setActiveTab] = useState<'bank' | 'cash'>('bank');
  const [page, setPage] = useState(1);
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submissionError, setSubmissionError] = useState('');

  const bankQuery: ListDepositsQuery = { page, limit: 30, date: dateFilter || undefined };
  const cashQuery: ListDepositsQuery = { page, limit: 30, date: dateFilter || undefined };

  const bankQuery_ = useBankDeposits(bankQuery);
  const cashQuery_ = useCashDeposits(cashQuery);
  const createBank = useCreateBankDeposit();
  const createCash = useCreateCashDeposit();
  const deleteBank = useDeleteBankDeposit();
  const deleteCash = useDeleteCashDeposit();

  const bankDeposits: BankDeposit[] = bankQuery_.data?.data ?? [];
  const cashDeposits: CashDeposit[] = cashQuery_.data?.data ?? [];
  const bankTotal = bankQuery_.data?.total ?? 0;
  const cashTotal = cashQuery_.data?.total ?? 0;

  const deposits = activeTab === 'bank' ? bankDeposits : cashDeposits;
  const total = activeTab === 'bank' ? bankTotal : cashTotal;

  const filtered = deposits.filter(d =>
    !search || (d.remark ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (d.bankdeposit ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = deposits.reduce((sum, d) => sum + (parseFloat(d.amount ?? '0') || 0), 0);

  const handleSubmitBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError('');
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const depositDate = (data.get('depositDate') as string)?.trim();
    const amount = (data.get('amount') as string)?.trim();

    if (!depositDate || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(depositDate)) {
      setSubmissionError('Deposit date is required and must be YYYY-MM-DD.');
      return;
    }
    if (!amount) {
      setSubmissionError('Amount is required.');
      return;
    }
    if (!/^[0-9]+(?:\.[0-9]{1,2})?$/.test(amount)) {
      setSubmissionError('Amount must be a valid number.');
      return;
    }

    const payload = {
      depositDate,
      amount,
      remark: (data.get('remark') as string) || undefined,
      bankdeposit: (data.get('bankdeposit') as string) || undefined,
      comments: (data.get('comments') as string) || undefined,
      submitted: (data.get('submitted') as 'Yes' | 'No') ?? 'No',
    };

    try {
      console.debug('Bank deposit payload', payload);
      await createBank.mutateAsync(payload);
      setIsModalOpen(false);
    } catch (error: any) {
      const details = error?.response?.data?.details;
      const msg = error?.response?.data?.error || error?.message || 'Unable to save bank deposit.';
      setSubmissionError(String(msg));
      console.error('Bank deposit submission failed:', { payload, response: error?.response?.data, details, error });
    }
  };

  const handleSubmitCash = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError('');
    const form = e.target as HTMLFormElement;
    const data = new FormData(form);
    const depositDate = (data.get('depositDate') as string)?.trim();
    const amount = (data.get('amount') as string)?.trim();

    if (!depositDate || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(depositDate)) {
      setSubmissionError('Deposit date is required and must be YYYY-MM-DD.');
      return;
    }
    if (!amount) {
      setSubmissionError('Amount is required.');
      return;
    }
    if (!/^[0-9]+(?:\.[0-9]{1,2})?$/.test(amount)) {
      setSubmissionError('Amount must be a valid number.');
      return;
    }

    const payload = {
      depositDate,
      amount,
      remark: (data.get('remark') as string) || undefined,
      bankdeposit: (data.get('bankdeposit') as string) || undefined,
      comments: (data.get('comments') as string) || undefined,
      submitted: (data.get('submitted') as 'Yes' | 'No') ?? 'No',
    };

    try {
      console.debug('Cash deposit payload', payload);
      await createCash.mutateAsync(payload);
      setIsModalOpen(false);
    } catch (error: any) {
      const details = error?.response?.data?.details;
      const msg = error?.response?.data?.error || error?.message || 'Unable to save cash deposit.';
      setSubmissionError(String(msg));
      console.error('Cash deposit submission failed:', { payload, response: error?.response?.data, details, error });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this deposit record?')) return;
    if (activeTab === 'bank') await deleteBank.mutateAsync(id);
    else await deleteCash.mutateAsync(id);
  };

  const isLoading = activeTab === 'bank' ? bankQuery_.isLoading : cashQuery_.isLoading;

  return (
    <div className="plat-page animate-fade-in">
      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <Building size={20} className="color-primary" />
            Deposits Management
          </h1>
          <p className="plat-header-sub">Record and track bank and cash deposits.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={() => setIsModalOpen(true)}>
            <PlusCircle size={14} />
            Add Deposit
          </button>
        </div>
      </div>

      <div className="plat-tabs" style={{ marginBottom: 16 }}>
        <button type="button" className={`plat-tab ${activeTab === 'bank' ? 'plat-tab-active' : ''}`} onClick={() => setActiveTab('bank')}>
          <Building size={14} /> Bank Deposits
        </button>
        <button type="button" className={`plat-tab ${activeTab === 'cash' ? 'plat-tab-active' : ''}`} onClick={() => setActiveTab('cash')}>
          <Banknote size={14} /> Cash Deposits
        </button>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <span className="plat-stat-label">{activeTab === 'bank' ? 'Bank' : 'Cash'} Deposits</span>
          <span className="plat-stat-value">{total}</span>
        </div>
        <div className="plat-stat-card">
          <span className="plat-stat-label">Total Amount</span>
          <span className="plat-stat-value">₹{totalAmount.toLocaleString()}</span>
        </div>
      </div>

      <div className="plat-filters">
        <div className="plat-search-wrap">
          <Search size={16} className="plat-search-icon" />
          <input className="plat-filter-input plat-search-input" placeholder="Search remarks..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <input type="date" className="plat-filter-input" style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.82rem' }} value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
      </div>

      <div className="plat-card">
        {isLoading ? (
          <div className="plat-empty"><RefreshCw size={22} className="animate-spin opacity-30" /></div>
        ) : filtered.length === 0 ? (
          <div className="plat-empty">
            <Building size={40} className="plat-empty-icon" />
            <p className="plat-empty-text">No {activeTab} deposits found.</p>
          </div>
        ) : (
          <div className="plat-table-container">
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>ID</th>
                  <th style={{ width: 120 }}>Date</th>
                  <th>Amount</th>
                  <th>Bank/Account</th>
                  <th>Remark</th>
                  <th style={{ width: 80 }}>Status</th>
                  <th style={{ width: 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id}>
                    <td data-label="ID" style={{ fontFamily: 'var(--pp-font-mono)' }}>#{d.id}</td>
                    <td data-label="Date" style={{ fontFamily: 'var(--pp-font-mono)', fontSize: '0.78rem' }}>{d.depositDate}</td>
                    <td data-label="Amount" style={{ fontFamily: 'var(--pp-font-mono)', fontWeight: 600 }}>₹{(parseFloat(d.amount ?? '0') || 0).toLocaleString()}</td>
                    <td data-label="Bank">{d.bankdeposit || '—'}</td>
                    <td data-label="Remark">{d.remark || '—'}</td>
                    <td data-label="Status">
                      <span className={`plat-badge ${d.submitted === 'Yes' ? 'plat-badge-staff' : 'plat-badge-default'}`}>
                        {d.submitted === 'Yes' ? 'Submitted' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => handleDelete(d.id)}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="plat-modal-overlay animate-fade-in" onClick={e => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="plat-modal" style={{ maxWidth: 500 }}>
            <div className="plat-modal-header">
              <h2 className="plat-modal-title">Add {activeTab === 'bank' ? 'Bank' : 'Cash'} Deposit</h2>
              <button type="button" className="plat-btn plat-btn-icon" onClick={() => setIsModalOpen(false)}><X size={16} /></button>
            </div>
            <form onSubmit={activeTab === 'bank' ? handleSubmitBank : handleSubmitCash}>
              <div className="plat-modal-body plat-form">
                {submissionError && (
                  <div style={{ color: '#B91C1C', marginBottom: 16, fontWeight: 600 }}>{submissionError}</div>
                )}
                <div className="plat-form-group">
                  <label className="plat-form-label">Deposit Date <span className="plat-form-required">*</span></label>
                  <input className="plat-form-input" name="depositDate" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Amount <span className="plat-form-required">*</span></label>
                  <input className="plat-form-input" name="amount" type="text" required placeholder="e.g. 5000" />
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Bank/Account</label>
                  <input className="plat-form-input" name="bankdeposit" placeholder="e.g. HDFC Bank - Acc ****1234" />
                </div>
                <div className="plat-form-group plat-form-full">
                  <label className="plat-form-label">Remark</label>
                  <textarea className="plat-form-input" name="remark" rows={2} placeholder="Optional notes..." />
                </div>
                <div className="plat-form-group plat-form-full">
                  <label className="plat-form-label">Comments</label>
                  <textarea className="plat-form-input" name="comments" rows={2} />
                </div>
                <div className="plat-form-group">
                  <label className="plat-form-label">Status</label>
                  <select className="plat-form-input" name="submitted" defaultValue="No">
                    <option value="No">Pending</option>
                    <option value="Yes">Submitted</option>
                  </select>
                </div>
              </div>
              <div className="plat-modal-footer">
                <button type="button" className="plat-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="plat-btn plat-btn-primary" disabled={createBank.isPending || createCash.isPending}>
                  Record Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}