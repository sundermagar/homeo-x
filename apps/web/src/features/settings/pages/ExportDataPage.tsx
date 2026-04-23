import React, { useState } from 'react';
import { Download, FileText, Users, CreditCard, Calendar, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

import { useAuthStore } from '@/shared/stores/auth-store';

interface ExportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onExport: () => Promise<void>;
  isExporting: boolean;
}

function ExportCard({ title, description, icon, onExport, isExporting }: ExportCardProps) {
  return (
    <div className="export-card">
      <div className="flex items-center gap-4">
        <div className="export-icon-wrap">
          {icon}
        </div>
        <div>
          <h3 className="export-nav-title">{title}</h3>
          <p className="export-nav-desc">{description}</p>
        </div>
      </div>
      <button
        className="export-btn"
        onClick={onExport}
        disabled={isExporting}
      >
        {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        <span>{isExporting ? 'Generating Report...' : 'Export to CSV'}</span>
      </button>
    </div>
  );
}

export default function ExportDataPage() {
  const [exporting, setExporting] = useState<string | null>(null);
  const { token } = useAuthStore();

  const handleExport = async (type: string, endpoint: string) => {
    if (!token) {
      alert('Authentication session expired. Please log in again.');
      return;
    }

    setExporting(type);
    try {
      // Pass the token as a query parameter since window.location.href doesn't send headers
      window.location.href = `/api/export/${endpoint}?token=${token}`;
      
      // We wait a bit to clear the loading state as the browser handles the download
      await new Promise(r => setTimeout(r, 2000));
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to generate export. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="plat-page fade-in">

      <div className="settings-header">
        <h1 className="settings-title">
          <div className="export-icon-wrap" style={{ width: 36, height: 36, background: 'var(--pp-blue)', color: 'white' }}>
            <Download size={20} />
          </div>
          Clinical Data Archival
        </h1>
        <p className="settings-subtitle">Generate porting-ready CSV archives for clinical and financial auditing.</p>
      </div>

      <div className="export-grid">
        <ExportCard
          title="Patient Registry"
          description="Demographics, contact info, and registration history."
          icon={<Users size={24} />}
          onExport={() => handleExport('Patients', 'patients')}
          isExporting={exporting === 'Patients'}
        />
        <ExportCard
          title="Case History"
          description="Full clinical logs, consultations, and diagnosis data."
          icon={<FileText size={24} />}
          onExport={() => handleExport('Medical Cases', 'cases')}
          isExporting={exporting === 'Medical Cases'}
        />
        <ExportCard
          title="Financial Ledger"
          description="Revenue logs, transaction IDs, and settlement status."
          icon={<CreditCard size={24} />}
          onExport={() => handleExport('Billing', 'billing')}
          isExporting={exporting === 'Billing'}
        />
        <ExportCard
          title="Scheduling Log"
          description="Appointment sequences, cancellations, and visit maps."
          icon={<Calendar size={24} />}
          onExport={() => handleExport('Appointments', 'appointments')}
          isExporting={exporting === 'Appointments'}
        />
      </div>

      <div className="security-box">
        <div style={{ padding: '8px', background: 'var(--pp-success-bg)', color: 'var(--pp-success-fg)', borderRadius: '8px', border: '1px solid var(--pp-success-border)', flexShrink: 0 }}>
          <CheckCircle2 size={24} />
        </div>
        <div>
          <h4 className="font-bold text-[14px]" style={{ color: 'var(--text-main)' }}>Data Privacy & Security</h4>
          <p className="text-[12px] color-muted mt-0.5 leading-relaxed">
            Exported files contain sensitive health information. Ensure you handle these
            downloads according to your clinic's data protection policy.
            All export actions are logged in the system audit trail.
          </p>
        </div>
      </div>
    </div>
  );
}
