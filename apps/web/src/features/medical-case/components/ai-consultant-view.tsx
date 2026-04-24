import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, BrainCircuit, Activity, BookOpen, Layers, Paperclip, Square, AlertTriangle, X } from 'lucide-react';
import { useAiAnalysisStream } from '../hooks/use-ai-analysis';

import { AnalysisTheory } from '../types';

const THEORIES = [
  { id: AnalysisTheory.HOMEOPATHY, label: 'Clinical Homeopathy', icon: Activity },
  { id: AnalysisTheory.GNM, label: 'German New Medicine', icon: BrainCircuit },
  { id: AnalysisTheory.RUBRICS, label: 'Rubric Perception', icon: BookOpen },
  { id: AnalysisTheory.CORRELATION, label: 'Remedy Correlation', icon: Layers },
];

export function AiConsultantView({ regid }: { regid?: number }) {
  const [theory, setTheory] = useState<AnalysisTheory>(AnalysisTheory.HOMEOPATHY);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string, theory?: AnalysisTheory, provider?: string, isError?: boolean }[]>([]);
  const [attachment, setAttachment] = useState<{ name: string; url: string } | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const aiStream = useAiAnalysisStream();

  // Auto-scroll when content changes
  useEffect(() => {
    const container = document.querySelector('.mc-ai-chat-container');
    if (container && scrollRef.current && aiStream.isStreaming) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 350;
      if (isNearBottom) {
        scrollRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
      }
    }
  }, [aiStream.content]);

  // Show error popup when an error occurs (and streaming has stopped)
  useEffect(() => {
    if (aiStream.error && !aiStream.isStreaming) {
      setShowErrorModal(true);
    }
  }, [aiStream.error, aiStream.isStreaming]);

  const handleCloseError = () => {
    setShowErrorModal(false);
    aiStream.reset();
  };

  const handleStop = () => {
    aiStream.stop();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        const MAX_DIM = 1280;
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM; }
          else { width = Math.round(width * MAX_DIM / height); height = MAX_DIM; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        const resizedUrl = canvas.toDataURL('image/jpeg', 0.8);
        setAttachment({ name: file.name.replace(/\.[^/.]+$/, '.jpg'), url: resizedUrl });
        URL.revokeObjectURL(objectUrl);
      };
      img.src = objectUrl;
    }
    e.target.value = '';
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() && !attachment) return;

    const currentQuestion = question;
    const currentTheory = theory;

    // Add user message to history
    setMessages(prev => [...prev, { role: 'user', content: currentQuestion, theory: currentTheory }]);
    setQuestion('');

    // Force scroll immediately on new user message
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 100);

    aiStream.start({
      theory: currentTheory,
      question: currentQuestion,
      imageUrl: attachment?.url,
      patientContext: regid ? `Patient PT-${regid}` : 'General Inquiry'
    });
    setAttachment(null);
  };

  // When streaming finishes successfully or fails, add assistant message to history
  useEffect(() => {
    if (!aiStream.isStreaming) {
      if (aiStream.content && !aiStream.error) {
        setMessages(prev => {
          // Prevent duplicates if hook state hasn't cleared yet
          if (prev.length > 0 && prev[prev.length - 1]?.content === aiStream.content) return prev;
          return [...prev, { 
            role: 'assistant', 
            content: aiStream.content, 
            provider: aiStream.provider || undefined 
          }];
        });
      } else if (aiStream.error) {
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          // Only append an error bubble if the last message was a user query
          if (lastMsg && lastMsg.role === 'user') {
            return [...prev, { 
              role: 'assistant', 
              content: `**Analysis Failed**\n\n${aiStream.error}`,
              isError: true
            }];
          }
          return prev;
        });
      }
    }
  }, [aiStream.isStreaming, aiStream.content, aiStream.error, aiStream.provider]);

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
        {messages.map((msg, idx) => (
          <div key={idx} className={`mc-ai-msg-group ${msg.role}`}>
            {msg.role === 'user' ? (
              <div className="mc-ai-user-query">
                <div className="mc-ai-query-bubble">
                  <div className="mc-ai-query-badge">
                    {(() => {
                      const Icon = THEORIES.find(t => t.id === msg.theory)?.icon;
                      return Icon ? <Icon size={10} /> : null;
                    })()}
                    {THEORIES.find(t => t.id === msg.theory)?.label}
                  </div>
                  <div className="mc-ai-query-text">{msg.content}</div>
                </div>
              </div>
            ) : (
              <div className={`mc-ai-report ${msg.isError ? 'error' : ''}`}>
                <div className="mc-ai-report-header">
                  {msg.isError ? <AlertTriangle size={16} /> : <Sparkles size={16} />}
                  <span>{msg.isError ? 'Analysis Failed' : 'AI Clinical Analysis Report'} {msg.provider && <span style={{ opacity: 0.6, fontSize: '0.85em', marginLeft: 4 }}>({msg.provider})</span>}</span>
                </div>
                <div className="mc-ai-report-body">
                  <div className="mc-typewriter-box" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>') }} />
                </div>
              </div>
            )}
          </div>
        ))}

        {aiStream.isStreaming && (
          <div className="mc-ai-report active">
            <div className="mc-ai-report-header">
              <Sparkles size={16} className="mc-icon-spin" />
              <span>
                {aiStream.content ? 'AI Clinical Analysis Report' : 'Analyzing Clinical Case...'}
                {aiStream.provider && <span style={{ opacity: 0.6, fontSize: '0.85em', marginLeft: 4 }}>({aiStream.provider})</span>}
              </span>
            </div>
            <div className="mc-ai-report-body">
              {!aiStream.content && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', opacity: 0.5 }}>
                  <div className="mc-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                  <span>Generating clinical insights...</span>
                </div>
              )}
              <div
                className="mc-typewriter-box"
                dangerouslySetInnerHTML={{ __html: aiStream.content.replace(/\n/g, '<br/>') }}
              />
            </div>
          </div>
        )}

        {!aiStream.isStreaming && messages.length === 0 && !aiStream.error && (
          <div className="mc-ai-empty">
            <Sparkles size={48} strokeWidth={1} style={{ opacity: 0.2, marginBottom: 16 }} />
            <h3>Ask the Clinical Analysis AI</h3>
            <p>Select a theoretical lens and describe the patient's symptoms or upload a lab report for advanced analysis.</p>
          </div>
        )}
        <div ref={scrollRef} style={{ height: 1 }} />
      </div>

      <form className="mc-ai-input-wrapper" style={{ flexDirection: 'column', gap: '8px', alignItems: 'stretch' }} onSubmit={(e) => {
        e.preventDefault();
        if (!aiStream.isStreaming) {
          handleAnalyze(e);
        }
      }}>
        {attachment && (
          <div className="mc-ai-attachment-pill">
            <span style={{ marginRight: '8px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px', whiteSpace: 'nowrap' }}>{attachment.name}</span>
            <button 
              type="button" 
              onClick={() => setAttachment(null)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
            >
               <X size={14} />
            </button>
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%' }}>
          <input 
            type="file" 
            ref={fileInputRef} 
            hidden 
            accept="image/*" 
            onChange={handleFileSelect}
          />
          <button 
            type="button" 
            className="mc-ai-attach-btn" 
            title="Upload Report"
            onClick={() => fileInputRef.current?.click()}
            disabled={aiStream.isStreaming}
          >
            <Paperclip size={18} />
          </button>
          <input
            type="text"
            className="mc-ai-input"
            placeholder="e.g. Sharp pain in right hypochondrium, worse by fatty food..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={aiStream.isStreaming}
            style={{ flex: 1 }}
          />
          {aiStream.isStreaming ? (
            <button
              type="button"
              className="mc-ai-submit-btn"
              style={{ backgroundColor: '#ef4444' }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleStop();
              }}
            >
              Stop <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              type="submit"
              className="mc-ai-submit-btn"
              disabled={(!question.trim() && !attachment)}
            >
              Analyze <Send size={14} />
            </button>
          )}
        </div>
      </form>

      {showErrorModal && (
        <div className="mc-modal-overlay" onClick={handleCloseError}>
          <div className="mc-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, animation: 'modalFadeIn 200ms ease-out' }}>
            <div className="mc-modal-header" style={{ borderBottomColor: '#fee2e2', backgroundColor: '#fef2f2', padding: '20px 24px' }}>
              <div className="mc-modal-title-group" style={{ alignItems: 'center' }}>
                <div className="mc-modal-icon-bg" style={{ backgroundColor: '#fecaca', color: '#dc2626', width: 40, height: 40 }}>
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="mc-modal-title" style={{ color: '#991b1b', fontSize: '1.05rem' }}>AI Service Unavailable</h3>
                  <p className="mc-modal-sub" style={{ color: '#b91c1c', marginTop: 2 }}>High traffic volume detected.</p>
                </div>
              </div>
              <button className="mc-modal-close" onClick={handleCloseError} style={{ color: '#ef4444' }}>
                <X size={20} />
              </button>
            </div>
            <div className="mc-modal-body" style={{ padding: '24px' }}>
              <p style={{ marginBottom: 16, fontSize: '0.95rem', color: '#334155', lineHeight: 1.6 }}>
                The AI clinical analysis service is currently experiencing high traffic or your session timed out. This is usually resolved within a few seconds.
              </p>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px', fontSize: '0.8rem', color: '#475569', fontFamily: 'monospace', wordBreak: 'break-word' }}>
                {aiStream.error || 'Connection timed out after 15 seconds.'}
              </div>
              <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'flex-start', background: '#f0f9ff', padding: 12, borderRadius: 8, border: '1px solid #e0f2fe' }}>
                <span style={{ fontSize: '1.2rem' }}>💡</span>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#0369a1', lineHeight: 1.5 }}>
                  <strong>Tip:</strong> Please wait ~30 seconds before retrying. You can also try switching to a different theoretical lens.
                </p>
              </div>
            </div>
            <div className="mc-modal-footer" style={{ padding: '16px 24px', backgroundColor: '#f8fafc' }}>
              <button type="button" className="mc-btn-secondary" onClick={handleCloseError}>Close</button>
              <button type="button" className="mc-btn-primary" onClick={handleCloseError} style={{ backgroundColor: '#ef4444', boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)' }}>
                Dismiss & Retry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
