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

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, Zap } from 'lucide-react';

interface HeaderProps {
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (description: string) => void;
  trigger: string;
  setTrigger: (trigger: string) => void;
  automation: any;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
  isDemo: boolean;
}

export function Header({
  name,
  setName,
  description,
  setDescription,
  trigger,
  setTrigger,
  automation,
  onClose,
  onSave,
  isSaving,
  isDemo,
}: HeaderProps) {
  return (
    <div className="bg-[var(--bg-card)]/80 backdrop-blur-md border-b border-gray-100 px-5 py-3 flex items-center justify-between gap-4 shrink-0 shadow-sm z-10">
      <div className="flex items-center gap-4">
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 border border-gray-100 transition-all active:scale-95 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="h-6 w-px bg-gray-200/60" />

        <div className="flex flex-col min-w-[200px]">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Untitled Flow"
            className="h-6 text-sm font-bold border-none shadow-none p-0 focus:ring-0 focus:outline-none bg-transparent placeholder:text-gray-300 text-gray-900 tracking-wide"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            className="h-4 text-[10px] text-gray-400 border-none shadow-none p-0 focus:ring-0 focus:outline-none bg-transparent placeholder:text-gray-300 font-medium mt-0.5"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-gray-50/80 rounded-xl px-3 py-1.5 border border-gray-100 shadow-sm transition-all hover:bg-gray-50">
          <Zap className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
            Trigger:
          </span>
          <Select value={trigger} onValueChange={setTrigger}>
            <SelectTrigger className="h-5 text-[11px] w-[135px] border-none bg-transparent shadow-none p-0 focus:ring-0 font-bold text-gray-700 select-none">
              <SelectValue placeholder="Select trigger" />
            </SelectTrigger>
            <SelectContent className="border border-gray-100 shadow-lg rounded-xl">
              <SelectItem
                value="new_conversation"
                className="text-xs font-semibold text-gray-700 rounded-lg"
              >
                New conversation
              </SelectItem>
              <SelectItem
                value="message_received"
                className="text-xs font-semibold text-gray-700 rounded-lg"
              >
                Message received
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Badge
          variant="outline"
          className={`text-[9px] h-6 px-2.5 font-black uppercase tracking-widest rounded-lg border shadow-sm transition-all duration-300 ${
            automation?.id
              ? 'bg-gradient-to-r from-blue-50/60 to-indigo-50/60 text-indigo-600 border-blue-200/50 shadow-indigo-50'
              : 'bg-gradient-to-r from-emerald-50/60 to-green-50/60 text-emerald-600 border-emerald-200/50 shadow-emerald-50'
          }`}
        >
          {automation?.id ? 'Editing Flow' : 'New Flow'}
        </Badge>

        <Button
          size="sm"
          onClick={onSave}
          disabled={isDemo || isSaving}
          className="h-8.5 px-4 text-xs font-bold gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-200/40 hover:shadow-lg hover:shadow-blue-300/50 transition-all duration-300 active:scale-95 text-white"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              Save Flow
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
