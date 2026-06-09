import React, { useMemo } from 'react';
import { Drawer } from '../../../shared/components/drawer';
import { useNavigate } from 'react-router-dom';
import type { QueueItem } from '@mmc/types';
import { useFullMedicalCase } from '../../medical-case/hooks/use-medical-cases';
import { usePatientPrescriptions } from '../../medical-case/hooks/use-remedy-chart';
import { Activity, Pill, FileText, Stethoscope, Calendar, TrendingUp, ChevronRight } from 'lucide-react';

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
  const regid = patient?.regid || patient?.patientId || 0;

  // Fetch real clinical data
  const { data: fullData, isLoading: clinicalLoading } = useFullMedicalCase(Number(regid));
  const { data: prescriptionsHistory = [] } = usePatientPrescriptions(Number(regid));

  if (!patient) return null;

  const medicalCase = fullData?.medicalCase;
  const vitals = fullData?.vitals || [];
  const notes = fullData?.notes || [];
  const soap = fullData?.soap || [];
  const investigations = fullData?.investigations || [];
  const prescriptions = fullData?.prescriptions || [];

  // Calculate real stats
  const followupNotes = notes.filter((n: any) =>
    n.notesType === 'Followup' || n.noteType === 'Followup' || n.notes_type === 'Followup'
  );

  // Build visit history from prescriptions + followup notes + SOAP entries
  const visitHistory = useMemo(() => {
    const visits: { date: Date; dateStr: string; complaint: string; doctor: string; type: string; prescriptions: any[] }[] = [];
    const dateMap = new Map<string, { date: Date; complaint: string; doctor: string; type: string; prescriptions: any[] }>();

    // From prescriptions history (remedy chart)
    (prescriptionsHistory || []).forEach((rx: any) => {
      const d = new Date(rx.created_at || rx.createdAt || rx.dateval || 0);
      if (isNaN(d.getTime())) return;
      const key = d.toDateString();
      if (!dateMap.has(key)) {
        dateMap.set(key, {
          date: d,
          complaint: '',
          doctor: medicalCase?.doctorName || patient.doctorName || '',
          type: 'Prescription',
          prescriptions: [],
        });
      }
      const entry = dateMap.get(key)!;
      entry.prescriptions.push({
        medicine: rx.remedy_name || rx.remedyName || rx.medicineName || rx.medicine || '',
        potency: rx.potency_name || rx.potencyName || rx.potency || '',
        frequency: rx.frequency_name || rx.frequencyTitle || rx.frequency || '',
        days: rx.days,
      });
    });

    // From full data prescriptions
    (prescriptions || []).forEach((rx: any) => {
      const d = new Date(rx.createdAt || rx.created_at || rx.dateval || 0);
      if (isNaN(d.getTime())) return;
      const key = d.toDateString();
      if (!dateMap.has(key)) {
        dateMap.set(key, {
          date: d,
          complaint: '',
          doctor: medicalCase?.doctorName || patient.doctorName || '',
          type: 'Prescription',
          prescriptions: [],
        });
      }
      const entry = dateMap.get(key)!;
      const medName = rx.medicineName || rx.remedy_name || rx.remedyName || '';
      // Don't add duplicates
      if (medName && !entry.prescriptions.some((p: any) => p.medicine === medName)) {
        entry.prescriptions.push({
          medicine: medName,
          potency: rx.potencyName || rx.potency_name || rx.potency || '',
          frequency: rx.frequencyTitle || rx.frequency_name || rx.frequency || '',
          days: rx.days,
        });
      }
    });

    // From SOAP entries (complaints / diagnosis)
    (soap || []).forEach((s: any) => {
      const d = new Date(s.createdAt || s.created_at || s.visitDate || 0);
      if (isNaN(d.getTime())) return;
      const key = d.toDateString();
      if (!dateMap.has(key)) {
        dateMap.set(key, {
          date: d,
          complaint: s.subjective || s.assessment || '',
          doctor: medicalCase?.doctorName || patient.doctorName || '',
          type: s.assessment ? 'Follow-up' : 'Visit',
          prescriptions: [],
        });
      } else {
        const entry = dateMap.get(key)!;
        if (!entry.complaint && (s.subjective || s.assessment)) {
          entry.complaint = s.subjective || s.assessment || '';
        }
      }
    });

    // From followup notes
    followupNotes.forEach((n: any) => {
      const d = new Date(n.createdAt || n.created_at || n.dateval || 0);
      if (isNaN(d.getTime())) return;
      const key = d.toDateString();
      if (!dateMap.has(key)) {
        dateMap.set(key, {
          date: d,
          complaint: (n.notes || '').substring(0, 80),
          doctor: medicalCase?.doctorName || patient.doctorName || '',
          type: 'Follow-up',
          prescriptions: [],
        });
      } else {
        const entry = dateMap.get(key)!;
        if (!entry.complaint && n.notes) {
          entry.complaint = (n.notes || '').substring(0, 80);
        }
        if (entry.type === 'Prescription') entry.type = 'Follow-up';
      }
    });

    // Sort by date descending
    dateMap.forEach((v) => visits.push({ ...v, dateStr: v.date.toDateString() }));
    visits.sort((a, b) => b.date.getTime() - a.date.getTime());
    return visits;
  }, [prescriptionsHistory, prescriptions, soap, followupNotes, medicalCase, patient.doctorName]);

  const totalVisits = visitHistory.length || (notes.length > 0 ? 1 : 0);

  // Latest vitals
  const latestVitals = vitals[0] || null;

  // Last seen
  const lastSeenDate = visitHistory[0]?.date;
  const lastSeenStr = lastSeenDate
    ? lastSeenDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
    : '—';

  // Registration date
  const sinceDate = medicalCase?.registeredAt || medicalCase?.createdAt;
  const sinceStr = sinceDate
    ? new Date(sinceDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
    : 'Today';

  // Outstanding balance
  const balance = medicalCase?.outstandingBalance || 0;
  const balanceStr = balance > 0 ? `₹${balance}` : '₹0';

  const initials = (patient.patientName || 'A')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const formatDate = (d: Date) => {
    const day = d.getDate();
    const month = d.toLocaleString('default', { month: 'short' });
    return `${day} ${month}`;
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="520px"
      title={
        <div className="flex items-center gap-4 py-2">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-lg flex-shrink-0">
            {initials}
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">{patient.patientName}</div>
            <div className="text-xs text-slate-500 font-normal mt-1">
              {patient.age || '--'} Yrs {patient.gender?.charAt(0) || ''} · MRN-{patient.regid} · {(patient as any).phone || '—'}
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
              <span className="text-sm font-bold text-slate-900">{clinicalLoading ? '...' : totalVisits}</span>
              <span className="text-[10px] text-slate-500 mt-1">Visits</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col">
              <span className="text-sm font-bold text-slate-900">{clinicalLoading ? '...' : lastSeenStr}</span>
              <span className="text-[10px] text-slate-500 mt-1">Last seen</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col">
              <span className="text-sm font-bold text-slate-900">{clinicalLoading ? '...' : sinceStr}</span>
              <span className="text-[10px] text-slate-500 mt-1">Since</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col">
              <span className={`text-sm font-bold ${balance > 0 ? 'text-red-600' : 'text-green-700'}`}>
                {clinicalLoading ? '...' : balanceStr}
              </span>
              <span className="text-[10px] text-slate-500 mt-1">{balance > 0 ? 'Dues' : 'No dues'}</span>
            </div>
          </div>

          {/* Diagnosis */}
          {medicalCase?.condition && (
            <div className="mb-8">
              <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase font-mono mb-3">
                Diagnosis
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm font-semibold text-blue-800">
                {medicalCase.condition}
              </div>
            </div>
          )}

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
            {/* Show from current queue vitals OR latest from DB */}
            {(() => {
              const v = patient.vitals || latestVitals;
              const hasSomething = v && (v.systolicBp || v.diastolicBp || v.pulseRate || v.temperatureF || v.weightKg || v.bp || v.pulse || v.temp || v.weight);
              if (!hasSomething) {
                return <div className="text-sm text-slate-400">Not recorded — optional.</div>;
              }
              return (
                <div className="flex gap-6 flex-wrap border border-slate-100 bg-slate-50 rounded-xl p-4">
                  {(v.systolicBp || v.diastolicBp || v.bp) && (
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">
                        {v.systolicBp && v.diastolicBp ? `${v.systolicBp}/${v.diastolicBp}` : v.systolicBp || v.diastolicBp || v.bp}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5">BP</span>
                    </div>
                  )}
                  {(v.pulseRate || v.pulse) && (
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">{v.pulseRate || v.pulse}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Pulse</span>
                    </div>
                  )}
                  {(v.temperatureF || v.temp) && (
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">{v.temperatureF || v.temp}°F</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Temp</span>
                    </div>
                  )}
                  {(v.weightKg || v.weight) && (
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">{v.weightKg || v.weight} kg</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Weight</span>
                    </div>
                  )}
                  {v.heightCm && (
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">{v.heightCm} cm</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Height</span>
                    </div>
                  )}
                  {v.oxygenSaturation && (
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900">{v.oxygenSaturation}%</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">SpO2</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Visit History */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase font-mono mb-5">
              Visit History ({totalVisits})
            </div>
            
            {clinicalLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex gap-4">
                    <div className="w-14 h-10 bg-slate-100 rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-100 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : visitHistory.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-8">
                No visit records found.
              </div>
            ) : (
              <div className="space-y-1">
                {visitHistory.map((visit, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onClose();
                      navigate(`/medical-cases/${regid}`);
                    }}
                    className="w-full text-left flex gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-200"
                  >
                    {/* Date column */}
                    <div className="w-14 flex-shrink-0 text-center">
                      <div className="text-base font-bold text-slate-800 leading-none">
                        {visit.date.getDate()}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5">
                        {visit.date.toLocaleString('default', { month: 'short' })}
                      </div>
                      <div className="text-[9px] text-slate-300 mt-0.5">
                        {visit.date.getFullYear()}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {visit.complaint && (
                        <div className="text-sm font-semibold text-slate-800 mb-1.5 truncate">
                          {visit.complaint}
                        </div>
                      )}
                      
                      {/* Medicines prescribed */}
                      {visit.prescriptions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {visit.prescriptions.slice(0, 3).map((rx: any, ri: number) => (
                            <span key={ri} className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                              <Pill size={9} />
                              {rx.medicine}{rx.potency ? ` ${rx.potency}` : ''}
                            </span>
                          ))}
                          {visit.prescriptions.length > 3 && (
                            <span className="text-[10px] text-slate-400 self-center">
                              +{visit.prescriptions.length - 3} more
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {visit.doctor && (
                          <span className="bg-blue-50 text-blue-700 font-mono text-[10px] px-2 py-0.5 rounded">
                            Dr {visit.doctor}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-medium">
                          {visit.type}
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex-shrink-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight size={14} className="text-slate-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Investigation Summary */}
          {investigations.length > 0 && (
            <div className="mt-8">
              <div className="text-[10px] font-bold text-slate-400 tracking-widest uppercase font-mono mb-3">
                Investigations ({investigations.length})
              </div>
              <div className="space-y-2">
                {investigations.slice(0, 3).map((inv: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                    <div className="w-7 h-7 rounded-md bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <FileText size={13} className="text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">{inv.type || inv.category || 'Report'}</div>
                      <div className="text-[10px] text-slate-400">
                        {inv.investigationDate || inv.createdAt
                          ? new Date(inv.investigationDate || inv.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })
                          : '—'}
                      </div>
                    </div>
                  </div>
                ))}
                {investigations.length > 3 && (
                  <div className="text-[10px] text-blue-600 font-semibold text-center">
                    +{investigations.length - 3} more reports
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Bottom Pinned Bar */}
        <div className="p-5 border-t border-slate-100 bg-white space-y-2">
          <button
            onClick={() => {
              onClose();
              navigate(`/medical-cases/${regid}`);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Stethoscope size={16} />
            Full Medical Record
          </button>
          <button
            onClick={() => {
              onClose();
              navigate(`/patients/${regid}`);
            }}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs py-2.5 rounded-xl transition-colors"
          >
            Patient Profile
          </button>
        </div>
      </div>
    </Drawer>
  );
}
