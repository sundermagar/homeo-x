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
      <Link to="/settings" className="settings-back-link">
        <ArrowLeft size={14} />
        Back to Settings
      </Link>

      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <Settings2 size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            Medicine Metadata
          </h1>
          <p className="plat-header-sub">Manage standard potencies and dosage frequencies for prescriptions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        
        {/* Potencies Section */}
        <div className="plat-card p-0 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-main bg-main-sub flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
               <Hash size={16} className="color-primary" />
               Potencies
            </h3>
            <span className="text-xs color-muted">{potencies.length} items</span>
          </div>
          
          <div className="p-4 bg-soft border-b border-main">
            <form onSubmit={handleCreatePotency} className="flex gap-2">
               <input 
                 className="plat-form-input flex-1" 
                 placeholder="New Potency (e.g. 30C, 200C)" 
                 value={newPotency}
                 onChange={e => setNewPotency(e.target.value)}
                 disabled={createPotency.isPending}
               />
               <button className="plat-btn plat-btn-primary plat-btn-icon" type="submit" disabled={createPotency.isPending}>
                 <Plus size={16} />
               </button>
            </form>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
             {loadingP ? (
                <div className="p-8 flex justify-center"><RefreshCw size={20} className="animate-spin opacity-30" /></div>
             ) : potencies.length === 0 ? (
                <div className="p-8 text-center text-sm color-muted">No potencies defined</div>
             ) : (
                <div className="divide-y divide-main">
                   {potencies.map((p: any) => (
                      <div key={p.id} className="p-3 px-4 flex items-center justify-between hover:bg-main hover:bg-opacity-50 transition-colors">
                         <span className="font-mono">{p.name}</span>
                         <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger opacity-40 hover:opacity-100" onClick={() => handleDeleteP(p.id, p.name)}>
                           <Trash2 size={14} />
                         </button>
                      </div>
                   ))}
                </div>
             )}
          </div>
        </div>

        {/* Frequencies Section */}
        <div className="plat-card p-0 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-main bg-main-sub flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
               <Activity size={16} className="color-secondary" />
               Prescription Frequencies
            </h3>
            <span className="text-xs color-muted">{frequencies.length} items</span>
          </div>

          <div className="p-4 bg-soft border-b border-main">
            <form onSubmit={handleCreateFreq} className="flex gap-2">
               <input 
                 className="plat-form-input flex-1" 
                 placeholder="New Frequency (e.g. TID, BD, OD)" 
                 value={newFreq}
                 onChange={e => setNewFreq(e.target.value)}
                 disabled={createFreq.isPending}
               />
               <button className="plat-btn plat-btn-primary plat-btn-icon" type="submit" disabled={createFreq.isPending}>
                 <Plus size={16} />
               </button>
            </form>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
             {loadingF ? (
                <div className="p-8 flex justify-center"><RefreshCw size={20} className="animate-spin opacity-30" /></div>
             ) : frequencies.length === 0 ? (
                <div className="p-8 text-center text-sm color-muted">No frequencies defined</div>
             ) : (
                <div className="divide-y divide-main">
                   {frequencies.map((f: any) => (
                      <div key={f.id} className="p-3 px-4 flex items-center justify-between hover:bg-main hover:bg-opacity-50 transition-colors">
                         <span className="font-mono">{f.frequency}</span>
                         <button className="plat-btn plat-btn-sm plat-btn-icon plat-btn-danger opacity-40 hover:opacity-100" onClick={() => handleDeleteF(f.id, f.frequency)}>
                           <Trash2 size={14} />
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
