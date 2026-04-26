import { useRef, useEffect } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Textarea } from '../../../components/ui/textarea';
import { Input } from '../../../components/ui/input';
import { Activity, FileText, ClipboardList } from 'lucide-react';

interface ConsultationSummaryEditorProps {
  subjective: string;
  onSubjectiveChange: (val: string) => void;
  assessment: string;
  onAssessmentChange: (val: string) => void;
  clinicalNotes: string;
  onClinicalNotesChange: (val: string) => void;
}

export function ConsultationSummaryEditor({
  subjective,
  onSubjectiveChange,
  assessment,
  onAssessmentChange,
  clinicalNotes,
  onClinicalNotesChange,
}: ConsultationSummaryEditorProps) {
  const subjectiveRef = useRef<HTMLTextAreaElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = (ref: React.RefObject<HTMLTextAreaElement>) => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    autoResize(subjectiveRef);
  }, [subjective]);

  useEffect(() => {
    autoResize(notesRef);
  }, [clinicalNotes]);

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {/* SYMPTOMS BOX */}
      <Card className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-900 bg-gray-50/50 dark:bg-gray-900/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-4 w-4 text-indigo-500" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
              Symptoms
            </span>
          </div>
          <span className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter cursor-default">
            • Symptoms • Duration • Red Flags
          </span>
        </div>
        <CardContent className="p-4">
          <Textarea
            ref={subjectiveRef}
            value={subjective}
            onChange={(e) => onSubjectiveChange(e.target.value)}
            className="text-[14px] font-medium border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 overflow-hidden resize-none leading-relaxed placeholder:text-gray-300 text-gray-800 dark:text-gray-200"
            placeholder="Enter symptoms here..."
          />
        </CardContent>
      </Card>

      {/* DIAGNOSIS BOX */}
      <Card className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-900 bg-gray-50/50 dark:bg-gray-900/10 flex items-center gap-3">
          <FileText className="h-4 w-4 text-emerald-500" />
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            Diagnosis
          </span>
        </div>
        <CardContent className="p-4">
          <Input
            value={assessment}
            onChange={(e) => onAssessmentChange(e.target.value)}
            className="text-xl font-black border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 h-auto placeholder:text-gray-300 text-gray-900 dark:text-white"
            placeholder="Final diagnosis..."
          />
        </CardContent>
      </Card>

      {/* CLINICAL NOTES BOX */}
      <Card className="rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-900 bg-gray-50/50 dark:bg-gray-900/10 flex items-center gap-3">
          <ClipboardList className="h-4 w-4 text-amber-500" />
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            Clinical Notes
          </span>
        </div>
        <CardContent className="p-4">
          <Textarea
            ref={notesRef}
            value={clinicalNotes}
            onChange={(e) => onClinicalNotesChange(e.target.value)}
            className="text-[14px] border-0 bg-transparent shadow-none focus-visible:ring-0 p-0 overflow-hidden resize-none leading-relaxed placeholder:text-gray-200 text-gray-700 dark:text-gray-300"
            placeholder="Notes..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
