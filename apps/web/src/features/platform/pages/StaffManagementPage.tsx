import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, Stethoscope, User, Phone, Shield, Plus, Hospital } from 'lucide-react';
import DoctorsPage from './DoctorsPage';
import EmployeesPage from './EmployeesPage';
import ReceptionistsPage from './ReceptionistsPage';
import ClinicAdminsPage from './ClinicAdminsPage';
import DispensariesTabPage from './DispensariesTabPage';
import '../styles/platform.css';

type Tab = 'doctors' | 'employees' | 'receptionists' | 'clinicadmins' | 'dispensaries';

const tabActionLabels: Record<Tab, string> = {
  doctors: 'Register Doctor',
  employees: 'Add Employee',
  receptionists: 'Add Receptionist',
  clinicadmins: 'Add Admin',
  dispensaries: 'Add Staff Account'
};

export default function StaffManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as Tab) || 'doctors';
  const [actionTrigger, setActionTrigger] = useState(0);

  const handleTabChange = (tab: Tab) => {
    setActionTrigger(0);
    setSearchParams({ tab });
  };

  return (
    <div className="plat-page fade-in">
      <div className="plat-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="plat-header-title">
            <Users size={22} className="color-primary" />
            Staff Management
          </h1>
          <p className="plat-header-sub">Manage doctors, employees, receptionists, clinic administrators, and dispensary staff.</p>
        </div>
      </div>

      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--pp-warm-4)', paddingBottom: '20px' }}>
        <div className="plat-view-toggle-group">
          <button 
            className={`plat-view-toggle-btn ${activeTab === 'doctors' ? 'is-active' : ''}`} 
            onClick={() => handleTabChange('doctors')}
          >
            <Stethoscope size={14} /> Doctors
          </button>
          <button 
            className={`plat-view-toggle-btn ${activeTab === 'employees' ? 'is-active' : ''}`} 
            onClick={() => handleTabChange('employees')}
          >
            <User size={14} /> Employees
          </button>
          <button 
            className={`plat-view-toggle-btn ${activeTab === 'receptionists' ? 'is-active' : ''}`} 
            onClick={() => handleTabChange('receptionists')}
          >
            <Phone size={14} /> Receptionists
          </button>
          <button 
            className={`plat-view-toggle-btn ${activeTab === 'clinicadmins' ? 'is-active' : ''}`} 
            onClick={() => handleTabChange('clinicadmins')}
          >
            <Shield size={14} /> Clinic Admins
          </button>
          <button 
            className={`plat-view-toggle-btn ${activeTab === 'dispensaries' ? 'is-active' : ''}`} 
            onClick={() => handleTabChange('dispensaries')}
          >
            <Hospital size={14} /> Dispensaries
          </button>
        </div>
        <button 
          className="plat-btn plat-btn-primary" 
          onClick={() => setActionTrigger(prev => prev + 1)}
        >
          <Plus size={16} strokeWidth={2} style={{ marginRight: 4 }} />
          {tabActionLabels[activeTab]}
        </button>
      </div>

      <div>
        {activeTab === 'doctors' && <DoctorsPage actionTrigger={actionTrigger} />}
        {activeTab === 'employees' && <EmployeesPage actionTrigger={actionTrigger} />}
        {activeTab === 'receptionists' && <ReceptionistsPage actionTrigger={actionTrigger} />}
        {activeTab === 'clinicadmins' && <ClinicAdminsPage actionTrigger={actionTrigger} />}
        {activeTab === 'dispensaries' && <DispensariesTabPage actionTrigger={actionTrigger} />}
      </div>
    </div>
  );
}
