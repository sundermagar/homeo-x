import React, { useState, useEffect } from 'react';
import { useWhatsApp } from '../hooks/use-whatsapp';
import { Play, Plus, Clock, BarChart3, Search } from 'lucide-react';
import { format } from 'date-fns';
import { CampaignModal } from './campaign-modal';
import { toast } from '@/hooks/use-toast';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { Pagination } from '@/components/shared/pagination';

export const CampaignList = () => {
  const { useCampaignsPaginated, useBroadcastCampaign } = useWhatsApp();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  
  const { data, isLoading } = useCampaignsPaginated({ page, limit: pageSize, search });
  const campaigns = data?.data || [];
  const totalEntries = data?.total || 0;
  
  const broadcastMutation = useBroadcastCampaign();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  useEffect(() => {
    const handleOpenModal = () => setIsModalOpen(true);
    window.addEventListener('open-campaign-modal', handleOpenModal);
    return () => window.removeEventListener('open-campaign-modal', handleOpenModal);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': 
        return <span className="pp-badge-status status-active animate-pulse">ACTIVE</span>;
      case 'completed': 
        return <span className="pp-badge-status status-completed">COMPLETED</span>;
      case 'scheduled': 
        return <span className="pp-badge-status status-pending">SCHEDULED</span>;
      case 'failed': 
        return <span className="pp-badge-status status-cancelled">FAILED</span>;
      default: 
        return <span className="pp-badge-status" style={{ background: 'var(--pp-bg-subtle)', color: 'var(--pp-text-muted)' }}>DRAFT</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search/Filter Bar */}
      <div className="pp-filter-card">
        <div className="pp-filter-search-wrap">
          <Search size={16} />
          <input
            type="text"
            className="pp-filter-search-input"
            placeholder="Search campaigns by name or template..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="pp-table-meta-row">
        <div className="pp-table-meta-label">Active Campaigns</div>
        <div className="pp-table-meta-stats">Total: {totalEntries} records</div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={pageSize} cols={7} />
      ) : (
        <>
          <div className="pp-table-container-enhanced bg-white rounded-[12px] shadow-sm border border-pp-border">
            <div className="pp-table-scroll">
              <table className="pp-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Campaign Identity</th>
                    <th>Template Reference</th>
                    <th>Status</th>
                    <th>Engagement Metrics</th>
                    <th>Created At</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-20 text-muted italic font-medium">
                        <BarChart3 className="w-10 h-10 mx-auto mb-4 opacity-10" />
                        No campaigns found. Start by creating a new outreach campaign.
                      </td>
                    </tr>
                  ) : (
                    campaigns.map((campaign: any, idx: number) => (
                      <tr key={campaign.id} className="pp-hover-row">
                        <td>
                           <span className="font-mono text-[10px] font-bold opacity-40">{idx + 1 + (page - 1) * pageSize}</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-pp-blue-tint text-pp-blue rounded-lg flex items-center justify-center font-bold text-xs">
                              {campaign.name.substring(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <p className="appt-cell-name">{campaign.name}</p>
                              <p className="appt-cell-phone">ID: {campaign.id}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center text-[13px] font-medium text-secondary">
                            <Clock className="w-3.5 h-3.5 mr-2 opacity-50" />
                            {campaign.templateName}
                          </div>
                        </td>
                        <td>{getStatusBadge(campaign.status)}</td>
                        <td>
                          <div className="space-y-1.5 max-w-[140px]">
                            <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider">
                              <span className="text-success">Sent: {campaign.sentCount || 0}</span>
                              <span className="text-danger">Fail: {campaign.failedCount || 0}</span>
                            </div>
                            <div className="h-1.5 w-full bg-pp-bg-subtle rounded-full overflow-hidden flex">
                              <div 
                                className="bg-success h-full transition-all duration-1000" 
                                style={{ width: `${(campaign.sentCount / (campaign.recipientCount || 1)) * 100}%` }} 
                              />
                              <div 
                                className="bg-danger h-full transition-all duration-1000" 
                                style={{ width: `${(campaign.failedCount / (campaign.recipientCount || 1)) * 100}%` }} 
                              />
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col">
                            <span className="appt-cell-name text-xs">{format(new Date(campaign.createdAt), 'MMM dd, yyyy')}</span>
                            <span className="appt-cell-phone">{format(new Date(campaign.createdAt), 'h:mm a')}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {campaign.status === 'draft' && (
                            <button 
                              className="btn-primary btn-sm px-4 h-8 text-[11px]"
                              onClick={() => {
                                broadcastMutation.mutate(campaign.id, {
                                  onSuccess: () => toast({ title: 'Broadcast Initialized', description: 'Patients are now being messaged.' }),
                                  onError: (err: any) => toast({ title: 'Broadcast Failed', description: err.message, variant: 'error' })
                                });
                              }}
                              disabled={broadcastMutation.isPending && broadcastMutation.variables === campaign.id}
                            >
                              <Play className={`w-3.5 h-3.5 mr-1.5 ${(broadcastMutation.isPending && broadcastMutation.variables === campaign.id) ? 'animate-spin' : ''}`} />
                              {(broadcastMutation.isPending && broadcastMutation.variables === campaign.id) ? 'Launching...' : 'Launch'}
                            </button>
                          )}
                          {campaign.status === 'completed' && (
                            <button className="btn-ghost text-pp-blue font-bold text-[11px]">
                              View Analytics
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
      
      <CampaignModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
