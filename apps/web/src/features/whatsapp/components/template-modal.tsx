import React, { useState } from 'react';
import { useWhatsApp } from '../hooks/use-whatsapp';
import type { WhatsAppTemplate, WhatsAppChannel } from '@mmc/types';
import ReactDOM from 'react-dom';
import { 
  X, Search, FileText, Megaphone, Wrench, ShieldCheck, 
  Globe, Image as ImageIcon, Video, FileDown, MousePointerClick,
  Check, Loader2, Info, ChevronRight, Send
} from 'lucide-react';
const cn = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');
import { toast } from '@/hooks/use-toast';
import '@/features/appointments/styles/appointments.css';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: WhatsAppTemplate, variables: any[], mediaId?: string) => void;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  MARKETING: { label: 'Marketing', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Megaphone },
  UTILITY: { label: 'Utility', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Wrench },
  AUTHENTICATION: { label: 'Auth', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: ShieldCheck },
};

const Badge = ({ category }: { category: string }) => {
  const config = CATEGORY_CONFIG[category.toUpperCase()] || { label: category, color: 'bg-gray-50 text-gray-600 border-gray-200', icon: Info };
  const Icon = config.icon;
  return (
    <span className={cn("px-2 py-0.5 rounded-full border text-[10px] font-bold flex items-center gap-1", config.color)}>
      <Icon size={10} />
      {config.label}
    </span>
  );
};

export const TemplateModal = ({ isOpen, onClose, onSelect }: TemplateModalProps) => {
  const { useTemplates, useChannels } = useWhatsApp();
  const { data: channels } = useChannels();
  // Use the first active channel — same one the inbox uses
  const activeChannelId = channels?.[0]?.id;
  const { data: templates, isLoading } = useTemplates(activeChannelId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [variables, setVariables] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);

  const approvedTemplates = templates?.filter((t: any) => t.status === 'approved') || [];

  const filteredTemplates = approvedTemplates.filter((t: any) => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         t.body.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || t.category.toUpperCase() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleTemplateSelect = (template: any) => {
    const varCount = (template.body.match(/\{\{\d+\}\}/g) || []).length;
    setSelectedTemplate(template);
    setVariables(Array(varCount).fill({ type: 'custom', value: '' }));
  };

  const handleSend = () => {
    if (!selectedTemplate) return;
    
    // Validate variables
    const incomplete = variables.some(v => v.type === 'custom' && !v.value);
    if (incomplete) {
      toast({ title: 'Variables Required', description: 'Please fill in all clinical variables.', variant: 'error' });
      return;
    }

    setIsSending(true);
    // Simulate sending/selecting
    setTimeout(() => {
      onSelect(selectedTemplate, variables);
      setIsSending(false);
      onClose();
      setSelectedTemplate(null);
      setVariables([]);
    }, 800);
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      <div className="appt-drawer-overlay" onClick={onClose} />
      <div className="appt-drawer-panel" style={{ maxWidth: '600px' }}>
        <div className="appt-drawer-header">
          <div className="flex items-center gap-2">
            {selectedTemplate && (
              <button 
                onClick={() => setSelectedTemplate(null)}
                className="p-1 hover:bg-pp-bg-subtle rounded-lg text-muted transition-colors"
              >
                <ChevronRight size={18} className="rotate-180" />
              </button>
            )}
            <h2 className="appt-drawer-title">
              {selectedTemplate ? 'Configure Template' : 'Select Medical Template'}
            </h2>
          </div>
          <button className="appt-drawer-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="appt-drawer-body">
          {!selectedTemplate ? (
            <div className="space-y-6">
              {/* Search & Filter */}
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
                  <input 
                    placeholder="Search clinical templates..." 
                    className="appt-form-input pl-10" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {['ALL', 'MARKETING', 'UTILITY', 'AUTHENTICATION'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all whitespace-nowrap",
                        selectedCategory === cat 
                          ? "bg-pp-blue border-pp-blue text-white shadow-sm" 
                          : "bg-white border-pp-border text-secondary hover:border-pp-blue/30"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template List */}
              <div className="grid gap-4">
                {isLoading ? (
                  <div className="py-10 text-center text-muted italic">Syncing with Meta Vault...</div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="py-10 text-center">
                    <FileText size={40} className="mx-auto text-muted/20 mb-3" />
                    <p className="text-secondary font-medium">No templates found</p>
                    <p className="text-[11px] text-muted mt-1 text-balance">Try adjusting your filters or sync your Meta Business account.</p>
                  </div>
                ) : filteredTemplates.map((t: any) => (
                  <div 
                    key={t.id}
                    onClick={() => handleTemplateSelect(t)}
                    className="p-4 bg-white border border-pp-border rounded-2xl hover:border-pp-blue/50 cursor-pointer transition-all group shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-[13px] font-bold text-main group-hover:text-pp-blue transition-colors">{t.name}</h4>
                      <Badge category={t.category} />
                    </div>
                    <p className="text-xs text-secondary line-clamp-2 leading-relaxed">{t.body}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="flex items-center gap-1 text-[10px] text-muted font-bold uppercase tracking-tight">
                        <Globe size={11} /> {t.language || 'en_US'}
                      </span>
                      {t.mediaType && t.mediaType !== 'text' && (
                        <span className="flex items-center gap-1 text-[10px] text-muted font-bold uppercase tracking-tight">
                          <ImageIcon size={11} /> {t.mediaType}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-slide-up">
              {/* Preview Card */}
              <div className="p-5 bg-pp-bg-subtle/50 rounded-2xl border border-pp-border border-dashed">
                <div className="space-y-3">
                  {selectedTemplate.header && (
                    <div className="text-[13px] font-bold text-main border-b border-pp-border pb-2">{selectedTemplate.header}</div>
                  )}
                  <div className="text-xs text-secondary leading-relaxed whitespace-pre-wrap">{selectedTemplate.body}</div>
                  {selectedTemplate.footer && (
                    <div className="text-[10px] text-muted italic pt-1">{selectedTemplate.footer}</div>
                  )}
                </div>
              </div>

              {/* Variables Section */}
              {variables.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-main uppercase tracking-widest flex items-center gap-2">
                    <Info size={14} className="text-pp-blue" />
                    Inject Clinical Variables
                  </h3>
                  <div className="space-y-4 bg-white p-5 rounded-2xl border border-pp-border">
                    {variables.map((v, idx) => (
                      <div key={idx} className="appt-form-group mb-0">
                        <label className="appt-form-label flex justify-between">
                          <span>Variable {"{{" + (idx + 1) + "}}"}</span>
                          {selectedTemplate.variables?.[idx] && (
                            <span className="text-[10px] text-muted normal-case font-medium italic">Example: {selectedTemplate.variables[idx]}</span>
                          )}
                        </label>
                        <div className="flex gap-2">
                          <select 
                            className="appt-form-input w-32 shrink-0"
                            value={v.type}
                            onChange={(e) => {
                              const updated = [...variables];
                              updated[idx] = { ...updated[idx], type: e.target.value };
                              setVariables(updated);
                            }}
                          >
                            <option value="custom">Manual</option>
                            <option value="fullName">Patient Name</option>
                            <option value="phone">Patient Phone</option>
                          </select>
                          {v.type === 'custom' && (
                            <input 
                              placeholder="Enter manual value..." 
                              className="appt-form-input"
                              value={v.value}
                              onChange={(e) => {
                                const updated = [...variables];
                                updated[idx] = { ...updated[idx], value: e.target.value };
                                setVariables(updated);
                              }}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 bg-pp-blue/5 border border-pp-blue/10 rounded-xl flex gap-3">
                <Info size={16} className="text-pp-blue shrink-0 mt-0.5" />
                <p className="text-[11px] text-secondary leading-relaxed">
                  Templates bypass the 24-hour service window. Sending this will initiate a new clinical session with the patient.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="appt-drawer-actions">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          {selectedTemplate && (
            <button 
              className="btn-primary"
              onClick={handleSend}
              disabled={isSending}
            >
              {isSending ? <><Loader2 size={15} className="animate-spin" /> Preparing...</> : <><Send size={15} /> Select Template</>}
            </button>
          )}
        </div>
      </div>
    </>,
    document.body
  );
};


