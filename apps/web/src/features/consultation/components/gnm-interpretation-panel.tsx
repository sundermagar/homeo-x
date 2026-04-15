import { useState, useRef, useEffect } from 'react';
import { Activity, ChevronDown, ChevronRight, Zap, Layers, Heart, Stethoscope, ClipboardList, Trophy, CheckSquare, Sparkles, Plus } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Textarea } from '../../../components/ui/textarea';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { RubricRepertory } from './rubric-repertory';
import type { GnmAnalysis, SuggestedRubric } from '../../../types/ai';

// ─── Collapsible Card ───

function CollapsibleCard({ id, icon: Icon, title, iconColor, borderColor, cardBg, headerBg, visible, defaultOpen = true, badge, children }: {
  id: string; icon: React.ElementType; title: string;
  iconColor: string; borderColor: string; cardBg?: string; headerBg?: string;
  visible: boolean; defaultOpen?: boolean; badge?: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!visible) return null;

  return (
    <Card id={`gnm-${id}`} style={{ borderRadius: 'var(--radius-xl)', border: `1px solid ${borderColor}`, background: cardBg || 'var(--bg-card)', overflow: 'hidden', boxShadow: 'var(--shadow-xs)', animation: 'fadeIn 0.3s ease-out' }}>
      <button type="button" onClick={() => setOpen(!open)} style={{ width: '100%', padding: '0.75rem 1rem', background: headerBg || 'var(--bg-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', border: 'none', borderBottom: `1px solid ${borderColor}`, transition: 'background var(--transition-fast)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Icon style={{ width: 16, height: 16, color: iconColor }} />
          <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{title}</span>
          {badge}
        </div>
        {open ? <ChevronDown style={{ width: 14, height: 14, color: 'var(--text-disabled)' }} /> : <ChevronRight style={{ width: 14, height: 14, color: 'var(--text-disabled)' }} />}
      </button>
      {open && <CardContent style={{ padding: '1rem', animation: 'fadeIn 0.2s ease-out' }}>{children}</CardContent>}
    </Card>
  );
}

// ─── Match Badge ───
function MatchBadge({ strength }: { strength: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    strongest: { bg: '#D1FAE5', color: '#065F46' },
    strong:    { bg: '#DBEAFE', color: '#1E3A8A' },
    moderate:  { bg: '#FEF3C7', color: '#92400E' },
  };
  const style = colors[strength] || colors['moderate'] || { bg: '#FEF3C7', color: '#92400E' };
  return <span style={{ fontSize: 9, fontWeight: 700, padding: '0.125rem 0.375rem', borderRadius: 'var(--radius-full)', background: style.bg, color: style.color }}>
    {strength.charAt(0).toUpperCase() + strength.slice(1)} Match
  </span>;
}

// ─── Trait Chip ───
function TraitChip({ label, chipStyle }: { label: string; chipStyle: React.CSSProperties }) {
  return <span style={{ fontSize: 10, padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-card)', fontWeight: 500, ...chipStyle }}>{label}</span>;
}

// ─── Sub-section label ───
function SubLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 10, color: 'var(--text-disabled)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem', margin: '0 0 0.375rem' }}>{children}</p>;
}

// ─── Props ───
interface GnmInterpretationPanelProps {
  subjective: string; onSubjectiveChange: (val: string) => void;
  assessment: string; onAssessmentChange: (val: string) => void;
  clinicalNotes: string; onClinicalNotesChange: (val: string) => void;
  gnmAnalysis: GnmAnalysis | null;
  visitId: string;
  onAutoSuggestRemedy?: (remedyName: string, potencies: string[]) => void;
  initialRubrics?: SuggestedRubric[];
  onApplyGnmRemedy?: (remedyName: string, potency: string) => void;
  onCopyToAdvice?: (text: string) => void;
}

export function GnmInterpretationPanel({ subjective, onSubjectiveChange, assessment, onAssessmentChange, clinicalNotes, onClinicalNotesChange, gnmAnalysis, visitId, onAutoSuggestRemedy, initialRubrics, onApplyGnmRemedy, onCopyToAdvice }: GnmInterpretationPanelProps) {
  const subjectiveRef = useRef<HTMLTextAreaElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const autoResize = (ref: React.RefObject<HTMLTextAreaElement | null>) => { if (ref.current) { ref.current.style.height = 'auto'; ref.current.style.height = `${ref.current.scrollHeight}px`; } };

  useEffect(() => { autoResize(subjectiveRef); }, [subjective]);
  useEffect(() => { autoResize(notesRef); }, [clinicalNotes]);

  const hasGnm = !!gnmAnalysis;
  const chipTags = (color: string) => ({ borderRadius: 'var(--radius-card)', border: `1px solid ${color}20`, background: `${color}10`, color });
  const sectionRow = { display: 'flex', flexDirection: 'column' as const, gap: '0.75rem' };
  const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', animation: 'fadeIn 0.4s ease-out' }}>
      {/* 1. Symptoms */}
      <CollapsibleCard id="symptoms" icon={Activity} title="Symptoms" iconColor="#6366F1" borderColor="var(--border-default)"
        badge={<span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>• Symptoms • Duration • Red Flags</span>}
        visible={true}
      >
        <Textarea ref={subjectiveRef} value={subjective} onChange={e => onSubjectiveChange(e.target.value)}
          style={{ fontSize: 14, fontWeight: 500, border: 'none', background: 'transparent', boxShadow: 'none', padding: 0, overflow: 'hidden', resize: 'none', lineHeight: 1.6 }}
          placeholder="Enter symptoms here..." />
      </CollapsibleCard>

      {/* 2. Core Conflict */}
      <CollapsibleCard id="core-conflict" icon={Zap} title="Core Conflict" iconColor="#8B5CF6" borderColor="#DDD6FE" cardBg="rgba(245,243,255,0.3)"
        badge={<span style={{ fontSize: 9, padding: '0.125rem 0.375rem', borderRadius: 'var(--radius-full)', background: '#EDE9FE', color: '#5B21B6', fontWeight: 700 }}>GNM</span>}
        visible={hasGnm}
      >
        {gnmAnalysis?.coreConflict && (
          <div style={sectionRow}>
            <div style={grid2}>
              <div><SubLabel>Conflict Type</SubLabel><p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: '#6D28D9', margin: 0 }}>{gnmAnalysis.coreConflict.conflictType}</p></div>
              <div><SubLabel>Affected Tissue</SubLabel><p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500, color: 'var(--text-secondary)', margin: 0 }}>{gnmAnalysis.coreConflict.affectedTissue}</p></div>
            </div>
            <div><SubLabel>Biological Meaning</SubLabel><p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{gnmAnalysis.coreConflict.biologicalMeaning}</p></div>
            {gnmAnalysis.coreConflict.triggerEvents.length > 0 && (
              <div>
                <SubLabel>Trigger Events</SubLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.375rem' }}>
                  {gnmAnalysis.coreConflict.triggerEvents.map((e, i) => <TraitChip key={i} label={e} chipStyle={chipTags('#7C3AED')} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </CollapsibleCard>

      {/* 3. Conflict Phases */}
      <CollapsibleCard id="conflict-phases" icon={Layers} title="Conflict Phases" iconColor="#F97316" borderColor="#FED7AA" visible={hasGnm}>
        {gnmAnalysis?.phases && (
          <div style={sectionRow}>
            <div style={grid2}>
              <div style={{ borderRadius: 'var(--radius-card)', border: '1px solid #FEE2E2', background: 'rgba(254,242,242,0.5)', padding: '0.75rem' }}>
                <p style={{ fontSize: 9, color: '#EF4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>🔴 Conflict Active</p>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{gnmAnalysis.phases.conflictActive}</p>
              </div>
              <div style={{ borderRadius: 'var(--radius-card)', border: '1px solid #BBF7D0', background: 'rgba(240,253,244,0.5)', padding: '0.75rem' }}>
                <p style={{ fontSize: 9, color: '#16A34A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>🟢 Healing Phase</p>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{gnmAnalysis.phases.healingPhase}</p>
              </div>
            </div>
            {gnmAnalysis.phases.isRecurrentTrack && (
              <div style={{ borderRadius: 'var(--radius-card)', border: '1px solid #FDE68A', background: 'rgba(255,251,235,0.5)', padding: '0.5rem 0.75rem' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#B45309', margin: 0 }}>
                  ⚠️ Recurrent Track Conflict
                  {gnmAnalysis.phases.trackTriggers?.length > 0 && ` — re-triggered by: ${gnmAnalysis.phases.trackTriggers.join(', ')}`}
                </p>
              </div>
            )}
          </div>
        )}
      </CollapsibleCard>

      {/* 4. Homeopathic Totality */}
      <CollapsibleCard id="totality" icon={Heart} title="Homeopathic Totality" iconColor="#EC4899" borderColor="#FBCFE8" visible={hasGnm}>
        {gnmAnalysis?.homeopathicTotality && (
          <div style={sectionRow}>
            <div>
              <SubLabel>Mental / Emotional</SubLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.25rem' }}>
                {gnmAnalysis.homeopathicTotality.mentalEmotional.map((t, i) => <TraitChip key={i} label={t} chipStyle={chipTags('#2563EB')} />)}
              </div>
            </div>
            <div>
              <SubLabel>Physical Generals</SubLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '0.25rem' }}>
                {gnmAnalysis.homeopathicTotality.physicalGenerals.map((g, i) => <TraitChip key={i} label={g} chipStyle={chipTags('#16A34A')} />)}
              </div>
            </div>
          </div>
        )}
      </CollapsibleCard>

      {/* 5. Diagnosis */}
      <CollapsibleCard id="diagnosis" icon={Stethoscope} title="Diagnosis" iconColor="#10B981" borderColor="var(--border-default)" visible={true}>
        <Input value={assessment} onChange={e => onAssessmentChange(e.target.value)}
          style={{ fontSize: 20, fontWeight: 900, border: 'none', background: 'transparent', boxShadow: 'none', padding: 0, height: 'auto' }}
          placeholder="Final diagnosis..." />
      </CollapsibleCard>

      {/* 6. Clinical Notes */}
      <CollapsibleCard id="clinical-notes" icon={ClipboardList} title="Clinical Notes" iconColor="#F59E0B" borderColor="var(--border-default)" visible={true}>
        <Textarea ref={notesRef} value={clinicalNotes} onChange={e => onClinicalNotesChange(e.target.value)}
          style={{ fontSize: 14, border: 'none', background: 'transparent', boxShadow: 'none', padding: 0, overflow: 'hidden', resize: 'none', lineHeight: 1.6 }}
          placeholder="Notes..." />
      </CollapsibleCard>

      {/* 7. Rubrics + Repertorization */}
      <RubricRepertory visitId={visitId} onAutoSuggestRemedy={onAutoSuggestRemedy} initialRubrics={initialRubrics} />

      {/* 8. Ranked Remedies */}
      <CollapsibleCard id="ranked-remedies" icon={Trophy} title="Clinical Ranking" iconColor="#EAB308" borderColor="#FDE68A"
        badge={<span style={{ fontSize: 9, padding: '0.125rem 0.375rem', borderRadius: 'var(--radius-full)', background: '#FEF3C7', color: '#92400E', fontWeight: 700 }}>GNM + Classical</span>}
        visible={hasGnm && (gnmAnalysis?.rankedRemedies?.length ?? 0) > 0}
      >
        {gnmAnalysis?.rankedRemedies && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {gnmAnalysis.rankedRemedies.map((remedy, i) => {
              const medals = ['🥇', '🥈', '🥉'];
              const borders = ['#FCD34D', '#D1D5DB', '#FDBA74'];
              return (
                <div key={i} style={{ borderRadius: 'var(--radius-card)', border: `1px solid ${borders[i] || 'var(--border-default)'}`, background: 'var(--bg-card)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: 18 }}>{medals[i] || `#${remedy.rank}`}</span>
                      <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>{remedy.name}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-disabled)', fontWeight: 500 }}>{remedy.suggestedPotency}</span>
                      <MatchBadge strength={remedy.matchStrength} />
                    </div>
                    <Button size="sm" variant="outline" onClick={() => onApplyGnmRemedy?.(remedy.name, remedy.suggestedPotency)} style={{ height: '1.5rem', fontSize: 10, padding: '0 0.5rem', color: 'var(--color-success-600)', borderColor: 'var(--color-success-200)' }}>
                      <Plus style={{ width: 12, height: 12, marginRight: 2 }} /> Apply to Rx
                    </Button>
                  </div>
                  {remedy.keynotes.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {remedy.keynotes.map((k, j) => <span key={j} style={{ fontSize: 9, padding: '0.125rem 0.375rem', borderRadius: 4, background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}>{k}</span>)}
                    </div>
                  )}
                  {remedy.whenToUse && <p style={{ fontSize: 10, color: 'var(--text-tertiary)', fontStyle: 'italic', margin: 0 }}>When: {remedy.whenToUse}</p>}
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleCard>

      {/* 9. Resolution Strategy */}
      <CollapsibleCard id="resolution" icon={CheckSquare} title="Resolution Strategy" iconColor="#14B8A6" borderColor="#99F6E4"
        badge={<span style={{ fontSize: 9, padding: '0.125rem 0.375rem', borderRadius: 'var(--radius-full)', background: '#CCFBF1', color: '#0F766E', fontWeight: 700 }}>GNM Healing</span>}
        visible={hasGnm}
      >
        {gnmAnalysis?.resolutionStrategy && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {gnmAnalysis.resolutionStrategy.directions.map((dir, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div style={{ width: 16, height: 16, borderRadius: '0.25rem', border: '1px solid var(--border-strong)', flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', margin: 0 }}>{dir}</p>
                </div>
              ))}
            </div>
            {gnmAnalysis.resolutionStrategy.prognosis && (
              <div style={{ borderRadius: 'var(--radius-card)', background: 'rgba(204,251,241,0.3)', border: '1px solid #99F6E4', padding: '0.5rem 0.75rem' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#0F766E', marginBottom: 2 }}>💡 Prognosis</p>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{gnmAnalysis.resolutionStrategy.prognosis}</p>
              </div>
            )}
            {onCopyToAdvice && (
              <Button variant="outline" size="sm" onClick={() => { const text = [...gnmAnalysis.resolutionStrategy.directions, gnmAnalysis.resolutionStrategy.prognosis ? `Prognosis: ${gnmAnalysis.resolutionStrategy.prognosis}` : ''].filter(Boolean).join('\n'); onCopyToAdvice(text); }} style={{ alignSelf: 'flex-start', fontSize: 10, color: '#0F766E', borderColor: '#99F6E4' }}>
                📋 Copy to Advice
              </Button>
            )}
          </div>
        )}
      </CollapsibleCard>

      {/* GNM Confidence */}
      {hasGnm && gnmAnalysis.confidence > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.25rem 0' }}>
          <Sparkles style={{ width: 12, height: 12, color: '#A78BFA' }} />
          <span style={{ fontSize: 9, color: 'var(--text-disabled)', fontWeight: 500 }}>GNM Analysis Confidence: {Math.round(gnmAnalysis.confidence * 100)}%</span>
        </div>
      )}
    </div>
  );
}
