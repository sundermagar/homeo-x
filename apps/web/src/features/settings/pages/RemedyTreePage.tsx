import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  ChevronRight,
  ChevronDown,
  RotateCw,
  Stethoscope,
  Activity
} from 'lucide-react';
import { useRemedyTree } from '@/features/medical-case/hooks/use-remedy-chart';
import '../styles/remedy-tree.css';
import { TableSkeleton } from '@/components/shared/table-skeleton';

// ─── Sub-Components ──────────────────────────────────────────────────────────

interface TreeRowProps {
  node: any;
  depth?: number;
  expandedIds: Set<number>;
  onToggle: (id: number) => void;
}

function TreeRow({ node, depth = 0, expandedIds, onToggle }: TreeRowProps) {
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children && node.children.length > 0;

  const getIcon = () => {
    if (depth === 0) return <BookOpen size={14} />;
    if (hasChildren) return <Activity size={14} />;
    return <Stethoscope size={14} />;
  };

  return (
    <div className="rt-tree-item-group">
      <div
        className={`rt-tree-row group ${isExpanded ? 'rt-row-expanded' : ''}`}
        style={{ paddingLeft: `${(depth * 20) + 12}px` }}
        onClick={() => hasChildren && onToggle(node.id)}
      >
        <div className={`rt-toggle-btn ${!hasChildren ? 'rt-invisible' : ''}`}>
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </div>

        <div className="rt-node-content">
          <div className="rt-node-icon rt-icon-muted">
            {getIcon()}
          </div>
          <div className="rt-node-text-wrapper">
            <span className="rt-node-label">{node.label}</span>
          </div>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="rt-children-container">
          {node.children.map((child: any) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function RemedyTreePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const { data: treeNodes, isLoading } = useRemedyTree();

  const toggleNode = (id: number) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const filteredNodes = useMemo(() => {
    if (!searchTerm) return treeNodes || [];
    const filter = (nodes: any[]): any[] => {
      return nodes.reduce((acc: any[], n) => {
        const matches = n.label.toLowerCase().includes(searchTerm.toLowerCase());
        const childMatches = n.children ? filter(n.children) : [];
        if (matches || childMatches.length > 0) {
          acc.push({ ...n, children: childMatches });
        }
        return acc;
      }, []);
    };
    return filter(treeNodes || []);
  }, [treeNodes, searchTerm]);

  return (
    <div className="pp-page-container rt-page-container full-height single-column enhanced animate-fade-in">
      <div className="rt-header">
        <div>
          <h1 className="rt-title">
            <Activity size={20} strokeWidth={1.6} style={{ color: 'var(--pp-blue)', marginRight: '12px' }} />
            Remedy Chart
          </h1>
          <p className="rt-subtitle">Clinical Materia Medica Explorer</p>
        </div>
      </div>

      <div className="rt-main-view">
        <div className="rt-toolbar">
          <div className="rt-search-wrapper">
            <Search className="rt-search-icon" size={16} />
            <input
              placeholder="Search by symptom or remedy..."
              className="rt-search-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="rt-tree-viewport">
          {isLoading ? (
            <TableSkeleton rows={10} columns={1} />
          ) : filteredNodes.length === 0 ? (
            <div className="rt-empty-state">
              <div className="rt-empty-icon"><Search size={40} /></div>
              <div className="rt-empty-text">
                <h3>No taxonomy found</h3>
                <p>Try refining your search terms.</p>
              </div>
            </div>
          ) : (
            <div className="rt-tree-root">
              {filteredNodes.map(node => (
                <TreeRow
                  key={node.id}
                  node={node}
                  expandedIds={expandedIds}
                  onToggle={toggleNode}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
