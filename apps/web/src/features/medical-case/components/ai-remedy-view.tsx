import React, { useMemo, useState } from 'react';
import {
  Search, ChevronRight, ChevronDown, Activity,
  Plus, RotateCw, Microscope, Zap,
  Folder, FolderOpen, FlaskConical, Network, X,
  Share2, MessageSquare, Printer
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
  expandedIds: Set<string | number>;
  onToggle: (id: string | number) => void;
  onSelectPath?: (path: string) => void;
  parentPath?: string;
}

function MatrixNode({ node, depth = 0, regid, searchQuery, expandedIds, onToggle, onSelectPath, parentPath = '' }: MatrixNodeProps) {
  const isOpen = expandedIds.has(node.id);

  const currentPath = parentPath ? `${parentPath} > ${node.label}` : node.label;

  // Lazy load children
  const { data: children, isLoading: loadingChildren } = useRemedyTree(isOpen ? node.id : -1);
  const { data: alternatives, isLoading: loadingAlts } = useRemedyAlternatives(isOpen ? node.id : null);
  const saveMutation = useSavePrescription();

  const hasChildren = (children && children.length > 0) || node.nodeType === 'RUBRIC';

  // Heuristic for leaf remedy
  const isRemedy = !hasChildren && (node.label.length < 35 && !node.label.includes('?'));

  const handlePrescribe = async (remedy: string, potency: string | null) => {
    if (!regid) return;
    if (!window.confirm(`Add ${remedy} to session records?`)) return;

    await saveMutation.mutateAsync({
      regid,
      remedyName: remedy,
      potencyName: potency || '',
      frequencyName: 'TDS',
      days: 3,
      notes: `Path: ${currentPath}`
    });
  };

  const handleNodeClick = () => {
    if (hasChildren) {
      onToggle(node.id);
    }
    if (onSelectPath) {
      onSelectPath(currentPath);
    }
  };

  // Depth-based design tokens
  const getColors = () => {
    if (depth === 0) return { 
      bg: 'var(--pp-blue-faded)', 
      border: 'var(--pp-blue-border)', 
      text: 'var(--pp-blue)' 
    };
    if (depth === 1) return { 
      bg: 'var(--pp-purple-faded)', 
      border: 'var(--pp-purple)', 
      text: 'var(--pp-purple)' 
    };
    return { bg: 'transparent', border: 'transparent', text: 'var(--text-main)' };
  };
  const colors = getColors();

  return (
    <div className="mc-matrix-node-container" style={{ marginBottom: '6px' }}>
      <div
        className={`mc-matrix-node-header ${isOpen ? 'is-open' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: depth === 0 ? '8px 12px' : '6px 10px',
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          cursor: hasChildren ? 'pointer' : 'default',
          color: colors.text
        }}
        onClick={handleNodeClick}
      >
        <div style={{ width: 16, display: 'flex', justifyContent: 'center' }}>
          {hasChildren ? (
            isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
          ) : (
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', opacity: 0.3 }} />
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <div style={{
            width: 24, height: 24, borderRadius: '6px',
            background: 'var(--bg-card)', border: '1px solid var(--border-main)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {hasChildren ? (
              isOpen ? <FolderOpen size={12} /> : <Folder size={12} />
            ) : (
              <FlaskConical size={11} />
            )}
          </div>
          <span style={{ fontSize: depth === 0 ? '0.8rem' : '0.72rem', fontWeight: depth === 0 ? 700 : 500 }}>
            <Highlight text={node.label} query={searchQuery || ''} />
          </span>
        </div>

        {hasChildren && children && children.length > 0 && (
          <span className="mc-count" style={{ fontSize: '0.6rem', padding: '2px 8px', background: 'var(--bg-card)', borderRadius: '4px', border: '1px solid var(--border-main)' }}>
            {children.length} {depth === 0 ? 'Categories' : 'Clusters'}
          </span>
        )}

        {depth > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); handlePrescribe(node.label, null); }}
            className="mc-action-circle"
            style={{ width: '24px', height: '24px', marginLeft: 'auto' }}
            title="Prescribe this rubric/remedy"
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
          {loadingChildren && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '4px' }}>Loading children...</div>}

          {children?.map(child => (
            <MatrixNode 
              key={child.id} 
              node={child} 
              depth={depth + 1} 
              regid={regid} 
              searchQuery={searchQuery} 
              expandedIds={expandedIds} 
              onToggle={onToggle} 
              onSelectPath={onSelectPath}
              parentPath={currentPath}
            />
          ))}

          {/* {loadingAlts && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', padding: '4px' }}>Querying clinical matrix...</div>} */}

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
  const [expandedIds, setExpandedIds] = useState<Set<string | number>>(new Set());
  const [selectedPath, setSelectedPath] = useState<string>('');
  const { data: rootNodes, isLoading: loadingRoots } = useRemedyTree(0);
  const { data: searchResults, isLoading: loadingSearch } = useRemedyTree(searchTerm ? 0 : -1, searchTerm);

  // Auto-expand search results when they arrive
  React.useEffect(() => {
    if (searchTerm && searchResults) {
      setExpandedIds(prev => {
        const next = new Set(prev);
        searchResults.forEach(node => next.add(node.id));
        return next;
      });
    }
  }, [searchResults, searchTerm]);

  const toggleNode = (id: string | number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredNodes = searchTerm ? (searchResults || []) : (rootNodes || []);
  const isLoading = searchTerm ? loadingSearch : loadingRoots;
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const input = document.querySelector('.mc-search-input') as HTMLInputElement;
        input?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  const handleWhatsAppShare = () => {
    if (!selectedPath) return;
    const text = encodeURIComponent(`Remedy Selection Path: ${selectedPath}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handlePrintPath = () => {
    if (!selectedPath) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Remedy Path</title></head>
          <body style="font-family: sans-serif; padding: 40px;">
            <h1>Clinical Remedy Selection</h1>
            <p style="font-size: 1.2rem; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
              ${selectedPath}
            </p>
            <p style="color: #666; font-size: 0.8rem;">Generated from Homeo-X Clinical Matrix</p>
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="mc-detail-page" style={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header with Back Button */}
      <div className="mc-detail-header" style={{ marginBottom: '4px', padding: '10px 16px' }}>
        <div className="mc-back-group">
          <div>
            <h1 className="mc-page-title" style={{ fontSize: '1.15rem', marginBottom: '0' }}>Remedy Explorer</h1>
            <p className="mc-page-sub" style={{ fontSize: '0.65rem' }}>Taxonomically mapped Materia Medica</p>
          </div>
        </div>
        {regid && <span className="mc-active-badge" style={{ padding: '2px 6px', fontSize: '0.6rem' }}>Active Session: #{regid}</span>}
      </div>

      <div className="mc-matrix-layout" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* ── Left Column: Matrix Explorer ── */}
        <div className="mc-matrix-main" style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-card)', borderRadius: '12px', padding: '0', border: '1px solid var(--border-main)', boxShadow: 'var(--pp-premium-shadow)', overflow: 'hidden', height: '100%' }}>
          <div className="mc-remedy-header" style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-main)' }}>
            <div>
              <h2 className="mc-title" style={{ fontSize: '1rem', fontWeight: 800 }}>Pharmacopoeia & Taxonomy Matrix</h2>
              <p className="mc-subtitle" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Hierarchical mapping of remedies</p>
            </div>
            {selectedPath && (
              <div className="mc-breadcrumb-float">
                <span className="mc-breadcrumb-text">{selectedPath}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleWhatsAppShare} className="mc-action-circle" title="Share via WhatsApp">
                    <MessageSquare size={14} />
                  </button>
                  <button onClick={handlePrintPath} className="mc-action-circle" title="Print Path">
                    <Printer size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mc-action-row" style={{ background: 'var(--bg-surface-2)', padding: '12px 16px', borderBottom: '1px solid var(--border-main)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="mc-search-wrap" style={{ 
              position: 'relative', 
              width: '100%', 
              maxWidth: '360px',
              height: '42px',
              borderRadius: '10px',
              background: 'var(--bg-card)',
              border: '1.5px solid var(--border-main)',
              boxShadow: 'var(--pp-shadow-sm)',
              transition: 'all 0.2s ease'
            }}>
              <Search style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--pp-text-3)' }} size={16} />
              <input
                type="text"
                placeholder="Locate clinical rubric or remedy..."
                className="mc-search-input"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                autoFocus
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  padding: '0 40px 0 42px', 
                  fontSize: '0.88rem', 
                  fontWeight: 500,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none'
                }}
              />
              {searchTerm && (
                <button 
                  className="mc-search-clear" 
                  onClick={() => setSearchTerm('')}
                  style={{ 
                    position: 'absolute', 
                    right: 12, 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--pp-text-4)',
                    cursor: 'pointer'
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {searchTerm && (
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--pp-blue)', background: 'var(--pp-blue-tint)', padding: '4px 10px', borderRadius: '6px' }}>
                {filteredNodes.length} matches identified
              </div>
            )}
          </div>

          <div className="mc-matrix-tree" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginTop: '8px', padding: '0 16px 16px' }}>
            {isLoading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <RotateCw className="animate-spin" size={24} style={{ color: 'var(--primary)', margin: '0 auto 12px' }} />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {searchTerm ? 'Searching clinical matrix...' : 'Loading remedy hierarchy...'}
                </p>
              </div>
            ) : filteredNodes.length === 0 ? (
              <div className="mc-empty-state">
                <Search size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p>{searchTerm ? 'No matches found in the matrix.' : 'No taxonomy data available.'}</p>
              </div>
            ) : (
              <>
                {filteredNodes.map(node => (
                  <MatrixNode 
                    key={node.id} 
                    node={node} 
                    regid={regid} 
                    searchQuery={searchTerm} 
                    expandedIds={expandedIds} 
                    onToggle={toggleNode} 
                    onSelectPath={setSelectedPath}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
