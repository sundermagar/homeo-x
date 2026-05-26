import React from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { usePatientBills } from '@/features/billing/hooks/use-billing';
import { usePatientPackages } from '@/features/packages/hooks/use-packages';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  regid: number;
  patientName: string;
}

export function PatientCaseInterceptModal({ isOpen, onClose, regid, patientName }: Props) {
  const navigate = useNavigate();

  const { data: billSummary, isLoading: isLoadingBills } = usePatientBills(regid);
  const { data: packages, isLoading: isLoadingPackages } = usePatientPackages(regid);

  if (!isOpen) return null;

  const handleContinue = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
    navigate(`/medical-cases/${regid}`);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  const dueBalance = billSummary?.totals?.totalBalance || 0;
  
  const sortedPackages = [...(packages || [])].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });
  const latestPackage = sortedPackages[0];
  const isExpired = latestPackage?.status === 'Expired' || latestPackage?.status === 'Cancelled';
  
  if (isLoadingBills || isLoadingPackages) return null;

  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: 'transparent' }}>
      
      {/* Exact Chrome macOS Alert Replica */}
      <div 
        style={{ 
          background: '#ffffff', 
          borderRadius: '12px', 
          width: '420px', 
          marginTop: '20px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.15), 0 0 1px rgba(0,0,0,0.2)',
          padding: '20px 24px 24px 24px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Removed the 'localhost says' header */}

        <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '60px' }}>
          {dueBalance > 0 ? (
            <div style={{ color: '#dc2626', fontWeight: 500 }}>
              Outstanding Balance: ₹{dueBalance.toLocaleString('en-IN')}
            </div>
          ) : (
            <div>Account Cleared: No outstanding balance</div>
          )}

          {latestPackage ? (
            <div>
              {isExpired ? (
                `Your package has been expired (${latestPackage.packageName || 'Unknown'})`
              ) : (
                <>
                  Active Package: {latestPackage.packageName || 'Unknown'}<br />
                  Valid till: {new Date(latestPackage.expiryDate).toLocaleDateString('en-GB')}
                </>
              )}
            </div>
          ) : (
            <div>No Active Package</div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
          <button 
            onClick={handleCancel}
            style={{ 
              padding: '8px 20px', 
              background: '#e8f0fe', 
              border: 'none', 
              borderRadius: '20px', 
              fontSize: '14px', 
              fontWeight: 500, 
              color: '#0b57d0', 
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            Cancel
          </button>
          <button 
            onClick={handleContinue}
            style={{ 
              padding: '8px 24px', 
              background: '#0b57d0', 
              border: 'none', 
              borderRadius: '20px', 
              fontSize: '14px', 
              fontWeight: 500, 
              color: '#ffffff', 
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
