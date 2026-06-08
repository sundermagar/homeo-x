import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useWhatsApp } from '../hooks/use-whatsapp';
import {
  Zap,
  Plus,
  Play,
  Pause,
  Trash2,
  ChevronRight,
  MessageSquare,
  Target,
  Clock,
  ArrowRight,
  Search,
} from 'lucide-react';
import { format } from 'date-fns';
import AutomationFlowBuilder from './automation-flow-builder/AutomationFlowBuilder';
import { Pagination } from '@/components/shared/pagination';
import { toast } from '@/hooks/use-toast';

export const AutomationBuilder = () => {
  const { useAutomationsPaginated, useChannels, useUpdateAutomation, useDeleteAutomation } =
    useWhatsApp();
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
      },
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

  const filteredAutomations = automations.filter(
    (flow: any) =>
      flow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (flow.description && flow.description.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  if (isCreatingNew || editingAutomation) {
    return (
      <div className="h-[calc(100vh-220px)] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-[var(--bg-card)] shadow-sm ring-1 ring-black/5 animate-fade-in relative z-10 flex flex-col">
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
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-[var(--bg-card)] p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="flex-1 max-w-md">
          <label className="pp-table-meta-label uppercase tracking-widest text-[9px] mb-1.5 block">
            Search Workflows
          </label>
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
            <div
              key={i}
              className="appt-card animate-pulse bg-pp-bg-subtle/20 border-pp-border h-[180px]"
            />
          ))
        ) : filteredAutomations.length === 0 ? (
          <div className="py-20 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-200 dark:border-white/10 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-white/10 rounded-2xl flex items-center justify-center mb-6 text-muted/30">
              <Zap size={32} />
            </div>
            <h3 className="text-xl font-bold text-main">No Journeys Configured</h3>
            <p className="text-secondary mt-2 mb-4 max-w-sm mx-auto text-sm leading-relaxed">
              Define your first automated medical journey. Trigger workflows based on incoming
              keywords or patient status changes.
            </p>
          </div>
        ) : (
          filteredAutomations.map((flow: any) => (
            <div
              key={flow.id}
              className="group p-5 md:p-6 bg-[var(--bg-card)] rounded-[24px] border border-pp-border shadow-sm hover:shadow-md transition-all flex flex-col gap-5 md:gap-6"
            >
              {/* Top Row: Title, Description, and Actions */}
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <div className="flex justify-center items-center w-8 h-8 bg-[#F4F3F1] dark:bg-[#222226] text-main rounded-[10px] font-bold text-xs shadow-inner">
                      #{flow.id}
                    </div>
                    <h3 className="text-[17px] font-bold text-main">{flow.name}</h3>
                    <div
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        flow.status === 'active'
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-secondary border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {flow.status}
                    </div>
                  </div>
                  <p className="text-[13px] text-secondary leading-relaxed pl-11 max-w-2xl">
                    {flow.description || 'Keyword based quick messaging automation.'}
                  </p>
                </div>

                {/* Primary Actions */}
                <div className="flex items-center gap-2 pl-11 lg:pl-0">
                  <button
                    onClick={() => handleToggleStatus(flow)}
                    disabled={updateMutation.isPending || deleteMutation.isPending}
                    className={`h-[38px] px-3.5 rounded-xl font-semibold text-[13px] transition-all flex items-center gap-2 border ${
                      flow.status === 'active'
                        ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200/50 hover:bg-amber-100 dark:hover:bg-amber-500/20'
                        : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                    }`}
                  >
                    {flow.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                    {flow.status === 'active' ? 'Pause' : 'Start'}
                  </button>
                  <button
                    onClick={() => setEditingAutomation(flow)}
                    className="h-[38px] px-4 bg-[#09090b] dark:bg-white text-white dark:text-[#09090b] rounded-xl font-semibold text-[13px] shadow-sm hover:bg-[#27272a] dark:hover:bg-slate-100 transition-all flex items-center gap-2"
                  >
                    Edit Logic <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Bottom Row: Stats & Secondary Actions */}
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-5 pt-2 pl-11 lg:pl-0">
                {/* Stats Cards */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-3 px-3.5 py-2.5 bg-[#FAFAF9] dark:bg-[#1c1c21] rounded-[14px] border border-pp-border/60">
                    <div className="p-1.5 bg-[var(--bg-card)] dark:bg-[#222226] rounded-[8px] shadow-sm text-secondary">
                      <Target size={14} />
                    </div>
                    <div>
                      <p className="text-[9px] text-muted font-bold uppercase tracking-wider mb-0.5 leading-none">
                        Trigger
                      </p>
                      <p className="text-[12px] font-bold text-main leading-none">
                        {flow.trigger?.replace(/_/g, ' ') || 'Keyword'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 px-3.5 py-2.5 bg-[#FAFAF9] dark:bg-[#1c1c21] rounded-[14px] border border-pp-border/60">
                    <div className="p-1.5 bg-[var(--bg-card)] dark:bg-[#222226] rounded-[8px] shadow-sm text-secondary">
                      <MessageSquare size={14} />
                    </div>
                    <div>
                      <p className="text-[9px] text-muted font-bold uppercase tracking-wider mb-0.5 leading-none">
                        Executions
                      </p>
                      <p className="text-[12px] font-bold text-main leading-none">
                        {flow.executionCount || 0} Patients
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 px-3.5 py-2.5 bg-[#FAFAF9] dark:bg-[#1c1c21] rounded-[14px] border border-pp-border/60">
                    <div className="p-1.5 bg-[var(--bg-card)] dark:bg-[#222226] rounded-[8px] shadow-sm text-secondary">
                      <Clock size={14} />
                    </div>
                    <div>
                      <p className="text-[9px] text-muted font-bold uppercase tracking-wider mb-0.5 leading-none">
                        Last Run
                      </p>
                      <p className="text-[12px] font-bold text-main leading-none">
                        {flow.lastExecutedAt
                          ? format(new Date(flow.lastExecutedAt), 'MMM dd, HH:mm')
                          : 'Never'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Secondary Actions */}
                <div className="flex items-center gap-2">
                  <button className="h-[38px] px-3.5 bg-[var(--bg-card)] dark:bg-[#1c1c21] border border-pp-border rounded-xl text-[13px] font-semibold text-secondary hover:text-main hover:bg-[var(--bg-card)] dark:hover:bg-[#222226] transition-all flex items-center gap-2">
                    Analytics <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(flow)}
                    disabled={updateMutation.isPending || deleteMutation.isPending}
                    className="w-[38px] h-[38px] flex justify-center items-center bg-[var(--bg-card)] dark:bg-[#1c1c21] border border-pp-border rounded-xl text-muted hover:text-error hover:bg-error/5 hover:border-error/30 transition-all"
                    title="Delete Automation"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
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
