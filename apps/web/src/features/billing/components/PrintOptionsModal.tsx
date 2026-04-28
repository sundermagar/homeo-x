import { X, Printer, FileText, Package, Layout } from 'lucide-react';
import type { BillWithPatient } from '@mmc/types';

interface PrintOptionsModalProps {
  bill: BillWithPatient;
  onClose: () => void;
  onPrint: (template: 'standard' | 'pharmacy' | 'package' | 'comprehensive') => void;
}

export function PrintOptionsModal({ bill, onClose, onPrint }: PrintOptionsModalProps) {
  return (
    <div className="plat-modal-overlay" style={{ zIndex: 9999 }}>
      <div className="plat-modal-content animate-fade-in" style={{ maxWidth: '480px', padding: 0, overflow: 'hidden', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>Print Options</h2>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: '#f8fafc',
              color: '#64748b',
              cursor: 'pointer',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Active Record Summary */}
        <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #f0f7ff 0%, #e0f2fe 100%)', borderBottom: '1px solid #bae6fd' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Active Record Summary</div>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#0c4a6e' }}>{bill.patientName}</div>
          <div style={{ fontSize: '12px', color: '#0369a1', marginTop: '4px', opacity: 0.8, fontWeight: 500 }}>Bill No: #{bill.billNo} • Amount: ₹{bill.charges.toLocaleString()}</div>
        </div>

        {/* Options List */}
        <div style={{ padding: '24px', display: 'grid', gap: '12px', background: '#fff' }}>
          <PrintOption
            icon={<FileText size={18} />}
            title="Standard Receipt"
            desc="Professional bill with clinic branding"
            onClick={() => onPrint('standard')}
          />
          <PrintOption
            icon={<Printer size={18} />}
            title="Pharmacy Layout"
            desc="Optimized for medicine and stock items"
            onClick={() => onPrint('pharmacy')}
          />
          <PrintOption
            icon={<Package size={18} />}
            title="Package Invoice"
            desc="Summary of treatment plans and bundles"
            onClick={() => onPrint('package')}
          />
          <PrintOption
            icon={<Layout size={18} />}
            title="Full Statement"
            desc="Detailed clinical history and payments"
            onClick={() => onPrint('comprehensive')}
          />
        </div>

        {/* Footer Padding */}
        <div style={{ height: '8px', background: '#fff' }} />
      </div>
    </div>
  );
}

function PrintOption({ icon, title, desc, onClick }: { icon: React.ReactNode, title: string, desc: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="print-option-btn"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        width: '100%',
        padding: '14px 16px',
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{
        width: '42px',
        height: '42px',
        borderRadius: '10px',
        background: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b',
        border: '1px solid #f1f5f9',
        transition: 'all 0.2s'
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{title}</div>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>{desc}</div>
      </div>
      <style>{`
        .print-option-btn:hover {
          background: #f0f7ff !important;
          border-color: #3b82f6 !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px -6px rgba(59, 130, 246, 0.15);
        }
        .print-option-btn:hover div:first-child {
          background: #fff !important;
          color: #3b82f6 !important;
          border-color: #bfdbfe !important;
          box-shadow: 0 4px 6px rgba(59, 130, 246, 0.05);
        }
        .print-option-btn:active {
          transform: translateY(0);
          background: #e0f2fe !important;
        }
      `}</style>
    </button>
  );
}
