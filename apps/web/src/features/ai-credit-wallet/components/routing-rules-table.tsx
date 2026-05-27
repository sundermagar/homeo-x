import React, { useState, useEffect } from 'react';
import { useRoutingRules } from '../hooks/use-routing-data';
import { Activity, ArrowRight, Plus, X } from 'lucide-react';
import { useAIModels } from '../hooks/use-ai-models-data';
import { toast } from '@/hooks/use-toast';
import { Pagination } from '@/components/shared/pagination';
import { usePagination } from '@/shared/hooks/use-pagination';

export function RoutingRulesTable() {
  const initialRules = useRoutingRules();
  const [rules, setRules] = useState(initialRules);
  const activeModels = useAIModels().filter(m => m.status === 'Active');

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

  const handleRemoveFallback = (ruleId: string, idxToRemove: number) => {
    setRules(prev => prev.map(rule => {
      if (rule.id === ruleId) {
        return {
          ...rule,
          fallbackModels: rule.fallbackModels.filter((_, idx) => idx !== idxToRemove)
        };
      }
      return rule;
    }));
    toast({ title: 'Fallback removed', description: 'The fallback chain has been updated.' });
  };

  const handleUpdateFallback = (ruleId: string, idxToUpdate: number, newModelId: string) => {
    setRules(prev => prev.map(rule => {
      if (rule.id === ruleId) {
        const newFallbacks = [...rule.fallbackModels];
        newFallbacks[idxToUpdate] = newModelId;
        return { ...rule, fallbackModels: newFallbacks };
      }
      return rule;
    }));
  };

  const handleAddFallback = (ruleId: string) => {
    setRules(prev => prev.map(rule => {
      if (rule.id === ruleId) {
        // Just add a random active model for demo purposes that isn't already primary or in chain
        const available = activeModels.filter(m => m.id !== rule.primaryModel && !rule.fallbackModels.includes(m.id));
        if (available.length > 0) {
          return {
            ...rule,
            fallbackModels: [...rule.fallbackModels, available[0].id]
          };
        } else {
          toast({ title: 'No models available', description: 'All active models are already in the chain.', variant: 'destructive' });
        }
      }
      return rule;
    }));
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
            <th style={{ padding: '12px 24px', fontSize: '12px', fontWeight: 600, color: '#6B7280' }}>DAILY BUDGET (₹)</th>
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
                <select className="cw-form-select" defaultValue={rule.primaryModel} style={{ width: '160px', padding: '6px 10px', fontSize: '13px' }}>
                  {activeModels.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </td>
              <td data-label="FALLBACK CHAIN" style={{ padding: '16px 24px', verticalAlign: 'middle' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                  {rule.fallbackModels.length === 0 ? (
                    <span style={{ fontSize: '13px', color: '#9CA3AF', fontStyle: 'italic' }}>None (Fail immediately)</span>
                  ) : (
                    rule.fallbackModels.map((modelId, idx) => {
                      const modelName = activeModels.find(m => m.id === modelId)?.name || modelId;
                      return (
                        <React.Fragment key={`${modelId}-${idx}`}>
                          <div style={{ display: 'flex', alignItems: 'center', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: '4px', padding: '2px 6px', fontSize: '12px', color: '#4B5563' }}>
                            <select 
                              value={modelId}
                              onChange={(e) => handleUpdateFallback(rule.id, idx, e.target.value)}
                              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#111827', fontSize: 'inherit', fontWeight: 600, cursor: 'pointer', appearance: 'none', paddingRight: '8px' }}
                            >
                              {activeModels.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
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
                  defaultValue={rule.dailyBudget} 
                  style={{ width: '100px', padding: '6px 10px', fontSize: '13px' }} 
                />
              </td>
              <td data-label="STATUS" style={{ padding: '16px 24px', verticalAlign: 'middle', textAlign: 'right' }}>
                <label className="plat-toggle" style={{ display: 'inline-block' }}>
                  <input type="checkbox" defaultChecked={rule.isEnabled} />
                  <span className="plat-slider"></span>
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
