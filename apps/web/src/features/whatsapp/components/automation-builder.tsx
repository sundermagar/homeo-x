import React, { useState, useEffect } from 'react';
import { useWhatsApp } from '../hooks/use-whatsapp';
import { Zap, Plus, Play, Pause, Trash2, ChevronRight, MessageSquare, Target, Clock, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { AutomationModal } from './automation-modal';
import { Pagination } from '@/components/shared/pagination';

export const AutomationBuilder = () => {
  const { useAutomationsPaginated } = useWhatsApp();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  
  const { data, isLoading } = useAutomationsPaginated({ page, limit: pageSize });
  const automations = data?.data || [];
  const totalEntries = data?.total || 0;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  useEffect(() => {
    const handleOpenModal = () => setIsModalOpen(true);
    window.addEventListener('open-automation-modal', handleOpenModal);
    return () => window.removeEventListener('open-automation-modal', handleOpenModal);
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">

      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
          Array.from({ length: pageSize }).map((_, i) => (
            <div key={i} className="appt-card animate-pulse bg-pp-bg-subtle/20 border-pp-border h-[180px]" />
          ))
        ) : automations.length === 0 ? (
          <div className="py-24 bg-pp-bg-subtle/30 rounded-3xl border-2 border-dashed border-pp-border text-center">
            <div className="w-16 h-16 bg-pp-bg-subtle rounded-2xl flex items-center justify-center mx-auto mb-6 text-muted/30">
              <Zap size={32} />
            </div>
            <h3 className="text-xl font-bold text-main">No Journeys Configured</h3>
            <p className="text-secondary mt-2 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
              Define your first automated medical journey. Trigger workflows based on incoming keywords or patient status changes.
            </p>
          </div>
        ) : automations.map((flow: any) => (
          <div key={flow.id} className="appt-card group hover:border-pp-blue/30 transition-all p-0 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-stretch">
              <div className="p-6 flex-1 border-b md:border-b-0 md:border-r border-pp-border">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-pp-bg-subtle rounded-xl text-primary font-bold text-xs">
                      #{flow.id}
                    </div>
                    <h3 className="text-lg font-bold text-main">{flow.name}</h3>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    flow.status === 'active' ? 'bg-success/10 text-success border border-success/20' : 'bg-pp-bg-subtle text-muted border border-pp-border'
                  }`}>
                    {flow.status}
                  </div>
                </div>
                <p className="text-sm text-secondary mb-6 leading-relaxed">{flow.description}</p>
                
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2">
                    <Target size={14} className="text-muted" />
                    <div>
                      <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Trigger</p>
                      <p className="text-[12px] font-bold text-main">{flow.trigger?.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare size={14} className="text-muted" />
                    <div>
                      <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Executions</p>
                      <p className="text-[12px] font-bold text-main">{flow.executionCount || 0} Patients</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-muted" />
                    <div>
                      <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Last Run</p>
                      <p className="text-[12px] font-bold text-main">{flow.lastExecutedAt ? format(new Date(flow.lastExecutedAt), 'MMM dd, HH:mm') : 'Never'}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-pp-bg-subtle/30 p-6 w-full md:w-64 flex flex-col justify-between">
                <div className="space-y-3">
                  <button className="w-full btn-secondary h-10 justify-between group/btn">
                    <span>Edit Logic</span>
                    <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                  <button className="w-full btn-secondary h-10 justify-between">
                    <span>View Analytics</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
                
                <div className="flex gap-2 mt-6">
                  <button className="flex-1 p-2 bg-white border border-pp-border rounded-xl text-success hover:bg-success/5 transition-all flex items-center justify-center gap-2">
                    {flow.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button className="p-2 bg-white border border-pp-border rounded-xl text-muted hover:text-error hover:bg-error/5 transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
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

      <AutomationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
