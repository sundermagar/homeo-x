import React from 'react';
import { Plus, Home, Truck, Package, Activity } from 'lucide-react';
import { SearchableSelect } from './searchable-select';
import { RxForm } from '../hooks/use-prescription-workflow';

export function QuickRxForm({
  form,
  setForm,
  lookups,
  delivery,
  setDelivery,
  isRxToday,
  editingId,
  firstRxOfToday,
  startNewRx,
  setManualInstruction,
  dayOptions,
  selectedDayCharge
}: {
  form: RxForm;
  setForm: (f: RxForm) => void;
  lookups: any;
  delivery: string;
  setDelivery: (d: string) => void;
  isRxToday: boolean;
  editingId: number | null;
  firstRxOfToday: any;
  startNewRx: () => void;
  setManualInstruction: (val: boolean) => void;
  dayOptions: string[];
  selectedDayCharge: any;
}) {
  // Banner removed as requested by user

  if (!editingId) {
    return (
      <button 
        onClick={startNewRx}
        style={{ 
          width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--pp-blue-border)',
          background: 'var(--pp-blue-faded)', color: 'var(--pp-blue)', fontWeight: 800, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
        }}
      >
        <Activity size={18} /> Start New Prescription
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pp-text-3)' }}>Remedy</label>
        <SearchableSelect
          value={form.remedyName}
          onChange={val => {
            setManualInstruction(false);
            setForm({ ...form, remedyName: val });
          }}
          options={lookups?.medicines?.map((m: any) => m.name) || []}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pp-text-3)' }}>Delivery</label>
          <div style={{ position: 'relative' }}>
            <select
              value={delivery}
              onChange={(e) => setDelivery(e.target.value)}
              style={{
                width: '100%', padding: '6px 8px 6px 30px', borderRadius: '4px',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                appearance: 'none', background: 'var(--bg-card)',
                border: '1px solid var(--border-main)', color: 'var(--pp-ink)',
                outline: 'none', minHeight: '30px'
              }}
            >
              <option value="clinic">Clinic</option>
              <option value="courier">Courier</option>
              <option value="pickup">Pickup</option>
            </select>
            <div style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--pp-blue)', pointerEvents: 'none', display: 'flex' }}>
              {delivery === 'clinic' && <Home size={14} />}
              {delivery === 'courier' && <Truck size={14} />}
              {delivery === 'pickup' && <Package size={14} />}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pp-text-3)' }}>Potency</label>
          <SearchableSelect
            value={form.potencyName}
            onChange={val => {
              setManualInstruction(false);
              setForm({ ...form, potencyName: val });
            }}
            options={lookups?.potencies?.map((p: any) => p.name) || []}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pp-text-3)' }}>Frequency</label>
          <SearchableSelect
            value={form.frequencyName}
            onChange={val => {
              setManualInstruction(false);
              setForm({ ...form, frequencyName: val });
            }}
            options={lookups?.frequencies?.map((f: any) => f.name) || []}
          />
        </div>

        {(!isRxToday || (editingId && firstRxOfToday && editingId === firstRxOfToday.id)) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pp-text-3)' }}>Days</label>
            <SearchableSelect
              value={form.days ? String(form.days) : ''}
              onChange={val => {
                setManualInstruction(false);
                setForm({ ...form, days: parseInt(val) || 0 });
              }}
              options={dayOptions}
              placeholder="Select"
            />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pp-text-3)' }}>Instructions</label>
        <textarea
          placeholder="Manual instructions..."
          style={{ 
            width: '100%', padding: '8px 12px', border: '1px solid var(--border-main)', 
            borderRadius: '8px', fontSize: '0.85rem', minHeight: '60px', 
            resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', 
            background: 'var(--bg-card)', color: 'var(--pp-ink)' 
          }}
          value={form.instructions}
          onChange={e => {
            setManualInstruction(true);
            setForm({ ...form, instructions: e.target.value });
          }}
        />
      </div>
      
      <div style={{ fontSize: '0.65rem', color: 'var(--pp-text-3)', fontStyle: 'italic', textAlign: 'right' }}>
        Auto-saving changes...
      </div>
    </div>
  );
}
