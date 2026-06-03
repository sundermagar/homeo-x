import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatientBills } from '@/features/billing/hooks/use-billing';
import { usePatientPackages } from '@/features/packages/hooks/use-packages';
import { toast } from '@/hooks/use-toast';

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

  useEffect(() => {
    if (!isOpen || isLoadingBills || isLoadingPackages) return;

    const dueBalance = billSummary?.totals?.totalBalance || 0;
    
    const sortedPackages = [...(packages || [])].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    const latestPackage = sortedPackages[0];
    const isExpired = latestPackage?.status === 'Expired' || latestPackage?.status === 'Cancelled';

    let billText = '';
    if (dueBalance > 0) {
      billText = `Outstanding Balance: ₹${dueBalance.toLocaleString('en-IN')}`;
    } else {
      billText = `Account Cleared`;
    }

    let pkgText = '';
    if (latestPackage) {
      if (isExpired) {
        pkgText = `Expired Package`;
      } else {
        pkgText = `Active Package (Valid till ${new Date(latestPackage.expiryDate).toLocaleDateString('en-GB')})`;
      }
    } else {
      pkgText = `No Active Package`;
    }

    toast({
      title: patientName,
      description: `${billText} • ${pkgText}`,
      variant: dueBalance > 0 || isExpired ? 'error' : 'default',
    });

    onClose();
    navigate(`/medical-cases/${regid}`);
    
  }, [isOpen, isLoadingBills, isLoadingPackages, billSummary, packages, navigate, onClose, patientName, regid]);

  return null;
}
