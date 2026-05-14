import React from 'react';
import { Sparkles } from 'lucide-react';
import { AiConsultantView } from '../components/ai-consultant-view';
import '../styles/medical-case.css';

export default function AiConsultantPage() {
  return (
    <div className="pp-page-container">
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <Sparkles size={48} className="text-gray-300" />
        <h1 className="text-2xl font-bold text-gray-900">AI Clinical Analysis Deprecated</h1>
        <p className="text-gray-500 max-w-md">
          This feature has been decommissioned. Please use the standard clinical modules for patient analysis.
        </p>
      </div>
    </div>
  );
}
