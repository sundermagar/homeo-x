/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

// AutomationFlowBuilder.tsx - Main Component

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { GitBranch, MessageCircle, Settings } from 'lucide-react';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  addEdge,
  useEdgesState,
  useNodesState,
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
  NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { apiClient } from '@/infrastructure/api-client';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/shared/stores/auth-store';

import { AutomationFlowBuilderProps, BuilderNodeData, NodeKind, Template, Member } from './types';
import { uid, defaultsByKind, transformAutomationToFlow } from './utils';
import { nodeTypes } from './NodeComponents';
import { CustomEdge } from './CustomEdge';
import { ConfigPanel } from './ConfigPanel';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

function getDraftStorageKey(channelId: string) {
  return `automation_drafts_${channelId}`;
}

function saveDraftToStorage(channelId: string, draft: any) {
  try {
    const raw = localStorage.getItem(getDraftStorageKey(channelId));
    const drafts = raw ? JSON.parse(raw) : [];
    const existingIdx = drafts.findIndex((d: any) => d.id === draft.id);
    if (existingIdx >= 0) {
      drafts[existingIdx] = draft;
    } else {
      drafts.unshift(draft);
    }
    const trimmed = drafts.slice(0, 10);
    localStorage.setItem(getDraftStorageKey(channelId), JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to save automation draft:', e);
  }
}

function removeDraftFromStorage(channelId: string, draftId: string) {
  try {
    const raw = localStorage.getItem(getDraftStorageKey(channelId));
    const drafts = raw ? JSON.parse(raw) : [];
    localStorage.setItem(
      getDraftStorageKey(channelId),
      JSON.stringify(drafts.filter((d: any) => d.id !== draftId)),
    );
  } catch (e) {
    console.error('Failed to remove automation draft:', e);
  }
}

export default function AutomationFlowBuilder({
  automation,
  channelId,
  onClose,
  onDraftSaved,
}: AutomationFlowBuilderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<'canvas' | 'nodes' | 'config'>('canvas');

  const draftIdRef = useRef<string>(
    automation?._draftId || `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  );
  const savedSuccessRef = useRef(false);
  const onDraftSavedRef = useRef(onDraftSaved);
  const nodesRef = useRef<Node<BuilderNodeData>[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const nameRef = useRef<string>(automation?.name || 'Send a message');
  const descriptionRef = useRef<string>(automation?.description || '');
  const triggerRef = useRef<string>(automation?.trigger || 'new_conversation');

  const [name, setName] = useState<string>(automation?.name || 'Send a message');
  const [description, setDescription] = useState<string>(automation?.description || '');
  const [trigger, setTrigger] = useState<string>(automation?.trigger || 'new_conversation');

  const initialFlowRef = useRef<{
    nodes: Node<BuilderNodeData>[];
    edges: Edge[];
  } | null>(null);

  if (!initialFlowRef.current) {
    initialFlowRef.current = transformAutomationToFlow(automation);
  }

  const [nodes, setNodes, onNodesChange] = useNodesState(initialFlowRef.current?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlowRef.current.edges);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) || null,
    [nodes, selectedId],
  );

  const onConnect = useCallback(
    (params: Edge | Connection) =>
      setEdges((eds) => addEdge({ ...params, animated: true, type: 'custom' }, eds)),
    [setEdges],
  );

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    const builderNode = node as Node<BuilderNodeData>;
    setSelectedId(builderNode.id);
    if (window.innerWidth < 768) {
      setActiveTab('config');
    }
  }, []);

  const { data: templates = [] } = useQuery({
    queryKey: ['whatsapp', 'templates', channelId],
    queryFn: async () => {
      if (!channelId) return [];
      const { data } = await apiClient.get<{ data: any[] }>('/whatsapp/templates', {
        params: { channelId },
      });
      const list = data.data || [];
      return list.filter((t: any) => t.status?.toUpperCase() === 'APPROVED');
    },
    enabled: !!channelId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['staff', 'employee'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: any[] }>('/staff', {
        params: { category: 'employee' },
      });
      return data.data || [];
    },
  });

  const addNode = (kind: NodeKind) => {
    const id = uid();
    const base = defaultsByKind[kind];

    const newNode: Node<BuilderNodeData> = {
      id,
      type: kind,
      position: { x: 200, y: (nodes.length + 1) * 140 },
      data: { ...(base as BuilderNodeData) },
    };

    setNodes((nds) => [...nds, newNode]);
    setSelectedId(id);
    if (window.innerWidth < 768) {
      setActiveTab('canvas');
    }
  };

  const deleteNode = () => {
    if (!selectedId || selectedId === 'start') return;

    setNodes((nds) => nds.filter((n) => n.id !== selectedId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedId && e.target !== selectedId));
    setSelectedId(null);
  };

  const patchSelected = (patch: Partial<BuilderNodeData>) => {
    if (!selectedId) return;
    setNodes((nds) =>
      nds.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, ...patch } } : n)),
    );
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const data = {
        id: payload.automationId || undefined,
        name: payload.name,
        description: payload.description,
        trigger: payload.trigger,
        triggerConfig: payload.triggerConfig || {},
        flowData: {
          nodes: payload.nodes,
          edges: payload.edges,
        },
        channelId: channelId ? Number(channelId) : undefined,
        status: payload.status || 'inactive',
      };

      const response = await apiClient.post<{ data: any }>('/whatsapp/automations', data);
      return response.data.data;
    },
    onSuccess: () => {
      savedSuccessRef.current = true;
      if (channelId) {
        removeDraftFromStorage(channelId, draftIdRef.current);
      }
      toast({
        title: automation?.id ? 'Automation updated' : 'Automation created',
        description: 'Your automation flow has been saved successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['wa-automations'] });
      onClose();
    },
    onError: (error: any) => {
      console.error('Save mutation error:', error);
      toast({
        title: 'Failed to save automation',
        description:
          error?.response?.data?.message || error?.message || 'An error occurred while saving.',
        variant: 'error',
      });
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for your automation.',
        variant: 'error',
      });
      return;
    }

    const backendNodes = nodes
      .filter((n) => n.id !== 'start')
      .map((node) => ({
        ...node,
        position: {
          x: node.position.x,
          y: node.position.y,
        },
      }));

    const normalizedEdges = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type || 'custom',
      animated: edge.animated || true,
    }));

    const uniqueEdges: typeof normalizedEdges = [];
    const seenConnections = new Set<string>();

    normalizedEdges.forEach((edge) => {
      const connectionKey = `${edge.source}-${edge.target}`;
      if (!seenConnections.has(connectionKey)) {
        seenConnections.add(connectionKey);
        uniqueEdges.push(edge);
      }
    });

    const mainEdges = uniqueEdges.filter((e) => e.source !== 'start');

    const payload = {
      name,
      description,
      trigger,
      triggerConfig: {},
      nodes: backendNodes,
      edges: mainEdges,
      automationId: automation?.id || null,
    };

    saveMutation.mutate(payload);
  };

  useEffect(() => {
    onDraftSavedRef.current = onDraftSaved;
  }, [onDraftSaved]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    nameRef.current = name;
  }, [name]);

  useEffect(() => {
    descriptionRef.current = description;
  }, [description]);

  useEffect(() => {
    triggerRef.current = trigger;
  }, [trigger]);

  useEffect(() => {
    return () => {
      if (savedSuccessRef.current || !channelId) return;
      if (automation?.id && !automation?._isDraft) return;

      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;

      const hasContent = currentNodes.length > 1;
      if (!hasContent) return;

      const serializableNodes = currentNodes
        .filter((n) => n.id !== 'start')
        .map((n) => ({
          nodeId: n.id,
          type: n.type,
          position: n.position,
          data: Object.fromEntries(Object.entries(n.data).filter(([_, v]) => !(v instanceof File))),
        }));

      const serializableEdges = currentEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      }));

      saveDraftToStorage(channelId, {
        id: draftIdRef.current,
        name: nameRef.current || 'Untitled Draft',
        description: descriptionRef.current,
        trigger: triggerRef.current,
        nodes: serializableNodes,
        edges: serializableEdges,
        channelId,
        savedAt: new Date().toISOString(),
      });

      onDraftSavedRef.current?.();
    };
  }, []);

  const cleanupEdges = useCallback(() => {
    setEdges((currentEdges) => {
      const cleaned: Edge[] = [];
      const seen = new Set<string>();

      currentEdges.forEach((edge) => {
        const key = `${edge.source}-${edge.target}`;
        if (!seen.has(key)) {
          seen.add(key);
          cleaned.push(edge);
        }
      });

      return cleaned;
    });
  }, [setEdges]);

  useEffect(() => {
    if (edges.length > nodes.length * 2) {
      cleanupEdges();
    }
  }, [edges.length, nodes.length, cleanupEdges]);

  const onInit = useCallback((reactFlowInstance: any) => {
    (reactFlowInstance as ReactFlowInstance<Node<BuilderNodeData>, Edge>).setViewport({
      x: 0,
      y: 0,
      zoom: 1,
    });
  }, []);

  const edgeTypes = useMemo(
    () => ({
      custom: (props: any) => <CustomEdge {...props} setEdges={setEdges} />,
    }),
    [setEdges],
  );

  return (
    <div className="flex h-screen w-full bg-slate-50/50 dark:bg-slate-500/5 overflow-hidden font-sans relative">
      {/* Mobile Responsive Overlay Backdrops */}
      {(activeTab === 'nodes' || activeTab === 'config') && (
        <div
          onClick={() => setActiveTab('canvas')}
          className="fixed inset-0 bg-slate-900/15 backdrop-blur-[2px] z-20 md:hidden transition-all duration-300"
        />
      )}

      {/* Sidebar - Flow Nodes */}
      <div
        className={`fixed md:relative inset-y-0 left-0 z-30 h-full transition-transform duration-300 md:translate-x-0 shrink-0 md:flex ${
          activeTab === 'nodes' ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <Sidebar onAddNode={addNode} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden bg-white">
        <Header
          name={name}
          setName={setName}
          description={description}
          setDescription={setDescription}
          trigger={trigger}
          setTrigger={setTrigger}
          automation={automation}
          onClose={onClose}
          onSave={handleSave}
          isSaving={saveMutation.isPending}
          isDemo={(user as any)?.username === 'demouser'}
        />

        <div className="flex-1 relative bg-slate-50/40">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onInit={onInit}
            fitView
            edgeTypes={edgeTypes}
            minZoom={0.2}
            maxZoom={2}
          >
            <Controls className="!bg-[var(--bg-card)]/90 !backdrop-blur-md !border !border-gray-100 !rounded-xl !shadow-md !left-4 !bottom-16 md:!bottom-4 overflow-hidden !m-0 !flex !flex-row" />
            <Background color="#cbd5e1" gap={16} size={1} variant={BackgroundVariant.Dots} />
          </ReactFlow>
        </div>
      </div>

      {/* Config Panel - Properties */}
      <div
        className={`fixed md:relative inset-y-0 right-0 z-30 h-full transition-transform duration-300 md:translate-x-0 shrink-0 md:flex ${
          activeTab === 'config' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        }`}
      >
        <div className="w-[320px] shrink-0 h-full overflow-hidden bg-[var(--bg-card)] flex flex-col border-l border-gray-100">
          <ConfigPanel
            selected={selectedNode}
            onChange={patchSelected}
            onDelete={deleteNode}
            templates={templates as Template[]}
            members={members as Member[]}
            channelId={channelId}
          />
        </div>
      </div>

      {/* Mobile Responsive Floating Tab Controls */}
      <div className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 bg-[var(--bg-card)]/95 backdrop-blur-md border border-slate-200/80 px-2 py-1.5 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex items-center gap-1 z-40">
        <button
          onClick={() => setActiveTab('nodes')}
          className={`px-3.5 py-2 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'nodes'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <GitBranch size={12} />
          Nodes
        </button>

        <button
          onClick={() => setActiveTab('canvas')}
          className={`px-3.5 py-2 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'canvas'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <MessageCircle size={12} />
          Canvas
        </button>

        <button
          onClick={() => {
            if (selectedId) {
              setActiveTab('config');
            } else {
              toast({
                title: 'Select a node',
                description: 'Tap any node on the canvas to configure it.',
              });
            }
          }}
          className={`px-3.5 py-2 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'config'
              ? 'bg-blue-600 text-white shadow-sm'
              : !selectedId
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Settings size={12} />
          Edit
          {selectedId && activeTab !== 'config' && (
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
          )}
        </button>
      </div>
    </div>
  );
}
