import { Mic } from 'lucide-react';
import { CollapsibleSection } from '../../../components/shared/collapsible-section';
import { AmbientScribe } from './ambient-scribe';
import type { SoapSuggestion } from '../../../types/ai';

interface VoiceCaptureSectionProps {
  visitId: string;
  aiContext?: { chiefComplaint?: string; specialty?: string; patientAge?: number; patientGender?: string; allergies?: string[]; };
  onSoapGenerated: (suggestion: SoapSuggestion) => void;
}

export function VoiceCaptureSection({ visitId, aiContext, onSoapGenerated }: VoiceCaptureSectionProps) {
  return (
    <CollapsibleSection id="section-voice" title="Voice Capture" subtitle="Tap to dictate — SOAP generated automatically" icon={<Mic style={{ width: 20, height: 20 }} />} defaultOpen={true}>
      <AmbientScribe visitId={visitId} aiContext={aiContext} onSoapGenerated={onSoapGenerated} />
    </CollapsibleSection>
  );
}
