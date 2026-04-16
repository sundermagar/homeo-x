import React, { useState } from 'react';
import { Download, FileText, Users, CreditCard, Calendar, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

interface ExportCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onExport: () => Promise<void>;
  isExporting: boolean;
}

function ExportCard({ title, description, icon, onExport, isExporting }: ExportCardProps) {
  return (
    <div className="plat-card p-6 flex flex-col gap-4 hover:shadow-lg transition-all duration-300 border-main">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-soft rounded-xl text-primary border border-main">
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-[15px]">{title}</h3>
          <p className="text-[11px] color-muted leading-tight mt-0.5">{description}</p>
        </div>
      </div>
      <button 
        className="plat-btn plat-btn-primary w-full mt-2" 
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

  const handleExport = async (type: string) => {
    setExporting(type);
    // Simulate export latency
    await new Promise(r => setTimeout(r, 1500));
    alert(`${type} data export triggered. File will be downloaded shortly.`);
    setExporting(null);
  };

  return (
    <div className="plat-page fade-in">
      <div className="mb-2">
        <Link to="/settings" className="settings-back-link">
          <ArrowLeft size={14} />
          Back to Settings
        </Link>
      </div>

      <div className="plat-header mb-8">
        <div>
          <h1 className="plat-header-title">
            <Download size={20} className="color-primary" />
            Clinical Data Archival
          </h1>
          <p className="plat-header-sub">Generate porting-ready CSV archives for clinical and financial auditing.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ExportCard 
          title="Patient Registry"
          description="Demographics, contact info, and registration history."
          icon={<Users size={20} />}
          onExport={() => handleExport('Patients')}
          isExporting={exporting === 'Patients'}
        />
        <ExportCard 
          title="Case History"
          description="Full clinical logs, consultations, and diagnosis data."
          icon={<FileText size={20} />}
          onExport={() => handleExport('Medical Cases')}
          isExporting={exporting === 'Medical Cases'}
        />
        <ExportCard 
          title="Financial Ledger"
          description="Revenue logs, transaction IDs, and settlement status."
          icon={<CreditCard size={20} />}
          onExport={() => handleExport('Billing')}
          isExporting={exporting === 'Billing'}
        />
        <ExportCard 
          title="Scheduling Log"
          description="Appointment sequences, cancellations, and visit maps."
          icon={<Calendar size={20} />}
          onExport={() => handleExport('Appointments')}
          isExporting={exporting === 'Appointments'}
        />
      </div>

      <div className="mt-12 plat-glass-box p-6 rounded-xl border border-main border-dashed flex items-start gap-4">
         <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100">
           <CheckCircle2 size={16} />
         </div>
         <div>
            <h4 className="font-bold text-sm">Data Privacy & Security</h4>
            <p className="text-xs color-muted mt-1 leading-relaxed">
              Exported files contain sensitive health information. Ensure you handle these 
              downloads according to your clinic's data protection policy. 
              All export actions are logged in the system audit trail.
            </p>
         </div>
      </div>
    </div>
  );
}
