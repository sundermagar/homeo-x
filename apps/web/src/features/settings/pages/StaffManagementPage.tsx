import React from 'react';
import { Users, ShieldCheck, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

import '../../platform/styles/platform.css';
import '../styles/settings.css';

export default function StaffManagementPage() {
  return (
    <div className="plat-page animate-fade-in">
      <div className="plat-header">
        <div>
          <h1 className="plat-header-title">
            <Users size={20} className="color-primary" />
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

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <span className="plat-stat-label">System Access</span>
          <span className="plat-stat-value">Identity Service</span>
        </div>
        <div className="plat-stat-card">
          <span className="plat-stat-label">Security Role</span>
          <span className="plat-stat-value plat-stat-value-success">Administrator</span>
        </div>
      </div>

      <div className="plat-card mt-6">
        <div className="plat-empty">
          <ShieldCheck size={48} className="plat-empty-icon mb-4" />
          <h3 className="text-lg font-semibold mb-2">Centralized Account Management</h3>
          <p className="plat-empty-text max-w-md mx-auto">
            Staff roles, permissions, and login credentials are managed through the centralized 
            <strong> Platform Accounts</strong> module for enhanced security and multi-clinic synchronization.
          </p>
          <Link to="/platform/accounts" className="plat-btn plat-btn-primary mt-6">
            Go to User Accounts
          </Link>
        </div>
      </div>
    </div>
  );
}
