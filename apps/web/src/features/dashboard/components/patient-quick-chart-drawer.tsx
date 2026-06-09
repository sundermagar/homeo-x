import React from 'react';
import { Drawer } from '../../../shared/components/drawer';
import { useNavigate } from 'react-router-dom';
import type { QueueItem } from '@mmc/types';

interface PatientQuickChartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  patient: QueueItem | null;
  onAddVitals?: () => void;
}

export function PatientQuickChartDrawer({
  isOpen,
  onClose,
  patient,
  onAddVitals,
}: PatientQuickChartDrawerProps) {
  const navigate = useNavigate();

  if (!patient) return null;

  // Mocked data since QueueItem doesn't have full historical stats natively
  const mockedVisits = 1;
  const mockedLastSeen = '—';
  const mockedSince = 'Today';
  const mockedDues = '₹0';
  const mockedComplaint = patient.notes || 'Routine checkup. Documented symptoms pending triage.';
  const mockedDoctor = patient.doctorName || 'General';

  const initials = (patient.patientName || 'A')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="500px"
      title={
        <div className="flex items-center gap-4 py-2">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-lg flex-shrink-0">
            {initials}
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">{patient.patientName}</div>
            <div className="text-xs text-slate-500 font-normal mt-1">
              {patient.age || '--'} Yrs {patient.gender?.charAt(0) || ''} · MRN-{patient.regid} · {patient.phone || '—'}
            </div>
          </div>
        </div>
      }
    >
      <div className="flex flex-col h-full bg-white">
        
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 border-t border-slate-100">
          
          {/* Metrics Grid */}
          <div className="grid grid-cols-4 gap-3 mb-10">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col">
              <span className="text-sm font-bold text-slate-900">{mockedVisits}</span>
              <span className="text-[10px] text-slate-500 mt-1">Visits</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col">
              <span className="text-sm font-bold text-slate-900">{mockedLastSeen}</span>
              <span className="text-[10px] text-slate-500 mt-1">Last seen by</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col">
              <span className="text-sm font-bold text-slate-900">{mockedSince}</span>
              <span className="text-[10px] text-slate-500 mt-1">Since</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col">
              <span className="text-sm font-bold text-green-700">{mockedDues}</span>
              <span className="text-[10px] text-slate-500 mt-1">No dues</span>
            </div>
          </div>

          {/* Vitals */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase font-mono">
                Vitals
              </div>
              <button 
                onClick={onAddVitals}
                className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md hover:bg-emerald-100 transition-colors"
              >
                + Add
              </button>
            </div>
            {patient.vitals && (patient.vitals.systolicBp || patient.vitals.diastolicBp || patient.vitals.pulseRate || patient.vitals.temperatureF || patient.vitals.weightKg || patient.vitals.bp || patient.vitals.pulse || patient.vitals.temp || patient.vitals.weight) ? (
              <div className="flex gap-8 border border-slate-100 bg-slate-50 rounded-xl p-4">
                {(patient.vitals.systolicBp || patient.vitals.diastolicBp || patient.vitals.bp) && (
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900">
                      {patient.vitals.systolicBp && patient.vitals.diastolicBp 
                        ? `${patient.vitals.systolicBp}/${patient.vitals.diastolicBp}` 
                        : patient.vitals.systolicBp || patient.vitals.diastolicBp || patient.vitals.bp}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">BP</span>
                  </div>
                )}
                {(patient.vitals.pulseRate || patient.vitals.pulse) && (
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900">{patient.vitals.pulseRate || patient.vitals.pulse}</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Pulse (bpm)</span>
                  </div>
                )}
                {(patient.vitals.temperatureF || patient.vitals.temp) && (
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900">{patient.vitals.temperatureF || patient.vitals.temp}°F</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Temp</span>
                  </div>
                )}
                {(patient.vitals.weightKg || patient.vitals.weight) && (
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900">{patient.vitals.weightKg || patient.vitals.weight}kg</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Weight</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-400">
                Not recorded — optional.
              </div>
            )}
          </div>

          {/* Visit History */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase font-mono mb-6">
              Visit History
            </div>
            
            <div className="flex gap-4">
              <div className="w-12 flex-shrink-0 text-[11px] font-mono text-slate-500 leading-snug">
                30 May
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 mb-2">
                  {mockedComplaint}
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-blue-50 text-blue-700 font-mono text-[10px] px-2 py-0.5 rounded">
                    Dr {mockedDoctor}
                  </span>
                  <span className="text-xs text-slate-500">
                    New case
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Pinned Bar */}
        <div className="p-6 border-t border-slate-100 bg-white">
          <button
            onClick={() => {
              onClose();
              navigate(`/patients/${patient.regid}`);
            }}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-sm py-3.5 rounded-xl transition-colors border border-slate-200"
          >
            Full record
          </button>
        </div>
      </div>
    </Drawer>
  );
}
