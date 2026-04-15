import { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import type { ScoredRemedy, SuggestedRubric } from '../../../../types/ai';
import './stages.css';

interface RepertoryStageProps {
  selectedRubrics: SuggestedRubric[];
  scoredRemedies: ScoredRemedy[];
  onApplyRemedy?: (remedyName: string, potency: string) => void;
}

export function RepertoryStage({ selectedRubrics, scoredRemedies, onApplyRemedy }: RepertoryStageProps) {
  const topRemedies = useMemo(() => scoredRemedies.slice(0, 8), [scoredRemedies]);

  const matrix = useMemo(() => {
    const rows: Array<{ rubric: SuggestedRubric; grades: Record<string, number>; originalIndex: number }> = [];
    for (let i = 0; i < selectedRubrics.length; i++) {
      const rubric = selectedRubrics[i];
      const grades: Record<string, number> = {};
      let hasAnyCoverage = false;
      for (const remedy of topRemedies) {
        const coverage = remedy.coverage?.find(c => c.rubricId === rubric.rubricId);
        if (coverage && coverage.grade > 0) { grades[remedy.remedyId] = coverage.grade; hasAnyCoverage = true; }
      }
      if (hasAnyCoverage) rows.push({ rubric, grades, originalIndex: i + 1 });
    }
    return rows;
  }, [selectedRubrics, topRemedies]);

  const rubricCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const gradeTotals: Record<string, number> = {};
    for (const remedy of topRemedies) {
      let count = 0, gradeSum = 0;
      for (const row of matrix) { const grade = row.grades[remedy.remedyId]; if (grade && grade > 0) { count++; gradeSum += grade; } }
      counts[remedy.remedyId] = count; gradeTotals[remedy.remedyId] = gradeSum;
    }
    return { counts, gradeTotals };
  }, [topRemedies, matrix]);

  const gradeClass = (grade: number) => {
    if (grade >= 3) return 'rep-grade-3';
    if (grade >= 2) return 'rep-grade-2';
    if (grade >= 1) return 'rep-grade-1';
    return '';
  };

  const eliminatingCount = selectedRubrics.filter(r => r.importance >= 3).length;
  const importantCount   = selectedRubrics.filter(r => r.importance === 2).length;

  const handleExportCSV = () => {
    const headers = ['Rubric (grade)', ...topRemedies.map(r => r.remedyName.toLowerCase().replace(/\s+/g, '-'))];
    const rows = matrix.map(row => [`${row.rubric.description} (${row.rubric.importance})`, ...topRemedies.map(r => row.grades[r.remedyId] || '-')]);
    const totalsRow = ['Grade total', ...topRemedies.map(r => rubricCounts.gradeTotals[r.remedyId] || 0)];
    const csv = [headers, ...rows, totalsRow].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'repertorization.csv'; a.click();
  };

  const rubricImportanceBadge = (importance: number) =>
    importance >= 3 ? 'rep-grade-badge rep-grade-badge--3' : importance >= 2 ? 'rep-grade-badge rep-grade-badge--2' : 'rep-grade-badge rep-grade-badge--1';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.4s ease-out' }}>
      {/* Header */}
      <div className="rep-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="stage-section-label">Rubrics ({selectedRubrics.length})</span>
          {selectedRubrics.length > 0 && <span className="symptom-count-badge" style={{ background: 'var(--color-success-100)', color: 'var(--color-success-700)' }}>All extracted</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="stage-section-label" style={{ color: 'var(--text-disabled)' }}>Grid — Complete Repertory · Totality</span>
          <Button variant="outline" size="sm" onClick={handleExportCSV} style={{ height: '1.75rem', fontSize: 10, fontWeight: 700, padding: '0 0.75rem', borderRadius: 'var(--radius-card)' }}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Main */}
      <div className="stage-layout">
        {/* LEFT: Rubric list */}
        <div className="rep-rubric-list">
          {selectedRubrics.map((rubric, i) => (
            <div key={rubric.rubricId} className="rep-rubric-row">
              <span className="rep-rubric-num">{i + 1}.</span>
              <span className="rep-rubric-text">{rubric.chapter ? `${rubric.chapter}; ` : ''}{rubric.description}</span>
              <span className={rubricImportanceBadge(rubric.importance)}>{rubric.importance}</span>
            </div>
          ))}
        </div>

        {/* CENTER: Matrix */}
        <div className="stage-col--main">
          {topRemedies.length > 0 ? (
            <>
              <div className="rx-card" style={{ borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-default)', background: 'var(--bg-card)', overflowX: 'auto' }}>
                <table className="rep-matrix-table">
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-strong)' }}>
                      <th>Rubric</th>
                      {topRemedies.map((r, ri) => (
                        <th key={r.remedyId}
                          onClick={() => onApplyRemedy?.(r.remedyName, r.commonPotencies[0] || '200C')}
                          title={`Click to prescribe ${r.remedyName}`}
                          style={ri === 0 ? { background: 'var(--color-error-50)', color: 'var(--color-error-600)' } : undefined}
                        >
                          {r.remedyName.toLowerCase().replace(/\s+/g, '-').slice(0, 7)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.map((row) => (
                      <tr key={row.rubric.rubricId} style={{ background: row.originalIndex % 2 === 0 ? 'var(--bg-card)' : 'rgba(248,250,252,0.5)' }}>
                        <td>{row.originalIndex}. {row.rubric.description} ({row.rubric.importance})</td>
                        {topRemedies.map(r => {
                          const grade = row.grades[r.remedyId] || 0;
                          return (
                            <td key={r.remedyId}>
                              {grade > 0 ? <span className={gradeClass(grade)}>{grade}</span> : <span style={{ color: 'var(--border-default)' }}>–</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr className="rep-totals-row">
                      <td>Rubric count</td>
                      {topRemedies.map(r => <td key={r.remedyId}>{rubricCounts.counts[r.remedyId] || 0}</td>)}
                    </tr>
                    <tr className="rep-grade-total-row">
                      <td>Grade total</td>
                      {topRemedies.map(r => <td key={r.remedyId}>{rubricCounts.gradeTotals[r.remedyId] || 0}</td>)}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Clinical note */}
              <div className="rep-clinical-note">
                <p>
                  <strong>Clinical note:</strong>{' '}
                  {topRemedies[0]?.remedyName} leads on all rubrics.
                  {topRemedies[0]?.matchExplanation?.[0] && ` ${topRemedies[0].matchExplanation[0]}`}
                </p>
              </div>

              {/* Legend */}
              <div className="rep-legend">
                <div className="rep-legend-item">
                  <span className="rep-legend-count rep-legend-count--eliminating">{eliminatingCount}</span>
                  <span className="rep-legend-label">Eliminating</span>
                </div>
                <div className="rep-legend-item">
                  <span className="rep-legend-count rep-legend-count--important">{importantCount}</span>
                  <span className="rep-legend-label">Important</span>
                </div>
                <div className="rep-legend-item">
                  <span className="rep-legend-count rep-legend-count--confirm">1</span>
                  <span className="rep-legend-label">Confirmatory</span>
                </div>
              </div>
            </>
          ) : (
            <div className="stage-empty-panel">
              <BarChart3 style={{ width: 32, height: 32, color: 'var(--text-disabled)', margin: '0 auto 0.75rem' }} />
              <p>No scored remedies yet</p>
              <p>Generate AI consultation draft to populate rubrics</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
