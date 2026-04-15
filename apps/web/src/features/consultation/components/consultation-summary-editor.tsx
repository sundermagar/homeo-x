import { useRef, useEffect } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Textarea } from '../../../components/ui/textarea';
import { Input } from '../../../components/ui/input';
import { Activity, FileText, ClipboardList } from 'lucide-react';

interface ConsultationSummaryEditorProps {
  subjective: string; onSubjectiveChange: (val: string) => void;
  assessment: string; onAssessmentChange: (val: string) => void;
  clinicalNotes: string; onClinicalNotesChange: (val: string) => void;
}

const boxHeaderStyle: React.CSSProperties = {
  padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-light)',
  background: 'var(--bg-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
};
const boxLabelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 900, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' };
const transparentAreaStyle: React.CSSProperties = { border: 'none', background: 'transparent', boxShadow: 'none', padding: 0, overflow: 'hidden', resize: 'none', lineHeight: 1.6 };

export function ConsultationSummaryEditor({ subjective, onSubjectiveChange, assessment, onAssessmentChange, clinicalNotes, onClinicalNotesChange }: ConsultationSummaryEditorProps) {
  const subjectiveRef = useRef<HTMLTextAreaElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const autoResize = (ref: React.RefObject<HTMLTextAreaElement>) => { if (ref.current) { ref.current.style.height = 'auto'; ref.current.style.height = `${ref.current.scrollHeight}px`; } };
  useEffect(() => { autoResize(subjectiveRef); }, [subjective]);
  useEffect(() => { autoResize(notesRef); }, [clinicalNotes]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.4s ease-out' }}>
      <Card style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
        <div style={boxHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity style={{ width: 16, height: 16, color: '#6366F1' }} />
            <span style={boxLabelStyle}>Symptoms</span>
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>• Symptoms • Duration • Red Flags</span>
        </div>
        <CardContent style={{ padding: '1rem' }}>
          <Textarea ref={subjectiveRef} value={subjective} onChange={e => onSubjectiveChange(e.target.value)} style={{ ...transparentAreaStyle, fontSize: 14, fontWeight: 500 }} placeholder="Enter symptoms here..." />
        </CardContent>
      </Card>

      <Card style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
        <div style={boxHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileText style={{ width: 16, height: 16, color: '#10B981' }} />
            <span style={boxLabelStyle}>Diagnosis</span>
          </div>
        </div>
        <CardContent style={{ padding: '1rem' }}>
          <Input value={assessment} onChange={e => onAssessmentChange(e.target.value)} style={{ fontSize: 20, fontWeight: 900, border: 'none', background: 'transparent', boxShadow: 'none', padding: 0, height: 'auto' }} placeholder="Final diagnosis..." />
        </CardContent>
      </Card>

      <Card style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
        <div style={boxHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ClipboardList style={{ width: 16, height: 16, color: '#F59E0B' }} />
            <span style={boxLabelStyle}>Clinical Notes</span>
          </div>
        </div>
        <CardContent style={{ padding: '1rem' }}>
          <Textarea ref={notesRef} value={clinicalNotes} onChange={e => onClinicalNotesChange(e.target.value)} style={{ ...transparentAreaStyle, fontSize: 14 }} placeholder="Notes..." />
        </CardContent>
      </Card>
    </div>
  );
}
