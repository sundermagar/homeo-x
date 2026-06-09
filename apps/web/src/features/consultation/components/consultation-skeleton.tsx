import React from 'react';
import { cn } from '../../../lib/cn';

export function ConsultationSkeleton() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FAFAF8] text-[#0F0F0E]">
      {/* ═══ LEFT SIDEBAR SKELETON ═══ */}
      <aside className="w-[264px] bg-white border-r border-[#E3E2DF] flex flex-col shrink-0">
        {/* Patient card */}
        <div className="flex gap-3 items-center px-4 py-4 border-b border-[#E3E2DF]">
          <div className="w-[42px] h-[42px] rounded-[11px] pp-skeleton shrink-0" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3.5 w-24 pp-skeleton rounded" />
            <div className="h-2.5 w-32 pp-skeleton rounded" />
          </div>
        </div>
        {/* Chief complaint */}
        <div className="px-[18px] py-3 border-b border-[#E3E2DF] space-y-2">
          <div className="h-2.5 w-20 pp-skeleton rounded" />
          <div className="h-3.5 w-full pp-skeleton rounded" />
          <div className="h-3.5 w-2/3 pp-skeleton rounded" />
        </div>
        {/* Tabs */}
        <div className="flex-1 px-3.5 py-3 space-y-4">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-6 w-12 pp-skeleton rounded-md" />)}
          </div>
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="p-3 border border-[#E3E2DF] rounded-md bg-[#FAFAF8] space-y-2">
                <div className="h-2 w-16 pp-skeleton rounded" />
                <div className="h-3 w-full pp-skeleton rounded" />
                <div className="h-6 w-16 pp-skeleton rounded-md mt-2" />
              </div>
            ))}
          </div>
        </div>
        {/* Bottom bar */}
        <div className="px-[18px] py-3.5 border-t border-[#E3E2DF]">
          <div className="h-9 w-full pp-skeleton rounded-md" />
        </div>
      </aside>

      {/* ═══ CENTER MAIN SKELETON ═══ */}
      <main className="flex-1 min-w-0 flex flex-col relative">
        {/* Top mode bar */}
        <div className="shrink-0 min-h-[48px] bg-white border-b border-[#E3E2DF] px-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-md pp-skeleton" />
          <div className="flex items-center gap-2.5">
            <div className="h-4 w-12 pp-skeleton rounded" />
            <div className="h-6 w-11 rounded-full pp-skeleton" />
            <div className="h-4 w-20 pp-skeleton rounded" />
          </div>
        </div>

        {/* Center content */}
        <div className="flex-1 overflow-auto bg-[#FAFAF8] p-4 lg:p-6 pb-24">
          <div className="max-w-[800px] mx-auto space-y-4">
            <div className="bg-white border border-[#E3E2DF] rounded-xl shadow-sm p-4 h-[400px] flex flex-col">
              <div className="h-4 w-32 pp-skeleton rounded mb-4" />
              <div className="flex-1 pp-skeleton rounded-md opacity-50" />
            </div>
            <div className="bg-white border border-[#E3E2DF] rounded-xl shadow-sm p-4 h-[200px] flex flex-col">
              <div className="h-4 w-24 pp-skeleton rounded mb-4" />
              <div className="flex-1 pp-skeleton rounded-md opacity-50" />
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="shrink-0 min-h-[48px] border-t border-[#E3E2DF] bg-white px-[18px] py-2 flex items-center justify-between">
          <div className="h-4 w-40 pp-skeleton rounded" />
          <div className="flex gap-2">
            <div className="h-9 w-24 pp-skeleton rounded-md" />
            <div className="h-9 w-32 pp-skeleton rounded-md" />
          </div>
        </div>
      </main>

      {/* ═══ RIGHT RAIL SKELETON ═══ */}
      <aside className="w-[360px] bg-white border-l border-[#E3E2DF] flex flex-col shrink-0 relative shadow-[-4px_0_12px_rgba(0,0,0,0.02)]">
        {/* Rail header */}
        <div className="h-14 border-b border-[#E3E2DF] bg-[#FAFAF8] px-4 flex items-center justify-between">
          <div className="h-4 w-20 pp-skeleton rounded" />
          <div className="h-7 w-20 pp-skeleton rounded-md" />
        </div>
        {/* Rail content */}
        <div className="flex-1 p-4 space-y-4">
          <div className="h-10 w-full pp-skeleton rounded-lg" />
          <div className="h-32 w-full pp-skeleton rounded-lg opacity-50" />
          <div className="h-20 w-full pp-skeleton rounded-lg opacity-50" />
        </div>
      </aside>
    </div>
  );
}
