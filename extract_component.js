const fs = require('fs');
const file = '/Users/apple/Documents/worksarea/homeo-x/apps/web/src/features/medical-case/pages/case-detail-page.tsx';
let content = fs.readFileSync(file, 'utf8');

// The block to extract starts at `return sortedDates.map(([dateKey, data], idx) => {`
// Let's locate the return block inside the IIFE.
const startMarker = `return sortedDates.map(([dateKey, data], idx) => {`;
const endMarker = `})()}`;

const startIndex = content.indexOf(startMarker);
if (startIndex === -1) {
    console.log("Could not find startMarker");
    process.exit(1);
}

// Find matching closing brace/parentheses. It's right before `})()`
// A safer way is to just use string replacement on the exact block.

// We will replace the whole map block with <TimelineVisitCard key={dateKey} dateKey={dateKey} data={data} isFirst={idx === 0} />
// We need to inject the function definition above `export default function CaseDetailPage() {`

const newMapBlock = `return sortedDates.map(([dateKey, data], idx) => (
                  <TimelineVisitCard key={dateKey} dateKey={dateKey} data={data} isFirst={idx === 0} />
                ));`;

// Let's find where the map block ends
let mapBlockEnd = content.indexOf(`})()}`, startIndex);

const oldMapBlock = content.substring(startIndex, mapBlockEnd);

// Replace the old map block with the new one
content = content.replace(oldMapBlock, newMapBlock);

// Now define the component at the top
const componentCode = `
function TimelineVisitCard({ dateKey, data, isFirst }: { dateKey: string, data: any, isFirst: boolean }) {
  const [isVisitExpanded, setIsVisitExpanded] = useState(isFirst);
  const [isRxExpanded, setIsRxExpanded] = useState(true);
  const [isNotesExpanded, setIsNotesExpanded] = useState(true);
  const [expandedReports, setExpandedReports] = useState<Record<number, boolean>>({});

  const dateObj = new Date(dateKey + 'T00:00:00');
  const isToday = dateObj.toDateString() === new Date().toDateString();
  const formattedDate = dateObj.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  // Extract SOAP diagnosis
  const soapDiagnosis = data.soapItems.map((s: any) => {
    const parts: string[] = [];
    if (s.subjective) parts.push(\`S: \${s.subjective}\`);
    if (s.objective) parts.push(\`O: \${s.objective}\`);
    if (s.assessment) parts.push(\`A: \${s.assessment}\`);
    if (s.plan) parts.push(\`P: \${s.plan}\`);
    if (!parts.length) {
      if (s.diagnosis) parts.push(s.diagnosis);
      if (s.complaint) parts.push(s.complaint);
      if (s.notes) parts.push(s.notes);
    }
    return parts.join('\\n');
  }).filter(Boolean);

  return (
    <div style={{
      borderBottom: '1px solid #e2e8f0',
      background: '#fff',
    }}>
      {/* Date Header */}
      <div 
        onClick={() => setIsVisitExpanded(!isVisitExpanded)}
        style={{
          padding: '14px 24px',
          background: isToday ? '#eff6ff' : '#fafafa',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: isToday ? '#3b82f6' : '#6366f1',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.7rem',
          fontWeight: 800,
          lineHeight: 1.1,
          flexShrink: 0
        }}>
          <span style={{ fontSize: '1.1rem' }}>{dateObj.getDate()}</span>
          <span style={{ fontSize: '0.6rem', textTransform: 'uppercase' }}>{dateObj.toLocaleString('default', { month: 'short' })}</span>
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {formattedDate}
            {isToday && <span style={{ padding: '2px 8px', borderRadius: '10px', background: '#dbeafe', color: '#2563eb', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' }}>Today</span>}
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
            {data.rxItems.length > 0 && <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#e0e7ff', color: '#3730a3', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><Pill size={10} /> {data.rxItems.length} prescription{data.rxItems.length !== 1 ? 's' : ''}</span>}
            {data.soapItems.length > 0 && <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#dcfce7', color: '#166534', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><Stethoscope size={10} /> {data.soapItems.length} diagnosis</span>}
            {data.followupItems.length > 0 && <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#fef3c7', color: '#92400e', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><FileText size={10} /> {data.followupItems.length} follow-up</span>}
            {data.vitalItems.length > 0 && <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#fce7f3', color: '#9d174d', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><Activity size={10} /> {data.vitalItems.length} vitals</span>}
            {data.labItems.length > 0 && <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#ffedd5', color: '#9a3412', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><FlaskConical size={10} /> {data.labItems.length} lab report{data.labItems.length !== 1 ? 's' : ''}</span>}
            {data.mediaItems.length > 0 && <span style={{ padding: '2px 8px', borderRadius: '12px', background: '#f1f5f9', color: '#334155', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><Image size={10} /> {data.mediaItems.length} media</span>}
          </div>
        </div>

        <ChevronDown size={20} style={{ color: '#94a3b8', transform: isVisitExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>

      {/* Expanded Content */}
      {isVisitExpanded && (
        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* SOAP / Diagnosis Section */}
          {soapDiagnosis.length > 0 && (
            <div style={{
              padding: '14px 18px',
              background: '#fefce8',
              border: '1px solid #fde68a',
              borderRadius: '10px',
              borderLeft: '4px solid #f59e0b'
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Stethoscope size={13} /> Diagnosis / Assessment
              </div>
              {soapDiagnosis.map((text: string, si: number) => (
                <div key={si} style={{ fontSize: '0.85rem', color: '#78350f', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: si > 0 ? '8px' : 0 }}>{text}</div>
              ))}
            </div>
          )}

          {/* Follow-up Notes */}
          {data.followupItems.length > 0 && (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              borderLeft: '4px solid #22c55e',
              overflow: 'hidden'
            }}>
              <div 
                onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                style={{ cursor: 'pointer', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={13} /> Follow-up Notes
                </div>
                <ChevronDown size={14} style={{ color: '#166534', transform: isNotesExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>
              
              {isNotesExpanded && (
                <div style={{ padding: '0 18px 14px 18px' }}>
                  {data.followupItems.map((note: any, ni: number) => (
                    <div key={ni} style={{ fontSize: '0.85rem', color: '#14532d', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: ni > 0 ? '8px' : 0 }}>{note.notes}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vitals */}
          {data.vitalItems.length > 0 && (
            <div style={{
              padding: '14px 18px',
              background: '#fdf4ff',
              border: '1px solid #fbcfe8',
              borderRadius: '10px',
              borderLeft: '4px solid #d946ef'
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#86198f', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={13} /> Vitals Recorded
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {data.vitalItems.map((vital: any, vi: number) => (
                  <div key={vi} style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', width: '100%' }}>
                    {vital.weight && <div style={{ fontSize: '0.85rem', color: '#701a75' }}><strong>Weight:</strong> {vital.weight} kg</div>}
                    {vital.bp && <div style={{ fontSize: '0.85rem', color: '#701a75' }}><strong>BP:</strong> {vital.bp}</div>}
                    {vital.pulse && <div style={{ fontSize: '0.85rem', color: '#701a75' }}><strong>Pulse:</strong> {vital.pulse} /min</div>}
                    {vital.temperature && <div style={{ fontSize: '0.85rem', color: '#701a75' }}><strong>Temp:</strong> {vital.temperature} °F</div>}
                    {vital.spO2 && <div style={{ fontSize: '0.85rem', color: '#701a75' }}><strong>SpO2:</strong> {vital.spO2} %</div>}
                    {vital.notes && <div style={{ fontSize: '0.85rem', color: '#701a75', width: '100%' }}><strong>Notes:</strong> {vital.notes}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lab Reports */}
          {data.labItems.length > 0 && (
            <div style={{
              padding: '14px 18px',
              background: '#fff7ed',
              border: '1px solid #fed7aa',
              borderRadius: '10px',
              borderLeft: '4px solid #f97316'
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FlaskConical size={13} /> Lab Reports & Investigations
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.labItems.map((lab: any, li: number) => {
                  let parsedData: any = {};
                  if (lab.data) {
                    try { parsedData = typeof lab.data === 'string' ? JSON.parse(lab.data) : lab.data; } catch (e) { parsedData = {}; }
                  }
                  const hasData = parsedData && Object.keys(parsedData).length > 0;
                  const isReportExpanded = expandedReports[li] || false;

                  return (
                    <div key={li} style={{ fontSize: '0.85rem', color: '#7c2d12', padding: '12px', background: '#ffedd5', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#9a3412' }}>{lab.type || lab.investigationName || lab.investigation_name || 'Lab Report'}</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {(lab.attachmentUrl || lab.url || lab.fileUrl) && (
                            <a href={lab.attachmentUrl || lab.url || lab.fileUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700, color: '#ea580c', textDecoration: 'none', background: '#ffedd5', padding: '4px 8px', borderRadius: '6px', border: '1px solid #fdba74' }}>
                              <Eye size={12} /> View File
                            </a>
                          )}
                          {hasData && (
                            <button 
                              onClick={() => setExpandedReports(prev => ({ ...prev, [li]: !prev[li] }))}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 700, color: '#ea580c', background: 'transparent', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', border: '1px solid #fdba74' }}
                            >
                              <Eye size={12} /> {isReportExpanded ? 'Hide Report' : 'View Report'}
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {hasData && isReportExpanded && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', marginTop: '4px' }}>
                          {Object.entries(parsedData).map(([k, v], idx) => (
                            v ? <div key={idx} style={{ background: '#fff7ed', padding: '6px 10px', borderRadius: '6px', border: '1px solid #fed7aa', display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9a3412', textTransform: 'uppercase', opacity: 0.8 }}>{k.replace(/_/g, ' ')}</span>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#7c2d12' }}>{String(v)}</span>
                            </div> : null
                          ))}
                        </div>
                      )}
                      
                      {(lab.summary || lab.notes || lab.result) && <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#9a3412', fontSize: '0.8rem' }}>{lab.summary || lab.notes || lab.result}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Media */}
          {data.mediaItems.length > 0 && (
            <div style={{
              padding: '14px 18px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              borderLeft: '4px solid #64748b'
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Image size={13} /> Uploaded Media
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {data.mediaItems.map((media: any, mi: number) => (
                  <a 
                    key={mi} 
                    href={media.url || media.fileUrl || '#'} 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ 
                      display: 'flex', flexDirection: 'column', gap: '4px', 
                      padding: '8px', background: '#fff', border: '1px solid #cbd5e1', 
                      borderRadius: '8px', textDecoration: 'none', color: '#0f172a' 
                    }}
                  >
                    {media.url?.match(/\\.(jpeg|jpg|gif|png)$/i) || media.fileUrl?.match(/\\.(jpeg|jpg|gif|png)$/i) ? (
                      <img src={media.url || media.fileUrl} alt="Media" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' }} />
                    ) : (
                      <div style={{ width: '80px', height: '80px', background: '#f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={24} style={{ color: '#94a3b8' }} />
                      </div>
                    )}
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {media.fileName || media.name || 'File'}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Prescriptions Table */}
          {data.rxItems.length > 0 && (
            <div style={{
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              overflow: 'hidden'
            }}>
              <div 
                onClick={() => setIsRxExpanded(!isRxExpanded)}
                style={{ cursor: 'pointer', background: '#f8fafc', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isRxExpanded ? '1px solid #e2e8f0' : 'none' }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Pill size={13} /> Prescriptions
                </div>
                <ChevronDown size={14} style={{ color: '#64748b', transform: isRxExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>

              {isRxExpanded && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f5f3ff', borderBottom: '1px solid #ede9fe' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800, fontSize: '0.72rem', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Remedy</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800, fontSize: '0.72rem', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Potency</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800, fontSize: '0.72rem', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Frequency</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, fontSize: '0.72rem', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Days</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800, fontSize: '0.72rem', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Instructions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rxItems.map((rx: any, ri: number) => (
                      <tr key={ri} style={{ borderBottom: ri < data.rxItems.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#1e293b' }}>{rx.remedy_name || rx.remedyName || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ padding: '3px 10px', background: '#f5f3ff', border: '1px solid #ede9fe', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, color: '#6d28d9' }}>
                            {rx.potency_name || rx.potencyName || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#7c3aed', fontWeight: 600 }}>{rx.frequency_name || rx.frequencyName || '—'}</td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, color: '#1e293b' }}>{rx.days || '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '0.82rem', maxWidth: '200px' }}>
                          {rx.prescription || rx.notes || rx.instructions || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* If no data for this date at all */}
          {data.rxItems.length === 0 && soapDiagnosis.length === 0 && data.followupItems.length === 0 && data.vitalItems.length === 0 && data.labItems.length === 0 && data.mediaItems.length === 0 && (
            <div style={{ padding: '12px', color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', fontStyle: 'italic' }}>
              No clinical data recorded for this date.
            </div>
          )}

        </div>
      )}
    </div>
  );
}
`;

const insertIndex = content.indexOf('export default function CaseDetailPage');
content = content.substring(0, insertIndex) + componentCode + "\n\n" + content.substring(insertIndex);

fs.writeFileSync(file, content);
console.log('Update successful');
