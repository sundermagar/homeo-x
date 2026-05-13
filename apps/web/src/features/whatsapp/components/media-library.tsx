import React, { useState, useEffect } from 'react';
import { useWhatsApp } from '../hooks/use-whatsapp';
import { Search, Upload, Filter, MoreVertical, FileText, Image as ImageIcon, Video, Music, HardDrive, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { MediaModal } from './media-modal';
import { Pagination } from '@/components/shared/pagination';

export const MediaLibrary = () => {
  const { useMediaPaginated } = useWhatsApp();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data, isLoading } = useMediaPaginated({ page, limit: pageSize, search: searchTerm });
  const media = data?.data || [];
  const totalEntries = data?.total || 0;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  useEffect(() => {
    const handleOpenModal = () => setIsModalOpen(true);
    window.addEventListener('open-media-modal', handleOpenModal);
    return () => window.removeEventListener('open-media-modal', handleOpenModal);
  }, []);

  const getFileIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'image': return <ImageIcon size={18} />;
      case 'video': return <Video size={18} />;
      case 'audio': return <Music size={18} />;
      default: return <FileText size={18} />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-pp-border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/60" size={16} />
          <input 
            placeholder="Search medical assets..." 
            className="pp-filter-search-input" 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({ length: pageSize }).map((_, i) => (
            <div key={i} className="appt-card animate-pulse bg-pp-bg-subtle/20 border-pp-border h-[200px]" />
          ))
        ) : media.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <div className="w-16 h-16 bg-pp-bg-subtle rounded-2xl flex items-center justify-center mx-auto mb-4 text-muted/40">
              <HardDrive size={32} />
            </div>
            <h3 className="text-lg font-bold text-main">Vault Empty</h3>
            <p className="text-secondary text-sm mt-1">Upload educational imagery or medical documents to reuse them in campaigns.</p>
          </div>
        ) : media.map((item: any) => (
          <div key={item.id} className="appt-card group hover:border-pp-blue/30 transition-all p-0 overflow-hidden flex flex-col">
            <div className="aspect-video bg-pp-bg-subtle flex items-center justify-center relative">
              {item.type === 'image' && item.url ? (
                <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
              ) : (
                <div className="text-primary/30">
                  {getFileIcon(item.type)}
                </div>
              )}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all">
                <button className="p-1.5 bg-white shadow-lg rounded-lg text-muted hover:text-main">
                  <MoreVertical size={14} />
                </button>
              </div>
            </div>
            <div className="p-4">
              <h4 className="text-[13px] font-bold text-main truncate">{item.name}</h4>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1.5 text-[10px] text-muted font-bold uppercase tracking-wider">
                  <span className="p-1 bg-pp-bg-subtle rounded text-primary">
                    {getFileIcon(item.type)}
                  </span>
                  {item.type}
                </div>
                <span className="text-[11px] text-muted font-medium">
                  {format(new Date(item.createdAt), 'MMM dd')}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!isLoading && totalEntries > 0 && (
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(totalEntries / pageSize)}
          pageSize={pageSize}
          totalItems={totalEntries}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      <MediaModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
