import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FlaskConical, CloudUpload } from 'lucide-react';

export function PatientLabReports() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      alert(`Selected file: ${file.name}. \n\n(Backend upload functionality will be added here soon)`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', background: '#f5f3ef', zIndex: 50 }}>
      {/* Top App Bar */}
      <div style={{ flexShrink: 0, zIndex: 10, display: 'flex', alignItems: 'center', padding: '16px', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <button 
          onClick={() => navigate(-1)} 
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#1e293b' }}
        >
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 600, color: '#000000', fontSize: '1rem', marginRight: '20px' }}>
          My Lab Reports
        </div>
      </div>

      {/* Main Content - Empty State */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <FlaskConical size={36} color="#475569" strokeWidth={1.5} />
        <div style={{ fontSize: '0.85rem', color: '#333333', fontWeight: 500 }}>
          No reports uploaded yet
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end' }}>
        
        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept="image/*,application/pdf"
          onChange={handleFileUpload}
        />
        
        {/* Upload Button */}
        <button 
          onClick={() => fileInputRef.current?.click()}
          style={{ background: 'var(--primary)', border: 'none', borderRadius: '12px', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
        >
          <CloudUpload size={18} />
          Upload report
        </button>
      </div>
    </div>
  );
}

export default PatientLabReports;
