import React from 'react';
import { MapPin, Phone, Clock, ShieldCheck } from 'lucide-react';
import { useOrganization } from '../../platform/hooks/use-organizations';
import { useAuthStore } from '@/shared/stores/auth-store';

export function ClinicBrandingHeader() {
  const user = useAuthStore(s => s.user);
  const { data: org } = useOrganization(user?.contextId || 0);

  if (!org) return null;

  const getLogoUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    return `/api${path}`;
  };

  return (
    <div className="clinic-letterhead-ui animate-fade-in" style={{
      background: 'white',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '20px',
      border: '1px solid var(--pp-warm-4)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Visual Accent */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'linear-gradient(90deg, #16a1e4 0%, #6366f1 50%, #8b5cf6 100%)'
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flex: 1 }}>
        <div style={{
          width: '70px',
          height: '70px',
          borderRadius: '12px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0
        }}>
          {org.logo ? (
            <img src={getLogoUrl(org.logo) || undefined} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <div style={{ color: '#94a3b8', fontSize: '20px', fontWeight: 800 }}>{org.name.charAt(0).toUpperCase()}</div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 900,
            color: '#0f172a',
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            fontFamily: 'var(--pp-font-display, inherit)'
          }}>
            {org.name}
          </h1>
          <p style={{
            fontSize: '0.85rem',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #16a1e4 0%, #6366f1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0
          }}>
            {org.tagLine || 'Healthcare Specialist'}
          </p>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px', 
            marginTop: '6px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '99px',
            padding: '2px 10px',
            width: 'fit-content'
          }}>
            <ShieldCheck size={12} style={{ color: '#16a1e4' }} />
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
              {org.registration || 'Verified Clinic'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ 
        textAlign: 'right', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '6px',
        borderLeft: '1px solid #e2e8f0',
        paddingLeft: '24px',
        minWidth: '200px'
      }}>
        <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
          <span>{org.address}</span>
          <MapPin size={14} style={{ color: '#6366f1' }} />
        </div>
        <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
          <span>{org.phone}</span>
          <Phone size={14} style={{ color: '#6366f1' }} />
        </div>
        <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
          <span>{org.timing || '9:00 AM - 8:00 PM'}</span>
          <Clock size={14} style={{ color: '#6366f1' }} />
        </div>
      </div>
    </div>
  );
}
