import React, { useState } from 'react';
import { User, Clock, FileText, UserCheck, Shield, ChevronDown, Building2, Monitor } from 'lucide-react';
import { useAuditLogs, AuditLogEntry } from '../hooks/use-audit';
import '../styles/platform.css';

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'auth.login', label: 'Login' },
  { value: 'auth.logout', label: 'Logout' },
  { value: 'impersonation.start', label: 'Impersonation Start' },
  { value: 'impersonation.end', label: 'Impersonation End' },
  { value: 'patient.create', label: 'Patient Create' },
  { value: 'patient.update', label: 'Patient Update' },
  { value: 'settings.update', label: 'Settings Update' },
];

export default function AuditLogsPage() {
  const [actionFilter, setActionFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const { data, isLoading } = useAuditLogs({
    action: actionFilter || undefined,
    tenantId: tenantFilter || undefined,
    limit: 50,
  });

  const formatActionTitle = (action: string) => {
    const labels: Record<string, string> = {
      'auth.login': 'Login',
      'auth.logout': 'Logout',
      'auth.password_change': 'Password Change',
      'patient.create': 'Patient Created',
      'patient.update': 'Patient Updated',
      'patient.delete': 'Patient Deleted',
      'case.create': 'Case Created',
      'case.complete': 'Case Completed',
      'consultation.start': 'Consultation Started',
      'consultation.complete': 'Consultation Completed',
      'consultation.ai_pipeline': 'AI Pipeline Run',
      'settings.update': 'Settings Updated',
      'settings.role_update': 'Role Updated',
      'impersonation.start': 'Impersonation Started',
      'impersonation.end': 'Impersonation Ended',
    };
    return labels[action] || action.split('.').pop()?.replace(/_/g, ' ') || action;
  };

  const getActionIcon = (action: string) => {
    if (action.includes('impersonation')) return <UserCheck size={18} />;
    if (action.includes('login') || action.includes('logout')) return <Shield size={18} />;
    if (action.includes('patient')) return <User size={18} />;
    return <FileText size={18} />;
  };

  const getIconClass = (action: string) => {
    if (action === 'impersonation.end' || action === 'auth.logout') return 'audit-icon-box audit-icon-box-gray';
    return 'audit-icon-box audit-icon-box-blue';
  };

  const renderDetail = (log: AuditLogEntry) => {
    const meta = log.metadata || {};
    if (log.action.includes('impersonation')) {
      if (log.action === 'impersonation.start') {
        return <div className="audit-detail-box"><b>Reason:</b> {meta.reason || 'testing'}</div>;
      }
      if (log.action === 'impersonation.end') {
        return <div className="audit-detail-box"><b>Duration:</b> {meta.duration || '1 minutes'}</div>;
      }
    }
    if (meta.notes) {
      return <div className="audit-detail-box"><b>Notes:</b> {meta.notes}</div>;
    }
    return null;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="plat-page fade-in">
      {/* ─── Header ─── */}
      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">Audit Logs</h1>
          <p className="plat-header-sub">Track all platform admin actions for compliance and security</p>
        </div>
        <div className="plat-stats-bar" style={{ marginBottom: 0, gridTemplateColumns: 'auto' }}>
          <div className="plat-stat-card">
            <span className="plat-stat-label">Total Entries</span>
            <span className="plat-stat-value plat-stat-value-primary">{data?.total ?? '—'}</span>
          </div>
        </div>
      </div>

      {/* ─── Filters ─── */}
      <div className="plat-filters" style={{ border: 'none', background: 'transparent', padding: '0 0 20px 0' }}>
        <div style={{ display: 'flex', gap: '12px', width: '100%', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <select
              className="plat-form-input"
              style={{ width: '180px', borderRadius: '8px', appearance: 'none', paddingRight: '32px' }}
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              {ACTION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '11px', color: '#94a3b8', pointerEvents: 'none' }} />
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="plat-form-input"
              placeholder="Filter by tenant..."
              style={{ width: '180px', borderRadius: '8px' }}
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ─── Logs List ─── */}
      <div className="plat-card" style={{ padding: 0 }}>
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>Loading logs...</div>
        ) : (
          <div className="audit-list">
            {(data?.data || []).map((log) => (
              <div key={log.id} className="audit-item">
                <div className={getIconClass(log.action)}>
                  {getActionIcon(log.action)}
                </div>

                <div className="audit-content">
                  <div className="audit-title">
                    {formatActionTitle(log.action)}
                  </div>

                  <div className="audit-meta-row">
                    <div className="audit-meta-item">
                      <User size={14} />
                      <span>User ID: {log.userId ?? '—'}</span>
                    </div>
                    <div className="audit-meta-item">
                      <Building2 size={14} />
                      <span>{log.tenantId}</span>
                    </div>
                    <div className="audit-meta-item">
                      <Clock size={14} />
                      <span>{formatDate(log.createdAt)}</span>
                    </div>
                  </div>

                  {/* Resource info */}
                  {(log.resourceType || log.resourceId) && (
                    <div className="audit-detail-box">
                      <b>Resource:</b> {log.resourceType}:{log.resourceId}
                    </div>
                  )}

                  {renderDetail(log)}

                  {/* IP & User-Agent */}
                  {(log.ip || log.userAgent) && (
                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                      {log.ip && (
                        <div className="audit-meta-item">
                          <Monitor size={12} />
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>{log.ip}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {(!data?.data || data.data.length === 0) && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                No audit logs found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
