import React, { useRef, useState } from 'react';
import { useAuthStore } from '@/shared/stores/auth-store';
import { useMyMedicalRecords, useManageClinicalRecords } from '@/features/medical-case/hooks/use-medical-cases';
import { useApi } from '@/shared/hooks/use-api';
import { Upload, FileText, Calendar, Activity, Camera, Volume2, Eye, Loader2, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
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
  const { data: records, isLoading } = useMyMedicalRecords();
  const api = useApi();
  const { saveInvestigation, saveImage, deleteRecord, deleteImage } = useManageClinicalRecords();
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'reports' | 'media'>('reports');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Media upload state
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const mediaFileInputRef = useRef<HTMLInputElement>(null);

  // Deletion state
  const [deletingId, setDeletingId] = useState<number | null>(null);

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
        <div>
          <h1 className="pp-page-hero-title">
            <Activity size={22} strokeWidth={1.8} />
            {activeTab === 'reports' ? 'My Reports' : 'My Clinical Media'}
          </h1>
          <p className="pp-page-hero-sub">
            {activeTab === 'reports' 
              ? 'View and upload your lab reports and investigations.' 
              : 'View and upload clinical evidence, images, and audio/video records.'}
          </p>
        </div>
        <div className="pp-page-hero-actions">
          {activeTab === 'reports' ? (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,image/*"
              />
              <button 
                className="btn-primary flex items-center gap-2"
                onClick={handleUploadClick} 
                disabled={isUploading}
              >
                <Upload size={14} strokeWidth={1.6} />
                {isUploading ? 'Uploading...' : 'Upload Report'}
              </button>
            </>
          ) : (
            <>
              <input
                type="file"
                ref={mediaFileInputRef}
                onChange={handleMediaFileChange}
                className="hidden"
                accept="image/*,video/*,audio/*,application/pdf"
              />
              <button 
                className="btn-primary flex items-center gap-2"
                onClick={() => mediaFileInputRef.current?.click()} 
                disabled={isUploadingMedia}
              >
                <Upload size={14} strokeWidth={1.6} />
                {isUploadingMedia ? 'Uploading...' : 'Upload Media'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="appt-tabs mb-6">
        <button
          className={`appt-tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          Reports
        </button>
        <button
          className={`appt-tab ${activeTab === 'media' ? 'active' : ''}`}
          onClick={() => setActiveTab('media')}
        >
          Media
        </button>
      </div>

      {/* Reports Tab Content */}
      {activeTab === 'reports' && (
        investigations.length === 0 ? (
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
            {investigations.map((inv: any) => (
              <div key={inv.id} className="appt-grid-card-minimal animate-fade-in">
                {/* Card Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Activity size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-base text-foreground">
                        {inv.type || 'Investigation'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Report ID: #{inv.id}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border/40">
                    <Calendar size={13} className="mr-1.5 text-primary" />
                    {inv.investDate || inv.dateval ? format(new Date(inv.investDate || inv.dateval), 'dd MMM yyyy') : 'Unknown'}
                  </div>
                </div>

                {/* Card Body */}
                <div className="appt-grid-card-body-minimal">
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
                  ) : (
                    Object.keys(inv)
                      .filter((k) => !['id', 'regid', 'createdAt', 'updatedAt', 'deletedAt', 'type', 'dateval', 'investDate', 'attachmentUrl', 'summary', 'data', 'visitId', 'visitid'].includes(k))
                      .slice(0, 4)
                      .map((k) => (
                        <div key={k} className="appt-grid-detail-item">
                          <span className="label capitalize">{k.replace(/_/g, ' ')}</span>
                          <span className="value text-right">{renderDetailValue(inv[k])}</span>
                        </div>
                      ))
                  )}

                  {inv.visitId && (
                    <div className="appt-grid-detail-item">
                      <span className="label">Visit ID</span>
                      <span className="value">#{inv.visitId}</span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="appt-grid-card-actions-minimal mt-auto flex gap-2 w-full">
                  {inv.attachmentUrl && (
                    <button 
                      className="appt-btn flex-1 flex items-center justify-center gap-2"
                      onClick={() => window.open(inv.attachmentUrl, '_blank')}
                    >
                      <FileText size={14} />
                      View
                    </button>
                  )}
                  <button 
                    className="appt-btn appt-btn-danger flex-1 flex items-center justify-center gap-2"
                    onClick={() => handleDeleteReport(inv.id)}
                    disabled={deletingId === inv.id}
                  >
                    <Trash2 size={14} />
                    {deletingId === inv.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Media Tab Content */}
      {activeTab === 'media' && (
        images.length === 0 ? (
          <EmptyState
            icon={Camera}
            title="No media files found"
            description="You haven't uploaded any clinical media yet, and your doctor hasn't shared any with you."
            actionLabel={isUploadingMedia ? 'Uploading...' : 'Upload your first media'}
            onAction={() => mediaFileInputRef.current?.click()}
            variant="card"
            className="my-8"
          />
        ) : (
          <div className="appt-card-grid">
            {images.map((img: any) => {
              const imagePath = img.picture || img.picturePath || img.picture_path;
              const timestamp = img.createdAt || img.created_at || img.recordedAt || img.recorded_at;
              const resolvedUrl = imagePath ? getImageUrl(imagePath) : '';
              const mediaType = getMediaType(imagePath || '');

              return (
                <div key={img.id} className="appt-grid-card-minimal animate-fade-in flex flex-col">
                  {/* Media Preview Container */}
                  <div className="relative rounded-xl overflow-hidden bg-muted/40 border border-border/50 flex items-center justify-center w-full aspect-video mb-4">
                    {resolvedUrl ? (
                      <>
                        {mediaType === 'image' && (
                          <div className="w-full h-full relative group cursor-pointer" onClick={() => window.open(resolvedUrl, '_blank')}>
                            <img
                              src={resolvedUrl}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              alt={img.description || 'Clinical Media'}
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                              <Eye size={20} />
                            </div>
                          </div>
                        )}
                        {mediaType === 'video' && (
                          <video
                            src={resolvedUrl}
                            controls
                            className="w-full h-full object-contain bg-black"
                          />
                        )}
                        {mediaType === 'audio' && (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-primary/5">
                            <Volume2 size={32} className="text-primary mb-2 animate-pulse" />
                            <audio src={resolvedUrl} controls className="w-full max-w-[240px]" />
                          </div>
                        )}
                        {mediaType === 'pdf' && (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-muted/60">
                            <FileText size={32} className="text-destructive mb-2" />
                            <span className="text-xs font-semibold mb-2 text-foreground">PDF Document</span>
                            <button
                              onClick={() => window.open(resolvedUrl, '_blank')}
                              className="appt-btn flex items-center gap-1.5 text-xs py-1 px-3"
                            >
                              <FileText size={12} />
                              View PDF
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center text-muted-foreground p-4">
                        <Camera size={24} className="mx-auto mb-1.5 opacity-40" />
                        <div className="text-xs">Media unavailable</div>
                      </div>
                    )}
                  </div>

                  {/* Card Header & Description */}
                  <div className="flex flex-col flex-grow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {mediaType}
                      </span>
                      <div className="flex items-center text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border/40">
                        <Calendar size={12} className="mr-1 text-primary" />
                        {timestamp ? format(new Date(timestamp), 'dd MMM yyyy') : 'Unknown'}
                      </div>
                    </div>

                    <p className="text-sm font-medium text-foreground leading-relaxed mb-4">
                      {img.description || 'Clinical Evidence'}
                    </p>

                    {/* Card Actions */}
                    <div className="appt-grid-card-actions-minimal mt-auto flex gap-2 w-full">
                      {resolvedUrl && (
                        <button 
                          className="appt-btn flex-grow flex items-center justify-center gap-2"
                          onClick={() => window.open(resolvedUrl, '_blank')}
                        >
                          <Eye size={14} />
                          View
                        </button>
                      )}
                      <button 
                        className="appt-btn appt-btn-danger flex-grow flex items-center justify-center gap-2"
                        onClick={() => handleDeleteMedia(img.id)}
                        disabled={deletingId === img.id}
                      >
                        <Trash2 size={14} />
                        {deletingId === img.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
