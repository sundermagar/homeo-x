import React from 'react';
import { Sparkles } from 'lucide-react';
import { AiConsultantView } from '../components/ai-consultant-view';
import '../styles/medical-case.css';

export default function AiConsultantPage() {
  return (
    <div className="pp-page-container">
      <header className="pp-page-header" style={{ marginBottom: 'var(--pp-space-6)', marginTop: 'var(--pp-space-4)' }}>
        <div>
          <div className="text-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={22} style={{ color: 'var(--primary)' }} />
            AI Clinical Analysis
            <span className="db-badge db-badge-primary" style={{ marginLeft: 8 }}>Global Session</span>
          </div>
          <p className="text-subtitle" style={{ marginTop: '4px' }}>
            Multi-theoretical AI analysis: Homeopathy, GNM, and Rubric correlations
          </p>
        </div>
      </header>

      <div style={{ height: 'calc(100vh - 200px)', minHeight: 500 }}>
        <AiConsultantView />
      </div>
    </div>
  );
}
