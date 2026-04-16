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
    <div className="plat-modal-backdrop" onClick={onClose}>
      <div className="plat-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="plat-modal-header">
          <h3 className="plat-modal-title">
            {mode === 'create' ? 'Register New Account Manager' : 'Update Manager Account'}
          </h3>
          <button className="plat-btn plat-btn-icon plat-btn-ghost" onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="plat-modal-body">
          {/* Section 1: Professional Identity */}
          <div className="plat-form-section">
            <h4 className="plat-form-section-title">Manager Identity</h4>
            <div className="plat-form-grid-multi">
              <div className="plat-form-group" style={{ gridColumn: 'span 2' }}>
                <label className="plat-form-label">Full Name *</label>
                <input
                  className="plat-form-input"
                  required
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. John Doe"
                />
              </div>

              <div className="plat-form-group">
                <label className="plat-form-label">Designation</label>
                <input
                  className="plat-form-input"
                  value={form.designation}
                  onChange={(e) => set('designation', e.target.value)}
                  placeholder="e.g. Senior Manager"
                />
              </div>

              <div className="plat-form-group">
                <label className="plat-form-label">Gender</label>
                <select
                  className="plat-form-input"
                  value={form.gender}
                  onChange={(e) => set('gender', e.target.value)}
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="plat-form-group" style={{ gridColumn: 'span 2' }}>
                <label className="plat-form-label">Linked Clinic Station</label>
                <select
                  className="plat-form-input"
                  value={form.clinicId ?? ''}
                  onChange={(e) => set('clinicId', e.target.value ? parseInt(e.target.value) : undefined)}
                >
                  <option value="">— No specific clinic —</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Access */}
          <div className="plat-form-section">
            <h4 className="plat-form-section-title">Contact & Access</h4>
            <div className="plat-form-grid-multi">
              <div className="plat-form-group">
                <label className="plat-form-label">Email Address</label>
                <input
                  className="plat-form-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="manager@homeox.com"
                />
              </div>

              <div className="plat-form-group">
                <label className="plat-form-label">Mobile Number</label>
                <input
                  className="plat-form-input"
                  type="tel"
                  value={form.mobile}
                  onChange={(e) => set('mobile', e.target.value)}
                  placeholder="9876543210"
                />
              </div>

              {mode === 'create' && (
                <div className="plat-form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="plat-form-label">Initial Password *</label>
                  <input
                    className="plat-form-input"
                    type="password"
                    required
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    placeholder="Min. 6 characters"
                  />
                </div>
              )}

              <div className="plat-form-group" style={{ gridColumn: 'span 2' }}>
                <label className="plat-form-label">Residential Address</label>
                <input
                  className="plat-form-input"
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                  placeholder="Home address"
                />
              </div>

              <div className="plat-form-group" style={{ gridColumn: 'span 2' }}>
                <label className="plat-form-label">Internal Notes / About</label>
                <textarea
                  className="plat-form-input"
                  value={form.about}
                  onChange={(e) => set('about', e.target.value)}
                  rows={2}
                  placeholder="Additional profile notes..."
                />
              </div>
            </div>
          </div>

          <div className="plat-modal-footer">
            <button type="button" className="plat-btn plat-btn-ghost" onClick={onClose}>
              Discard
            </button>
            <button type="submit" className="plat-btn plat-btn-primary" disabled={isPending}>
              {isPending ? 'Syncing...' : mode === 'create' ? 'Register Manager' : 'Update Manager'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
