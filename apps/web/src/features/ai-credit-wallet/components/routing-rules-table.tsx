import React, { useState, useEffect } from 'react';
import { useRoutingRules, RoutingRule } from '../hooks/use-routing-data';
import { Activity, ArrowRight, Plus, X } from 'lucide-react';
import { useAIModels } from '../hooks/use-ai-models-data';
import { toast } from '@/hooks/use-toast';
import { Pagination } from '@/components/shared/pagination';
import { usePagination } from '@/shared/hooks/use-pagination';
import { ModelSelectDropdown } from './model-select-dropdown';

export function RoutingRulesTable() {
  const { data: initialRules, updateRule } = useRoutingRules();
  const [rules, setRules] = useState<RoutingRule[]>(initialRules);
  const { data: aiModels } = useAIModels();
  const activeModels = aiModels.filter(m => m.status === 'Active');

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    paginatedData,
    totalItems
  } = usePagination(rules);

  useEffect(() => {
    setRules(initialRules);
  }, [initialRules]);

  const handleUpdatePrimaryModel = (ruleId: string, newModelId: string) => {
    setRules(prev => prev.map(rule => {
      if (rule.id === ruleId) {
        return { ...rule, primaryModel: newModelId };
      }
      return rule;
    }));
    if (updateRule) {
      updateRule({ id: ruleId, updates: { primaryModel: newModelId } });
    }
    toast({ title: 'Primary Model Updated', description: 'The routing rule has been saved.' });
  };

  const handleRemoveFallback = (ruleId: string, idxToRemove: number) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    const updatedFallbacks = rule.fallbackModels.filter((_: string, idx: number) => idx !== idxToRemove);
    
    setRules(prev => prev.map(r => r.id === ruleId ? { ...r, fallbackModels: updatedFallbacks } : r));
    if (updateRule) {
      updateRule({ id: ruleId, updates: { fallbackModels: updatedFallbacks } });
    }
    toast({ title: 'Fallback removed', description: 'The fallback chain has been updated.' });
  };

  const handleUpdateFallback = (ruleId: string, idxToUpdate: number, newModelId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    const updatedFallbacks = [...rule.fallbackModels];
    updatedFallbacks[idxToUpdate] = newModelId;
    
    setRules(prev => prev.map(r => r.id === ruleId ? { ...r, fallbackModels: updatedFallbacks } : r));
    if (updateRule) {
      updateRule({ id: ruleId, updates: { fallbackModels: updatedFallbacks } });
    }
    toast({ title: 'Fallback updated', description: 'The fallback chain has been saved.' });
  };

  const handleAddFallback = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    
    const available = activeModels.filter(m => m.id !== rule.primaryModel && !rule.fallbackModels.includes(m.id));
    const modelToAdd = available[0];
    
    if (modelToAdd) {
      const updatedFallbacks = [...rule.fallbackModels, modelToAdd.id];
      setRules(prev => prev.map(r => r.id === ruleId ? { ...r, fallbackModels: updatedFallbacks } : r));
      if (updateRule) {
        updateRule({ id: ruleId, updates: { fallbackModels: updatedFallbacks } });
        toast({ title: 'Fallback added', description: 'The fallback chain has been updated.' });
      }
    } else {
      toast({ title: 'No models available', description: 'All active models are already in the chain.', variant: 'error' });
    }
  };

  return (
    <div className="cw-card" style={{ padding: '0', overflow: 'hidden' }}>
      <div className="cw-card-header" style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', marginBottom: 0 }}>
        <div>
          <h3 className="cw-card-title">Feature Routing</h3>
          <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Map each platform feature to primary and fallback AI models.</p>
        </div>
      </div>
      
      <table className="cw-responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>FEATURE</th>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>PRIMARY MODEL</th>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>FALLBACK CHAIN</th>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>DAILY BUDGET (cr)</th>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>MAX TOKENS</th>
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280', textAlign: 'right' }}>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((rule) => (
            <tr key={rule.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
              <td data-label="FEATURE" style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${rule.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Activity size={16} color={rule.color} />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{rule.feature}</span>
                </div>
              </td>
              <td data-label="PRIMARY MODEL" style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ModelSelectDropdown 
                    value={rule.primaryModel} 
                    options={activeModels.filter(m => !rule.fallbackModels.includes(m.id) || m.id === rule.primaryModel)} 
                    onChange={(val) => handleUpdatePrimaryModel(rule.id, val)}
                    variant="primary"
                  />
                  {!rule.primaryModel && (
                    <div title="Warning: No primary model set. AI calls will fail." style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', background: '#FEE2E2', color: '#EF4444', fontSize: '12px', fontWeight: 800 }}>!</div>
                  )}
                </div>
              </td>
              <td data-label="FALLBACK CHAIN" style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                  {rule.fallbackModels.length === 0 ? (
                    <span style={{ fontSize: '13px', color: '#9CA3AF', fontStyle: 'italic' }}>None (Fail immediately)</span>
                  ) : (
                    rule.fallbackModels.map((modelId: string, idx: number) => {
                      const availableForThisFallback = activeModels.filter(m => m.id !== rule.primaryModel && (!rule.fallbackModels.includes(m.id) || m.id === modelId));
                      return (
                        <React.Fragment key={`${modelId}-${idx}`}>
                          <div style={{ display: 'flex', alignItems: 'center', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: '4px', padding: '2px 6px', fontSize: '12px', color: '#4B5563' }}>
                            <ModelSelectDropdown 
                              value={modelId}
                              options={availableForThisFallback}
                              onChange={(val) => handleUpdateFallback(rule.id, idx, val)}
                              variant="fallback"
                            />
                            <button 
                              onClick={() => handleRemoveFallback(rule.id, idx)}
                              style={{ background: 'none', border: 'none', padding: 0, marginLeft: '6px', color: '#9CA3AF', cursor: 'pointer', display: 'flex' }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                          {idx < rule.fallbackModels.length - 1 && <ArrowRight size={12} color="#9CA3AF" />}
                        </React.Fragment>
                      );
                    })
                  )}
                  <button 
                    onClick={() => handleAddFallback(rule.id)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '4px', border: '1px dashed #D1D5DB', background: 'white', color: '#6B7280', cursor: 'pointer', transition: 'border-color 0.2s' }} 
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#9CA3AF'} 
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#D1D5DB'}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </td>
              <td data-label="DAILY BUDGET" style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                <input 
                  type="number" 
                  className="cw-form-input" 
                  value={rule.dailyBudget} 
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, dailyBudget: val } : r));
                  }}
                  onBlur={(e) => {
                    const val = Number(e.target.value);
                    if (updateRule) {
                      updateRule({ id: rule.id, updates: { dailyBudget: val } });
                    }
                  }}
                  style={{ width: '100px', padding: '6px 10px', fontSize: '13px' }} 
                />
              </td>
              <td data-label="MAX TOKENS" style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                <input 
                  type="number" 
                  className="cw-form-input" 
                  value={rule.maxTokensPerCall || ''} 
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                    setRules(prev => prev.map(r => r.id === rule.id ? { ...r, maxTokensPerCall: val } : r));
                  }}
                  onBlur={(e) => {
                    const val = e.target.value === '' ? 0 : Number(e.target.value);
                    if (updateRule) {
                      updateRule({ id: rule.id, updates: { maxTokensPerCall: val } });
                    }
                  }}
                  placeholder="No limit"
                  style={{ width: '100px', padding: '6px 10px', fontSize: '13px' }} 
                />
              </td>
              <td data-label="STATUS" style={{ padding: '16px 24px', verticalAlign: 'middle', textAlign: 'right' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: rule.isEnabled ? '#10B981' : '#6B7280' }}>
                    {rule.isEnabled ? '● Enabled' : '○ Disabled'}
                  </span>
                  <div className="plat-toggle" style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px' }}>
                    <input 
                      type="checkbox" 
                      checked={rule.isEnabled} 
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isEnabled: checked } : r));
                        if (updateRule) {
                          updateRule({ id: rule.id, updates: { isEnabled: checked } });
                        }
                        toast({ title: checked ? 'Feature Enabled' : 'Feature Disabled', description: `AI routing for ${rule.feature} is now ${checked ? 'enabled' : 'disabled'}.` });
                      }}
                      style={{ opacity: 0, width: 0, height: 0 }} 
                    />
                    <span className="plat-slider" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: rule.isEnabled ? '#10B981' : '#D1D5DB', borderRadius: '20px', transition: '0.4s' }}></span>
                    <span style={{ position: 'absolute', left: rule.isEnabled ? '18px' : '2px', top: '2px', width: '16px', height: '16px', background: 'white', borderRadius: '50%', transition: '0.4s' }}></span>
                  </div>
                </label>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB' }}>
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(totalItems / itemsPerPage)}
          pageSize={itemsPerPage}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={setItemsPerPage}
        />
      </div>
    </div>
  );
}
