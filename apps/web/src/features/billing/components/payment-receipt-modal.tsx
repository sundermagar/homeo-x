import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Printer, Share2, X, Download } from 'lucide-react';

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientData: any;
  billingData: {
    regularCharges: number;
    additionalCharges: any[];
    totalBill: number;
    paidAmount: number;
    balance: number;
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
              <span className="font-semibold text-gray-900">{patientData?.patientName || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Reg ID:</span>
              <span className="font-semibold text-gray-900">#{patientData?.regid}</span>
            </div>
          </div>

          {/* Charges Breakdown */}
          <div className="mb-8">
            <div className="space-y-4 border rounded-xl p-6 bg-white shadow-sm">
              <div className="flex justify-between items-center text-gray-600">
                <span className="text-base font-medium">Regular Charge</span>
                <span className="text-base font-bold text-gray-900">₹{billingData.regularCharges}</span>
              </div>
              
              <div className="flex justify-between items-center text-gray-600 border-t pt-4">
                <span className="text-base font-medium">Additional Charge</span>
                <span className="text-base font-bold text-gray-900">
                  ₹{billingData.additionalCharges.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)}
                </span>
              </div>
              
              <div className="flex justify-between items-center border-t border-blue-100 pt-4 bg-blue-50/30 -mx-6 px-6">
                <span className="text-lg font-bold text-gray-900">Total Charge</span>
                <span className="text-xl font-black text-blue-600">₹{billingData.totalBill}</span>
              </div>

              <div className="flex justify-between items-center text-gray-600 border-t pt-4">
                <span className="text-base font-medium">Received Charge</span>
                <span className="text-base font-bold text-green-600">₹{billingData.paidAmount}</span>
              </div>

              <div className="flex justify-between items-center text-gray-600 border-t pt-4">
                <span className="text-base font-medium">Balance</span>
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
