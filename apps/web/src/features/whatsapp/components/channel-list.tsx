import React, { useState, useEffect } from 'react';
import { useWhatsApp } from '../hooks/use-whatsapp';
import { ShieldCheck, Globe, RefreshCw, Smartphone, CheckCircle2, XCircle } from 'lucide-react';
import { ChannelModal } from './channel-modal';
import { toast } from '@/hooks/use-toast';

export const ChannelList = () => {
  const { useChannels, useSyncTemplates } = useWhatsApp();
  const { data: channels, isLoading } = useChannels();
  const syncTemplatesMutation = useSyncTemplates();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  useEffect(() => {
    const handleOpenModal = () => setIsModalOpen(true);
    window.addEventListener('open-channel-modal', handleOpenModal);
    return () => window.removeEventListener('open-channel-modal', handleOpenModal);
  }, []);

  // Derive status from isActive field (channel.status doesn't exist in schema)
  const getStatusBadge = (isActive: boolean) => {
    if (isActive) return <span className="pp-badge-status status-active">CONNECTED</span>;
    return <span className="pp-badge-status status-cancelled">DISCONNECTED</span>;
  };

  if (isLoading) return <div className="p-12 text-center text-muted animate-pulse font-bold tracking-widest uppercase text-xs">Loading Connectivity Matrix...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="pp-table-meta-row">
        <div className="pp-table-meta-label">Meta Business Connectivity</div>
        <div className="pp-table-meta-stats">{channels?.length || 0} active nodes</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {channels?.length === 0 ? (
          <div className="col-span-full p-20 bg-white border border-pp-border border-dashed rounded-3xl text-center">
            <Globe className="w-12 h-12 mx-auto mb-4 opacity-10" />
            <h4 className="text-lg font-bold text-main">No Nodes Connected</h4>
            <p className="text-muted text-sm mt-1 mb-8">Establish a bridge with Meta Cloud API to start messaging.</p>
          </div>
        ) : (
          channels?.map((channel: any) => (
            <div key={channel.id} className="appt-card p-0 overflow-hidden flex flex-col group">
              <div className="p-6 space-y-6 flex-1">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 bg-pp-bg-subtle rounded-2xl flex items-center justify-center text-pp-blue group-hover:bg-pp-blue group-hover:text-white transition-all duration-300">
                    <Globe size={24} />
                  </div>
                  {getStatusBadge(!!channel.isActive)}
                </div>

                <div>
                  <h3 className="text-lg font-bold text-main">{channel.name}</h3>
                  <div className="flex items-center text-xs font-bold text-muted mt-1 uppercase tracking-wider">
                    <Smartphone className="w-3.5 h-3.5 mr-1.5 opacity-50" />
                    +{channel.phoneNumber}
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-secondary">
                    <ShieldCheck className="w-4 h-4 text-pp-blue" />
                    Meta Verified Connectivity
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-secondary">
                    {channel.isActive ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : (
                      <XCircle className="w-4 h-4 text-danger" />
                    )}
                    {channel.isActive ? 'E2E Encryption Active' : 'Security Handshake Required'}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-pp-bg-subtle/50 border-t border-pp-border flex gap-2">
                <button 
                  className="btn-secondary h-9 flex-1 text-[11px] font-bold"
                  onClick={() => {
                    syncTemplatesMutation.mutate(channel.id, {
                      onSuccess: (result: any) => {
                        const stats = result;
                        toast({ 
                          title: 'Meta Templates Synced', 
                          description: stats?.total 
                            ? `${stats.total} templates: ${stats.created} new, ${stats.updated} updated, ${stats.unchanged} unchanged`
                            : 'Templates refreshed successfully.'
                        });
                      },
                      onError: (err: any) => toast({ title: 'Sync Failed', description: err.message, variant: 'error' })
                    });
                  }}
                  disabled={syncTemplatesMutation.isPending && syncTemplatesMutation.variables === channel.id}
                >
                  <RefreshCw size={14} className={`mr-1.5 ${(syncTemplatesMutation.isPending && syncTemplatesMutation.variables === channel.id) ? 'animate-spin' : ''}`} />
                  { (syncTemplatesMutation.isPending && syncTemplatesMutation.variables === channel.id) ? 'Syncing...' : 'Sync Templates' }
                </button>
                <button className="btn-ghost h-9 w-9 bg-white border border-pp-border flex items-center justify-center rounded-lg hover:bg-pp-bg-subtle transition-colors">
                  <ShieldCheck size={16} className="text-pp-blue" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <ChannelModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
