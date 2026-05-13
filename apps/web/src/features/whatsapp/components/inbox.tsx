import React, { useState } from 'react';
import { useWhatsApp } from '../hooks/use-whatsapp';
import { Search, Send, User, Check, CheckCheck, MessageSquare, Phone, Info, MoreVertical, Plus, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { NewChatModal } from './new-chat-modal';
import { TemplateModal } from './template-modal';
import { toast } from '@/hooks/use-toast';
import type { WhatsAppConversation, WhatsAppMessage } from '@mmc/types';

export const Inbox = ({ channelId }: { channelId?: number }) => {
  const { useConversations, useMessages, useSendMessage, useSendTemplate } = useWhatsApp();
  const sendTemplateMutation = useSendTemplate();
  const { data: conversations, isLoading: loadingConv } = useConversations(channelId);
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const { data: messages, isLoading: loadingMsg } = useMessages(selectedConvId || undefined);
  const [activeChannelFilter, setActiveChannelFilter] = useState('all');
  const [activeStatusFilter, setActiveStatusFilter] = useState('open');
  const [searchTerm, setSearchTerm] = useState('');

  const [messageText, setMessageText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const sendMessageMutation = useSendMessage();

  const handleSend = () => {
    if (!selectedConvId || !messageText.trim()) return;
    sendMessageMutation.mutate({ conversationId: selectedConvId, content: messageText });
    setMessageText('');
  };

  const handleStartChat = (contact: any) => {
    // Check if conversation already exists
    const existing = conversations?.find((c) => c.contactPhone === contact.phone);
    if (existing) {
      setSelectedConvId(existing.id);
    } else {
      toast({ title: 'New Conversation', description: `Initiating secure dialogue with ${contact.name}...` });
    }
  };

  const filteredConversations = conversations?.filter((conv) => {
    // Basic search
    const matchesSearch = !searchTerm || 
      conv.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.contactPhone?.includes(searchTerm);
    
    if (!matchesSearch) return false;

    // Status filter
    if (activeStatusFilter === 'unread' && conv.unreadCount === 0) return false;
    if (activeStatusFilter === 'open' && conv.status === 'resolved') return false;
    if (activeStatusFilter === 'resolved' && conv.status !== 'resolved') return false;

    // Channel filter
    // If channelType is not in WhatsAppConversation yet, we can add it or cast
    const c = conv as any;
    if (activeChannelFilter === 'wa' && c.channelType !== 'whatsapp') return false;
    if (activeChannelFilter === 'widget' && c.channelType !== 'widget') return false;
    if (activeChannelFilter === 'unread' && conv.unreadCount === 0) return false;

    return true;
  });

  const selectedConv = conversations?.find((c) => c.id === selectedConvId);


  return (
    <div className="flex h-[calc(100vh-220px)] border border-pp-border rounded-xl overflow-hidden bg-white shadow-sm animate-fade-in">
      {/* Sidebar - Conversations */}
      <div className="w-80 md:w-96 border-r border-pp-border flex flex-col bg-pp-bg-subtle/30">
        <div className="p-5 border-b border-pp-border space-y-4 bg-white">
          <div className="flex justify-between items-center">
            <h3 className="text-[11px] font-bold text-muted uppercase tracking-[0.1em]">Clinical Team Chat</h3>
            <button 
              className="w-8 h-8 rounded-xl hover:bg-pp-bg-subtle flex items-center justify-center text-pp-blue transition-all border border-transparent hover:border-pp-border"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/40" size={14} />
            <input 
              className="pp-filter-search-input pl-10 h-10 text-xs font-medium" 
              placeholder="Search conversations..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Tier 1: Channel Filters (Pill Style) */}
          <div className="flex items-center gap-1.5 p-1 bg-pp-bg-subtle rounded-xl overflow-x-auto no-scrollbar border border-pp-border/50">
            {['all', 'wa', 'widget', 'assigned', 'unread'].map((f) => (
              <button
                key={f}
                onClick={() => setActiveChannelFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeChannelFilter === f 
                    ? 'bg-white text-pp-blue shadow-sm ring-1 ring-pp-border/50' 
                    : 'text-muted hover:text-main'
                }`}
              >
                {f === 'wa' ? 'WA' : f}
              </button>
            ))}
          </div>

          {/* Tier 2: Status Filters (Tab Style) */}
          <div className="flex items-center gap-6 px-2">
            {['unread', 'open', 'resolved'].map((s) => (
              <button
                key={s}
                onClick={() => setActiveStatusFilter(s)}
                className={`text-[11px] font-bold transition-all relative py-1 uppercase tracking-widest ${
                  activeStatusFilter === s 
                    ? 'text-pp-blue' 
                    : 'text-muted hover:text-main'
                }`}
              >
                {s}
                {activeStatusFilter === s && (
                  <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-pp-blue rounded-full shadow-[0_1px_4px_rgba(var(--pp-blue-rgb),0.4)]" />
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConv ? (
            <div className="p-8 text-center text-muted text-xs font-bold animate-pulse uppercase tracking-widest">Loading...</div>
          ) : filteredConversations?.length === 0 ? (
            <div className="p-12 text-center text-muted italic text-sm">No clinical chats found.</div>
          ) : (
            filteredConversations?.map((conv: any) => (
              <div 
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={`p-4 border-b border-pp-border/50 cursor-pointer transition-all relative ${
                  selectedConvId === conv.id ? 'bg-white' : 'hover:bg-white/60'
                }`}
              >
                {selectedConvId === conv.id && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-pp-blue" />
                )}
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-pp-blue-tint flex items-center justify-center text-pp-blue font-bold text-sm shadow-sm">
                    {(conv.contactName || conv.contactPhone).substring(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <h4 className={`font-bold text-[13px] truncate ${selectedConvId === conv.id ? 'text-pp-blue' : 'text-main'}`}>
                        {conv.contactName || `+${conv.contactPhone}`}
                      </h4>
                      <span className="text-[9px] font-bold text-muted uppercase">
                        {conv.lastMessageAt ? format(new Date(conv.lastMessageAt), 'HH:mm') : ''}
                      </span>
                    </div>
                    <p className="text-[11px] truncate text-muted font-medium">
                      {conv.lastMessageText || 'No messages yet'}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <div className="w-4 h-4 bg-pp-blue text-white text-[9px] font-bold flex items-center justify-center rounded-full mt-1">
                      {conv.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content - Chat */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConvId ? (
          <>
            <div className="px-6 py-4 border-b border-pp-border flex justify-between items-center bg-white shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-pp-bg-subtle flex items-center justify-center text-pp-blue border border-pp-border">
                  <User size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-main leading-tight text-sm">{selectedConv?.contactName || `+${selectedConv?.contactPhone}`}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 bg-success rounded-full" />
                    <span className="text-[10px] font-bold text-success uppercase tracking-wider">Patient Active</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 rounded-full text-muted hover:bg-pp-bg-subtle flex items-center justify-center transition-colors">
                  <Phone size={16} />
                </button>
                <button className="w-8 h-8 rounded-full text-muted hover:bg-pp-bg-subtle flex items-center justify-center transition-colors">
                  <Info size={16} />
                </button>
                <button className="w-8 h-8 rounded-full text-muted hover:bg-pp-bg-subtle flex items-center justify-center transition-colors">
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-pp-bg-subtle/20">
              {loadingMsg ? (
                <div className="flex justify-center p-8 text-xs font-bold text-muted uppercase tracking-widest animate-pulse">Syncing...</div>
              ) : (
                messages?.slice().reverse().map((msg: any) => (
                  <div key={msg.id} className={`flex flex-col ${msg.direction === 'outbound' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[80%] p-3.5 rounded-xl shadow-sm ${
                      msg.direction === 'outbound' 
                        ? 'bg-pp-blue text-white rounded-tr-none' 
                        : 'bg-white text-main border border-pp-border rounded-tl-none'
                    }`}>
                      <p className="text-[13px] leading-relaxed font-medium whitespace-pre-wrap">{msg.content}</p>
                      <div className={`flex items-center gap-1.5 mt-2 ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                        <span className={`text-[8px] font-bold uppercase tracking-widest ${msg.direction === 'outbound' ? 'text-white/60' : 'text-muted'}`}>
                          {format(new Date(msg.timestamp || msg.createdAt), 'HH:mm')}
                        </span>
                        {msg.direction === 'outbound' && (
                          msg.status === 'read' 
                            ? <CheckCheck className="w-3 h-3 text-white" /> 
                            : <Check className="w-3 h-3 text-white/50" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-5 border-t border-pp-border bg-white">
              <div className="flex items-end gap-3 p-2 bg-pp-bg-subtle rounded-xl border border-pp-border focus-within:border-pp-blue focus-within:bg-white transition-all shadow-inner">
                <button 
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="p-2 hover:bg-white rounded-lg text-muted hover:text-pp-blue transition-all"
                >
                  <FileText size={20} />
                </button>
                <textarea 
                  rows={1}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder="Type clinical response..." 
                  className="flex-1 bg-transparent border-none focus:ring-0 shadow-none py-2 px-2 text-sm font-medium resize-none outline-none"
                />
                <button 
                  onClick={handleSend}
                  disabled={sendMessageMutation.isPending || !messageText.trim()}
                  className="bg-pp-blue hover:bg-pp-blue-dark text-white w-10 h-10 rounded-lg flex items-center justify-center transition-all disabled:opacity-50 disabled:grayscale"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-pp-bg-subtle/10 p-12 text-center">
            <div className="w-20 h-20 bg-white rounded-3xl shadow-sm border border-pp-border flex items-center justify-center mb-6 text-pp-blue/20">
              <MessageSquare size={32} />
            </div>
            <h3 className="text-lg font-bold text-main uppercase tracking-widest">No Selection</h3>
            <p className="text-muted mt-2 max-w-xs text-sm font-medium leading-relaxed">
              Select a conversation from the directory to start a clinical dialogue.
            </p>
          </div>
        )}
      </div>
      <NewChatModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSelect={handleStartChat}
      />
      <TemplateModal 
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelect={(template, variables) => {
          if (!selectedConv) {
            toast({ title: 'No Conversation', description: 'Select a conversation first.', variant: 'error' });
            return;
          }
          // Build template components from variables
          const components = variables.length > 0 ? [{
            type: 'body',
            parameters: variables.map((v: any) => ({
              type: 'text',
              text: v.type === 'custom' ? v.value : v.type,
            })),
          }] : [];

          sendTemplateMutation.mutate({
            conversationId: selectedConv.id,
            phone: selectedConv.contactPhone,
            templateName: template.name,
            language: template.language || 'en_US',
            components,
          }, {
            onSuccess: () => {
              toast({ title: 'Template Sent', description: `${template.name} delivered to patient.` });
            },
            onError: (err: any) => {
              toast({ title: 'Send Failed', description: err?.response?.data?.message || err.message, variant: 'error' });
            },
          });
        }}
      />
    </div>
  );
};
