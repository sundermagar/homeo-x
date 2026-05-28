import React, { useState, useEffect } from 'react';
import {
  Bell, Filter, RotateCw, List, LayoutGrid, MessageSquare,
  AlertCircle, CalendarClock, Search, ChevronRight, Clock,
  CheckCircle2, User, Calendar, MoreVertical, X, Phone, Download, Printer
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '@/infrastructure/api-client';
import { useDoctors } from '@/features/appointments/hooks/use-doctors';
import { TableSkeleton } from '@/components/shared/table-skeleton';
import { Pagination } from '@/components/shared/pagination';
import { EmptyState } from '@/components/shared/empty-state';
import { useWhatsApp } from '@/features/whatsapp/hooks/use-whatsapp';
import { useCallStatuses } from '@/features/settings/hooks/use-settings';
import { Drawer } from '@/shared/components/drawer';

export default function FollowupsPage() {
  const navigate = useNavigate();
  const { useSendText } = useWhatsApp();
  const sendText = useSendText();
  const [followups, setFollowups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [search, setSearch] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Status Modal State
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedFollowup, setSelectedFollowup] = useState<any>(null);
  const [newCallStatus, setNewCallStatus] = useState('');
  const [newActionDate, setNewActionDate] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [filters, setFilters] = useState({
    from_date: '',
    to_date: '',
    doctor_id: ''
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const { data: doctors = [] } = useDoctors();
  const { data: callStatuses = [] } = useCallStatuses();

  useEffect(() => {
    fetchFollowups();
  }, [filters, page, limit]);

  const fetchFollowups = async () => {
    setLoading(true);
    try {
      const params: any = {
        ...filters,
        page,
        limit,
        search,
        _t: Date.now().toString()
      };

      const res = await apiClient.get('/appointments/followups', { params });
      if (res.data?.data) {
        setFollowups(res.data.data.data || []);
        setTotal(res.data.data.total || 0);
      }
    } catch (error) {
      console.error("Failed to load followups", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFollowups();
  };

  const handleSelectAll = () => {
    if (selectedIds.size === followups.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(followups.map(f => f.id + '-' + f.visitType)));
    }
  };

  const handleSelectRow = (id: string, visitType: string) => {
    const key = id + '-' + visitType;
    const newSet = new Set(selectedIds);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setSelectedIds(newSet);
  };

  const updateActionStatus = async (f: any, callStatus: string) => {
    try {
      await apiClient.post('/appointments/followups/status', {
        id: f.id,
        visitType: f.visitType,
        callStatus: callStatus,
        actionDate: new Date().toISOString().split('T')[0]
      });
      fetchFollowups();
    } catch (err) {
      console.error('Failed to update action status', err);
    }
  };

  const handleSendAll = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to send WhatsApp reminders to ${selectedIds.size} selected patients?`)) return;

    let successCount = 0;
    const selectedList = followups.filter(f => selectedIds.has(f.id + '-' + f.visitType));
    
    selectedList.forEach(f => {
      const phone = f.phone ? f.phone.replace(/\D/g, '') : '';
      if (!phone || phone.length < 10) return;
      const finalPhone = phone.length === 10 ? '91' + phone : phone;
      const textMessage = `Dear ${f.patientName || 'Patient'},\n\nThis is a friendly reminder for your upcoming follow-up appointment.\n\nPlease let us know if you need to reschedule.\n\nRegards,\nMMC HomeoTech`;
      
      sendText.mutate({ phone: finalPhone, message: textMessage }, {
        onSuccess: () => { 
          successCount++;
          updateActionStatus(f, 'WhatsApp Sent');
        }
      });
    });
    alert(`Bulk send initiated for ${selectedIds.size} patients.`);
    setSelectedIds(new Set());
  };

  const openStatusModal = (f: any) => {
    setSelectedFollowup(f);
    setNewCallStatus(f.callStatus || '');
    setNewActionDate(f.actionDate ? new Date(f.actionDate).toISOString().split('T')[0] || '' : '');
    setStatusModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedFollowup) return;
    setUpdatingStatus(true);
    try {
      const res = await apiClient.post('/appointments/followups/status', {
        id: selectedFollowup.id,
        visitType: selectedFollowup.visitType,
        callStatus: newCallStatus,
        actionDate: newActionDate || null
      });
      console.log("UPDATE STATUS RESPONSE:", res.data);
      alert('Status updated successfully');
      setStatusModalOpen(false);
      fetchFollowups();
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const openWhatsApp = (f: any) => {
    const phone = f.phone ? f.phone.replace(/\D/g, '') : '';
    if (!phone) {
      alert('Mobile number not available');
      return;
    }
    const finalPhone = phone.length === 10 ? '91' + phone : phone;
    
    const textMessage = `Dear ${f.patientName || 'Patient'},\n\nThis is a friendly reminder for your upcoming follow-up appointment.\n\nPlease let us know if you need to reschedule.\n\nRegards,\nMMC HomeoTech`;

    sendText.mutate({
      phone: finalPhone,
      message: textMessage
    }, {
      onSuccess: () => {
        alert('✅ Follow-up reminder sent via WhatsApp!');
        updateActionStatus(f, 'WhatsApp Sent');
      },
      onError: (err: any) => alert('❌ Failed to send WhatsApp message: ' + (err.response?.data?.message || err.message))
    });
  };

  const missedCount = followups.filter(f => f.visitType === 'Missed').length;
  const nextVisitCount = followups.filter(f => f.visitType === 'Next Visit').length;
  const actionTakenCount = followups.filter(f => f.callStatus).length;

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedFollowups = React.useMemo(() => {
    let sortableItems = [...followups];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        // String comparison for names
        if (sortConfig.key === 'patientName') {
          valA = valA ? valA.toLowerCase() : '';
          valB = valB ? valB.toLowerCase() : '';
        }

        // Date comparison
        if (sortConfig.key === 'lastDate' || sortConfig.key === 'bookingDate') {
          valA = valA ? new Date(valA).getTime() : 0;
          valB = valB ? new Date(valB).getTime() : 0;
        }

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [followups, sortConfig]);

  const exportToCSV = () => {
    const headers = ['Reg ID', 'Patient Name', 'Phone', 'Enc. Type', 'Prescription Date', 'Next Date', 'Call Status', 'Action Date'];
    const data = sortedFollowups.map(f => [
      `#${f.patientId}`,
      f.patientName || '',
      f.phone || '',
      f.visitType,
      f.lastDate ? new Date(f.lastDate).toLocaleDateString('en-GB') : '',
      f.bookingDate ? new Date(f.bookingDate).toLocaleDateString('en-GB') : '',
      f.callStatus || '',
      f.actionDate ? new Date(f.actionDate).toLocaleDateString('en-GB') : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Followups_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (!sortedFollowups || sortedFollowups.length === 0) return;
    
    const html = `
      <html>
        <head>
          <title>Follow-up Dues Report</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #1e293b; }
            h2 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
            th { background: #f8fafc; font-weight: bold; }
            @media print {
              body { padding: 0; }
              @page { size: A4 portrait; margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <h2>Follow-up Dues Report (As of ${new Date().toLocaleDateString('en-GB')})</h2>
          <table>
            <thead>
              <tr>
                <th>Reg ID</th>
                <th>Patient Name</th>
                <th>Phone</th>
                <th>Enc. Type</th>
                <th>Prescription Date</th>
                <th>Next Date</th>
                <th>Call Status</th>
                <th>Action Date</th>
              </tr>
            </thead>
            <tbody>
              ${sortedFollowups.map(f => `
                <tr>
                  <td>#${f.patientId}</td>
                  <td>${f.patientName || ''}</td>
                  <td>${f.phone || ''}</td>
                  <td>${f.visitType}</td>
                  <td>${f.lastDate ? new Date(f.lastDate).toLocaleDateString('en-GB') : ''}</td>
                  <td>${f.bookingDate ? new Date(f.bookingDate).toLocaleDateString('en-GB') : ''}</td>
                  <td>${f.callStatus || ''}</td>
                  <td>${f.actionDate ? new Date(f.actionDate).toLocaleDateString('en-GB') : ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.print();
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig?.key !== columnKey) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4, color: 'var(--pp-primary)' }}>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="pp-page-container animate-fade-in">
      {/* Header Section */}
      <header className="pp-page-header mb-8">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-title pp-text-gradient">Follow-up Dues</h1>
            <p className="text-subtitle">{followups.length} clinical encounters pending attention</p>
          </div>
        </div>
        <div className="flex items-center gap-3 hide-on-print">
          <button className="btn-secondary" onClick={exportToCSV}>
            <Download size={14} />
            <span className="hide-mobile">CSV</span>
          </button>
          <button className="btn-secondary" onClick={handlePrint}>
            <Printer size={14} />
            <span className="hide-mobile">PDF</span>
          </button>
          <button className="btn-secondary" onClick={fetchFollowups}>
            <RotateCw size={14} className={loading ? 'fu-spin' : ''} />
            <span className="hide-mobile">Sync Data</span>
          </button>
        </div>
      </header>

      {/* Hero / Insights Card */}
      <section className="fu-hero-card pp-card-premium mb-8">
        <div className="fu-hero-content">
          <div className="fu-hero-icon-blob">
            <CalendarClock size={24} strokeWidth={1.5} />
          </div>
          <div className="fu-hero-text">
            <h2 className="fu-h2">Clinical Insights</h2>
            <p className="fu-p">Unified dashboard for missed appointments and scheduled next visits.</p>
          </div>
        </div>

        <div className="fu-insights-grid">
          <div className="fu-insight-item">
            <div className="fu-insight-icon total"><Bell size={18} /></div>
            <div>
              <span className="fu-insight-label">Total Pending</span>
              <span className="fu-insight-value">{followups.length}</span>
            </div>
          </div>
          <div className="fu-insight-item">
            <div className="fu-insight-icon missed"><AlertCircle size={18} /></div>
            <div>
              <span className="fu-insight-label">Missed Visits</span>
              <span className="fu-insight-value">{missedCount}</span>
            </div>
          </div>
          <div className="fu-insight-item">
            <div className="fu-insight-icon next"><CheckCircle2 size={18} /></div>
            <div>
              <span className="fu-insight-label">Upcoming</span>
              <span className="fu-insight-value">{nextVisitCount}</span>
            </div>
          </div>
          <div className="fu-insight-item">
            <div className="fu-insight-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)' }}><Phone size={18} /></div>
            <div>
              <span className="fu-insight-label">Action Taken</span>
              <span className="fu-insight-value">{actionTakenCount}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Action Bar */}
      <div className="fu-action-bar mb-6">
        <div className="fu-search-group">
          <Search size={18} className="fu-search-icon" />
          <form onSubmit={handleSearch} className="flex-1">
            <input
              type="text"
              className="pp-input"
              placeholder="Search by patient name or mobile..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </form>
        </div>

        <div className="flex gap-3">
          {selectedIds.size > 0 && (
            <button className="btn-primary animate-fade-in" onClick={handleSendAll}>
              <MessageSquare size={16} />
              <span className="hide-mobile">Send All ({selectedIds.size})</span>
            </button>
          )}
          <button
            className={`btn-secondary ${isFilterOpen ? 'fu-btn-active' : ''}`}
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <Filter size={16} />
            <span className="hide-mobile">Filters</span>
          </button>

          <div className="fu-toggle-group">
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              <List size={18} />
            </button>
            <button
              className={viewMode === 'card' ? 'active' : ''}
              onClick={() => setViewMode('card')}
            >
              <LayoutGrid size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Filter Panel */}
      {isFilterOpen && (
        <div className="pp-card mb-6 animate-fade-in" style={{ background: 'var(--pp-warm-1)' }}>
          <div className="pp-form-grid">
            <div className="fu-field">
              <label className="text-label">Practitioner</label>
              <select
                className="pp-select"
                value={filters.doctor_id}
                onChange={e => setFilters(prev => ({ ...prev, doctor_id: e.target.value }))}
              >
                <option value="">All Doctors</option>
                {doctors.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="fu-field">
              <label className="text-label">From Date</label>
              <input
                type="date"
                className="pp-input"
                value={filters.from_date}
                onChange={e => setFilters(prev => ({ ...prev, from_date: e.target.value }))}
              />
            </div>
            <div className="fu-field">
              <label className="text-label">To Date</label>
              <input
                type="date"
                className="pp-input"
                value={filters.to_date}
                onChange={e => setFilters(prev => ({ ...prev, to_date: e.target.value }))}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="fu-main">
        {loading ? (
          viewMode === 'list' ? (
            <TableSkeleton rows={limit} columns={6} />
          ) : (
            <div className="pp-patient-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="pp-card-premium" style={{ height: 280, padding: 24 }}>
                  <div className="skeleton-box skeleton-text" style={{ width: '40%', height: 20, marginBottom: 20 }} />
                  <div className="flex flex-col items-center mb-5">
                    <div className="skeleton-box" style={{ width: 64, height: 64, borderRadius: 20, marginBottom: 12 }} />
                    <div className="skeleton-box skeleton-text" style={{ width: '60%', height: 18 }} />
                  </div>
                  <div className="skeleton-box skeleton-text" style={{ height: 60, borderRadius: 12 }} />
                </div>
              ))}
            </div>
          )
        ) : followups.length === 0 ? (
          <EmptyState 
            icon={CalendarClock}
            title={search || filters.doctor_id || filters.from_date ? "No matches found" : "No pending follow-ups"}
            description={search || filters.doctor_id || filters.from_date ? "Try adjusting your filters or search query to find specific clinical encounters." : "You're all caught up! No missed visits or scheduled follow-ups were found for this clinic."}
            actionLabel={search || filters.doctor_id || filters.from_date ? "Reset Filters" : undefined}
            onAction={search || filters.doctor_id || filters.from_date ? () => {
              setFilters({ from_date: '', to_date: '', doctor_id: '' });
              setSearch('');
            } : undefined}
            variant="card"
            className="my-8"
          />
        ) : (
          <div className={`animate-fade-in ${viewMode === 'list' ? 'fu-list-view' : 'fu-grid-view'}`}>
            {viewMode === 'list' ? (
              <div className="pp-table-scroll pp-card-premium" style={{ padding: 0 }}>
                <table className="pp-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>
                        <input 
                          type="checkbox" 
                          checked={followups.length > 0 && selectedIds.size === followups.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th>Reg ID</th>
                      <th onClick={() => handleSort('patientName')} style={{ cursor: 'pointer', userSelect: 'none' }} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        Patient Details <SortIcon columnKey="patientName" />
                      </th>
                      <th>Enc. Type</th>
                      <th onClick={() => handleSort('lastDate')} style={{ cursor: 'pointer', userSelect: 'none' }} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        Prescription Date <SortIcon columnKey="lastDate" />
                      </th>
                      <th onClick={() => handleSort('bookingDate')} style={{ cursor: 'pointer', userSelect: 'none' }} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        Next Date <SortIcon columnKey="bookingDate" />
                      </th>
                      <th>Call Status</th>
                      <th>Action Date</th>
                      <th className="hide-on-print" style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedFollowups.map(f => (
                      <tr key={f.id + '-' + f.visitType} className="hover-row">
                        <td>
                          <input 
                            type="checkbox" 
                            checked={selectedIds.has(f.id + '-' + f.visitType)}
                            onChange={() => handleSelectRow(f.id, f.visitType)}
                          />
                        </td>
                        <td data-label="Reg ID">
                          <span className="fu-meta-cell">#{f.patientId}</span>
                        </td>
                        <td data-label="Patient">
                          <div className="fu-patient-info">
                            <div className="fu-avatar-sm">{f.patientName?.[0]}</div>
                            <div>
                              <span className="fu-name">{f.patientName}</span>
                              <span className="fu-phone">{f.phone || 'No Contact'}</span>
                            </div>
                          </div>
                        </td>
                        <td data-label="Enc. Type">
                          <span className={`db-badge ${f.visitType === 'Missed' ? 'db-badge-danger' : 'db-badge-success'}`}>
                            {f.visitType}
                          </span>
                        </td>
                        <td data-label="Prescription Date">
                          <div className="flex items-center gap-1.5 fu-meta-cell">
                            {f.lastDate ? (
                              <>
                                <Calendar size={14} className="color-muted" />
                                {new Date(f.lastDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </>
                            ) : '—'}
                          </div>
                        </td>
                        <td data-label="Next Date">
                          <div className="flex items-center gap-1.5 fu-meta-cell">
                            {f.bookingDate ? (
                              <>
                                <Calendar size={14} className="color-muted" />
                                {new Date(f.bookingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </>
                            ) : '—'}
                          </div>
                        </td>
                        <td data-label="Call Status">
                          <div className="fu-meta-cell">
                            {f.callStatus || '—'}
                          </div>
                        </td>
                        <td data-label="Action Date">
                          <div className="flex items-center gap-1.5 fu-meta-cell">
                            {f.actionDate ? (
                              <>
                                <Calendar size={14} className="color-muted" />
                                {new Date(f.actionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </>
                            ) : '—'}
                          </div>
                        </td>
                        <td className="hide-on-print" data-label="Actions" style={{ textAlign: 'right' }}>
                          <div className="flex justify-end gap-2 fu-action-wrap">
                            <button 
                              className="fu-action-btn wa" 
                              onClick={() => openWhatsApp(f)} 
                              title="Send WhatsApp"
                              style={f.callStatus === 'WhatsApp Sent' ? { background: '#25D366', color: 'white', borderColor: '#25D366' } : {}}
                            >
                              <MessageSquare size={14} />
                            </button>
                            <button 
                              className="fu-action-btn" 
                              onClick={() => openStatusModal(f)} 
                              title="Update Status"
                              style={f.callStatus && f.callStatus !== 'WhatsApp Sent' ? { background: 'var(--pp-blue)', color: 'white', borderColor: 'var(--pp-blue)' } : {}}
                            >
                              <Phone size={14} />
                            </button>
                            <Link to={`/medical-cases/${f.patientId}`} className="fu-action-btn" title="View Case">
                              <ChevronRight size={14} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="fu-grid-view-inner">
                {sortedFollowups.map(f => (
                  <div key={f.id} className="fu-patient-card pp-card-premium">
                    <div className="flex justify-between items-start mb-4">
                      <div className="fu-avatar-lg">{f.patientName?.[0]}</div>
                      <span className={`db-badge ${f.visitType === 'Missed' ? 'db-badge-danger' : 'db-badge-success'}`}>
                        {f.visitType}
                      </span>
                    </div>
                    
                    <h3 className="fu-card-title mb-1">{f.patientName}</h3>
                    <p className="fu-phone mb-4">{f.phone || 'No Contact'}</p>
                    
                    <div className="fu-card-meta mb-4">
                      <div className="fu-meta-row">
                        <Calendar size={14} />
                        <span>Next Date: {new Date(f.bookingDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div className="fu-meta-row">
                        <Clock size={14} />
                        <span>Time: {f.bookingTime || 'Not set'}</span>
                      </div>
                      <div className="fu-meta-row">
                        <User size={14} />
                        <span>Dr. {f.doctorName || 'General'}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button className="btn-secondary flex-1" onClick={() => openWhatsApp(f)} style={{ height: 40, fontSize: 12 }}>
                        WhatsApp
                      </button>
                      <Link to={`/medical-cases/${f.patientId}`} className="btn-primary flex-1" style={{ height: 40, fontSize: 12 }}>
                        View Case
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {!loading && total > 0 && (
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(total / limit)}
          pageSize={limit}
          totalItems={total}
          onPageChange={setPage}
          onPageSizeChange={setLimit}
        />
      )}

      <Drawer
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Update Call Status"
        maxWidth="480px"
      >
        <div style={{ padding: '24px' }}>
          <div className="pp-form-grid" style={{ gridTemplateColumns: '1fr', gap: '20px' }}>
            <div className="fu-field">
              <label style={{ display: 'block', marginBottom: 8, fontSize: '13px', fontWeight: 600, color: 'var(--pp-text-2)' }}>Call Status</label>
              <select 
                value={newCallStatus}
                onChange={e => setNewCallStatus(e.target.value)}
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', backgroundColor: '#fff', color: '#000', cursor: 'pointer' }}
              >
                <option value="">Select Status...</option>
                {callStatuses.map((status: any) => (
                  <option key={status.id} value={status.name}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="fu-field">
              <label style={{ display: 'block', marginBottom: 8, fontSize: '13px', fontWeight: 600, color: 'var(--pp-text-2)' }}>Action Date</label>
              <input 
                type="date" 
                value={newActionDate}
                onChange={e => setNewActionDate(e.target.value)}
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px 12px', fontSize: '14px', backgroundColor: '#fff', color: '#000' }}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4" style={{ padding: '0 24px 24px 24px' }}>
          <button className="btn-secondary" onClick={() => setStatusModalOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleUpdateStatus} disabled={updatingStatus}>
            {updatingStatus ? 'Updating...' : 'Save Changes'}
          </button>
        </div>
      </Drawer>

      <style>{`
        .fu-back-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid var(--pp-warm-4);
          background: var(--bg-card);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--pp-text-2);
          cursor: pointer;
          transition: all 0.2s;
        }
        .fu-back-btn:hover {
          background: var(--pp-warm-2);
          border-color: var(--pp-blue-border);
          color: var(--pp-blue);
        }

        .text-title { font-size: 1.5rem !important; }
        .text-subtitle { font-size: 0.8rem !important; }

        /* Hero Insights - Fully Responsive & Premium */
        .fu-hero-card {
          padding: clamp(16px, 4vw, 24px);
          display: flex;
          flex-direction: column;
          gap: 24px;
          background: var(--bg-card);
          position: relative;
          overflow: hidden;
          border-radius: 20px;
        }
        .fu-hero-card::before {
          content: '';
          position: absolute;
          top: 0; right: 0;
          width: 250px; height: 250px;
          background: radial-gradient(circle at top right, var(--pp-blue-tint) 0%, transparent 70%);
          z-index: 0;
          pointer-events: none;
        }
        .fu-hero-content {
          display: flex;
          align-items: center;
          gap: clamp(12px, 3vw, 20px);
          position: relative;
          z-index: 1;
        }
        .fu-hero-icon-blob {
          flex-shrink: 0;
          width: clamp(40px, 10vw, 48px);
          height: clamp(40px, 10vw, 48px);
          background: var(--pp-blue);
          color: white;
          border-radius: clamp(12px, 3vw, 18px);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.15);
        }
        .fu-h2 { font-size: clamp(1.1rem, 3vw, 1.25rem); font-weight: 700; color: var(--text-main); margin: 0; }
        .fu-p { color: var(--text-muted); font-size: clamp(0.75rem, 2vw, 0.85rem); margin-top: 4px; line-height: 1.4; }

        .fu-insights-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: clamp(12px, 3vw, 20px);
          position: relative;
          z-index: 1;
          width: 100%;
        }
        .fu-insight-item {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--bg-surface-2);
          padding: clamp(10px, 2vw, 14px);
          border-radius: 12px;
          border: 1px solid var(--border-main);
          transition: all 0.2s ease;
        }
        .fu-insight-item:hover {
          transform: translateY(-2px);
          box-shadow: var(--pp-shadow-sm);
          background: var(--bg-card);
          border-color: var(--primary-border);
        }
        .fu-insight-icon {
          flex-shrink: 0;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .fu-insight-icon.total { background: #eff6ff; color: var(--pp-blue); }
        .fu-insight-icon.missed { background: #fef2f2; color: var(--pp-danger-fg); }
        .fu-insight-icon.next { background: #f0fdf4; color: var(--pp-success-fg); }
        
        .fu-insight-label { display: block; font-size: 9px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
        .fu-insight-value { display: block; font-size: clamp(1.1rem, 3vw, 1.25rem); font-weight: 800; color: var(--text-main); line-height: 1; margin-top: 2px; }

        /* Action Bar */
        .fu-action-bar {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .fu-search-group {
          flex: 1;
          display: flex;
          align-items: center;
          position: relative;
        }
        .fu-search-icon {
          position: absolute;
          left: 14px;
          color: var(--pp-text-4);
          pointer-events: none;
        }
        .fu-search-group .pp-input {
          padding-left: 44px;
          height: 44px;
          border-radius: 12px;
        }
        .fu-btn-active {
          border-color: var(--pp-blue) !important;
          background: var(--pp-blue-tint) !important;
          color: var(--pp-blue) !important;
        }

        .fu-toggle-group {
          display: flex;
          background: var(--pp-warm-3);
          padding: 3px;
          border-radius: 10px;
        }
        .fu-toggle-group button {
          width: 38px;
          height: 38px;
          border: none;
          background: transparent;
          border-radius: 7px;
          color: var(--pp-text-3);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .fu-toggle-group button.active {
          background: var(--bg-card);
          color: var(--pp-blue);
          box-shadow: var(--pp-shadow-sm);
        }

        /* List View */
        .fu-patient-info { display: flex; align-items: center; gap: 12px; }
        .fu-avatar-sm {
          width: 32px; height: 32px;
          background: var(--pp-warm-3);
          color: var(--pp-text-2);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 12px;
        }
        .fu-name { display: block; font-weight: 700; color: var(--text-main); font-size: 14px; }
        .fu-phone { display: block; font-size: 11px; color: var(--text-muted); }
        .fu-meta-cell { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-main); }
        .fu-meta-cell svg { color: var(--text-muted); }

        .fu-action-btn {
          width: 32px; height: 32px;
          border-radius: 6px;
          border: 1px solid var(--pp-warm-4);
          background: var(--bg-card);
          display: flex; align-items: center; justify-content: center;
          color: var(--pp-text-2);
          transition: all 0.2s;
        }
        .fu-action-btn:hover { background: var(--pp-warm-2); color: var(--pp-blue); border-color: var(--pp-blue-border); }
        .fu-action-btn.wa:hover { background: #f0fdf4; color: var(--pp-success-fg); border-color: #bbf7d0; }

        /* Card View */
        .fu-patient-card { padding: 24px; position: relative; }
        .fu-avatar-lg {
          width: 64px; height: 64px;
          background: linear-gradient(135deg, var(--pp-warm-2) 0%, var(--pp-warm-3) 100%);
          color: var(--pp-blue);
          border-radius: 20px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 800; font-size: 1.5rem;
          border: 4px solid var(--bg-card);
          box-shadow: var(--pp-shadow-sm);
        }
        .fu-card-title { font-size: 1.1rem; font-weight: 700; color: var(--pp-ink); margin: 0; }
        .fu-card-meta {
          background: var(--pp-warm-1);
          border-radius: 12px;
          padding: 12px;
          border: 1px solid var(--pp-warm-2);
        }
        .fu-meta-row { display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--pp-text-2); }
        .fu-meta-row:not(:last-child) { margin-bottom: 8px; }
        .fu-meta-row svg { color: var(--pp-text-4); }

        /* Loading & Empty */
        .fu-loading-state { padding: 100px 0; text-align: center; }
        .fu-loader-circle {
          width: 32px; height: 32px;
          border: 3px solid var(--pp-warm-3);
          border-top-color: var(--pp-blue);
          border-radius: 50%;
          margin: 0 auto 16px;
          animation: fu-spin 0.8s linear infinite;
        }
        .fu-empty-state { padding: 60px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; }
        .fu-empty-icon {
          width: 64px; height: 64px;
          background: var(--pp-warm-2);
          color: var(--pp-text-4);
          border-radius: 24px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 24px;
        }

        @keyframes fu-spin { to { transform: rotate(360deg); } }
        .fu-spin { animation: fu-spin 1s linear infinite; }

        @media (min-width: 860px) {
          .fu-action-bar { flex-direction: row; }
          .fu-hero-card { flex-direction: row; justify-content: space-between; align-items: center; }
          .fu-insights-grid { width: auto; min-width: 500px; }
        }
        
        @media (max-width: 480px) {
          .fu-insights-grid { grid-template-columns: 1fr; }
          .fu-hero-content { align-items: flex-start; }
          .fu-hero-icon-blob { margin-top: 4px; }
        }
      `}</style>
    </div>
  );
}
