import React from 'react';
import { useForm } from 'react-hook-form';
import { useWhatsApp } from '../hooks/use-whatsapp';
import ReactDOM from 'react-dom';
import { X, Bot, MessageSquare, BrainCircuit, Loader2, ShieldCheck, FileText } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import '@/features/appointments/styles/appointments.css';


interface ChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatbotFormInput {
  title: string;
  welcomeMessage: string;
  instructions: string;
}

export const ChatbotModal = ({ isOpen, onClose }: ChatbotModalProps) => {
  const { useCreateChatbot } = useWhatsApp();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChatbotFormInput>();
  
  const createChatbotMutation = useCreateChatbot();

  const onSubmit = (data: ChatbotFormInput) => {
    const payload = {
      ...data,
      clinicId: 1,
      uuid: crypto.randomUUID(),
      isActive: true
    };

    if (createChatbotMutation.mutate) {
      createChatbotMutation.mutate(payload, {
        onSuccess: () => {
          toast({ title: 'AI Agent Deployed', description: 'Your clinical triage bot is now online.' });
          reset();
          onClose();
        },
        onError: (err: any) => {
          toast({ title: 'Deployment Failed', description: err.message, variant: 'error' });
        }
      });
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      <div className="appt-drawer-overlay" onClick={onClose} />
      <div className="appt-drawer-panel" style={{ maxWidth: '500px' }}>
        <div className="appt-drawer-header">
          <h2 className="appt-drawer-title">Deploy AI Clinical Agent</h2>
          <button className="appt-drawer-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="appt-drawer-body">
          <form onSubmit={handleSubmit(onSubmit)} className="appt-form">
            
            {/* Bot Identity */}
            <div className="appt-form-group">
              <label className="appt-form-label">
                <Bot size={13} strokeWidth={1.6} />
                Agent Identity
              </label>
              <input 
                placeholder="e.g. Triage Assistant v1.0" 
                className={`appt-form-input ${errors.title ? 'border-error' : ''}`}
                {...register('title', { required: true })} 
              />
            </div>

            {/* Welcome Message */}
            <div className="appt-form-group">
              <label className="appt-form-label">
                <MessageSquare size={13} strokeWidth={1.6} />
                Clinical Greeting
              </label>
              <textarea 
                placeholder="e.g. Hello! I am the Homeo-X AI Assistant. How can I help you today?" 
                className={`appt-form-input min-h-[100px] py-3 ${errors.welcomeMessage ? 'border-error' : ''}`}
                {...register('welcomeMessage', { required: true })} 
              />
              <p className="text-[10px] text-muted mt-1 px-1">This message is sent when the patient initiates a chat.</p>
            </div>

            {/* System Instructions */}
            <div className="appt-form-group">
              <label className="appt-form-label">
                <BrainCircuit size={13} strokeWidth={1.6} />
                AI Triage Instructions
              </label>
              <textarea 
                placeholder="e.g. You are a professional medical assistant. Your goal is to gather symptoms and triage patients to the correct clinical department. Never provide a final diagnosis." 
                className={`appt-form-input min-h-[150px] py-3 ${errors.instructions ? 'border-error' : ''}`}
                {...register('instructions', { required: true })} 
              />
              <p className="text-[10px] text-muted mt-1 px-1">Detailed behavioral guidelines for the AI agent.</p>
            </div>

            <div className="space-y-3 mt-6">
              <div className="p-4 bg-pp-blue/5 border border-pp-blue/10 rounded-xl flex gap-3">
                <ShieldCheck size={16} className="text-pp-blue shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-pp-blue uppercase tracking-wider">Medical Guardrails</p>
                  <p className="text-[11px] text-secondary leading-relaxed">
                    AI responses are automatically filtered through our clinical safety layer to ensure medical compliance.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-pp-bg-subtle/50 border border-pp-border rounded-xl flex gap-3">
                <FileText size={16} className="text-muted shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-muted uppercase tracking-wider">Next Step: Training</p>
                  <p className="text-[11px] text-muted leading-relaxed">
                    After deployment, you can upload medical PDFs and clinical guidelines to the Knowledge Base.
                  </p>
                </div>
              </div>
            </div>

            <div className="appt-form-actions" style={{ marginTop: 'auto', paddingTop: '24px' }}>
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={createChatbotMutation.isPending}
              >
                {createChatbotMutation.isPending ? <><Loader2 size={15} className="animate-spin" /> Deploying…</> : 'Deploy AI Agent'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>,
    document.body
  );
};
