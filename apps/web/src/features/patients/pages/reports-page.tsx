import React, { useRef, useState } from 'react';
import { useAuthStore } from '@/shared/stores/auth-store';
import { useMyMedicalRecords, useManageClinicalRecords } from '@/features/medical-case/hooks/use-medical-cases';
import { useApi } from '@/shared/hooks/use-api';
import { Upload, FileText, Calendar, Activity, Camera, Volume2, Eye, Loader2, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { EmptyState } from '@/components/shared/empty-state';
import '@/features/appointments/styles/appointments.css';

// ─── Utility to extract media type from path ───
const getMediaType = (urlOrPath: string): 'image' | 'video' | 'audio' | 'pdf' | 'other' => {
  if (!urlOrPath) return 'other';
  const pathParts = urlOrPath.toLowerCase().split('?');
  const firstPart = pathParts[0] || '';
  const hashParts = firstPart.split('#');
  const path = hashParts[0] || '';
  if (/\.(jpeg|jpg|gif|png|webp|svg|bmp)$/i.test(path)) return 'image';
  if (/\.(mp4|webm|ogg|mov|mkv|avi|flv|wmv)$/i.test(path)) return 'video';
  if (/\.(mp3|wav|ogg|m4a|aac|flac|wma)$/i.test(path)) return 'audio';
  if (/\.pdf$/i.test(path)) return 'pdf';
  return 'image'; // fallback
};

const getImageUrl = (path: string) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  const envUrl = import.meta.env['VITE_API_URL'];
  if (envUrl) {
    const baseUrl = (envUrl as string).replace(/\/api\/?$/, '');
    return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
  }

  return path.startsWith('/') ? path : '/' + path;
};
export default function ReportsPage() {
  const { user } = useAuthStore();
  const isPatient = user?.type === 'Patient' || (user as any)?.role === 'patient';
  const { data: records, isLoading } = useMyMedicalRecords();
  const api = useApi();
  const { saveInvestigation, saveImage, deleteRecord, deleteImage } = useManageClinicalRecords();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Media upload state
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);

  // Deletion state
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Comparison state
  const [isComparingMode, setIsComparingMode] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<any[]>([]);
  const [showComparisonView, setShowComparisonView] = useState(false);

  const handleDeleteReport = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    setDeletingId(id);
    try {
      await deleteRecord.mutateAsync({ type: 'investigations', id });
      toast({
        title: 'Report deleted',
        description: 'The report has been removed from your record.',
      });
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error.message || 'There was an error deleting your report.',
        variant: 'error',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteMedia = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this media?')) return;
    setDeletingId(id);
    try {
      await deleteImage.mutateAsync(id);
      toast({
        title: 'Media deleted',
        description: 'The media file has been removed from your case history.',
      });
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error.message || 'There was an error deleting your media.',
        variant: 'error',
      });
    } finally {
      setDeletingId(null);
    }
  };


  const investigations = records?.investigations || [];
  const images = records?.images || [];

  const unifiedReports = [
    ...investigations.map((inv: any) => ({ ...inv, _source: 'investigation', _unifiedId: `inv-${inv.id}` })),
    ...images.map((img: any) => ({
      id: img.id,
      _source: 'image',
      _unifiedId: `img-${img.id}`,
      type: img.description || 'Clinical Evidence',
      investDate: img.createdAt || img.recordedAt || img.created_at,
      attachmentUrl: img.picture || img.picturePath || img.picture_path,
      summary: 'Uploaded by clinic',
      data: {}
    }))
  ].sort((a, b) => new Date(b.investDate || 0).getTime() - new Date(a.investDate || 0).getTime());

  const toggleCompareSelect = (inv: any) => {
    if (selectedForComparison.find(i => i._unifiedId === inv._unifiedId)) {
      setSelectedForComparison(prev => prev.filter(i => i._unifiedId !== inv._unifiedId));
    } else {
      if (selectedForComparison.length < 2) {
        setSelectedForComparison(prev => [...prev, inv]);
      } else {
        toast({ title: 'Limit Reached', description: 'You can only compare 2 reports at a time.', variant: 'error' });
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    toast({
      title: 'Uploading report...',
      description: 'Please wait while we process your document.',
    });

    try {
      // 1. Upload file and run OCR
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/medical-cases/records/investigations/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { parsed, attachmentUrl } = res.data.data;

      // 2. Save the investigation
      const payload = {
        // regid is injected by backend for patients
        type: parsed?.type || 'Specific',
        investDate: parsed?.date || new Date().toISOString().split('T')[0],
        attachmentUrl,
        summary: parsed?.summary || 'Patient uploaded report',
        data: parsed?.data || {},
      };

      await saveInvestigation.mutateAsync(payload);

      toast({
        title: 'Report uploaded successfully',
        description: 'Your report has been saved to your clinical record.',
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'There was an error uploading your report.',
        variant: 'error',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleMediaFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingMedia(true);
    toast({
      title: 'Uploading media...',
      description: 'Please wait while we process your file.',
    });

    try {
      const formData = new FormData();
      formData.append('description', 'Patient uploaded media');
      formData.append('files', file);

      await saveImage.mutateAsync(formData);

      toast({
        title: 'Media uploaded successfully',
        description: 'Your media has been added to your case history.',
      });
    } catch (error: any) {
      toast({
        title: 'Upload failed',
        description: error.message || 'There was an error uploading your media.',
        variant: 'error',
      });
    } finally {
      setIsUploadingMedia(false);
      if (mediaFileInputRef.current) {
        mediaFileInputRef.current.value = '';
      }
    }
  };

  // Helper to format values elegantly (e.g. objects, strings)
  const renderDetailValue = (val: any) => {
    if (val === null || val === undefined) return '—';
    if (typeof val === 'object') {
      if (Array.isArray(val)) {
        return val.map(item => typeof item === 'object' ? JSON.stringify(item) : String(item)).join(', ');
      }
      return Object.entries(val)
        .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
        .join(', ');
    }
    return String(val);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your records...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pp-page-container appt-page animate-fade-in">
      {/* Hero Header */}
      <div className="pp-page-hero">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {isPatient && (
            <Link 
              to="/portal/select-track"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--pp-bg-hover)',
                color: 'var(--pp-text-1)',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
              onMouseOut={e => e.currentTarget.style.background = 'var(--pp-bg-hover)'}
            >
              <ArrowLeft size={18} />
            </Link>
          )}
          <div>
            <h1 className="pp-page-title">My Reports</h1>
            <p className="pp-page-subtitle">
              View and upload your lab reports, investigations, and clinical evidence.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {unifiedReports.length > 0 && (
            <button 
              className={`appt-btn ${isComparingMode ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
              onClick={() => {
                if (isComparingMode) {
                  setIsComparingMode(false);
                  setShowComparisonView(false);
                  setSelectedForComparison([]);
                } else {
                  setIsComparingMode(true);
                }
              }}
              style={{ border: '1px solid' }}
            >
              {showComparisonView ? 'Close Comparison' : isComparingMode ? 'Cancel Comparison' : 'Compare Reports'}
            </button>
          )}
          {!isComparingMode && !showComparisonView && (
            <button 
              className="appt-btn appt-btn-primary flex items-center gap-2"
              onClick={handleUploadClick}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
              Upload Report
            </button>
          )}
          {isComparingMode && !showComparisonView && (
            <button 
              className="appt-btn appt-btn-primary flex items-center gap-2"
              disabled={selectedForComparison.length !== 2}
              onClick={() => setShowComparisonView(true)}
            >
              <Eye size={18} />
              View Side-by-Side
            </button>
          )}
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        style={{ display: 'none' }} 
        accept=".pdf,image/*" 
      />

      <div className="pp-page-content">
        {showComparisonView ? (
          <div className="comparison-viewer animate-fade-in" style={{ height: '70vh', display: 'flex', gap: '20px', marginTop: '20px' }}>
            {selectedForComparison.map((inv, idx) => {
              const mediaType = getMediaType(inv.attachmentUrl || '');
              return (
                <div key={inv._unifiedId} style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
                  <div style={{ padding: '12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{inv.type || 'Clinical Document'}</span>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                      {inv.investDate ? format(new Date(inv.investDate), 'dd MMM yyyy') : 'Unknown Date'}
                    </span>
                  </div>
                  <div style={{ flex: 1, background: '#f1f5f9', position: 'relative' }}>
                    {mediaType === 'image' ? (
                      <img src={inv.attachmentUrl} alt="Report" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <iframe src={inv.attachmentUrl} style={{ width: '100%', height: '100%', border: 'none' }} title={`report-${idx}`} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : unifiedReports.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No reports found"
            description="You haven't uploaded any reports yet, and your doctor hasn't shared any with you."
            actionLabel={isUploading ? 'Uploading...' : 'Upload your first report'}
            onAction={handleUploadClick}
            variant="card"
            className="my-8"
          />
        ) : (
          <div className="appt-card-grid">
            {unifiedReports.map((inv: any) => {
              const isSelected = selectedForComparison.some(i => i._unifiedId === inv._unifiedId);
              const resolvedUrl = inv.attachmentUrl ? getImageUrl(inv.attachmentUrl) : '';
              return (
                <div 
                  key={inv._unifiedId} 
                  className={`appt-grid-card-minimal animate-fade-in flex flex-col ${isComparingMode ? 'cursor-pointer hover:border-primary/50' : ''}`}
                  style={{
                    border: isSelected ? '3px solid var(--pp-primary)' : '1px solid var(--border)',
                    boxShadow: isSelected ? '0 0 0 4px var(--pp-primary-tint)' : '0 4px 20px -2px rgba(0,0,0,0.02)',
                    background: isSelected ? 'var(--pp-primary-tint, #f0fdf4)' : '#fff',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => {
                    if (isComparingMode) toggleCompareSelect(inv);
                  }}
                >
                  {/* Card Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      {inv._source === 'image' ? <Camera size={20} /> : <Activity size={20} />}
                    </div>
                    <div>
                      <div className="font-bold text-base text-foreground">
                        {inv.type || 'Clinical Document'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {inv._source === 'image' ? 'Media File' : 'Report'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border/40">
                    <Calendar size={13} className="mr-1.5 text-primary" />
                    {inv.investDate || inv.dateval ? format(new Date(inv.investDate || inv.dateval), 'dd MMM yyyy') : 'Unknown'}
                  </div>
                </div>

                {/* Card Body */}
                <div className="appt-grid-card-body-minimal flex-grow">
                  {inv.summary && (
                    <div className="text-sm text-foreground/80 leading-relaxed py-1 mb-2">
                      <span className="font-bold text-[10px] text-muted-foreground uppercase tracking-widest block mb-1">
                        Summary
                      </span>
                      <p className="font-medium text-foreground/90">{inv.summary}</p>
                    </div>
                  )}

                  {inv.data && typeof inv.data === 'object' && Object.keys(inv.data).length > 0 ? (
                    Object.entries(inv.data).slice(0, 4).map(([key, val]) => (
                      <div key={key} className="appt-grid-detail-item">
                        <span className="label capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="value text-right">{renderDetailValue(val)}</span>
                      </div>
                    ))
                  ) : null}

                </div>

                {/* Card Actions */}
                {!isComparingMode && (
                  <div className="appt-grid-card-actions-minimal mt-auto flex gap-2 w-full pt-4">
                    {resolvedUrl && (
                      <button 
                        className="appt-btn flex-1 flex items-center justify-center gap-2"
                        onClick={(e) => { e.stopPropagation(); window.open(resolvedUrl, '_blank'); }}
                      >
                        <FileText size={14} />
                        View
                      </button>
                    )}
                    <button 
                      className="appt-btn appt-btn-danger flex-1 flex items-center justify-center gap-2"
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (inv._source === 'image') {
                          handleDeleteMedia(inv.id);
                        } else {
                          handleDeleteReport(inv.id);
                        }
                      }}
                      disabled={deletingId === inv.id}
                    >
                      <Trash2 size={14} />
                      {deletingId === inv.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                )}
                
                {isComparingMode && (
                  <div className="mt-auto pt-4 flex justify-center">
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', 
                      border: `2px solid ${isSelected ? 'var(--pp-primary)' : '#cbd5e1'}`,
                      background: isSelected ? 'var(--pp-primary)' : '#f8fafc',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}>
                      {isSelected && <div style={{ width: '12px', height: '12px', background: '#fff', borderRadius: '50%' }} />}
                    </div>
                  </div>
                )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
