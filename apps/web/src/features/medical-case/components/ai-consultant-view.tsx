import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, BrainCircuit, Activity, BookOpen, Layers, Paperclip } from 'lucide-react';
import { apiClient } from '@/infrastructure/api-client';

export enum AnalysisTheory {
  HOMEOPATHY = 'HOMEOPATHY',
  GNM = 'GNM',
  RUBRICS = 'RUBRICS',
  CORRELATION = 'CORRELATION',
}

const THEORIES = [
  { id: AnalysisTheory.HOMEOPATHY, label: 'Clinical Homeopathy', icon: Activity },
  { id: AnalysisTheory.GNM, label: 'German New Medicine', icon: BrainCircuit },
  { id: AnalysisTheory.RUBRICS, label: 'Rubric Perception', icon: BookOpen },
  { id: AnalysisTheory.CORRELATION, label: 'Remedy Correlation', icon: Layers },
];

function TypewriterText({ text, speed = 20 }: { text: string; speed?: number }) {
  const [displayedText, setDisplayedText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let index = 0;
    setDisplayedText('');

    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText((prev) => prev + text.charAt(index));
        index++;
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      } else {
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <div
      ref={scrollRef}
      className="mc-typewriter-box"
      dangerouslySetInnerHTML={{ __html: displayedText.replace(/\n/g, '<br/>') }}
    />
  );
}

export function AiConsultantView({ regid }: { regid?: number }) {
  const [theory, setTheory] = useState<AnalysisTheory>(AnalysisTheory.HOMEOPATHY);
  const [question, setQuestion] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsAnalyzing(true);
    setResponse(null);

    try {
      const res = await apiClient.post('/api/medical-cases/ai-analysis', {
        theory,
        question,
        // Optional: pass patient context if needed
        patientContext: regid ? `Patient PT-${regid}` : 'General Inquiry'
      });
      setResponse(res.data.data.analysis);
    } catch (error) {
      console.error('AI Analysis failed:', error);
      setResponse('**Error**: Failed to generate analysis. Please try again or check the Azure credentials.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="mc-ai-consultant">
      <div className="mc-ai-theory-selector">
        <span className="mc-ai-theory-label">Theoretical Lens:</span>
        <div className="mc-ai-theory-pills">
          {THEORIES.map((t) => (
            <button
              key={t.id}
              className={`mc-theory-pill ${theory === t.id ? 'active' : ''}`}
              onClick={() => setTheory(t.id)}
            >
              <t.icon size={13} strokeWidth={2} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mc-ai-chat-container">
        {response ? (
          <div className="mc-ai-report">
            <div className="mc-ai-report-header">
              <Sparkles size={16} className="mc-icon-spin" />
              <span>AI Clinical Analysis Report</span>
            </div>
            <div className="mc-ai-report-body">
              <TypewriterText text={response} speed={15} />
            </div>
          </div>
        ) : (
          <div className="mc-ai-empty">
            <Sparkles size={48} strokeWidth={1} style={{ opacity: 0.2, marginBottom: 16 }} />
            <h3>Ask the Clinical Analysis AI</h3>
            <p>Select a theoretical lens and describe the patient's symptoms or upload a lab report for advanced analysis.</p>
          </div>
        )}
      </div>

      <form className="mc-ai-input-wrapper" onSubmit={handleAnalyze}>
        <button type="button" className="mc-ai-attach-btn" title="Upload Report">
          <Paperclip size={18} />
        </button>
        <input
          type="text"
          className="mc-ai-input"
          placeholder="e.g. Sharp pain in right hypochondrium, worse by fatty food..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={isAnalyzing}
        />
        <button
          type="submit"
          className="mc-ai-submit-btn"
          disabled={isAnalyzing || !question.trim()}
        >
          {isAnalyzing ? (
            <span className="mc-spinner" />
          ) : (
            <>Analyze <Send size={14} /></>
          )}
        </button>
      </form>
    </div>
  );
}
