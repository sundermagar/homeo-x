const fs = require('fs');
const file = '/Users/apple/Documents/worksarea/homeo-x/apps/web/src/features/medical-case/pages/case-detail-page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Find the start of the purple header and end of it.
const startPurple = content.indexOf('<div className="patient-profile-card">');
const endPurple = content.indexOf('<!-- ─── Consolidated Read-Only Case History ─── -->') !== -1 ? content.indexOf('<!-- ─── Consolidated Read-Only Case History ─── -->') : content.indexOf('{/* ─── Consolidated Read-Only Case History ─── */}');

if (startPurple !== -1 && endPurple !== -1) {
    // Delete the purple header
    content = content.substring(0, startPurple) + content.substring(endPurple);
    
    // Now replace the header of the Patient Details card
    const oldDetailsHeader = `<div style={{
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <User size={18} style={{ color: '#6366f1' }} />
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>Patient Details</span>
          </div>`;
          
    const newDetailsHeader = `<div style={{
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => navigate('/patients')}
                style={{ cursor: 'pointer', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '4px', color: '#64748b' }}
                title="Back to Patient List"
              >
                <ArrowLeft size={18} />
              </button>
              <User size={18} style={{ color: '#6366f1' }} />
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b' }}>Patient Details</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* WhatsApp Action */}
              <button onClick={() => {
                const phone = medicalCase.phone || medicalCase.mobile || '';
                if (phone) {
                  navigate(\`/communications/whatsapp/inbox?phone=\${encodeURIComponent(phone)}\`);
                } else {
                  alert('No phone number available for this patient.');
                }
              }} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#25D366', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                WhatsApp
              </button>

              {/* Package Action */}
              <button
                onClick={() => setShowAssignModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: activePackage?.status === 'Active' ? '#f0fdf4' : '#fff1f2', border: \`1px solid \${activePackage?.status === 'Active' ? '#bbf7d0' : '#fecdd3'}\`, color: activePackage?.status === 'Active' ? '#166534' : '#be123c', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                title="Assign or view package"
              >
                {activePackage?.status === 'Active' ? <Award size={14} /> : <Clock size={14} />}
                {activePackage?.packageName 
                  ? \`\${activePackage.packageName} (\${activePackage.status})\`
                  : 'No active plan / Add Package'}
              </button>

              {/* ABHA Action */}
              {abhaStatus?.isLinked ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                  <ShieldCheck size={14} /> ABHA: {abhaStatus.abhaId}
                  <button
                    onClick={async (e) => {
                      e.preventDefault(); e.stopPropagation();
                      if (!confirm('Remove ABHA link from this patient?')) return;
                      try {
                        await abhaUnlinkMutation.mutateAsync();
                        toast({ title: 'ABHA Unlinked', description: 'ABHA ID removed', variant: 'success' });
                      } catch (err: any) { toast({ title: 'Failed', description: err.message, variant: 'error' }); }
                    }}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: '6px', padding: '0', display: 'flex', alignItems: 'center' }}
                    title="Unlink ABHA"
                  >
                    <Unlink size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAbhaModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  <Link2 size={14} /> Link ABHA
                </button>
              )}
            </div>
          </div>`;
          
    content = content.replace(oldDetailsHeader, newDetailsHeader);
    fs.writeFileSync(file, content);
    console.log('Update successful');
} else {
    console.log('Could not find purple header start or end');
}
