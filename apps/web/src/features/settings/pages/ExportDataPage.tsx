import React, { useState } from 'react';
import { Download, FileText, Users, CreditCard, Calendar, Loader2, CheckCircle2  } from 'lucide-react';

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
    <div className="plat-card p-6 flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-faded rounded-lg text-primary">
          {icon}
        </div>
        <div>
          <h3 className="font-bold text-lg">{title}</h3>
          <p className="text-sm text-secondary">{description}</p>
        </div>
      </div>
      <button 
        className="plat-btn plat-btn-primary w-full mt-2" 
        onClick={onExport} 
        disabled={isExporting}
      >
        {isExporting ? <Loader2 size={16} className="animate-spin mr-2" /> : <Download size={16} className="mr-2" />}
        {isExporting ? 'Preparing File...' : 'Export to CSV'}
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
    <div className="plat-page animate-fade-in">
      

      <div className="plat-header mb-8">
        <div>
          <h1 className="plat-header-title">
            <Download size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            Export Data
          </h1>
          <p className="plat-header-sub">Generate and download CSV reports for clinical and administrative data.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ExportCard 
          title="Patients Directory"
          description="Basic profile info, contact details, and registration dates."
          icon={<Users size={24} />}
          onExport={() => handleExport('Patients')}
          isExporting={exporting === 'Patients'}
        />
        <ExportCard 
          title="Medical Cases"
          description="Summary of all consultations and visit history."
          icon={<FileText size={24} />}
          onExport={() => handleExport('Medical Cases')}
          isExporting={exporting === 'Medical Cases'}
        />
        <ExportCard 
          title="Billing Records"
          description="Transactions, invoice summaries, and payment status."
          icon={<CreditCard size={24} />}
          onExport={() => handleExport('Billing')}
          isExporting={exporting === 'Billing'}
        />
        <ExportCard 
          title="Appointments"
          description="Historical and future appointment logs."
          icon={<Calendar size={24} />}
          onExport={() => handleExport('Appointments')}
          isExporting={exporting === 'Appointments'}
        />
      </div>

      <div className="mt-12 bg-faded p-6 rounded-xl border border-main border-dashed flex items-start gap-4">
         <CheckCircle2 className="text-success mt-1" size={20} />
         <div>
            <h4 className="font-bold mb-1">Data Privacy Notice</h4>
            <p className="text-sm text-secondary">
               All exported data contains sensitive patient information. Please ensure that exported files 
               are handled securely in compliance with clinic data protection policies.
            </p>
         </div>
      </div>
    </div>
  );
}
