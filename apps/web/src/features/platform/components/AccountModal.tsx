import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { Account, Organization } from '@mmc/types';
import { useCreateAccount, useUpdateAccount } from '../hooks/use-accounts';
import '../styles/platform.css';

interface AccountModalProps {
  mode: 'create' | 'edit';
  account?: Account;
  organizations: Organization[];
  onClose: () => void;
}

export function AccountModal({ mode, account, organizations, onClose }: AccountModalProps) {
  const [form, setForm] = useState({
    name:        account?.name        ?? '',
    email:       account?.email       ?? '',
    password:    '',
    gender:      account?.gender      ?? 'Male',
    mobile:      account?.mobile      ?? '',
    city:        account?.city        ?? '',
    address:     account?.address     ?? '',
    about:       account?.about       ?? '',
    designation: account?.designation ?? '',
    clinicId:    account?.clinicId as number | undefined ?? undefined,
  });

  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const isPending = createAccount.isPending || updateAccount.isPending;

  const set = (key: string, val: string | number | undefined) =>
    setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'create') {
        await createAccount.mutateAsync(form as any);
      } else {
        const { password: _pw, ...rest } = form;
        await updateAccount.mutateAsync({ id: account!.id, ...rest });
      }
      onClose();
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'An error occurred. Please try again.');
    }
  };

  return (
    <div
      className="plat-modal-overlay fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="plat-modal">

        {/* ─── Modal Header ─── */}
        <div className="plat-modal-header">
          <h2 className="plat-modal-title">
            {mode === 'create' ? 'New Account Manager' : 'Edit Account'}
          </h2>
          <button className="plat-btn plat-btn-icon" onClick={onClose} style={{ border: 'none' }}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* ─── Form ─── */}
        <form onSubmit={handleSubmit}>
          <div className="plat-form plat-modal-body">

            {/* Full Name — full width */}
            <div className="plat-form-full plat-form-group">
              <label className="plat-form-label">
                Full Name <span className="plat-form-required">*</span>
              </label>
              <input className="plat-form-input" required
                value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="Dr. Firstname Lastname" />
            </div>

            {/* Email */}
            <div className="plat-form-group">
              <label className="plat-form-label">Email</label>
              <input className="plat-form-input" type="email"
                value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="name@clinic.com" />
            </div>

            {/* Mobile */}
            <div className="plat-form-group">
              <label className="plat-form-label">Mobile</label>
              <input className="plat-form-input" type="tel"
                value={form.mobile} onChange={e => set('mobile', e.target.value)}
                placeholder="+91 98765 43210" />
            </div>

            {/* Password — only on create, full width */}
            {mode === 'create' && (
              <div className="plat-form-full plat-form-group">
                <label className="plat-form-label">
                  Password <span className="plat-form-required">*</span>
                </label>
                <input className="plat-form-input" type="password" required
                  value={form.password} onChange={e => set('password', e.target.value)}
                  placeholder="Minimum 6 characters" />
              </div>
            )}

            {/* Gender */}
            <div className="plat-form-group">
              <label className="plat-form-label">Gender</label>
              <select className="plat-form-select"
                value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>
            </div>

            {/* Designation */}
            <div className="plat-form-group">
              <label className="plat-form-label">Designation</label>
              <input className="plat-form-input"
                value={form.designation} onChange={e => set('designation', e.target.value)}
                placeholder="e.g. Clinic Manager" />
            </div>

            {/* Linked Clinic — full width */}
            <div className="plat-form-full plat-form-group">
              <label className="plat-form-label">Linked Clinic</label>
              <select className="plat-form-select"
                value={form.clinicId ?? ''}
                onChange={e => set('clinicId', e.target.value ? parseInt(e.target.value) : undefined)}>
                <option value="">— No specific clinic —</option>
                {organizations.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>

          </div>

          {/* ─── Footer Actions ─── */}
          <div className="plat-modal-footer">
            <button type="button" className="plat-btn" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="plat-btn plat-btn-primary" style={{ flex: 1 }} disabled={isPending}>
              {isPending ? 'Saving…' : mode === 'create' ? 'Create Account' : 'Save Changes'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
