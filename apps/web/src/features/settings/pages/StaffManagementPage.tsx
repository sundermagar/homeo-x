import React from 'react';
import { Users, ShieldCheck, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../../platform/styles/platform.css';
import '../styles/settings.css';

export default function StaffManagementPage() {
  return (
    <div className="plat-page fade-in">


      <div className="pp-page-hero">
        <div>
          <h1 className="pp-page-hero-title">
            <Users size={22} strokeWidth={1.8} />
            Staff Management
          </h1>
          <p className="pp-page-hero-sub">Manage platform users, receptionists, and clinical assistants.</p>
        </div>
        <div className="pp-page-hero-actions">
          <Link to="/platform/accounts" className="plat-btn plat-btn-primary">
            <UserPlus size={14} />
            Manage Login Accounts
          </Link>
        </div>
      </div>

      <div className="plat-stats-bar">
        <div className="plat-stat-card">
          <p className="plat-stat-label">System Access</p>
          <p className="plat-stat-value plat-stat-value-primary">Identity Service</p>
        </div>
        <div className="plat-stat-card">
          <p className="plat-stat-label">Security Role</p>
          <p className="plat-stat-value plat-stat-value-success">Administrator</p>
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
