import { X } from 'lucide-react';
import './ops-modal.css';

interface OpsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function OpsModal({ isOpen, onClose, title, children }: OpsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="ops-modal-backdrop" onClick={onClose}>
      <div className="ops-modal-content slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="ops-modal-header">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="ops-modal-close">
            <X size={20} />
          </button>
        </div>
        <div className="ops-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
