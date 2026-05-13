import React, { useState, useEffect } from 'react';
import { useWhatsApp } from '../hooks/use-whatsapp';
import { Bot, Plus, Settings, FileText, Globe, MessageCircle, MoreHorizontal, BrainCircuit, Activity, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ChatbotModal } from './chatbot-modal';
import { Pagination } from '@/components/shared/pagination';

export const ChatbotManager = () => {
  const { useChatbotsPaginated } = useWhatsApp();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  
  const { data, isLoading } = useChatbotsPaginated({ page, limit: pageSize });
  const chatbots = data?.data || [];
  const totalEntries = data?.total || 0;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  useEffect(() => {
    const handleOpenModal = () => setIsModalOpen(true);
    window.addEventListener('open-chatbot-modal', handleOpenModal);
    return () => window.removeEventListener('open-chatbot-modal', handleOpenModal);
  }, []);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* AI Pulse Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="appt-card p-6 bg-gradient-to-br from-pp-blue/5 to-transparent border-pp-blue/20">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-pp-blue/10 rounded-2xl text-pp-blue">
              <BrainCircuit size={24} />
            </div>
            <div>
              <h3 className="font-bold text-main">Neural Status</h3>
              <p className="text-[11px] text-muted font-medium uppercase tracking-wider">Clinical AI Active</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 bg-pp-bg-subtle rounded-full overflow-hidden">
              <div className="h-full bg-pp-blue w-[85%]" />
            </div>
            <span className="text-[12px] font-bold text-pp-blue">85%</span>
          </div>
        </div>

        <div className="appt-card p-6 bg-gradient-to-br from-success/5 to-transparent border-success/20">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-success/10 rounded-2xl text-success">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="font-bold text-main">Safety Guard</h3>
              <p className="text-[11px] text-muted font-medium uppercase tracking-wider">Medical Compliance</p>
            </div>
          </div>
          <p className="text-[12px] text-secondary font-medium leading-relaxed">
            All AI responses are filtered through HIPAA-compliant clinical boundaries.
          </p>
        </div>

        <div className="appt-card p-6 bg-gradient-to-br from-amber-500/5 to-transparent border-amber-500/20">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-600">
              <Activity size={24} />
            </div>
            <div>
              <h3 className="font-bold text-main">Triage Velocity</h3>
              <p className="text-[11px] text-muted font-medium uppercase tracking-wider">Avg Response Time</p>
            </div>
          </div>
          <h4 className="text-2xl font-bold text-main">1.2s</h4>
        </div>
      </div>

      {/* Main Bot List */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-main">Clinical AI Agents</h2>
          <p className="text-secondary text-sm">Deploy automated triage and support bots for patient inquiries.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          Array.from({ length: pageSize }).map((_, i) => (
            <div key={i} className="appt-card animate-pulse bg-pp-bg-subtle/20 border-pp-border h-[220px]" />
          ))
        ) : chatbots.length === 0 ? (
          <div className="col-span-full py-20 bg-pp-bg-subtle/30 rounded-3xl border-2 border-dashed border-pp-border text-center">
            <Bot className="w-16 h-16 mx-auto mb-4 text-muted/30" />
            <h3 className="text-xl font-bold text-main">No AI Agents Deployed</h3>
            <p className="text-secondary mt-2 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
              Start by creating your first AI Agent to handle automated triage and patient educational FAQs.
            </p>
          </div>
        ) : chatbots.map((bot: any) => (
          <div key={bot.id} className="appt-card group hover:border-pp-blue/40 transition-all p-6">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-pp-bg-subtle rounded-2xl flex items-center justify-center text-primary border border-pp-border group-hover:bg-pp-blue group-hover:text-white transition-all duration-500">
                  <Bot size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-main">{bot.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <span className="text-[11px] font-bold text-secondary uppercase tracking-widest">Active & Operational</span>
                  </div>
                </div>
              </div>
              <button className="p-2 hover:bg-pp-bg-subtle rounded-xl text-muted">
                <Settings size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-pp-bg-subtle/50 rounded-2xl border border-pp-border">
                <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FileText size={12} />
                  Training Intelligence
                </p>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <p className="text-[14px] font-bold text-main">14 Documents</p>
                    <p className="text-[10px] text-muted font-medium uppercase mt-1">PDF / Website Scrapes</p>
                  </div>
                  <div className="w-px h-8 bg-pp-border" />
                  <div className="flex-1">
                    <p className="text-[14px] font-bold text-main">1.4k Nodes</p>
                    <p className="text-[10px] text-muted font-medium uppercase mt-1">Knowledge Vectors</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 btn-secondary h-11">
                  <Globe size={15} />
                  Knowledge Base
                </button>
                <button className="flex-1 btn-secondary h-11">
                  <MessageCircle size={15} />
                  Test Dialogue
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!isLoading && totalEntries > 0 && (
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(totalEntries / pageSize)}
          pageSize={pageSize}
          totalItems={totalEntries}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      <ChatbotModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
