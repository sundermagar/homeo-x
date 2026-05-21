import React from 'react';
import { cn } from '../../../lib/cn';

export function ConsultationSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] w-full overflow-hidden bg-[#FAFAF8]">
      {/* ═══ SIDEBAR SKELETON ═══ */}
      <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-[#E3E2DF] flex flex-col shrink-0 z-10">
        {/* Patient Card Skeleton */}
        <div className="px-4 py-3 lg:px-5 lg:py-4 border-b border-[#E3E2DF] bg-[#FAFAF8] flex items-center lg:items-start lg:flex-col gap-3 lg:gap-0">
          <div className="w-10 h-10 rounded-lg pp-skeleton lg:mb-3 shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 w-24 pp-skeleton rounded" />
            <div className="h-3 w-32 pp-skeleton rounded" />
          </div>
          <div className="flex flex-col lg:flex-row lg:flex-wrap gap-1 lg:gap-2 lg:mt-3 items-end lg:items-center shrink-0">
            <div className="h-4 w-12 pp-skeleton rounded-[4px]" />
            <div className="h-4 w-16 pp-skeleton rounded-[4px]" />
          </div>
        </div>

        {/* Step Navigation Skeleton */}
        <nav className="flex-none lg:flex-1 px-4 py-3 lg:py-4 flex flex-wrap lg:flex-col gap-2 lg:gap-0 lg:space-y-1 border-b lg:border-b-0 border-[#E3E2DF]">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-none lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2.5 rounded-md">
              <div className="w-5 h-5 rounded-full pp-skeleton shrink-0" />
              <div className="h-3 w-28 pp-skeleton rounded" />
            </div>
          ))}
        </nav>

        {/* Session Info Skeleton */}
        <div className="hidden lg:block px-4 py-3 border-t border-[#E3E2DF] bg-[#FAFAF8]">
          <div className="h-2 w-16 pp-skeleton rounded mb-2" />
          <div className="h-3 w-full pp-skeleton rounded mb-1" />
          <div className="h-3 w-2/3 pp-skeleton rounded" />
          <div className="mt-4 h-8 w-full pp-skeleton rounded-md" />
        </div>
      </aside>

      {/* ═══ MAIN CONTENT SKELETON ═══ */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">
          <div className="max-w-[1200px] mx-auto px-4 lg:px-5 py-5 pb-8 space-y-8">
            
            {/* Top Progress / Stepper */}
            <div className="space-y-3">
              <div className="h-3 w-16 pp-skeleton rounded" />
              <div className="h-1.5 w-full bg-[#E3E2DF] rounded-full overflow-hidden">
                <div className="h-full w-1/4 pp-skeleton" />
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-3">
              <div className="h-8 w-64 pp-skeleton rounded" />
              <div className="h-4 w-96 pp-skeleton rounded" />
            </div>

            {/* Content Cards */}
            <div className="space-y-6">
              {/* Card 1: Patient Details */}
              <div className="bg-white border border-[#E3E2DF] rounded-xl p-6 space-y-6">
                <div className="h-3 w-24 pp-skeleton rounded" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <div className="h-3 w-16 pp-skeleton rounded" />
                    <div className="h-10 w-full pp-skeleton rounded-lg border border-[#E3E2DF]" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <div className="h-3 w-8 pp-skeleton rounded" />
                       <div className="h-10 w-full pp-skeleton rounded-lg border border-[#E3E2DF]" />
                    </div>
                    <div className="space-y-2">
                       <div className="h-3 w-12 pp-skeleton rounded" />
                       <div className="h-10 w-full pp-skeleton rounded-lg border border-[#E3E2DF]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Chief Complaint */}
              <div className="bg-white border border-[#E3E2DF] rounded-xl p-6 space-y-4">
                <div className="h-3 w-32 pp-skeleton rounded" />
                <div className="h-24 w-full pp-skeleton rounded-lg border border-[#E3E2DF]" />
              </div>

              {/* Card 3: Case Type */}
              <div className="bg-white border border-[#E3E2DF] rounded-xl p-6 space-y-4">
                <div className="h-3 w-20 pp-skeleton rounded" />
                <div className="flex gap-4">
                  <div className="h-10 w-24 pp-skeleton rounded-lg border border-[#E3E2DF]" />
                  <div className="h-10 w-24 pp-skeleton rounded-lg border border-[#E3E2DF]" />
                  <div className="h-10 w-24 pp-skeleton rounded-lg border border-[#E3E2DF]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar Skeleton */}
        <div className="sticky bottom-0 z-40 border-t border-[#E3E2DF] bg-white px-4 py-3 safe-area-bottom">
          <div className="flex items-center justify-between">
            <div className="h-10 w-24 pp-skeleton rounded-md" />
            <div className="h-10 w-40 pp-skeleton rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
