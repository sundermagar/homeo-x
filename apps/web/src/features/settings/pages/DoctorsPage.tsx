import React, { useState } from 'react';
import { Stethoscope, Plus, Edit2, Trash2, RefreshCw, ArrowLeft, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAccounts, useDeleteAccount } from '../../platform/hooks/use-accounts';
import { useOrganizations } from '../../platform/hooks/use-organizations';
import { AccountModal } from '../../platform/components/AccountModal';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

export default function DoctorsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>();
  const [search, setSearch] = useState('');

  // Filter by 'Doctor' role specifically
  const { data: doctors = [], isLoading } = useAccounts(undefined, 'Doctor');
  const { data: orgs = [] } = useOrganizations();
  const deleteAccount = useDeleteAccount();

  const filteredDoctors = doctors.filter((doc: any) =>
    doc.name?.toLowerCase().includes(search.toLowerCase()) ||
    doc.email?.toLowerCase().includes(search.toLowerCase()) ||
    doc.mobile?.toLowerCase().includes(search.toLowerCase()) ||
    doc.designation?.toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setEditing(undefined); setModalOpen(true); };
  const openEdit   = (d: any) => { setEditing(d); setModalOpen(true); };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Remove "${name}" from the Doctors Directory?`)) return;
    await deleteAccount.mutateAsync(id);
  };

  return (
    <div className="plat-page fade-in">
      <Link to="/settings" className="settings-back-link">
        <ArrowLeft size={14} />
        Back to Settings
      </Link>

      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <Stethoscope size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            Doctors Directory
          </h1>
          <p className="plat-header-sub">Manage clinical staff, specializations, and clinic assignments.</p>
        </div>
        <div className="plat-header-actions">
          <button className="plat-btn plat-btn-primary" onClick={openCreate}>
            <Plus size={14} strokeWidth={1.6} />
            Add New Doctor
          </button>
        </div>
      </div>

      <div className="plat-card">
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-main)' }}>
          <input
            className="plat-form-input"
            style={{ maxWidth: '280px' }}
            placeholder="Search doctors..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="plat-empty">
            <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', opacity: 0.3 }} />
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="plat-empty">
            <Stethoscope size={28} className="plat-empty-icon" />
            <p className="plat-empty-text">No doctors found in the directory.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="plat-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>Name</th>
                  <th>Contact Information</th>
                  <th>Clinic</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.map((doc: any, idx: number) => (
                  <tr key={doc.id}>
                    <td className="font-mono text-xs color-muted">{idx + 1}</td>
                    <td>
                      <div className="font-semibold">{doc.name}</div>
                      <div className="text-xs color-muted">{doc.designation || 'General Physician'}</div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        {doc.email && <div className="text-xs flex items-center gap-1.5"><Mail size={12} className="color-muted" /> {doc.email}</div>}
                        {doc.mobile && (
                          <div className="text-xs flex items-center gap-1.5 font-mono">
                            <Phone size={12} className="color-muted" /> {doc.mobile}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="text-secondary">
                      {orgs.find((o: any) => o.id === doc.clinicId)?.name || 'Multi-clinic Access'}
                    </td>
                    <td>
                      <div className="flex gap-3">
                        <button className="plat-btn plat-btn-sm plat-btn-icon" onClick={() => openEdit(doc)}>
                          <Edit2 size={13} />
                        </button>
                        <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger" onClick={() => handleDelete(doc.id, doc.name)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <AccountModal
          mode={editing ? 'edit' : 'create'}
          account={editing}
          organizations={orgs}
          onClose={() => { setModalOpen(false); setEditing(undefined); }}
        />
      )}
    </div>
  );
}
