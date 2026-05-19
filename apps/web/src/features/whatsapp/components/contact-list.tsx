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

  const safeFormatDate = (dateVal: any, pattern: string) => {
    try {
      if (!dateVal) return '';
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return format(d, pattern);
    } catch (e) {
      return '';
    }
  };

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
          {/* Desktop view (hidden on mobile) */}
          <div className="hidden md:block">
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
                          {safeFormatDate(contact.createdAt, 'MMM dd, yyyy')}
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
          </div>

          {/* Mobile view (cards, hidden on desktop) */}
          <div className="md:hidden space-y-4">
            {contacts.length === 0 ? (
              <div className="p-8 text-center bg-white border border-pp-border rounded-2xl text-muted italic text-sm">
                No patient records found in directory
              </div>
            ) : (
              contacts.map((contact: any) => (
                <div key={contact.id} className="bg-white p-5 rounded-2xl border border-pp-border shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-pp-bg-subtle flex items-center justify-center text-primary font-bold text-xs">
                        {contact.name?.substring(0, 2).toUpperCase() || 'P'}
                      </div>
                      <div>
                        <h4 className="font-bold text-main text-sm">{contact.name || 'Anonymous Patient'}</h4>
                        <p className="text-[10px] text-muted">{contact.email || 'no-email@homeox.com'}</p>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-pp-bg-subtle rounded-lg text-muted">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                  
                  <div className="bg-pp-bg-subtle/50 p-3 rounded-xl border border-pp-border text-xs text-secondary space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-muted text-[10px]">PHONE:</span>
                      <span className="font-bold text-main">+{contact.phone}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-muted text-[10px]">REGISTERED:</span>
                      <span className="font-medium text-main">{safeFormatDate(contact.createdAt, 'MMM dd, yyyy')}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {contact.tags?.map((tag: string) => (
                      <span key={tag} className="px-2 py-0.5 bg-pp-bg-subtle text-primary text-[10px] font-bold rounded-full border border-pp-border uppercase tracking-tight">
                        {tag}
                      </span>
                    )) || <span className="text-[10px] text-muted italic">Unsegmented</span>}
                  </div>
                </div>
              ))
            )}
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
