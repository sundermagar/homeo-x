import React, { useState } from 'react';
import { Database, Plus, Search, PowerOff, ArchiveRestore, Info, CheckCircle2 } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useAIModels, AIModel } from '../hooks/use-ai-models-data';
import { AddModelModal } from '../components/add-model-modal';
import { ModelDetailsModal } from '../components/model-details-modal';
import { ModelAllocationsTable } from '../components/model-allocations-table';
import { toast } from '@/hooks/use-toast';
import { Pagination } from '@/components/shared/pagination';
import { usePagination } from '@/shared/hooks/use-pagination';
import '../styles/credit-wallet.css';
import '../styles/ai-models.css';
import '../../platform/styles/platform.css';

import { StubSkeleton } from '../components/skeletons';

export default function ModelsManagementPage() {
  const { data: models, loading } = useAIModels();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [localModels, setLocalModels] = useState<AIModel[]>(models || []);
  const [activeTab, setActiveTab] = useState<'directory' | 'allocations'>('directory');

  React.useEffect(() => {
    if (models && models.length > 0) {
      setLocalModels(models);
    }
  }, [models]);

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData,
    totalItems
  } = usePagination(localModels);

  if (loading) {
    return <StubSkeleton />;
  }

  const activeModelsCount = localModels.filter(m => m.status === 'Active').length;

  const handleToggleStatus = (e: React.MouseEvent, model: AIModel) => {
    e.stopPropagation();
    
    // Mock the safety warning
    if (model.status === 'Active' && model.id === 'gpt-4o') {
      const confirmDeactivate = window.confirm(
        'Warning: Consultation AI uses this model with no fallback configured. Routing engine will pause for this feature. Reassign before confirming. Do you want to proceed?'
      );
      if (!confirmDeactivate) return;
    }

    setLocalModels(prev => 
      prev.map(m => m.id === model.id ? { ...m, status: m.status === 'Active' ? 'Inactive' : 'Active' } : m)
    );
    toast({
      title: 'Status Updated',
      description: `${model.name} is now ${model.status === 'Active' ? 'Inactive' : 'Active'}.`,
    });
  };

  const renderPricing = (model: AIModel) => {
    if (model.pricingBasis === 'Input + Output tokens') {
      return (
        <div className="cw-model-pricing-grid">
          <div className="cw-model-pricing-item">
            <span>Input / 1M</span>
            <strong>₹{((model.inputTokenCost || 0) * 1000).toFixed(2)}</strong>
          </div>
          <div className="cw-model-pricing-item">
            <span>Output / 1M</span>
            <strong>₹{((model.outputTokenCost || 0) * 1000).toFixed(2)}</strong>
          </div>
        </div>
      );
    }
    if (model.pricingBasis === 'Per minute of audio') {
      return (
        <div className="cw-model-pricing-item">
          <span>Cost per minute</span>
          <strong>₹{model.perMinuteCost?.toFixed(2)}</strong>
        </div>
      );
    }
    return (
      <div className="cw-model-pricing-item">
        <span>Custom Flat Rate</span>
        <strong>₹{model.flatCost?.toFixed(2)}</strong>
      </div>
    );
  };

  return (
    <TooltipProvider>
    <div className="cw-dashboard-grid animate-fade-in" style={{ minHeight: '100vh' }}>
      <div className="cw-header">
        <div>
          <h1>
            <Database size={18} />
            Model Directory
          </h1>
          <p>{totalItems} models configured · {activeModelsCount} active</p>
        </div>
        <button 
          className="plat-btn plat-btn-ghost" 
          onClick={() => setShowAddModal(true)}
          style={{ background: 'white', border: '1px solid #E5E7EB', color: '#111827', fontWeight: 600 }}
        >
          <Plus size={16} /> Add Model
        </button>
      </div>

      <div style={{ borderBottom: '1px solid #E5E7EB', marginBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '24px' }}>
          <button 
            onClick={() => setActiveTab('directory')}
            style={{ 
              padding: '12px 0', 
              background: 'transparent', 
              border: 'none', 
              borderBottom: activeTab === 'directory' ? '2px solid #2563EB' : '2px solid transparent',
              color: activeTab === 'directory' ? '#2563EB' : '#6B7280',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Model Directory
          </button>
          <button 
            onClick={() => setActiveTab('allocations')}
            style={{ 
              padding: '12px 0', 
              background: 'transparent', 
              border: 'none', 
              borderBottom: activeTab === 'allocations' ? '2px solid #2563EB' : '2px solid transparent',
              color: activeTab === 'allocations' ? '#2563EB' : '#6B7280',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Budget Allocations
          </button>
        </div>
      </div>

      {activeTab === 'directory' && (
        <>
          <div className="cw-models-grid">
          {paginatedData.map(model => {
            if (model.status === 'Inactive') {
            return (
              <div key={model.id} className="cw-card" style={{ 
                padding: '24px', 
                display: 'flex', 
                flexDirection: 'column', 
                height: '100%', 
                background: 'linear-gradient(180deg, #FAFAFA 0%, #F3F4F6 100%)', 
                border: '1px dashed #D1D5DB',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center'
              }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: '#6B7280' }}>
                  <PowerOff size={24} />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#374151' }}>{model.name}</div>
                  <div className="cw-model-status inactive" style={{ background: '#E5E7EB', color: '#4B5563', padding: '2px 6px', fontSize: '10px' }}>
                    Inactive
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: '#6B7280', fontWeight: 500, marginBottom: '16px' }}>{model.provider}</div>
                
                <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.5', maxWidth: '240px', marginBottom: '24px' }}>
                  Disabled recently. Routing paused and no credits are currently being consumed.
                </div>

                <button 
                  className="plat-btn" 
                  onClick={(e) => handleToggleStatus(e, model)} 
                  style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #D1D5DB', color: '#374151', fontSize: '13px', fontWeight: 600, padding: '8px 16px', borderRadius: '20px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#9CA3AF'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                >
                  <ArchiveRestore size={16} style={{ marginRight: '6px' }} />
                  Reactivate Model
                </button>
              </div>
            );
          }

          return (
            <div key={model.id} className="cw-model-card">
            
            <div className="cw-model-card-header">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="cw-model-logo">
                  {model.name.charAt(0)}
                </div>
                <div>
                  <div className="cw-model-name">{model.name}</div>
                  <div className="cw-model-provider">{model.provider}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div className={`cw-model-status ${model.modelType === 'Self-hosted' ? 'inactive' : 'active'}`} style={{ background: model.modelType === 'Self-hosted' ? '#FEF3C7' : '#E0E7FF', color: model.modelType === 'Self-hosted' ? '#D97706' : '#4338CA' }}>
                  {model.modelType}
                </div>
                <div className={`cw-model-status ${model.status.toLowerCase()}`}>
                  <div className="cw-model-status-dot" />
                  {model.status}
                </div>
              </div>
            </div>

            <div className="cw-model-metrics">
              <div>
                <div className="cw-model-metric-label">
                  Requests (mo)
                  <Tooltip>
                    <TooltipTrigger className="inline-flex cursor-pointer ml-1 align-middle text-gray-500">
                      <Info size={14} />
                    </TooltipTrigger>
                    <TooltipContent sideOffset={5}>
                      Number of requests made by this model in the last month.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="cw-model-metric-val">{model.monthlyRequests.toLocaleString()}</div>
              </div>
              <div>
                <div className="cw-model-metric-label">Credits used</div>
                <div className="cw-model-metric-val">{model.monthlyCredits.toLocaleString()}</div>
              </div>
            </div>

            {model.modelType === 'Free' ? (
              <div className="cw-model-pricing" style={{ padding: '12px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', color: '#166534', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                  <CheckCircle2 size={16} /> Free tier · No charge
                </div>
                <div style={{ color: '#15803D', fontSize: '12px' }}>
                  {model.provider === 'Groq' 
                    ? 'Groq free limit: 14,400 requests/day' 
                    : model.provider === 'Google' 
                      ? 'Google free tier: 1,500 requests/day (15 RPM)' 
                      : 'Standard free tier limits apply'}
                </div>
              </div>
            ) : (
              <div className="cw-model-pricing">
                <div className="cw-model-pricing-title">{model.pricingBasis}</div>
                {renderPricing(model)}
              </div>
            )}

            {model.featuresUsed && model.featuresUsed.length > 0 && (
              <div style={{ padding: '0 24px 16px 24px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {model.featuresUsed.map((feature, idx) => (
                  <span key={idx} style={{ background: '#F3F4F6', color: '#4B5563', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                    {feature}
                  </span>
                ))}
              </div>
            )}

            <div className="cw-model-actions">
              <button 
                className="cw-model-btn-ghost" 
                onClick={() => setSelectedModel(model)}
              >
                View usage stats →
              </button>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                <input 
                  type="checkbox" 
                  checked={model.status === 'Active'} 
                  onChange={(e) => handleToggleStatus(e as any, model)} 
                  style={{ width: '16px', height: '16px' }}
                />
                Enable Routing
              </label>
            </div>

          </div>
          );
        })}
          </div>

          <div style={{ marginTop: '24px' }}>
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalItems / itemsPerPage)}
              pageSize={itemsPerPage}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
              onPageSizeChange={setItemsPerPage}
            />
          </div>
        </>
      )}

      {activeTab === 'allocations' && <ModelAllocationsTable />}

      {showAddModal && <AddModelModal onClose={() => setShowAddModal(false)} />}
      {selectedModel && <ModelDetailsModal model={selectedModel} onClose={() => setSelectedModel(null)} />}
    </div>
    </TooltipProvider>
  );
}
