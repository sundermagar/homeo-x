import React from 'react';
import { Users, ShieldCheck, ArrowLeft, Plus, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

export default function StaffManagementPage() {
  return (
    <div className="plat-page fade-in">
      <Link to="/settings" className="settings-back-link">
        <ArrowLeft size={14} />
        Back to Settings
      </Link>

      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <Users size={20} strokeWidth={1.6} style={{ color: 'var(--primary)' }} />
            Staff Management
          </h1>
          <p className="plat-header-sub">Manage platform users, receptionists, and clinical assistants.</p>
        </div>
        <div className="plat-header-actions">
           <Link to="/platform/accounts" className="plat-btn plat-btn-primary">
              <UserPlus size={14} />
              Manage Login Accounts
           </Link>
        </div>
      </div>

      <div className="plat-card mt-6">
        <div className="plat-empty">
          <ShieldCheck size={32} className="plat-empty-icon" />
          <p className="plat-empty-text">Staff roles and permissions are currently managed via the Platform Accounts module.</p>
          <Link to="/platform/accounts" className="color-primary text-sm underline mt-2">Go to User Accounts</Link>
        </div>
      </div>
    </div>
  );
}
