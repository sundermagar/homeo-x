import React from 'react';
import { useWhatsApp } from '../hooks/use-whatsapp';
import ReactDOM from 'react-dom';
import { X, Search, User, Phone, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import '@/features/appointments/styles/appointments.css';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (contact: any) => void;
}

export const NewChatModal = ({ isOpen, onClose, onSelect }: NewChatModalProps) => {
  const { useContacts } = useWhatsApp();
  // clinicId here only controls `enabled`; actual filtering is server-side via auth JWT (req.user.contextId)
  const { data: contacts, isLoading } = useContacts(1); // truthy sentinel — server uses auth context
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredContacts = contacts?.filter((c: any) => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone?.includes(searchTerm)
  );

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      <div className="appt-drawer-overlay" onClick={onClose} />
      <div className="appt-drawer-panel" style={{ maxWidth: '450px' }}>
        <div className="appt-drawer-header">
          <h2 className="appt-drawer-title">Start Clinical Dialogue</h2>
          <button className="appt-drawer-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="appt-drawer-body flex flex-col p-0">
          <div className="p-5 border-b border-pp-border bg-pp-bg-subtle/30">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/60" size={16} />
              <input 
                placeholder="Find patient by name or phone..." 
                className="pp-filter-search-input" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-12 text-center text-muted font-bold animate-pulse text-[11px] uppercase tracking-widest">Synchronizing Directory...</div>
            ) : filteredContacts?.length === 0 ? (
              <div className="p-12 text-center text-muted italic text-sm">No clinical matches found.</div>
            ) : (
              <div className="divide-y divide-pp-border">
                {filteredContacts?.map((contact: any) => (
                  <div 
                    key={contact.id}
                    className="p-4 flex items-center gap-4 hover:bg-pp-bg-subtle transition-all cursor-pointer group"
                    onClick={() => {
                      onSelect(contact);
                      onClose();
                    }}
                  >
                    <div className="w-10 h-10 rounded-full bg-pp-blue-tint flex items-center justify-center text-pp-blue font-bold text-sm border border-pp-blue/10 group-hover:bg-pp-blue group-hover:text-white transition-all">
                      {contact.name?.substring(0, 1).toUpperCase() || 'P'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-main text-[13px] group-hover:text-pp-blue transition-colors">{contact.name || 'Anonymous'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Phone size={10} className="text-muted" />
                        <span className="text-[11px] text-muted font-bold">+{contact.phone}</span>
                      </div>
                    </div>
                    <button className="w-8 h-8 rounded-lg bg-pp-bg-subtle text-pp-blue flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                      <MessageSquare size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};
