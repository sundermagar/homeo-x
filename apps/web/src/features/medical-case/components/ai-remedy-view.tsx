import React, { useMemo, useState } from 'react';
import {
  Search, ChevronRight, ChevronDown, Activity,
  Plus, RotateCw, Microscope, Zap,
  Folder, FolderOpen, FlaskConical, Network
} from 'lucide-react';
import {
  useRemedyTree,
  useRemedyAlternatives,
  useSavePrescription,
  RemedyTreeNode,
  RemedyAlternative
} from '../hooks/use-remedy-chart';

import '../styles/medical-case.css';

// ─── Sub-Components ──────────────────────────────────────────────────────────

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

interface MatrixNodeProps {
  node: RemedyTreeNode;
  depth?: number;
  regid?: number;
  searchQuery?: string;
  expandedId: number | null;
  onExpand: (id: number | null) => void;
}

function MatrixNode({ node, depth = 0, regid, searchQuery, expandedId, onExpand }: MatrixNodeProps) {
  const isSearching = !!searchQuery;
  const isManualOpen = expandedId === node.id;
  const isOpen = isSearching || isManualOpen;

  const hasChildren = node.children && node.children.length > 0;

  // Heuristic for leaf remedy
  const isRemedy = !hasChildren && (node.label.length < 25 && !node.label.includes('?'));

  const { data: alternatives, isLoading: loadingAlts } = useRemedyAlternatives(isOpen ? node.id : null);
  const saveMutation = useSavePrescription();

  const handlePrescribe = async (remedy: string, potency: string | null) => {
    if (!regid) return;
    if (!window.confirm(`Add ${remedy} to session records?`)) return;

    await saveMutation.mutateAsync({
      regid,
      remedyName: remedy,
      potencyName: potency || '',
      frequencyName: 'TDS',
      days: 3,
      notes: 'Added from Matrix Explorer'
    });
  };

  // Depth-based design tokens
  const getColors = () => {
    if (depth === 0) {
      if (isOpen) {
        return { bg: 'var(--primary-tint)', text: 'var(--primary)', border: 'var(--primary-border)' };
      }
      return { bg: 'var(--bg-card)', text: 'var(--text-main)', border: 'var(--border-main)' };
    }
    if (depth === 1) return { bg: 'var(--bg-card)', text: 'var(--text-main)', border: 'var(--border-main)' };
    return { bg: 'var(--bg-surface-2)', text: 'var(--text-secondary)', border: 'transparent' };
  };
  const colors = getColors();

  return (
    <div className="mc-matrix-node-container" style={{ marginBottom: '8px' }}>
      <div
        className={`mc-matrix-node-header ${isOpen ? 'is-open' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: depth === 0 ? '12px 16px' : '10px 14px',
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          cursor: hasChildren ? 'pointer' : 'default',
          color: colors.text
        }}
        onClick={hasChildren ? () => onExpand(isManualOpen ? null : node.id) : undefined}
      >
        <div style={{ width: 16, display: 'flex', justifyContent: 'center' }}>
          {hasChildren ? (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', opacity: 0.3 }} />
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '8px',
            background: 'var(--bg-card)', border: '1px solid var(--border-main)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {hasChildren ? (
              isOpen ? <FolderOpen size={14} /> : <Folder size={14} />
            ) : (
              <FlaskConical size={12} />
            )}
          </div>
          <span style={{ fontSize: depth === 0 ? '0.9rem' : '0.82rem', fontWeight: depth === 0 ? 800 : 600 }}>
            <Highlight text={node.label} query={searchQuery || ''} />
          </span>
        </div>

        {hasChildren && (
          <span className="mc-count" style={{ fontSize: '0.6rem', padding: '2px 8px', background: 'var(--bg-card)', borderRadius: '4px', border: '1px solid var(--border-main)' }}>
          {node.children?.length ?? 0} Clusters
          </span>
        )}

        {isRemedy && regid && (
          <button
            onClick={(e) => { e.stopPropagation(); handlePrescribe(node.label, null); }}
            className="mc-btn-primary"
            style={{ height: '24px', padding: '0 8px', fontSize: '0.65rem', borderRadius: '6px' }}
          >
            <Plus size={12} />
          </button>
        )}
      </div>

      {isOpen && (
        <div style={{
          marginLeft: '22px',
          padding: '6px 0 10px 16px',
          borderLeft: '1.5px dashed var(--border-main)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          {node.children?.map(child => (
            <MatrixNode key={child.id} node={child} depth={depth + 1} regid={regid} searchQuery={searchQuery} expandedId={expandedId} onExpand={onExpand} />
          ))}

          {loadingAlts && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '4px' }}>Querying clinical matrix...</div>}

          {alternatives && alternatives.length > 0 && (
            <div style={{ padding: '8px', background: 'var(--bg-surface-2)', borderRadius: '10px' }}>
              <div className="mc-count" style={{ marginBottom: '8px', fontSize: '0.62rem' }}>Therapeutic Affinity</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {alternatives.map((alt: RemedyAlternative) => (
                  <button
                    key={alt.id}
                    onClick={() => handlePrescribe(alt.remedy, alt.potency)}
                    className="mc-remedy-pill"
                    style={{ background: 'var(--bg-card)', fontSize: '0.72rem' }}
                  >
                    <Activity size={10} style={{ color: 'var(--primary)' }} />
                    {alt.remedy} {alt.potency && <span>({alt.potency})</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AiRemedyView({ regid }: { regid?: number }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { data: treeNodes, isLoading } = useRemedyTree();

  const filteredNodes = useMemo(() => {
    if (!searchTerm) return treeNodes || [];
    const filter = (nodes: RemedyTreeNode[]): RemedyTreeNode[] => {
      return nodes.reduce((acc: RemedyTreeNode[], n) => {
        const matches = n.label.toLowerCase().includes(searchTerm.toLowerCase());
        const childMatches = n.children ? filter(n.children) : [];
        if (matches || childMatches.length > 0) {
          acc.push({ ...n, children: childMatches.length > 0 ? childMatches : n.children });
        }
        return acc;
      }, []);
    };
    return filter(treeNodes || []);
  }, [treeNodes, searchTerm]);

  return (
    <div className="mc-detail-page">
      {/* Header with Back Button */}
      <div className="mc-detail-header">
        <div className="mc-back-group">
          {/* <button className="mc-back-btn" onClick={() => window.history.back()}>
            <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} />
          </button> */}
          <div className="mc-divider-v" />
          <div>
            <h1 className="mc-page-title">Remedy Explorer</h1>
            <p className="mc-page-sub">Taxonomically mapped Materia Medica</p>
          </div>
        </div>
        {regid && <span className="mc-active-badge">Active Session: #{regid}</span>}
      </div>

      <div className="mc-matrix-layout">

        {/* ── Left Column: Matrix Explorer ── */}
        <div className="mc-matrix-main">
          <div className="mc-remedy-header">
            <div>
              <h2 className="mc-title">Pharmacopoeia & Taxonomy Matrix</h2>
              <p className="mc-subtitle">Hierarchical mapping of clinical remedies and therapeutic clusters</p>
            </div>
          </div>

          <div className="mc-search-wrap" style={{ marginTop: '20px' }}>
            <Search className="mc-search-icon" size={18} />
            <input
              type="text"
              placeholder="Locate remedy family or taxonomy node..."
              className="mc-search-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="mc-matrix-tree">
            {isLoading ? (
              <div className="mc-loading">
                <RotateCw size={32} className="mc-icon-spin" style={{ color: 'var(--primary)', marginBottom: '12px' }} />
                <div style={{ fontWeight: 600 }}>Synthesizing knowledge nodes...</div>
              </div>
            ) : (
              <>
                {filteredNodes.map(node => (
                  <MatrixNode key={node.id} node={node} regid={regid} searchQuery={searchTerm} expandedId={expandedId} onExpand={setExpandedId} />
                ))}
                {filteredNodes.length === 0 && (
                  <div className="mc-wip">
                    <Microscope size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                    <div className="mc-wip-title">No Taxonomical Nodes Found</div>
                    <p className="mc-wip-text">Try broadening your search or checking another directory</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
