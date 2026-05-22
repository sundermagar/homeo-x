import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer, Share2, X, Download } from 'lucide-react';

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientData: any;
  billingData: {
    regular: number;
    daysCharge: number;
    additional: number;
    total: number;
    received: number;
    balance: number;
    hasActivePackage?: boolean;
    activePackageName?: string;
    originalRegular?: number;
    originalDaysCharge?: number;
  };
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  isOpen,
  onClose,
  patientData,
  billingData,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const rows = [
    {
      label: 'Registration Charge',
      value: billingData.regular,
      isCovered:
        billingData.hasActivePackage &&
        (billingData.originalRegular || 0) > 0 &&
        billingData.regular === 0,
      originalValue: billingData.originalRegular,
    },
    {
      label: 'Medicine Days Charge',
      value: billingData.daysCharge,
      isCovered:
        billingData.hasActivePackage &&
        (billingData.originalDaysCharge || 0) > 0 &&
        billingData.daysCharge === 0,
      originalValue: billingData.originalDaysCharge,
    },
    { label: 'Additional Charge', value: billingData.additional },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white">
        <div className="p-6 print:p-0" id="receipt-content">
          {/* Receipt Header */}
          <div className="text-center mb-6 border-bottom pb-4">
            <h2 className="text-2xl font-bold text-gray-800">Payment Receipt</h2>
            <p className="text-sm text-gray-500">Date: {today}</p>
          </div>

          {/* Patient Info */}
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between mb-1">
              <span className="text-gray-600">Patient:</span>
              <span className="font-semibold text-gray-900">
                {patientData?.patientName || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Reg ID:</span>
              <span className="font-semibold text-gray-900">#{patientData?.regid}</span>
            </div>
          </div>

          {/* Charges Breakdown */}
          <div className="mb-8">
            {billingData.hasActivePackage && billingData.activePackageName && (
              <div className="mb-4 bg-blue-50 border border-blue-200 p-3 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💎</span>
                  <span className="font-bold text-blue-800">
                    Active Plan: {billingData.activePackageName}
                  </span>
                </div>
                <span className="text-xs font-bold text-gray-500 uppercase">Charges Waived</span>
              </div>
            )}
            <div className="space-y-4 border rounded-xl p-6 bg-white shadow-sm">
              {rows.map((row, idx) => (
                <div
                  key={idx}
                  className={`flex justify-between items-center text-gray-600 ${idx > 0 ? 'border-t pt-4' : ''}`}
                >
                  <span className="text-base font-medium">{row.label}</span>
                  <span className="text-base font-bold text-gray-900">
                    {row.isCovered ? (
                      <>
                        <del className="text-gray-400 text-sm mr-2">₹{row.originalValue}</del>
                        <span className="text-green-600">₹0</span>
                      </>
                    ) : (
                      `₹${row.value}`
                    )}
                  </span>
                </div>
              ))}

              <div className="flex justify-between items-center border-t border-blue-100 pt-4 bg-blue-50/30 -mx-6 px-6 pb-4">
                <span className="text-lg font-bold text-gray-900">Total Bill Amount</span>
                <span className="text-xl font-black text-blue-600">₹{billingData.total}</span>
              </div>

              <div className="flex justify-between items-center text-gray-600 border-t border-blue-100 pt-4">
                <span className="text-base font-medium">Amount Received</span>
                <span className="text-base font-bold text-green-600">₹{billingData.received}</span>
              </div>

              <div className="flex justify-between items-center text-gray-600 border-t pt-4">
                <span className="text-base font-medium">Pending Balance</span>
                <span className="text-base font-bold text-red-600">₹{billingData.balance}</span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center text-xs text-gray-400 italic">
            Thank you for choosing our clinic. This is a computer generated receipt.
          </div>
        </div>

        {/* Action Buttons (Hidden during print) */}
        <div className="p-4 bg-gray-50 border-t flex gap-3 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <Printer size={18} /> Print Receipt
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
