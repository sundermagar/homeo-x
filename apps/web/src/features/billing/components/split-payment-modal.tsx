import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, IndianRupee, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/toast';

interface SplitPayment {
  amount: number;
  paymentMode: string;
}

interface SplitPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalDue: number;
  onConfirm: (payments: SplitPayment[]) => Promise<void>;
  patientName?: string;
  regid?: number;
}

const PAYMENT_MODES = [
  'Cash',
  'Card',
  'Cheque',
  'UPI',
  'Online',
  'Bank Transfer',
  'Referral Bonus'
];

export const SplitPaymentModal: React.FC<SplitPaymentModalProps> = ({
  isOpen,
  onClose,
  totalDue,
  onConfirm,
  patientName,
  regid
}) => {
  const [payments, setPayments] = useState<SplitPayment[]>([
    { amount: totalDue > 0 ? totalDue : 0, paymentMode: 'Cash' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalEntered = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const remaining = totalDue - totalEntered;

  const addPayment = () => {
    setPayments([...payments, { amount: 0, paymentMode: 'UPI' }]);
  };

  const removePayment = (index: number) => {
    if (payments.length > 1) {
      setPayments(payments.filter((_, i) => i !== index));
    }
  };

  const updatePayment = (index: number, field: keyof SplitPayment, value: any) => {
    const newPayments = [...payments];
    newPayments[index] = { ...newPayments[index], [field]: value };
    setPayments(newPayments);
  };

  const handleConfirm = async () => {
    if (totalEntered <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a total amount greater than 0.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(payments);
      onClose();
    } catch (error) {
      console.error('Payment failed:', error);
      toast({
        title: "Payment Failed",
        description: "There was an error recording the payment.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-green-600" />
            Update Received Charges
          </DialogTitle>
          {patientName && (
            <p className="text-sm text-gray-500">
              Patient: <span className="font-semibold text-gray-900">{patientName}</span> (RegID: {regid})
            </p>
          )}
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Total Due</p>
              <p className="text-xl font-black text-gray-900">₹{totalDue.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase font-bold">Remaining</p>
              <p className={`text-xl font-black ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ₹{remaining.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
            {payments.map((payment, index) => (
              <div key={index} className="flex items-end gap-3 p-3 bg-white border rounded-xl shadow-sm group">
                <div className="flex-1 space-y-2">
                  <Label className="text-xs">Payment Mode</Label>
                  <Select
                    value={payment.paymentMode}
                    onValueChange={(val) => updatePayment(index, 'paymentMode', val)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_MODES.map(mode => (
                        <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-32 space-y-2">
                  <Label className="text-xs">Amount</Label>
                  <Input
                    type="number"
                    value={payment.amount || ''}
                    onChange={(e) => updatePayment(index, 'amount', parseFloat(e.target.value) || 0)}
                    className="h-9 font-medium"
                    placeholder="0.00"
                  />
                </div>

                {payments.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => removePayment(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full border-dashed border-2 hover:border-blue-500 hover:text-blue-600 transition-all"
            onClick={addPayment}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Another Payment Mode
          </Button>

          {remaining < 0 && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded text-xs border border-amber-200">
              <AlertCircle className="w-4 h-4" />
              Patient is overpaying by ₹{Math.abs(remaining).toLocaleString()}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button 
            className="bg-green-600 hover:bg-green-700 text-white font-bold"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Recording...' : `Record ₹${totalEntered.toLocaleString()} Payment`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
