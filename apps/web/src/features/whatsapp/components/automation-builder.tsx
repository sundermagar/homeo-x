import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useWhatsApp } from '../hooks/use-whatsapp';
import { Zap, Plus, Play, Pause, Trash2, ChevronRight, MessageSquare, Target, Clock, ArrowRight, Search } from 'lucide-react';
import { format } from 'date-fns';
import AutomationFlowBuilder from './automation-flow-builder/AutomationFlowBuilder';
import { Pagination } from '@/components/shared/pagination';
import { toast } from '@/hooks/use-toast';

export const AutomationBuilder = () => {
  const { useAutomationsPaginated, useChannels, useUpdateAutomation, useDeleteAutomation } = useWhatsApp();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  
  const { data, isLoading } = useAutomationsPaginated({ page, limit: pageSize });
  const { data: channels } = useChannels();
  const activeChannelId = channels?.[0]?.id?.toString();

  const updateMutation = useUpdateAutomation();
  const deleteMutation = useDeleteAutomation();

  const handleToggleStatus = (flow: any) => {
    const nextStatus = flow.status === 'active' ? 'inactive' : 'active';
    updateMutation.mutate(
      { id: flow.id, status: nextStatus },
      {
        onSuccess: () => {
          toast({
            title: nextStatus === 'active' ? 'Workflow Activated' : 'Workflow Paused',
            description: `The workflow "${flow.name}" has been successfully updated.`,
          });
        },
        onError: (err: any) => {
          toast({
            title: 'Action Failed',
            description: err.message || 'Unable to update workflow status.',
            variant: 'error',
          });
        },
      }
    );
  };

  const handleDelete = (flow: any) => {
    if (!window.confirm(`Are you sure you want to delete the workflow "${flow.name}"?`)) {
      return;
    }
    deleteMutation.mutate(flow.id, {
      onSuccess: () => {
        toast({
          title: 'Workflow Deleted',
          description: `The workflow "${flow.name}" has been removed.`,
        });
      },
      onError: (err: any) => {
        toast({
          title: 'Deletion Failed',
          description: err.message || 'Unable to delete the workflow.',
          variant: 'error',
        });
      },
    });
  };

  const automations = data?.data || [];
  const totalEntries = data?.total || 0;
  
  const [editingAutomation, setEditingAutomation] = useState<any | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    const handleOpenModal = () => setIsCreatingNew(true);
    window.addEventListener('open-automation-modal', handleOpenModal);
    return () => window.removeEventListener('open-automation-modal', handleOpenModal);
  }, []);

  const filteredAutomations = automations.filter((flow: any) => 
    flow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (flow.description && flow.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isCreatingNew || editingAutomation) {
    return (
      <div className="h-[calc(100vh-220px)] w-full rounded-2xl overflow-hidden border border-pp-border bg-white shadow-sm ring-1 ring-black/5 animate-fade-in relative z-10 flex flex-col">
        <AutomationFlowBuilder
          automation={editingAutomation}
          channelId={activeChannelId}
          onClose={() => {
            setIsCreatingNew(false);
            setEditingAutomation(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Filter and Actions bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white p-6 rounded-2xl border border-pp-border shadow-sm">
        <div className="flex-1 max-w-md">
          <label className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1.5 block">Search Workflows</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search workflow name, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pp-input w-full h-11 pl-10"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={16} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
          Array.from({ length: pageSize }).map((_, i) => (
            <div key={i} className="appt-card animate-pulse bg-pp-bg-subtle/20 border-pp-border h-[180px]" />
          ))
        ) : filteredAutomations.length === 0 ? (
          <div className="py-20 bg-pp-bg-subtle/30 rounded-3xl border border-pp-border text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-pp-bg-subtle rounded-2xl flex items-center justify-center mb-6 text-muted/30">
              <Zap size={32} />
            </div>
            <h3 className="text-xl font-bold text-main">No Journeys Configured</h3>
            <p className="text-secondary mt-2 mb-4 max-w-sm mx-auto text-sm leading-relaxed">
              Define your first automated medical journey. Trigger workflows based on incoming keywords or patient status changes.
            </p>
          </div>
        ) : filteredAutomations.map((flow: any) => (
          <div key={flow.id} className="appt-card group hover:border-pp-blue/30 transition-all p-0 overflow-hidden bg-white shadow-sm border border-pp-border rounded-2xl">
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
                    flow.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-pp-bg-subtle text-muted border border-pp-border'
                  }`}>
                    {flow.status}
                  </div>
                </div>
                <p className="text-sm text-secondary mb-6 leading-relaxed">{flow.description || 'Keyword based quick messaging automation.'}</p>
                
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
                  <button 
                    onClick={() => setEditingAutomation(flow)}
                    className="w-full btn-secondary h-10 justify-between group/btn"
                  >
                    <span>Edit Logic</span>
                    <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                  <button className="w-full btn-secondary h-10 justify-between">
                    <span>View Analytics</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
                
                <div className="flex gap-2 mt-6">
                  <button 
                    onClick={() => handleToggleStatus(flow)}
                    disabled={updateMutation.isPending || deleteMutation.isPending}
                    className="flex-1 p-2 bg-white border border-pp-border rounded-xl text-success hover:bg-success/5 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {flow.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button 
                    onClick={() => handleDelete(flow)}
                    disabled={updateMutation.isPending || deleteMutation.isPending}
                    className="p-2 bg-white border border-pp-border rounded-xl text-muted hover:text-error hover:bg-error/5 disabled:opacity-50 transition-all"
                  >
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
    </div>
  );
};
