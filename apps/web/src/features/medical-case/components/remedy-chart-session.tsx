import React, { useState, useMemo } from 'react';
import { 
  Search, BookOpen, ChevronRight, Activity, 
  FlaskConical, Save, Trash2, Calendar, FileText
} from 'lucide-react';
import { 
  useAlphabetIndex, 
  useRemedyLookups, 
  useRemedyAlternatives,
  usePatientPrescriptions,
  useSavePrescription,
  useDeletePrescription,
  useTreeByLetter,
  RemedyTreeNode,
  PrescriptionRow
} from '../hooks/use-remedy-chart';

import '../styles/medical-case.css';

export function RemedyChartSession({ regid }: { regid?: number }) {
  // Queries
  const { data: alphabetData, isLoading: loadingTree } = useAlphabetIndex();
  const { data: lookups } = useRemedyLookups();
  const { data: history } = usePatientPrescriptions(regid || 0);
  
  // State
  const [activeLetter, setActiveLetter] = useState('A');
  const [selectedNode, setSelectedNode] = useState<RemedyTreeNode | null>(null);
  
  // Form State
  const [form, setForm] = useState({
    remedyName: '',
    potencyName: '',
    frequencyName: '',
    days: 3,
    instructions: '',
    notes: ''
  });
 
  // Derived Queries
  const { data: filteredTree } = useTreeByLetter(activeLetter);
  const { data: alternatives } = useRemedyAlternatives(selectedNode?.id || null);
  
  // Mutations
  const saveMutation = useSavePrescription();
  const deleteMutation = useDeletePrescription(regid ?? 0);

  // Handlers
  const handleNodeClick = (node: RemedyTreeNode) => {
    setSelectedNode(node);
    if (node.nodeType === 'REMEDY' || node.nodeType === 'RUBRIC') {
      const cleanName = node.label.replace(/\(.*?\)/, '').trim();
      if (cleanName.length < 25) {
        setForm(prev => ({ ...prev, remedyName: cleanName }));
      }
    }
  };

  const handleAltClick = (alt: { remedy: string, potency: string | null }) => {
    setForm(prev => ({ 
      ...prev, 
      remedyName: alt.remedy,
      potencyName: alt.potency || prev.potencyName 
    }));
  };

  const handleSave = async () => {
    if (!regid) return alert('Cannot save: No active patient session.');
    if (!form.remedyName) return alert('Please enter a remedy name');
    
    await saveMutation.mutateAsync({
      regid,
      ...form
    });
    
    setForm({
      remedyName: '',
      potencyName: '',
      frequencyName: '',
      days: 3,
      instructions: '',
      notes: ''
    });
  };

  const handleDelete = async (id: number) => {
    if (!regid) return;
    if (window.confirm('Delete this prescription?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="mc-remedy-session-grid">
      
      {/* ─── Panel 1: Materia Medica Browser ─── */}
      <div className="mc-remedy-panel-left">
        <div className="mc-count" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen strokeWidth={2} size={14} />
          Materia Medica Browser
        </div>
        
        {/* A-Z Strip */}
        <div className="mc-alphabet-index">
          {alphabetData?.map(group => (
            <button 
              key={group.letter}
              onClick={() => setActiveLetter(group.letter)}
              className={`mc-alphabet-btn ${activeLetter === group.letter ? 'active' : ''}`}
            >
              {group.letter}
            </button>
          ))}
        </div>

        {/* Tree List */}
        <div style={{ flex: 1, overflowY: 'auto', marginTop: '12px', paddingRight: '4px' }}>
          {loadingTree ? (
            <div className="mc-loading">Loading list...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredTree?.[0]?.nodes.map(node => (
                <div 
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: selectedNode?.id === node.id ? 'var(--primary-tint)' : 'transparent',
                    color: selectedNode?.id === node.id ? 'var(--primary)' : 'var(--text-main)',
                    fontWeight: selectedNode?.id === node.id ? 700 : 500,
                    fontSize: '0.85rem',
                    transition: 'all 150ms',
                    border: selectedNode?.id === node.id ? '1px solid var(--primary-border)' : '1px solid transparent'
                  }}
                >
                  {node.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Panel 2: Clinical Prescription Form ─── */}
      <div className="mc-remedy-panel-center">
        
        {/* Context Header: Rubric Details */}
        {selectedNode && (
          <div style={{ padding: '16px', background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border-main)', marginBottom: '20px' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Selected Rubric: {selectedNode.label}
            </div>
            
            {alternatives && alternatives.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {alternatives.map(alt => (
                  <button
                    key={alt.id}
                    onClick={() => handleAltClick(alt)}
                    className="mc-alphabet-btn"
                    style={{ width: 'auto', height: 'auto', padding: '5px 12px', fontSize: '0.75rem', borderRadius: '100px' }}
                  >
                    {alt.remedy} {alt.potency && <span style={{ opacity: 0.6 }}>({alt.potency})</span>}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No AI alternatives mapped for this rubric.</div>
            )}
          </div>
        )}

        {/* Prescription Input Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', background: 'white', border: '1px solid var(--border-main)', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
          <div className="mc-page-title" style={{ fontSize: '1rem' }}>
            <FileText size={18} style={{ color: 'var(--primary)' }} />
            New Prescription Row
          </div>
          
          <div className="mc-input-group">
            <label>Remedy Name</label>
            <div className="mc-input-wrap">
              <input 
                type="text" 
                placeholder="Start typing medicine name..." 
                className="mc-search-input"
                style={{ paddingLeft: '12px' }}
                value={form.remedyName} 
                onChange={e => setForm({...form, remedyName: e.target.value})}
                list="medicines-list"
              />
              <datalist id="medicines-list">
                {lookups?.medicines.map(m => <option key={m.id} value={m.name} />)}
              </datalist>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="mc-input-group">
              <label>Potency</label>
              <input 
                type="text" 
                placeholder="30C" 
                className="mc-search-input"
                style={{ paddingLeft: '12px' }}
                value={form.potencyName} 
                onChange={e => setForm({...form, potencyName: e.target.value})}
                list="potencies-list"
              />
              <datalist id="potencies-list">
                {lookups?.potencies.map(p => <option key={p.id} value={p.name} />)}
              </datalist>
            </div>
            
            <div className="mc-input-group">
              <label>Frequency</label>
              <input 
                type="text" 
                placeholder="TDS" 
                className="mc-search-input"
                style={{ paddingLeft: '12px' }}
                value={form.frequencyName} 
                onChange={e => setForm({...form, frequencyName: e.target.value})}
                list="freqs-list"
              />
              <datalist id="freqs-list">
                {lookups?.frequencies.map(f => <option key={f.id} value={f.name} />)}
              </datalist>
            </div>
          </div>

          <div className="mc-input-group">
            <label>Duration & Instructions</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input 
                type="number" 
                className="mc-search-input" 
                style={{ width: '80px', paddingLeft: '12px' }}
                value={form.days} 
                onChange={e => setForm({...form, days: parseInt(e.target.value) || 0})}
              />
              <input 
                 type="text"
                 placeholder="Special instructions..."
                 className="mc-search-input"
                 style={{ flex: 1, paddingLeft: '12px' }}
                 value={form.instructions}
                 onChange={e => setForm({...form, instructions: e.target.value})}
              />
            </div>
          </div>

          <button 
            className="mc-btn-primary" 
            style={{ width: '100%', padding: '12px', borderRadius: '12px' }}
            onClick={handleSave}
            disabled={!regid || saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : <><FlaskConical size={18} /> Add to History</>}
          </button>
        </div>
      </div>

      {/* ─── Panel 3: Session Records ─── */}
      <div className="mc-remedy-panel-right">
        <div className="mc-count" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity strokeWidth={2} size={14} />
          Current Session Context
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
          {!regid ? (
            <div className="mc-wip">
              <Activity size={32} style={{ color: 'var(--text-placeholder)' }} className="pulse-icon" />
              <div className="mc-wip-title" style={{ fontSize: '0.85rem' }}>No Active Session</div>
            </div>
          ) : (
            <>
              {history?.map((rx: PrescriptionRow) => (
                <div key={rx.id} className="mc-rx-item" style={{ padding: '12px', background: 'var(--bg-surface-2)', borderRadius: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div className="mc-rx-name" style={{ fontSize: '0.85rem' }}>
                      {rx.remedy_name} {rx.potency_name && `(${rx.potency_name})`}
                    </div>
                    <div className="mc-rx-detail" style={{ fontSize: '0.72rem' }}>
                      {rx.frequency_name} • {rx.days} days
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(rx.id)}
                    className="mc-row-arrow"
                    style={{ color: 'var(--danger)', padding: '6px' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {history?.length === 0 && (
                <div className="mc-wip-text" style={{ textAlign: 'center', padding: '20px', opacity: 0.6 }}>
                  Start adding remedies to build the clinical record.
                </div>
              )}
            </>
          )}
        </div>
      </div>

    </div>
  );
}
