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

import {
  MessageCircle,
  HelpCircle,
  GitBranch,
  Clock,
  FileText,
  Users,
  Globe,
  CircleStop,
  UserPlus,
  UserCog,
  Variable,
  MapPin,
  List,
  Paperclip,
  CheckCheck,
  Info,
} from "lucide-react";
import { NodeKind } from "./types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  onAddNode: (kind: NodeKind) => void;
}

const nodeCategories = [
  {
    label: "Messages",
    items: [
      {
        kind: "custom_reply" as NodeKind,
        name: "Send Message",
        icon: MessageCircle,
        color: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-200",
        tip: "Send a text message, image, video, or button reply to the customer. Use this for greetings, confirmations, or any direct communication.",
      },
      {
        kind: "user_reply" as NodeKind,
        name: "Ask Question",
        icon: HelpCircle,
        color: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200",
        tip: "Ask the customer a question and wait for their reply. The response is saved in a variable you can use in later steps (e.g., collect name, order ID).",
      },
      {
        kind: "send_template" as NodeKind,
        name: "Template",
        icon: FileText,
        color: "text-teal-600",
        bg: "bg-teal-50",
        border: "border-teal-200",
        tip: "Send a pre-approved WhatsApp template message. Required when the 24-hour messaging window has expired. Select from your approved templates.",
      },
      {
        kind: "send_list_message" as NodeKind,
        name: "List Msg",
        icon: List,
        color: "text-sky-600",
        bg: "bg-sky-50",
        border: "border-sky-200",
        tip: "Send an interactive list with clickable options organized in sections. Great for menus, product catalogs, or multi-choice selections (up to 10 items).",
      },
      {
        kind: "send_media" as NodeKind,
        name: "Media",
        icon: Paperclip,
        color: "text-pink-600",
        bg: "bg-pink-50",
        border: "border-pink-200",
        tip: "Send an image, video, audio, or document file via URL. Add an optional caption. Use for product photos, brochures, invoices, or audio messages.",
      },
      {
        kind: "send_location" as NodeKind,
        name: "Location",
        icon: MapPin,
        color: "text-rose-600",
        bg: "bg-rose-50",
        border: "border-rose-200",
        tip: "Send a GPS location pin with an optional name and address. Perfect for sharing store locations, delivery points, or meeting spots.",
      },
    ],
  },
  {
    label: "Logic & Flow",
    items: [
      {
        kind: "conditions" as NodeKind,
        name: "Condition",
        icon: GitBranch,
        color: "text-purple-600",
        bg: "bg-purple-50",
        border: "border-purple-200",
        tip: "Branch the flow based on keywords or rules. Check if the customer's message contains, equals, or starts with specific words to route them down different paths.",
      },
      {
        kind: "time_gap" as NodeKind,
        name: "Delay",
        icon: Clock,
        color: "text-slate-600",
        bg: "bg-slate-100",
        border: "border-slate-200",
        tip: "Pause the flow for a set duration before continuing to the next step. Use for spacing out messages or waiting before follow-ups (seconds to hours).",
      },
      {
        kind: "set_variable" as NodeKind,
        name: "Variable",
        icon: Variable,
        color: "text-violet-600",
        bg: "bg-violet-50",
        border: "border-violet-200",
        tip: "Store a value for use in later steps. Set from a static value, the customer's last message, or a webhook response. Use {{varName}} in text fields to insert it.",
      },
    ],
  },
  {
    label: "Actions",
    items: [
      {
        kind: "assign_user" as NodeKind,
        name: "Assign",
        icon: Users,
        color: "text-indigo-600",
        bg: "bg-indigo-50",
        border: "border-indigo-200",
        tip: "Route the conversation to a specific team member or agent. Use after qualifying a lead or when human intervention is needed.",
      },
      {
        kind: "webhook" as NodeKind,
        name: "Webhook",
        icon: Globe,
        color: "text-orange-600",
        bg: "bg-orange-50",
        border: "border-orange-200",
        tip: "Call an external API or webhook URL. Send data from the conversation and use the response in subsequent steps. Great for CRM updates, order lookups, or integrations.",
      },
      {
        kind: "mark_as_read" as NodeKind,
        name: "Read",
        icon: CheckCheck,
        color: "text-lime-600",
        bg: "bg-lime-50",
        border: "border-lime-200",
        tip: "Mark the customer's message as read (blue ticks) and reset the unread counter. Use to acknowledge receipt before processing.",
      },
      {
        kind: "end" as NodeKind,
        name: "End",
        icon: CircleStop,
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
        tip: "Stop the automation flow here. No further nodes will execute after this point. Use to cleanly terminate a conversation path.",
      },
    ],
  },
  {
    label: "Contacts",
    items: [
      {
        kind: "add_to_group" as NodeKind,
        name: "Add Group",
        icon: UserPlus,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        tip: "Add the contact to a specific group for segmentation. Use to tag leads, customers, or interests for targeted campaigns later.",
      },
      {
        kind: "update_contact" as NodeKind,
        name: "Update",
        icon: UserCog,
        color: "text-cyan-600",
        bg: "bg-cyan-50",
        border: "border-cyan-200",
        tip: "Update contact details like name, email, notes, or tags. Supports {{variables}} so you can save collected info (e.g., set name from a question response).",
      },
    ],
  },
];

const hoverShadows: Record<string, string> = {
  custom_reply: "hover:shadow-blue-100/80 hover:border-blue-300",
  user_reply: "hover:shadow-amber-100/80 hover:border-amber-300",
  send_template: "hover:shadow-teal-100/80 hover:border-teal-300",
  send_list_message: "hover:shadow-sky-100/80 hover:border-sky-300",
  send_media: "hover:shadow-pink-100/80 hover:border-pink-300",
  send_location: "hover:shadow-rose-100/80 hover:border-rose-300",
  conditions: "hover:shadow-purple-100/80 hover:border-purple-300",
  time_gap: "hover:shadow-slate-200/80 hover:border-slate-300",
  set_variable: "hover:shadow-violet-100/80 hover:border-violet-300",
  assign_user: "hover:shadow-indigo-100/80 hover:border-indigo-300",
  webhook: "hover:shadow-orange-100/80 hover:border-orange-300",
  mark_as_read: "hover:shadow-lime-100/80 hover:border-lime-300",
  end: "hover:shadow-red-100/80 hover:border-red-300",
  add_to_group: "hover:shadow-emerald-100/80 hover:border-emerald-300",
  update_contact: "hover:shadow-cyan-100/80 hover:border-cyan-300",
};

export function Sidebar({ onAddNode }: SidebarProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-[260px] shrink-0 h-full bg-gradient-to-b from-white to-gray-50/30 flex flex-col border-r border-gray-100 overflow-hidden z-10">
        <div className="px-3.5 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-white shrink-0">
          <div className="font-bold text-xs text-gray-900 tracking-wide">Flow Nodes</div>
          <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1 font-medium">
            <span>Click to add</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span>hover <Info className="w-2.5 h-2.5 inline" /> for help</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-3">
          {nodeCategories.map((category) => (
            <div key={category.label}>
              <div className="text-[9px] font-black uppercase tracking-widest text-gray-400/80 mb-2 px-1">
                {category.label}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {category.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.kind} className="relative">
                      <button
                        onClick={() => onAddNode(item.kind)}
                        className={`w-full flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border ${item.border} ${item.bg} hover:shadow-lg ${hoverShadows[item.kind] || "hover:shadow-gray-100"} hover:-translate-y-0.5 transition-all duration-300 ease-out cursor-pointer active:scale-95 group`}
                      >
                        <Icon className={`w-5 h-5 ${item.color} transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-3`} />
                        <span className="text-[10px] font-semibold text-gray-600 leading-tight text-center w-full">
                          {item.name}
                        </span>
                      </button>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="absolute top-1 right-1 p-0.5 rounded-full hover:bg-[var(--bg-card)]/80 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Info className="w-3 h-3 text-gray-300 hover:text-gray-500" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[220px] text-xs leading-relaxed p-3 shadow-md border border-gray-100 bg-[var(--bg-card)] text-gray-700">
                          <p className="font-bold text-gray-900 mb-1 flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${item.bg}`} style={{ border: `1px solid ${item.color.replace('text-', 'var(--')}` }} />
                            {item.name}
                          </p>
                          <p className="text-gray-500 font-medium leading-normal">{item.tip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
