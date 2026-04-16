import React, { useMemo, useState } from 'react';
import { Search, ChevronRight, ChevronDown, Activity, Sparkles, Plus } from 'lucide-react';
import {
  useRemedyTree,
  useRemedyAlternatives,
  useSavePrescription,
  RemedyTreeNode,
  RemedyAlternative
} from '../hooks/use-remedy-chart';

import '../styles/medical-case.css';

interface AccordionNodeProps {
  node: RemedyTreeNode;
  regid?: number;
  searchQuery?: string;
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <span key={i} className="mc-highlight">{part}</span>
          : part
      )}
    </>
  );
}

function AccordionNode({ node, regid, searchQuery }: AccordionNodeProps) {
  const isSearching = !!searchQuery;
  const [isManualOpen, setIsManualOpen] = useState(false);

  // Auto-expand if we are searching and this node is part of the result
  const isOpen = isSearching || isManualOpen;

  const { data: alternatives, isLoading: loadingAlts } = useRemedyAlternatives(isOpen ? node.id : null);
  const saveMutation = useSavePrescription();

  // Heuristic to check if this node is likely a remedy rather than a rubric category
  const isRemedyNode = useMemo(() => {
    const isLeaf = !node.children || node.children.length === 0;
    const label = node.label.trim();
    return isLeaf && (label.length < 20 && !label.includes('?'));
  }, [node]);

  const handlePrescribe = async (remedy: string, potency: string | null) => {
    if (!regid) return;
    if (!window.confirm(`Add ${remedy} ${potency || ''} to prescription?`)) return;

    try {
      await saveMutation.mutateAsync({
        regid,
        remedyName: remedy,
        potencyName: potency || '',
        frequencyName: 'TDS',
        days: 3,
        notes: 'Added from AI Remedy Chart'
      });
    } catch (err) {
      alert('Failed to save prescription.');
    }
  };

  const nodeClass = isRemedyNode ? 'mc-remedy-leaf' : 'mc-remedy-folder';

  return (
    <div className={`mc-remedy-node-wrap ${isOpen ? 'is-open' : ''}`} style={{ marginBottom: '6px' }}>
      <div
        onClick={() => setIsManualOpen(!isManualOpen)}
        className={`mc-remedy-node-header ${nodeClass}`}
        style={{
          background: isOpen ? 'var(--text-main)' : (isRemedyNode ? 'var(--primary-tint)' : 'var(--bg-surface-2)'),
          padding: '10px 14px',
          borderRadius: '8px',
          color: isOpen ? 'white' : 'var(--text-main)',
          fontWeight: isRemedyNode ? 700 : 600,
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          border: `1px solid ${isOpen ? 'var(--text-main)' : (isRemedyNode ? 'var(--primary-border)' : 'var(--border-main)')}`,
          transition: 'all 200ms ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isRemedyNode && !node.children?.length ? 0.3 : 1 }}>
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          {isRemedyNode && <Activity size={12} style={{ color: 'var(--primary)' }} />}
          <Highlight text={node.label} query={searchQuery || ''} />
        </div>

        {isRemedyNode && regid && (
          <button
            onClick={(e) => { e.stopPropagation(); handlePrescribe(node.label, null); }}
            className="mc-btn-primary"
            style={{
              padding: '4px 10px',
              fontSize: '0.65rem',
              height: 'auto',
              boxShadow: 'none'
            }}
          >
            <Plus size={10} /> PRESCRIBE
          </button>
        )}
      </div>

      {isOpen && (
        <div style={{
          margin: '0 4px',
          padding: '12px 12px 12px 24px',
          background: 'var(--bg-card)',
          borderLeft: '2px solid var(--border-main)',
          borderBottomLeftRadius: '8px',
          borderBottomRightRadius: '8px'
        }}>
          {node.children && node.children.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {node.children.map((child) => (
                <AccordionNode key={child.id} node={child} regid={regid} searchQuery={searchQuery} />
              ))}
            </div>
          )}

          {loadingAlts && <div className="mc-loading" style={{ fontSize: '0.75rem', padding: '10px' }}>Analyzing alternatives...</div>}

          {alternatives && alternatives.length > 0 && (
            <div style={{ marginTop: node.children?.length ? '16px' : '0', padding: '4px' }}>
              <div className="mc-count" style={{ marginBottom: '8px', color: 'var(--text-muted)' }}>
                Suggested Remedies
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {alternatives.map((alt: RemedyAlternative) => (
                  <button
                    key={alt.id}
                    onClick={() => handlePrescribe(alt.remedy, alt.potency)}
                    className="mc-remedy-pill"
                  >
                    <Activity size={12} style={{ color: 'var(--primary)', opacity: 0.6 }} />
                    <span>{alt.remedy}</span>
                    {alt.potency && <span style={{ fontWeight: 400, opacity: 0.6, fontSize: '0.7rem' }}>{alt.potency}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!node.children?.length && !loadingAlts && (!alternatives || alternatives.length === 0) && (
            <div className="mc-wip-text" style={{ padding: '20px', textAlign: 'center', opacity: 0.6 }}>
              Exploring further refinements...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AiRemedyView({ regid }: { regid?: number }) {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: treeNodes, isLoading } = useRemedyTree();

  const filterTree = (nodes: RemedyTreeNode[], search: string): RemedyTreeNode[] => {
    if (!search) return nodes;

    return nodes.reduce((acc: RemedyTreeNode[], node) => {
      const matches = node.label.toLowerCase().includes(search.toLowerCase());
      const childMatches = node.children ? filterTree(node.children, search) : [];

      if (matches || childMatches.length > 0) {
        acc.push({
          ...node,
          children: childMatches.length > 0 ? childMatches : node.children
        });
      }
      return acc;
    }, []);
  };

  const filteredNodes = useMemo(() => {
    return filterTree(treeNodes || [], searchTerm);
  }, [treeNodes, searchTerm]);

  return (
    <div className="mc-remedy-container">

      <div className="mc-remedy-header">
        <h2 className="mc-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="mc-avatar" style={{ width: 32, height: 32 }}>
            <Sparkles size={16} />
          </div>
          Remedial Chart Reference
        </h2>
        {regid && (
          <span className="mc-active-badge">
            Consultation Active
          </span>
        )}
      </div>

      <div className="mc-search-wrap">
        <Search className="mc-search-icon" size={18} />
        <input
          type="text"
          placeholder="Search rubrics, categories or remedies..."
          className="mc-search-input"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '50%',
              width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', cursor: 'pointer', color: 'var(--text-muted)'
            }}
          >
            ×
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        {isLoading ? (
          <div className="mc-loading">
            <Activity className="pulse-icon" style={{ margin: '0 auto 16px', color: 'var(--primary)' }} />
            <div>Loading Repertory Tree...</div>
          </div>
        ) : (
          <div className="mc-fade-in-container">
            {filteredNodes.map(node => (
              <AccordionNode key={node.id} node={node} regid={regid} searchQuery={searchTerm} />
            ))}
            {filteredNodes.length === 0 && (
              <div className="mc-wip">
                <Search size={32} style={{ color: 'var(--text-placeholder)' }} />
                <div className="mc-wip-title">No results found</div>
                <p className="mc-wip-text">Try searching for a clinical condition or remedy name.</p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
