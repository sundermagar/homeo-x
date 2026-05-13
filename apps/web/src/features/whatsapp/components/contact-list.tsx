import React, { useState, useEffect } from 'react';
import { useWhatsApp } from '../hooks/use-whatsapp';
import { Search, UserPlus, Filter, MoreHorizontal, User, Tag, Phone, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { ContactModal } from './contact-modal';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { Pagination } from '@/components/shared/pagination';

export const ContactList = () => {
  const { useContactsPaginated } = useWhatsApp();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data, isLoading } = useContactsPaginated({ page, limit: pageSize, search: searchTerm });
  const contacts = data?.data || [];
  const totalEntries = data?.total || 0;
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const handleOpenModal = () => setIsModalOpen(true);
    window.addEventListener('open-contact-modal', handleOpenModal);
    return () => window.removeEventListener('open-contact-modal', handleOpenModal);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-pp-border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/60" size={16} />
          <input 
            placeholder="Search patient directory..." 
            className="pp-filter-search-input" 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={pageSize} cols={6} />
      ) : (
        <>
          <div className="pp-table-container-enhanced overflow-hidden">
            <table className="pp-table">
              <thead>
                <tr>
                  <th className="w-12"></th>
                  <th>Identity</th>
                  <th>Connectivity</th>
                  <th>Segmentation</th>
                  <th>Registered At</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody>
                {contacts.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted font-medium">No patient records found in directory</td></tr>
                ) : contacts.map((contact: any) => (
                  <tr key={contact.id} className="group pp-hover-row">
                    <td>
                      <div className="w-8 h-8 rounded-full bg-pp-bg-subtle flex items-center justify-center text-primary font-bold text-[10px]">
                        {contact.name?.substring(0, 2).toUpperCase() || 'P'}
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="font-bold text-main text-[13px]">{contact.name || 'Anonymous Patient'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Mail size={10} className="text-muted" />
                          <span className="text-[11px] text-muted font-medium">{contact.email || 'no-email@homeox.com'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-green-50 rounded-lg text-success">
                          <Phone size={12} />
                        </div>
                        <span className="text-[12px] font-bold text-secondary">+{contact.phone}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {contact.tags?.map((tag: string) => (
                          <span key={tag} className="px-2 py-0.5 bg-pp-bg-subtle text-primary text-[10px] font-bold rounded-full border border-pp-border uppercase tracking-tight">
                            {tag}
                          </span>
                        )) || <span className="text-[11px] text-muted italic">Unsegmented</span>}
                      </div>
                    </td>
                    <td>
                      <span className="text-[12px] text-secondary font-medium">
                        {format(new Date(contact.createdAt), 'MMM dd, yyyy')}
                      </span>
                    </td>
                    <td>
                      <button className="p-2 opacity-0 group-hover:opacity-100 transition-all hover:bg-pp-bg-subtle rounded-lg text-muted">
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalEntries > 0 && (
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(totalEntries / pageSize)}
              pageSize={pageSize}
              totalItems={totalEntries}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </>
      )}
      <ContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
