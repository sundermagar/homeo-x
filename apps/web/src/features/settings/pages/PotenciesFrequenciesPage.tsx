import React, { useState } from 'react';
import { Settings2, Plus, ArrowLeft, Trash2, Hash, Activity, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  usePotencies, useCreatePotency, useDeletePotency,
  useFrequencies, useCreateFrequency, useDeleteFrequency
} from '../hooks/use-settings';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

export default function PotenciesFrequenciesPage() {
  const { data: potencies = [], isLoading: loadingP } = usePotencies();
  const { data: frequencies = [], isLoading: loadingF } = useFrequencies();

  const createPotency = useCreatePotency();
  const deletePotency = useDeletePotency();
  const createFreq = useCreateFrequency();
  const deleteFreq = useDeleteFrequency();

  const [newPotency, setNewPotency] = useState('');
  const [newFreq, setNewFreq] = useState('');

  const handleCreatePotency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPotency.trim()) return;
    await createPotency.mutateAsync({ name: newPotency });
    setNewPotency('');
  };

  const handleCreateFreq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFreq.trim()) return;
    await createFreq.mutateAsync({ frequency: newFreq });
    setNewFreq('');
  };

  const handleDeleteP = (id: number, name: string) => {
    if (confirm(`Delete potency "${name}"?`)) deletePotency.mutate(id);
  };

  const handleDeleteF = (id: number, name: string) => {
    if (confirm(`Delete frequency "${name}"?`)) deleteFreq.mutate(id);
  };

  return (
    <div className="plat-page fade-in">


      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <Settings2 size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            Medicine Metadata
          </h1>
          <p className="plat-header-sub">Manage standard potencies and dosage frequencies for prescriptions.</p>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <p className="plat-stat-label">Total Potencies</p>
          <p className="plat-stat-value plat-stat-value-primary">{potencies.length}</p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Dosage Frequencies</p>
          <p className="plat-stat-value plat-stat-value-secondary">{frequencies.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">

        {/* Potencies Section */}
        <div className="plat-card overflow-hidden flex flex-col">
          <div className="p-5 border-b border-main bg-main-sub flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2" style={{ fontSize: '0.9rem' }}>
              <Hash size={18} className="color-primary" />
              Potencies
            </h3>
            <span className="plat-badge plat-badge-default">{potencies.length} items</span>
          </div>

          <div className="p-5 bg-soft border-b border-main">
            <form onSubmit={handleCreatePotency} className="flex gap-2">
              <input
                className="plat-form-input flex-1"
                placeholder="New Potency (e.g. 30C)"
                value={newPotency}
                onChange={e => setNewPotency(e.target.value)}
                disabled={createPotency.isPending}
              />
              <button className="plat-btn plat-btn-primary plat-btn-icon" type="submit" disabled={createPotency.isPending || !newPotency.trim()}>
                <Plus size={16} />
              </button>
            </form>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            {loadingP ? (
              <div className="p-12 flex justify-center"><RefreshCw size={24} className="animate-spin opacity-20" /></div>
            ) : potencies.length === 0 ? (
              <div className="p-12 text-center text-sm color-muted">No potencies defined yet</div>
            ) : (
              <div className="divide-y divide-main">
                {potencies.map((p: any) => (
                  <div key={p.id} className="p-4 px-6 flex items-center justify-between hover:bg-main hover:bg-opacity-40 transition-colors group">
                    <span className="font-mono font-bold text-sm color-ink">{p.name}</span>
                    <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-ghost-danger opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteP(p.id, p.name)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Frequencies Section */}
        <div className="plat-card overflow-hidden flex flex-col">
          <div className="p-5 border-b border-main bg-main-sub flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2" style={{ fontSize: '0.9rem' }}>
              <Activity size={18} className="color-secondary" />
              Prescription Frequencies
            </h3>
            <span className="plat-badge plat-badge-default">{frequencies.length} items</span>
          </div>

          <div className="p-5 bg-soft border-b border-main">
            <form onSubmit={handleCreateFreq} className="flex gap-2">
              <input
                className="plat-form-input flex-1"
                placeholder="New Frequency (e.g. TID)"
                value={newFreq}
                onChange={e => setNewFreq(e.target.value)}
                disabled={createFreq.isPending}
              />
              <button className="plat-btn plat-btn-primary plat-btn-icon" type="submit" disabled={createFreq.isPending || !newFreq.trim()}>
                <Plus size={16} />
              </button>
            </form>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            {loadingF ? (
              <div className="p-12 flex justify-center"><RefreshCw size={24} className="animate-spin opacity-20" /></div>
            ) : frequencies.length === 0 ? (
              <div className="p-12 text-center text-sm color-muted">No frequencies defined yet</div>
            ) : (
              <div className="divide-y divide-main">
                {frequencies.map((f: any) => (
                  <div key={f.id} className="p-4 px-6 flex items-center justify-between hover:bg-main hover:bg-opacity-40 transition-colors group">
                    <span className="font-mono font-bold text-sm color-ink">{f.frequency}</span>
                    <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-ghost-danger opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteF(f.id, f.frequency)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
