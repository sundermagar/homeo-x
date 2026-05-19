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

import { useMemo } from "react";
import { Handle, Position } from "@xyflow/react";
import {
  Zap,
  GitBranch,
  MessageCircle,
  HelpCircle,
  Clock,
  FileText,
  Users,
  Video,
  FileAudio,
  FileIcon,
  Globe,
  CircleStop,
  Image,
  UserPlus,
  UserCog,
  Variable,
  MapPin,
  List,
  Paperclip,
  CheckCheck,
} from "lucide-react";
import { BuilderNodeData } from "./types";

function NodeShell({
  children,
  icon,
  title,
  color,
  bgColor,
  borderColor,
  selected,
}: {
  children?: React.ReactNode;
  icon: React.ReactNode;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
  selected?: boolean;
}) {
  const activeBorderColor = useMemo(() => {
    if (color.includes("blue")) return "border-blue-500 ring-4 ring-blue-100/60";
    if (color.includes("purple")) return "border-purple-500 ring-4 ring-purple-100/60";
    if (color.includes("amber")) return "border-amber-500 ring-4 ring-amber-100/60";
    if (color.includes("slate")) return "border-slate-500 ring-4 ring-slate-100/60";
    if (color.includes("teal")) return "border-teal-500 ring-4 ring-teal-100/60";
    if (color.includes("indigo")) return "border-indigo-500 ring-4 ring-indigo-100/60";
    if (color.includes("orange")) return "border-orange-500 ring-4 ring-orange-100/60";
    if (color.includes("red")) return "border-red-500 ring-4 ring-red-100/60";
    if (color.includes("emerald")) return "border-emerald-500 ring-4 ring-emerald-100/60";
    if (color.includes("cyan")) return "border-cyan-500 ring-4 ring-cyan-100/60";
    if (color.includes("violet")) return "border-violet-500 ring-4 ring-violet-100/60";
    if (color.includes("rose")) return "border-rose-500 ring-4 ring-rose-100/60";
    if (color.includes("sky")) return "border-sky-500 ring-4 ring-sky-100/60";
    if (color.includes("pink")) return "border-pink-500 ring-4 ring-pink-100/60";
    if (color.includes("lime")) return "border-lime-500 ring-4 ring-lime-100/60";
    return "border-blue-500 ring-4 ring-blue-100/60";
  }, [color]);

  return (
    <div
      className={`rounded-xl bg-white shadow-sm min-w-[240px] max-w-[280px] overflow-hidden transition-all duration-200 border-2 ${
        selected
          ? `${activeBorderColor} shadow-md scale-[1.02]`
          : "border-gray-200/90 hover:shadow-md hover:border-gray-300 hover:scale-[1.01]"
      }`}
    >
      <div className={`flex items-center gap-2.5 px-3.5 py-2.5 ${bgColor} border-b ${borderColor}`}>
        <div className={`w-7 h-7 rounded-lg bg-white flex items-center justify-center ${color} shrink-0 shadow-sm border border-black/5`}>
          {icon}
        </div>
        <span className={`font-bold text-xs tracking-wide ${color}`}>{title}</span>
      </div>
      {children && (
        <div className="px-3.5 py-2.5 text-xs text-gray-600 space-y-2 bg-gradient-to-b from-white to-gray-50/30">
          {children}
        </div>
      )}
    </div>
  );
}

export function StartNode({ selected }: { selected?: boolean }) {
  return (
    <div className="relative flex flex-col items-center group">
      <div className={`w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-white shadow-md border-4 border-white transition-all duration-300 ${
        selected ? "ring-4 ring-green-200 scale-110 shadow-lg" : "hover:scale-105"
      }`}>
        <Zap className="w-6 h-6 animate-pulse" />
      </div>
      <div className="mt-2 px-3 py-0.5 bg-white rounded-full shadow-sm border border-gray-200/80 transition-all duration-300 group-hover:border-gray-300">
        <span className="text-[9px] font-black text-green-700 uppercase tracking-widest">Start</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-bottom-1.5 transition-transform hover:scale-125" />
    </div>
  );
}

export function ConditionsNode({ data, selected }: { data: BuilderNodeData; selected?: boolean }) {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<GitBranch className="w-4 h-4" />}
        title="Condition"
        color="text-purple-700"
        bgColor="bg-purple-50/50"
        borderColor="border-purple-100/60"
        selected={selected}
      >
        {data.conditionType === "keyword" && data.keywords && data.keywords.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {data.keywords.slice(0, 3).map((kw, i) => (
              <span key={i} className="bg-purple-50 text-purple-700 text-[10px] px-1.5 py-0.5 rounded font-semibold border border-purple-100/50">
                {kw}
              </span>
            ))}
            {data.keywords.length > 3 && (
              <span className="text-purple-400 text-[10px] font-bold">+{data.keywords.length - 3}</span>
            )}
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">No conditions set</div>
        )}
        {data.matchType && (
          <div className="text-[9px] text-purple-600 font-bold uppercase tracking-wider">
            Match: {data.matchType}
          </div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function CustomReplyNode({ data, selected }: { data: BuilderNodeData; selected?: boolean }) {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<MessageCircle className="w-4 h-4" />}
        title="Send Message"
        color="text-blue-700"
        bgColor="bg-blue-50/50"
        borderColor="border-blue-100/60"
        selected={selected}
      >
        {data.message ? (
          <p className="line-clamp-3 text-[11px] text-gray-600 bg-gray-50/80 rounded-lg p-2.5 border border-gray-200/50 leading-relaxed">
            {data.message.length > 100 ? `${data.message.slice(0, 100)}...` : data.message}
          </p>
        ) : (
          <div className="text-gray-400 italic text-[11px]">No message set</div>
        )}

        <div className="flex flex-wrap gap-1">
          {data.imagePreview && (
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-[9px] px-1.5 py-0.5 rounded font-bold border border-blue-100/30">
              <Image className="w-2.5 h-2.5" /> Image
            </span>
          )}
          {data.videoPreview && (
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-[9px] px-1.5 py-0.5 rounded font-bold border border-blue-100/30">
              <Video className="w-2.5 h-2.5" /> Video
            </span>
          )}
          {data.audioPreview && (
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-[9px] px-1.5 py-0.5 rounded font-bold border border-blue-100/30">
              <FileAudio className="w-2.5 h-2.5" /> Audio
            </span>
          )}
          {data.documentPreview && (
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 text-[9px] px-1.5 py-0.5 rounded font-bold border border-blue-100/30">
              <FileIcon className="w-2.5 h-2.5" /> Doc
            </span>
          )}
        </div>

        {data.buttons && data.buttons.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-100/80">
            {data.buttons.slice(0, 3).map((btn) => (
              <span key={btn.id} className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded font-semibold border border-blue-100/50 shadow-sm">
                {btn.text}
              </span>
            ))}
            {data.buttons.length > 3 && (
              <span className="text-blue-400 text-[10px] font-bold">+{data.buttons.length - 3}</span>
            )}
          </div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function UserReplyNode({ data, selected }: { data: BuilderNodeData; selected?: boolean }) {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<HelpCircle className="w-4 h-4" />}
        title="Ask Question"
        color="text-amber-700"
        bgColor="bg-amber-50/50"
        borderColor="border-amber-100/60"
        selected={selected}
      >
        {data.question ? (
          <p className="line-clamp-3 text-[11px] text-gray-600 bg-gray-50/80 rounded-lg p-2.5 border border-gray-200/50 leading-relaxed">
            {data.question.length > 100 ? `${data.question.slice(0, 100)}...` : data.question}
          </p>
        ) : (
          <div className="text-gray-400 italic text-[11px]">No question set</div>
        )}
        {data.saveAs && (
          <div className="flex items-center gap-1.5 text-[9px] text-amber-600 font-bold font-mono bg-amber-50/40 border border-amber-100/50 px-2 py-0.5 rounded w-fit">
            <span className="opacity-65">SAVE AS</span>
            <span>{"{{" + data.saveAs + "}}"}</span>
          </div>
        )}
        {data.buttons && data.buttons.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2 border-t border-gray-100/80">
            {data.buttons.slice(0, 3).map((btn) => (
              <span key={btn.id} className="bg-green-50 text-green-600 text-[10px] px-2 py-0.5 rounded font-semibold border border-green-100/50 shadow-sm">
                {btn.text}
              </span>
            ))}
          </div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function TimeGapNode({ data, selected }: { data: BuilderNodeData; selected?: boolean }) {
  const seconds = data.delay ?? 0;
  const display = seconds >= 3600
    ? `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
    : seconds >= 60
    ? `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    : `${seconds}s`;
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-slate-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<Clock className="w-4 h-4" />}
        title="Wait / Delay"
        color="text-slate-700"
        bgColor="bg-slate-50/50"
        borderColor="border-slate-200/60"
        selected={selected}
      >
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200/50 shadow-inner">
          <span className="text-xl font-bold tracking-tight text-slate-700">{display}</span>
          <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">pause</span>
        </div>
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function SendTemplateNode({ data, selected }: { data: BuilderNodeData; selected?: boolean }) {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-teal-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<FileText className="w-4 h-4" />}
        title="Send Template"
        color="text-teal-700"
        bgColor="bg-teal-50/50"
        borderColor="border-teal-100/60"
        selected={selected}
      >
        {data.templateId ? (
          <div className="flex items-center gap-2.5 bg-gray-50/80 rounded-lg p-2.5 border border-gray-200/50">
            <FileText className="w-4 h-4 text-teal-600 shrink-0" />
            <div className="overflow-hidden">
              <div className="text-[11px] text-gray-700 font-bold truncate">Template Selected</div>
              <div className="text-[9px] text-gray-400 font-mono truncate">ID: {data.templateId}</div>
            </div>
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">No template selected</div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-teal-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function AssignUserNode({ data, selected }: { data: BuilderNodeData; selected?: boolean }) {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<Users className="w-4 h-4" />}
        title="Assign Agent"
        color="text-indigo-700"
        bgColor="bg-indigo-50/50"
        borderColor="border-indigo-100/60"
        selected={selected}
      >
        {data.assigneeId ? (
          <div className="flex items-center gap-2.5 bg-gray-50/80 rounded-lg p-2.5 border border-gray-200/50">
            <Users className="w-4 h-4 text-indigo-600 shrink-0" />
            <div>
              <div className="text-[11px] text-gray-700 font-bold">Agent Assigned</div>
              <div className="text-[9px] text-gray-400 font-mono">Assignee: {data.assigneeId}</div>
            </div>
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">No agent selected</div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function WebhookNode({ data, selected }: { data: BuilderNodeData; selected?: boolean }) {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-orange-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<Globe className="w-4 h-4" />}
        title="Webhook"
        color="text-orange-700"
        bgColor="bg-orange-50/50"
        borderColor="border-orange-100/60"
        selected={selected}
      >
        {data.webhookUrl ? (
          <div className="space-y-2">
            <span className="inline-block bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-orange-200/40">
              {data.webhookMethod || "POST"}
            </span>
            <div className="text-[10px] text-gray-500 truncate bg-gray-50 rounded-lg px-2.5 py-1.5 font-mono border border-gray-200/50">{data.webhookUrl}</div>
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">No webhook configured</div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-orange-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function EndNode({ data, selected }: { data: BuilderNodeData; selected?: boolean }) {
  return (
    <div className="relative flex flex-col items-center group">
      <Handle type="target" position={Position.Top} className="!bg-red-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-top-1.5" />
      <div className={`w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-white shadow-md border-4 border-white transition-all duration-300 ${
        selected ? "ring-4 ring-red-200 scale-110 shadow-lg" : "hover:scale-105"
      }`}>
        <CircleStop className="w-6 h-6" />
      </div>
      <div className="mt-2 px-3 py-0.5 bg-white rounded-full shadow-sm border border-gray-200/80 transition-all duration-300 group-hover:border-gray-300">
        <span className="text-[9px] font-black text-red-700 uppercase tracking-widest">{data.endMessage || "End"}</span>
      </div>
    </div>
  );
}

export function AddToGroupNode({ data, selected }: { data: BuilderNodeData; selected?: boolean }) {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-emerald-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<UserPlus className="w-4 h-4" />}
        title="Add to Group"
        color="text-emerald-700"
        bgColor="bg-emerald-50/50"
        borderColor="border-emerald-100/60"
        selected={selected}
      >
        {data.groupName ? (
          <div className="flex items-center gap-2.5 bg-gray-50/80 rounded-lg p-2.5 border border-gray-200/50">
            <UserPlus className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[11px] text-gray-700 font-bold truncate">{data.groupName}</span>
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">No group selected</div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function UpdateContactNode({ data, selected }: { data: BuilderNodeData; selected?: boolean }) {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-cyan-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<UserCog className="w-4 h-4" />}
        title="Update Contact"
        color="text-cyan-700"
        bgColor="bg-cyan-50/50"
        borderColor="border-cyan-100/60"
        selected={selected}
      >
        {data.contactField ? (
          <div className="space-y-2">
            <span className="inline-block bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-cyan-200/40">
              {data.contactField}
            </span>
            {data.contactFieldValue && (
              <div className="text-[10px] text-gray-500 truncate bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-200/50 font-mono">
                {data.contactFieldValue}
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">No field configured</div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function SetVariableNode({ data, selected }: { data: BuilderNodeData; selected?: boolean }) {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-violet-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<Variable className="w-4 h-4" />}
        title="Set Variable"
        color="text-violet-700"
        bgColor="bg-violet-50/50"
        borderColor="border-violet-100/60"
        selected={selected}
      >
        {data.variableName ? (
          <div className="space-y-2">
            <div className="text-[10px] text-violet-600 font-bold font-mono bg-violet-50 border border-violet-100/40 px-2 py-0.5 rounded w-fit">
              {"$" + "{" + data.variableName + "}"}
            </div>
            {data.variableValue && (
              <div className="text-[11px] text-gray-500 truncate bg-gray-50 rounded px-2 py-1 border border-gray-200/50">
                = {data.variableValue}
              </div>
            )}
            {data.variableSource && data.variableSource !== "static" && (
              <span className="inline-block bg-violet-100 text-violet-700 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                {data.variableSource === "from_message" ? "From Message" : "From Webhook"}
              </span>
            )}
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">No variable set</div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-violet-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function SendLocationNode({ data, selected }: { data: BuilderNodeData; selected?: boolean }) {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-rose-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<MapPin className="w-4 h-4" />}
        title="Send Location"
        color="text-rose-700"
        bgColor="bg-rose-50/50"
        borderColor="border-rose-100/60"
        selected={selected}
      >
        {data.locationName || (data.latitude && data.longitude) ? (
          <div className="space-y-1.5">
            {data.locationName && (
              <div className="text-[11px] text-gray-700 font-bold">{data.locationName}</div>
            )}
            {data.latitude && data.longitude && (
              <div className="text-[9px] text-gray-400 font-mono bg-gray-50 rounded px-2.5 py-1 border border-gray-200/50">
                {data.latitude}, {data.longitude}
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">No location set</div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-rose-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function SendListMessageNode({ data, selected }: { data: BuilderNodeData; selected?: boolean }) {
  const totalRows = (data.listSections || []).reduce((sum, s) => sum + (s.rows?.length || 0), 0);
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-sky-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<List className="w-4 h-4" />}
        title="List Message"
        color="text-sky-700"
        bgColor="bg-sky-50/50"
        borderColor="border-sky-100/60"
        selected={selected}
      >
        {data.message ? (
          <p className="line-clamp-2 text-[11px] text-gray-600 bg-gray-50/80 rounded-lg p-2 border border-gray-200/50 leading-relaxed">
            {data.message.length > 80 ? `${data.message.slice(0, 80)}...` : data.message}
          </p>
        ) : (
          <div className="text-gray-400 italic text-[11px]">No body text</div>
        )}
        <div className="flex items-center gap-2">
          <span className="inline-block bg-sky-50 text-sky-600 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-sky-100/40 shadow-sm">
            {data.listSections?.length || 0} sections
          </span>
          <span className="text-[10px] text-gray-400 font-bold">{totalRows} items</span>
        </div>
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-sky-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function SendMediaNode({ data, selected }: { data: BuilderNodeData; selected?: boolean }) {
  const mediaLabel = data.mediaType ? data.mediaType.charAt(0).toUpperCase() + data.mediaType.slice(1) : "Media";
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-pink-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<Paperclip className="w-4 h-4" />}
        title="Send Media"
        color="text-pink-700"
        bgColor="bg-pink-50/50"
        borderColor="border-pink-100/60"
        selected={selected}
      >
        <span className="inline-block bg-pink-100 text-pink-700 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border border-pink-200/40">
          {mediaLabel}
        </span>
        {data.mediaUrl ? (
          <div className="text-[10px] text-gray-500 truncate bg-gray-50 rounded px-2.5 py-1.5 font-mono border border-gray-200/50">
            {data.mediaUrl}
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">No media URL set</div>
        )}
        {data.mediaCaption && (
          <p className="text-[10px] text-gray-400 truncate font-semibold">“{data.mediaCaption}”</p>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-pink-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function MarkAsReadNode({ selected }: { selected?: boolean }) {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-lime-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<CheckCheck className="w-4 h-4" />}
        title="Mark as Read"
        color="text-lime-700"
        bgColor="bg-lime-50/50"
        borderColor="border-lime-100/60"
        selected={selected}
      >
        <div className="flex items-center gap-2.5 bg-gray-50/80 rounded-lg p-2.5 border border-gray-200/50">
          <CheckCheck className="w-4 h-4 text-lime-600 shrink-0" />
          <span className="text-[11px] text-gray-700 font-semibold">Send Blue Read Receipts</span>
        </div>
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-lime-500 !w-3.5 !h-3.5 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export const nodeTypes = {
  start: StartNode,
  conditions: ConditionsNode,
  custom_reply: CustomReplyNode,
  user_reply: UserReplyNode,
  time_gap: TimeGapNode,
  send_template: SendTemplateNode,
  assign_user: AssignUserNode,
  webhook: WebhookNode,
  end: EndNode,
  add_to_group: AddToGroupNode,
  update_contact: UpdateContactNode,
  set_variable: SetVariableNode,
  send_location: SendLocationNode,
  send_list_message: SendListMessageNode,
  send_media: SendMediaNode,
  mark_as_read: MarkAsReadNode,
};
