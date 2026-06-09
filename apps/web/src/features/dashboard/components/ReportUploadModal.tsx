import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, Upload, FileImage, CheckCircle, Loader2 } from 'lucide-react';
import { useManageClinicalRecords } from '../../medical-case/hooks/use-medical-cases';
import { api } from '../../../lib/api-client';
import '../../patients/styles/patients.css';

interface ReportUploadModalProps {
  regid: number;
  patientName: string;
  onClose: () => void;
}

export function ReportUploadModal({ regid, patientName, onClose }: ReportUploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { saveImage, saveInvestigation } = useManageClinicalRecords();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files).slice(0, 5)); // Max 5 files
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      setFiles(Array.from(e.dataTransfer.files).slice(0, 5));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        
        // Run AI Scan
        const res: any = await api.post('/api/medical-cases/records/investigations/upload', fd);
        const p = res?.parsed;
        
        if (p) {
          // AI successfully extracted data, save as Lab Investigation
          await saveInvestigation.mutateAsync({
            regid,
            type: p.type || 'Specific',
            data: p.data || {},
            investDate: p.date || new Date().toISOString().split('T')[0],
            summary: p.summary || caption || 'Report uploaded by receptionist',
            attachmentUrl: res.attachmentUrl,
          });
        } else {
          // Fallback: AI failed to parse, or not a lab report. Save as generic media image
          const fallbackFd = new FormData();
          fallbackFd.append('regid', String(regid));
          fallbackFd.append('caption', caption || `Report uploaded by receptionist`);
          if (res?.attachmentUrl) {
            fallbackFd.append('picture', res.attachmentUrl);
          } else {
            fallbackFd.append('files', file);
          }
          await saveImage.mutateAsync(fallbackFd);
        }
      }

      setSuccess(true);
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload report. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  return ReactDOM.createPortal(
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-panel">
        {/* Header */}
        <div className="drawer-header">
          <div>
            <h2 className="drawer-title" style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--pp-text-primary)' }}>
              Upload Report / Photo
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--pp-text-muted)' }}>
              Patient: <strong>#{regid}</strong> — {patientName}
            </p>
          </div>
          <button onClick={onClose} className="drawer-close"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="drawer-body" style={{ padding: '20px 24px' }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <CheckCircle size={48} style={{ color: 'var(--pp-success-fg)', marginBottom: '12px' }} />
              <p style={{ fontWeight: 600, fontSize: '15px', color: 'var(--pp-text-primary)' }}>Uploaded & Analysed Successfully!</p>
              <p style={{ fontSize: '12px', color: 'var(--pp-text-muted)' }}>Saved to patient's Labs tab in case history.</p>
            </div>
          ) : (
            <>
              {/* Drop Zone */}
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--pp-border)',
                  borderRadius: '12px',
                  padding: '40px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: 'var(--bg-surface-2)',
                  marginBottom: '24px',
                }}
              >
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'var(--pp-blue-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px'
                }}>
                  <Upload size={24} style={{ color: 'var(--pp-blue)' }} />
                </div>
                <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)', margin: '0 0 4px' }}>
                  Click or drop files here
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                  Images, PDFs, lab reports (max 5 files)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Selected Files */}
              {files.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--pp-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
                    Selected Files ({files.length})
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {files.map((f, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 12px', background: 'var(--pp-bg-subtle)',
                        borderRadius: '8px', fontSize: '12px',
                      }}>
                        <FileImage size={14} style={{ color: 'var(--pp-blue)', flexShrink: 0 }} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                          {f.name}
                        </span>
                        <span style={{ color: 'var(--pp-text-muted)', fontSize: '10px', flexShrink: 0 }}>
                          {(f.size / 1024).toFixed(0)} KB
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--pp-text-muted)' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Caption */}
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label className="drawer-label">Description (optional)</label>
                <input
                  type="text"
                  className="drawer-input"
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="e.g. Blood test report, X-ray, prescription photo..."
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border-main)' }}>
                <button 
                  onClick={onClose} 
                  style={{ 
                    padding: '10px 16px', 
                    border: '1px solid var(--border-main)', 
                    background: 'var(--bg-card)', 
                    borderRadius: '8px', 
                    fontWeight: 600, 
                    cursor: 'pointer',
                    color: 'var(--text-main)',
                    fontSize: '13px'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  className="drawer-submit-btn"
                  disabled={files.length === 0 || uploading}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flex: 1, margin: 0 }}
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {uploading ? 'Analysing & Uploading...' : `Upload & Analyse ${files.length} file${files.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
