import React, { useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, Printer } from 'lucide-react';
import { printHtml } from '@/lib/print';

interface InvestigationPreviewModalProps {
  inv: any;
  onClose: () => void;
  doctorName?: string;
  clinicName?: string;
}

export function InvestigationPreviewModal({
  inv,
  onClose,
  doctorName,
  clinicName,
}: InvestigationPreviewModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (contentRef.current) {
      printHtml(contentRef.current.innerHTML);
    }
  };

  const parseTableLines = (text: string) => {
    if (!text) return [];
    return text.split('\n').map((line) => {
      const [first, ...rest] = line.split(':');
      if (rest.length > 0) {
        return { finding: first?.trim() || '', detail: rest.join(':').trim() };
      }
      return { finding: line, detail: '' };
    });
  };

  const parseBulletPoints = (text: string) => {
    if (!text) return [];
    return text
      .split('\n')
      .map((line) => line.trim().replace(/^[-*•]\s*/, ''))
      .filter(Boolean);
  };

  return ReactDOM.createPortal(
    <>
      <div className="mc-drawer-backdrop" onClick={onClose} />
      <div
        className="mc-drawer animate-slide-in-right"
        style={{ maxWidth: '800px', width: '100%', background: '#f8fafc' }}
      >
        <header
          className="mc-drawer-header"
          style={{
            background: 'white',
            color: 'var(--pp-ink)',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            padding: '16px 24px',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Report Preview</div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {inv.attachmentUrl && (
              <a
                href={inv.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
                style={{
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  textDecoration: 'none',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                }}
              >
                View Original
              </a>
            )}
            <button
              onClick={handlePrint}
              className="btn-primary"
              style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={16} /> Print
            </button>
            <button
              className="mc-drawer-close"
              onClick={onClose}
              style={{ color: 'var(--pp-text-3)' }}
            >
              <X size={20} />
            </button>
          </div>
        </header>

        <div style={{ padding: '32px', overflowY: 'auto', height: 'calc(100vh - 70px)' }}>
          <div
            ref={contentRef}
            style={{
              background: 'white',
              padding: '48px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {/* Printable Content */}
            <div
              style={{
                marginBottom: '32px',
                borderBottom: '2px solid #1e3a8a',
                paddingBottom: '16px',
              }}
            >
              <h1
                style={{
                  color: '#1e40af',
                  fontSize: '1.8rem',
                  fontWeight: 800,
                  margin: '0 0 16px 0',
                  textAlign: 'center',
                }}
              >
                {inv.type} — Report Summary
              </h1>
              <div
                style={{
                  fontSize: '0.9rem',
                  color: '#1f2937',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div>
                  <strong>Date:</strong>{' '}
                  {inv.investDate
                    ? new Date(inv.investDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })
                    : new Date().toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                </div>
                {doctorName && (
                  <div>
                    <strong>Reported by:</strong> {doctorName}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
              {Object.entries(inv.data || {})
                .filter(([key]) => {
                  const k = key.toLowerCase();
                  return (
                    k !== 'summary' &&
                    k !== 'attachmenturl' &&
                    k !== 'attachment_url' &&
                    k !== 'investdate' &&
                    k !== 'invest_date'
                  );
                })
                .map(([key, val]: [string, any]) => {
                  if (!val) return null;
                  const title = key
                    .split('_')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ');

                  // If it's a "Final Impression" or similar table
                  if (
                    key.toLowerCase().includes('impression') ||
                    key.toLowerCase().includes('table')
                  ) {
                    const rows = parseTableLines(val);
                    return (
                      <div key={key}>
                        <h2
                          style={{
                            color: '#2563eb',
                            fontSize: '1.1rem',
                            fontWeight: 700,
                            borderBottom: '1px solid #93c5fd',
                            paddingBottom: '4px',
                            marginBottom: '12px',
                          }}
                        >
                          {title}
                        </h2>
                        <table
                          style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}
                        >
                          <thead>
                            <tr style={{ background: '#1e40af', color: 'white' }}>
                              <th
                                style={{
                                  padding: '8px 12px',
                                  textAlign: 'left',
                                  border: '1px solid #cbd5e1',
                                }}
                              >
                                Finding
                              </th>
                              <th
                                style={{
                                  padding: '8px 12px',
                                  textAlign: 'left',
                                  border: '1px solid #cbd5e1',
                                }}
                              >
                                Detail
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r, i) => (
                              <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f1f5f9' }}>
                                <td
                                  style={{
                                    padding: '8px 12px',
                                    border: '1px solid #cbd5e1',
                                    fontWeight: 600,
                                  }}
                                >
                                  {r.finding}
                                </td>
                                <td style={{ padding: '8px 12px', border: '1px solid #cbd5e1' }}>
                                  {r.detail}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }

                  // Normal sections as bullet points
                  const lines = parseBulletPoints(val);
                  return (
                    <div key={key}>
                      <h2
                        style={{
                          color: '#2563eb',
                          fontSize: '1.1rem',
                          fontWeight: 700,
                          borderBottom: '1px solid #93c5fd',
                          paddingBottom: '4px',
                          marginBottom: '12px',
                        }}
                      >
                        {title}
                      </h2>
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: '20px',
                          fontSize: '0.95rem',
                          lineHeight: '1.6',
                          color: '#334155',
                        }}
                      >
                        {lines.map((line, i) => (
                          <li key={i} style={{ marginBottom: '4px' }}>
                            {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
            </div>

            {/* Render Summary at the very end of report data, before disclaimer */}
            {(() => {
              const summaryVal = inv.data?.summary || inv.summary;
              if (!summaryVal) return null;
              return (
                <div
                  style={{ marginTop: '32px', borderTop: '2px solid #cbd5e1', paddingTop: '20px' }}
                >
                  <h2
                    style={{
                      color: '#1e40af',
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      marginBottom: '8px',
                    }}
                  >
                    Summary
                  </h2>
                  <div
                    style={{
                      fontSize: '0.95rem',
                      lineHeight: '1.6',
                      color: '#1f2937',
                      background: '#eff6ff',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid #bfdbfe',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {summaryVal}
                  </div>
                </div>
              );
            })()}

            <div
              style={{
                marginTop: '48px',
                borderTop: '1px solid #dc2626',
                borderBottom: '1px solid #dc2626',
                padding: '12px 0',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic', color: '#475569' }}>
                <strong style={{ color: '#dc2626', fontStyle: 'normal' }}>Note:</strong> This is a
                radiological/investigation report summary. Please consult your physician to discuss
                these findings, their clinical significance, and appropriate next steps.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
