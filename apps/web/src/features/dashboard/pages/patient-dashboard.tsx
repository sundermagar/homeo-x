import React from 'react';
import { useAuthStore } from '@/shared/stores/auth-store';
import { Heart, Calendar, Activity, FileText } from 'lucide-react';

export function PatientDashboard() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Welcome to your Portal, {user?.name || 'Patient'}!</h1>
          <p className="text-blue-100 max-w-xl text-lg">
            View your upcoming appointments, recent prescriptions, and clinical records securely from your dashboard.
          </p>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Heart size={120} />
        </div>
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center hover:shadow-md transition-shadow cursor-pointer">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Calendar size={24} />
          </div>
          <h3 className="font-semibold text-slate-800 mb-1">My Appointments</h3>
          <p className="text-sm text-slate-500">View upcoming or book a new visit</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center hover:shadow-md transition-shadow cursor-pointer">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-4">
            <FileText size={24} />
          </div>
          <h3 className="font-semibold text-slate-800 mb-1">Prescriptions</h3>
          <p className="text-sm text-slate-500">Access your recent treatment plans</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center hover:shadow-md transition-shadow cursor-pointer">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-4">
            <Activity size={24} />
          </div>
          <h3 className="font-semibold text-slate-800 mb-1">Health Records</h3>
          <p className="text-sm text-slate-500">View vitals, history, and test reports</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h2>
        <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <Activity size={32} className="mx-auto mb-3 text-slate-400" />
          <p>No recent activity found in your records.</p>
        </div>
      </div>
    </div>
  );
}
