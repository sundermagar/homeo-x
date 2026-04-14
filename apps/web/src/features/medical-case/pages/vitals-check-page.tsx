import { useState, useRef } from 'react';
import {
  Activity, User, Calendar, Phone, Zap,
  Ruler, Weight, RefreshCw, Info, TrendingDown,
  TrendingUp, CheckCircle2, History, ChevronRight,
  RotateCcw
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '@/infrastructure/api-client';
import growthChart from '@/assets/growth-chart.png';
import '../styles/vitals-check.css';

// Legacy Assets
const RESULT_IMG_URL = 'https://xkidsgrowth.com/la-assets/images/heigh_growth_result_page.png';

// ═══════════════════════════════════════════════════════════════════════════════
// PARAMETER CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function ParameterCard({ label, current, ideal, unit, icon: Icon, color, analysis }: {
  label: string;
  current: string;
  ideal: string;
  unit: string;
  icon: React.ElementType;
  color: string;
  analysis: string;
}) {
  const diff = ideal ? (parseFloat(current) - parseFloat(ideal)).toFixed(2) : null;
  const isDeficit = diff !== null && parseFloat(diff) < 0;

  return (
    <div className="param-card">
      <div className="param-card-header">
        <div className="param-card-label-group">
          <Icon size={18} style={{ color }} />
          <span className="param-card-label">{label}</span>
        </div>
        {ideal && (
          <div className={`param-diff-badge ${isDeficit ? 'deficit' : 'premium'}`}>
            {isDeficit ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
            {isDeficit ? 'Deficit' : 'Premium'} {Math.abs(parseFloat(diff!))} {unit}
          </div>
        )}
      </div>

      <div className="param-card-body">
        <div className="param-card-body-col">
          <span className="param-card-sublabel">Current Measurement</span>
          <span className="param-card-value">
            {current}
            <span className="param-card-unit"> {unit}</span>
          </span>
        </div>
        <div className="param-card-body-col right">
          <span className="param-card-sublabel">Ideal Mean (WHO)</span>
          <span className="param-card-value" style={{ color: 'var(--success)' }}>
            {ideal || '—'}
            <span className="param-card-unit"> {unit}</span>
          </span>
        </div>
      </div>

      {analysis && (
        <div className="param-card-analysis">
          <Info size={14} className="param-card-analysis-icon" />
          <span>{analysis}</span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function VitalsCheckPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [selectedPatient] = useState<any>(null);
  const [results, setResults] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [form, setForm] = useState({
    regid: '',
    name: '',
    mobile: '',
    dob: '',
    gender: 'M',
    height: '',
    weight: ''
  });

  const searchTimeout = useRef<any>(null);

  // Search Logic
  const handleSearch = (q: string) => {
    setSearch(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 2) { setSuggestions([]); return; }

    searchTimeout.current = setTimeout(async () => {
      try {
        const { data } = await apiClient.get(`/patients?search=${q}&limit=5`);
        setSuggestions(data.data || []);
      } catch (err) {
        console.error('Search failed', err);
      }
    }, 300);
  };

  const selectPatient = (p: any) => {
    const gender = p.gender === 'Female' ? 'F' : 'M';
    setForm({
      ...form,
      regid: p.regid,
      name: `${p.first_name} ${p.surname}`,
      mobile: p.mobile1 || '',
      dob: p.dob || '',
      gender
    });
    setSuggestions([]);
    setSearch(`${p.first_name} ${p.surname} (${p.regid})`);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.dob || !form.height || !form.weight) {
      setErrors(['DOB, Height and Weight are required']);
      return;
    }

    setSubmitting(true);
    setErrors([]);
    try {
      const { data } = await apiClient.post('/medical-cases/vitals/analyze', {
        dob: form.dob,
        gender: form.gender,
        heightCm: parseFloat(form.height),
        weightKg: parseFloat(form.weight),
        name: form.name,
        mobile: form.mobile
      });

      if (data.success) {
        setResults(data.result);
      } else {
        setErrors([data.message]);
      }
    } catch (err: any) {
      setErrors([err.response?.data?.message || err.message]);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setResults(null);
    setForm({ regid: '', name: '', mobile: '', dob: '', gender: 'M', height: '', weight: '' });
    setSearch('');
    setErrors([]);
  };

  return (
    <div className="ghub-page-wrapper fade-in">
      {/* ─── Header ─── */}
      <div className="ghub-content-header">
        <div className="ghub-title-area">
          <h1 className="ghub-main-title">
            <Activity size={22} style={{ color: 'var(--primary)' }} />
            Growth Analytics Engine
          </h1>
          <p className="ghub-subtitle">Advanced percentile mapping for developmental tracking</p>
        </div>
      </div>

      <div className="ghub-main-container">

        {!results ? (
          <>
            {/* Left: Capture Parameters */}
            <section className="ghub-primary-card">
              <div className="ghub-card-header">
                <Zap className="ghub-zap-icon" size={20} />
                <h2>Capture Parameters</h2>
              </div>

              {errors.length > 0 && (
                <div className="ghub-error-banner">
                  {errors.map((err, i) => <div key={i}>{err}</div>)}
                </div>
              )}

              <form onSubmit={handleAnalyze} className="ghub-form-body">
                {/* Patient Search */}
                <div className="ghub-input-field">
                  <label className="ghub-input-label">Search Patient (Name or ID)</label>
                  <div className="ghub-input-container">
                    <User className="ghub-input-icon-left" size={16} />
                    <input
                      type="text"
                      className="ghub-premium-input"
                      value={search}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Enter name, phone or registration ID..."
                    />
                    {suggestions.length > 0 && (
                      <div className="ghub-dropdown">
                        {suggestions.map(p => (
                          <div key={p.regid} onClick={() => selectPatient(p)} className="ghub-drop-item">
                            <span style={{ fontWeight: 700 }}>{p.first_name} {p.surname}</span>
                            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                              PT-{p.regid}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact + DOB */}
                <div className="ghub-grid-2 mt-6">
                  <div className="ghub-input-field">
                    <label className="ghub-input-label">Primary Contact</label>
                    <div className="ghub-input-container">
                      <Phone className="ghub-input-icon-left" size={16} />
                      <input
                        type="text"
                        className="ghub-premium-input"
                        readOnly
                        value={form.mobile}
                        placeholder="+91 ..."
                      />
                    </div>
                  </div>
                  <div className="ghub-input-field">
                    <label className="ghub-input-label">Date of Birth</label>
                    <div className="ghub-input-container">
                      <Calendar className="ghub-input-icon-left" size={16} />
                      <input
                        type="text"
                        onFocus={(e) => (e.target.type = 'date')}
                        onBlur={(e) => !e.target.value && (e.target.type = 'text')}
                        className="ghub-premium-input"
                        readOnly={!selectedPatient}
                        value={form.dob}
                        placeholder="dd / mm / yyyy"
                      />
                    </div>
                  </div>
                </div>

                {/* Gender */}
                <div className="ghub-gender-selector mt-6">
                  <label>Gender</label>
                  <div className="ghub-toggle-group">
                    <button
                      type="button"
                      className={`ghub-toggle-item ${form.gender === 'M' ? 'active-male' : ''}`}
                      onClick={() => setForm({ ...form, gender: 'M' })}
                    >
                      Male
                    </button>
                    <button
                      type="button"
                      className={`ghub-toggle-item ${form.gender === 'F' ? 'active-female' : ''}`}
                      onClick={() => setForm({ ...form, gender: 'F' })}
                    >
                      Female
                    </button>
                  </div>
                </div>

                {/* Metrics */}
                <div className="ghub-metrics-grid mt-6">
                  <div className="ghub-metric-card">
                    <div className="ghub-level-bar" style={{ background: 'var(--primary)' }} />
                    <div className="ghub-metric-header">
                      <Ruler size={12} />
                      <span>Height (cm)</span>
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      value={form.height}
                      onChange={e => setForm({ ...form, height: e.target.value })}
                      placeholder="0.0"
                    />
                  </div>
                  <div className="ghub-metric-card">
                    <div className="ghub-level-bar" style={{ background: 'var(--danger)' }} />
                    <div className="ghub-metric-header">
                      <Weight size={12} />
                      <span>Weight (kg)</span>
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      value={form.weight}
                      onChange={e => setForm({ ...form, weight: e.target.value })}
                      placeholder="0.0"
                    />
                  </div>
                </div>

                {/* CTA */}
                <button
                  type="submit"
                  className="ghub-action-button"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <RotateCcw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Activity size={18} />
                      <span>Generate Diagnostic Analysis</span>
                    </>
                  )}
                </button>
              </form>
            </section>

            {/* Right: Illustration */}
            <section className="ghub-secondary-card">
              <div className="ghub-visual-area">
                <img src={growthChart} alt="Growth Progress" className="ghub-illustration" />
              </div>
              <div className="ghub-content-area">
                <h3>Standardized Percentile Mapping</h3>
                <p>Our engine utilizes WHO international standards to provide real-time clinical insights into developmental gaps.</p>
              </div>
            </section>
          </>
        ) : (
          /* Results View */
          <div className="ghub-results-wrapper">
            <section className="ghub-primary-card ghub-results-card">
              <div className="ghub-results-header">
                <div>
                  <h2 className="ghub-results-title">Analysis Synthesis</h2>
                  <div className="ghub-results-meta">
                    <span className="ghub-patient-name">{form.name}</span>
                    <span className="ghub-separator">·</span>
                    <span className="ghub-age-display">Age: {results.ageDisplay}</span>
                  </div>
                </div>
                <button onClick={reset} className="ghub-recalculate-btn">
                  <RefreshCw size={14} />
                  <span>Re-Calculate</span>
                </button>
              </div>

              <div className="ghub-results-grid">
                <div className="ghub-params-column">
                  <ParameterCard
                    label="Statural Height"
                    current={results.actualHeight}
                    ideal={results.expectedHeight}
                    unit="CM"
                    icon={Ruler}
                    color="var(--primary)"
                    analysis={results.heightAnalysis}
                  />
                  <ParameterCard
                    label="Body Weight"
                    current={results.actualWeight}
                    ideal={results.expectedWeight}
                    unit="KG"
                    icon={Weight}
                    color="var(--danger)"
                    analysis={results.weightAnalysis}
                  />
                </div>

                <div className="ghub-bmi-infographic">
                  <img src={RESULT_IMG_URL} alt="BMI Result" className="ghub-bmi-img" />
                  <div className="ghub-bmi-content">
                    <div className="ghub-bmi-label">BMI</div>
                    <div className="ghub-bmi-value">{results.bmi}</div>
                    <div className="ghub-bmi-status">
                      <CheckCircle2 size={13} />
                      Variance Normal
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="ghub-history-footer">
              <Link to="/medical-cases" className="ghub-history-link">
                <History size={15} />
                View History
                <ChevronRight size={15} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}