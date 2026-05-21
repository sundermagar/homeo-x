import React, { useState, useEffect } from 'react';
import { useWhatsApp } from '../hooks/use-whatsapp';
import { Search, UserPlus, Filter, Edit, User, Tag, Phone, Mail, Trash2, Download, Upload, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ContactModal } from './contact-modal';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { Pagination } from '@/components/shared/pagination';

export const ContactList = () => {
  const { useContactsPaginated, useDeleteContact, useCreateContact } = useWhatsApp();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data, isLoading } = useContactsPaginated({ page, limit: pageSize, search: searchTerm });
  const contacts = data?.data || [];
  const totalEntries = data?.total || 0;

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  // Normalize tag case-insensitively to prevent duplicates like VIP and vip
  const normalizeTag = (tag: string) => {
    if (!tag) return '';
    const trimmed = tag.trim();
    if (trimmed.toLowerCase() === 'vip') return 'VIP';
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  };

  // Dynamic available groups/tags deduplicated case-insensitively
  const availableGroups = Array.from(
    new Set(
      [
        'VIP', 'Lead', 'Follow-up', 'Patient',
        ...contacts.flatMap((c: any) => c.tags || [])
      ]
      .map(tag => normalizeTag(tag))
      .filter(Boolean)
    )
  );

  // Filter contacts locally based on dropdown selections
  const filteredContacts = contacts.filter((c: any) => {
    if (selectedGroup) {
      const contactTags = (c.tags || []).map((t: string) => normalizeTag(t));
      if (!contactTags.includes(normalizeTag(selectedGroup))) return false;
    }
    if (selectedStatus && selectedStatus !== 'All Statuses') {
      const statusVal = c.status || 'active';
      if (statusVal.toLowerCase() !== selectedStatus.toLowerCase()) return false;
    }
    return true;
  });
  
  const { mutateAsync: deleteContact } = useDeleteContact();
  const { mutateAsync: createContact } = useCreateContact();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);

  useEffect(() => {
    const handleOpenModal = () => {
      setEditingContact(null);
      setIsModalOpen(true);
    };
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

  const handleDelete = async (contactId: string | number) => {
    if (window.confirm('Are you sure you want to delete this contact? This action is permanent.')) {
      try {
        await deleteContact(contactId);
      } catch (err: any) {
        alert(err.message || 'Failed to delete contact.');
      }
    }
  };

  const handleExport = () => {
    if (contacts.length === 0) {
      alert('No contacts to export.');
      return;
    }
    const headers = ['Name', 'Phone', 'Email', 'Tags', 'Registered At'];
    const rows = contacts.map(c => [
      c.name || '',
      c.phone || '',
      c.email || '',
      (c.tags || []).join('; '),
      safeFormatDate(c.createdAt, 'yyyy-MM-dd')
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `contacts_export_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSample = () => {
    const headers = ['Name', 'Phone', 'Email', 'Tags'];
    const sampleRows = [
      ['John Doe', '919876543210', 'john@example.com', 'VIP; Patient'],
      ['Jane Smith', '919876543211', 'jane@example.com', 'Lead; Followup']
    ];
    
    const csvContent = [headers.join(','), ...sampleRows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'contacts_sample.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      
      const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
      if (lines.length <= 1) {
        alert('The uploaded file is empty or has no data rows.');
        return;
      }
      
      const headers = (lines[0] || '').split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
      
      const nameIdx = headers.indexOf('name');
      const phoneIdx = headers.indexOf('phone');
      const emailIdx = headers.indexOf('email');
      const tagsIdx = headers.indexOf('tags');
      
      if (phoneIdx === -1) {
        alert('CSV must contain at least a "Phone" column.');
        return;
      }
      
      let importedCount = 0;
      let failedCount = 0;
      
      // Import sequentially or concurrently
      const importPromises = [];
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
        const columns = matches.map(c => c.trim().replace(/^["']|["']$/g, ''));
        
        const phoneVal = columns[phoneIdx]?.replace(/\D/g, '');
        if (!phoneVal) {
          failedCount++;
          continue;
        }
        
        const nameVal = nameIdx !== -1 ? columns[nameIdx] : '';
        const emailVal = emailIdx !== -1 ? columns[emailIdx] : '';
        const tagsStr = tagsIdx !== -1 ? columns[tagsIdx] : '';
        const tagsVal = tagsStr ? tagsStr.split(';').map(t => t.trim()).filter(Boolean) : [];
        
        importPromises.push(
          createContact({
            name: nameVal || `Imported ${phoneVal.substring(phoneVal.length - 4)}`,
            phone: phoneVal,
            email: emailVal || null,
            tags: tagsVal
          })
          .then(() => { importedCount++; })
          .catch(() => { failedCount++; })
        );
      }
      
      await Promise.allSettled(importPromises);
      alert(`Import completed!\n- Successfully imported: ${importedCount}\n- Failed or skipped: ${failedCount}`);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search and Advanced Filter Row (Matching Reference UX) */}
      <div className="bg-white p-5 rounded-2xl border border-pp-border shadow-sm space-y-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/60" size={16} />
          <input 
            placeholder="Search contacts..." 
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-medium text-main focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted/60" 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
          />
        </div>

        {/* Dynamic Options Toolbar */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          {/* Groups Dropdown */}
          <div className="relative">
            <button 
              onClick={() => {
                setIsGroupDropdownOpen(!isGroupDropdownOpen);
                setIsStatusDropdownOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-secondary transition-all"
            >
              <Filter size={14} className="text-muted" />
              <span>{selectedGroup ? `Group: ${selectedGroup}` : 'All Groups'}</span>
              <ChevronDown size={12} className="text-muted/70" />
            </button>
            
            {isGroupDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                <button 
                  onClick={() => { setSelectedGroup(null); setIsGroupDropdownOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-main hover:bg-slate-50 transition-colors flex items-center justify-between"
                >
                  <span>All Groups</span>
                  {!selectedGroup && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </button>
                {availableGroups.map((group) => (
                  <button 
                    key={group}
                    onClick={() => { setSelectedGroup(group); setIsGroupDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-main hover:bg-slate-50 transition-colors flex items-center justify-between"
                  >
                    <span>{group}</span>
                    {selectedGroup === group && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Statuses Dropdown */}
          <div className="relative">
            <button 
              onClick={() => {
                setIsStatusDropdownOpen(!isStatusDropdownOpen);
                setIsGroupDropdownOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-secondary transition-all"
            >
              <Filter size={14} className="text-muted" />
              <span>{selectedStatus && selectedStatus !== 'All Statuses' ? `Status: ${selectedStatus}` : 'All Statuses'}</span>
              <ChevronDown size={12} className="text-muted/70" />
            </button>
            
            {isStatusDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                {['All Statuses', 'Active', 'Inactive'].map((status) => (
                  <button 
                    key={status}
                    onClick={() => { setSelectedStatus(status === 'All Statuses' ? null : status); setIsStatusDropdownOpen(false); }}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-main hover:bg-slate-50 transition-colors flex items-center justify-between"
                  >
                    <span>{status}</span>
                    {((!selectedStatus && status === 'All Statuses') || selectedStatus === status) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden lg:block h-4 w-px bg-slate-200 mx-1"></div>

          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-secondary transition-all"
          >
            <Download size={14} className="text-muted" />
            <span>Export All Contacts</span>
          </button>

          <input 
            type="file" 
            id="csv-import-input" 
            accept=".csv" 
            className="hidden" 
            onChange={handleImportFile} 
          />

          <button 
            onClick={() => document.getElementById('csv-import-input')?.click()}
            className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-secondary transition-all"
          >
            <Upload size={14} className="text-muted" />
            <span>Import Contacts</span>
          </button>

          <button 
            onClick={handleDownloadSample}
            className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-secondary transition-all"
          >
            <Download size={14} className="text-muted" />
            <span>Download Sample Excel</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={pageSize} cols={6} />
      ) : (
        <>
          {/* Desktop Table View */}
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
                    <th className="w-16 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted font-medium">
                        No contact records found matching filters
                      </td>
                    </tr>
                  ) : (
                    filteredContacts.map((contact: any) => {
                      const isPatient = String(contact.id).startsWith('patient_');
                      return (
                        <tr key={contact.id} className="group pp-hover-row">
                          <td>
                            <div className="w-8 h-8 rounded-full bg-pp-bg-subtle flex items-center justify-center text-primary font-bold text-[10px]">
                              {contact.name?.substring(0, 2).toUpperCase() || 'P'}
                            </div>
                          </td>
                          <td>
                            <div>
                              <p className="font-bold text-main text-[13px]">{contact.name || 'Anonymous Contact'}</p>
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
                                  {normalizeTag(tag)}
                                </span>
                              )) || <span className="text-[11px] text-muted italic">Unsegmented</span>}
                            </div>
                          </td>
                          <td>
                            <span className="text-[12px] text-secondary font-medium">
                              {safeFormatDate(contact.createdAt, 'MMM dd, yyyy')}
                            </span>
                          </td>
                           <td className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              {!isPatient ? (
                                <>
                                  <button 
                                    onClick={() => handleDelete(contact.id)}
                                    className="p-1.5 transition-all hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg"
                                    title="Delete CRM Contact"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                  <button 
                                    onClick={() => { setEditingContact(contact); setIsModalOpen(true); }}
                                    className="p-1.5 transition-all hover:bg-slate-100 rounded-lg text-slate-500 hover:text-primary"
                                    title="Edit Patient Contact"
                                  >
                                    <Edit size={15} />
                                  </button>
                                </>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-semibold px-2 py-0.5 bg-slate-100 rounded-full border border-slate-200 cursor-not-allowed select-none" title="EHR Patients cannot be modified or deleted from WhatsApp marketing context">
                                  EHR
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center bg-white border border-pp-border rounded-2xl text-muted italic text-sm">
                No patient records found matching filters
              </div>
            ) : (
              filteredContacts.map((contact: any) => {
                const isPatient = String(contact.id).startsWith('patient_');
                return (
                  <div key={contact.id} className="bg-white p-5 rounded-2xl border border-pp-border shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-pp-bg-subtle flex items-center justify-center text-primary font-bold text-xs">
                          {contact.name?.substring(0, 2).toUpperCase() || 'P'}
                        </div>
                        <div>
                          <h4 className="font-bold text-main text-sm">{contact.name || 'Anonymous Contact'}</h4>
                          <p className="text-[10px] text-muted">{contact.email || 'no-email@homeox.com'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!isPatient ? (
                          <>
                            <button 
                              onClick={() => handleDelete(contact.id)}
                              className="p-2 bg-red-50 hover:bg-red-100 rounded-lg text-red-500 transition-all"
                              title="Delete Contact"
                            >
                              <Trash2 size={15} />
                            </button>
                            <button 
                              onClick={() => { setEditingContact(contact); setIsModalOpen(true); }}
                              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-primary transition-all"
                              title="Edit Contact"
                            >
                              <Edit size={15} />
                            </button>
                          </>
                        ) : (
                          <span className="text-[9px] text-slate-400 font-semibold px-2 py-0.5 bg-slate-100 rounded-full border border-slate-200">
                            EHR
                          </span>
                        )}
                      </div>
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
                          {normalizeTag(tag)}
                        </span>
                      )) || <span className="text-[10px] text-muted italic">Unsegmented</span>}
                    </div>
                  </div>
                );
              })
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
      <ContactModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingContact(null); }} 
        contact={editingContact} 
      />
    </div>
  );
};
