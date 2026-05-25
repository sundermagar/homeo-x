import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWhatsApp } from '../hooks/use-whatsapp';
import { useWhatsAppSocket } from '../hooks/use-whatsapp-socket';
import { Search, Send, User, Check, CheckCheck, MessageSquare, Pin, MoreVertical, Plus, FileText, Paperclip, Smile, Loader2, ArrowLeft, CornerUpLeft, Forward, Trash2, X, Archive, Ban } from 'lucide-react';
import { format } from 'date-fns';
import { NewChatModal } from './new-chat-modal';
import { TemplateModal } from './template-modal';
import { toast } from '@/hooks/use-toast';
import type { WhatsAppConversation, WhatsAppMessage } from '@mmc/types';
import EmojiPicker from 'emoji-picker-react';
import { apiClient } from '@/infrastructure/api-client';

const ForwardModal = ({ 
  isOpen, 
  onClose, 
  onForward,
  conversations 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onForward: (conv: any) => void;
  conversations: any[] 
}) => {
  const [search, setSearch] = useState('');
  if (!isOpen) return null;

  const filtered = conversations?.filter(c => 
    c.contactName?.toLowerCase().includes(search.toLowerCase()) || 
    c.contactPhone?.includes(search)
  ) || [];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-[var(--pp-warm-3)] animate-scale-in">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-extrabold text-[var(--pp-ink)] uppercase tracking-[0.1em]">Forward Message</h3>
          <button onClick={onClose} className="p-1 hover:bg-[var(--pp-warm-2)] rounded-lg text-[var(--pp-text-3)] hover:text-[var(--pp-ink)] transition-all">
            <X size={18} />
          </button>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--pp-text-3)]/60" size={14} />
          <input 
            className="pp-filter-search-input pl-9 h-9 text-xs font-semibold border-[var(--pp-warm-4)] focus:border-[var(--pp-blue)] rounded-xl w-full outline-none bg-[var(--pp-warm-1)]/30"
            placeholder="Search contacts..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="max-h-60 overflow-y-auto divide-y divide-[var(--pp-warm-3)]/40 pr-1">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--pp-text-3)] italic">No contacts found</div>
          ) : (
            filtered.map((conv) => (
              <div 
                key={conv.id} 
                onClick={() => onForward(conv)}
                className="p-3 hover:bg-[var(--pp-warm-1)]/60 cursor-pointer rounded-xl flex items-center gap-3 transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--pp-blue-tint)] flex items-center justify-center text-[var(--pp-blue)] font-bold text-xs">
                  {(conv.contactName || conv.contactPhone).substring(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-[var(--pp-ink)] truncate">{conv.contactName || `+${conv.contactPhone}`}</h4>
                  <p className="text-[10px] text-[var(--pp-text-3)] truncate">+{conv.contactPhone}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export const Inbox = ({ channelId }: { channelId?: number }) => {
  const { 
    useConversations, 
    useMessages, 
    useSendMessage, 
    useSendTemplate, 
    useCreateConversation, 
    useUploadConversationMedia, 
    useMarkAsRead, 
    useDeleteMessage,
    useUpdateConversationStatus,
    useDeleteConversation,
    useSendReaction
  } = useWhatsApp();
  
  const navigate = useNavigate();
  const location = useLocation();
  const sendTemplateMutation = useSendTemplate();
  const createConversationMutation = useCreateConversation();
  const uploadMediaMutation = useUploadConversationMedia();
  const markAsReadMutation = useMarkAsRead();
  const deleteMessageMutation = useDeleteMessage();
  const updateStatusMutation = useUpdateConversationStatus();
  const deleteConversationMutation = useDeleteConversation();
  const sendReactionMutation = useSendReaction();

  const { data: conversations, isLoading: loadingConv } = useConversations(channelId);
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);
  const { data: messages, isLoading: loadingMsg, error: msgError } = useMessages(selectedConvId || undefined);

  // ─── Real-time WebSocket updates ───────────────────────────────────────────
  useWhatsAppSocket({ channelId, selectedConversationId: selectedConvId });
  
  // Auto-open chat if phone is provided in URL
  React.useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const phoneParam = searchParams.get('phone');
    if (phoneParam && !loadingConv) {
      const targetPhone = phoneParam.replace(/\D/g, '');
      const existing = conversations?.find((c) => c.contactPhone === targetPhone || c.contactPhone === `91${targetPhone}`);
      
      if (existing) {
        setSelectedConvId(existing.id);
      } else if (!existing && channelId) {
        // Create new conversation if it doesn't exist yet
        toast({ title: 'New Conversation', description: `Initiating chat with ${targetPhone}...` });
        createConversationMutation.mutate({
          channelId: Number(channelId),
          contactPhone: targetPhone,
          contactName: 'Patient',
        }, {
          onSuccess: (newConv) => {
            setSelectedConvId(newConv.id);
          }
        });
      }
      // Remove query param to prevent re-triggering
      navigate('/communications/whatsapp/inbox', { replace: true });
    }
  }, [location.search, loadingConv, conversations, channelId, navigate]);
  
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [forwardingMsg, setForwardingMsg] = useState<any | null>(null);
  const [reactingTo, setReactingTo] = useState<any | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const handleReact = (msg: any, emoji: string) => {
    sendReactionMutation.mutate({ messageId: msg.id, emoji }, {
      onSuccess: () => {
        setReactingTo(null);
      },
      onError: (err: any) => {
        toast({ title: 'Reaction Failed', description: err?.response?.data?.message || err?.message, variant: 'error' });
      }
    });
  };
  const [readConvIds, setReadConvIds] = useState<Set<number>>(new Set());

  const handleUpdateStatus = (newStatus: 'open' | 'closed') => {
    if (!selectedConvId) return;
    updateStatusMutation.mutate({ id: selectedConvId, status: newStatus }, {
      onSuccess: () => {
        toast({
          title: `Conversation status updated`,
          description: `Dialogue marked as ${newStatus === 'open' ? 'Open' : 'Resolved'}.`,
        });
        setShowMenu(false);
      },
      onError: (err: any) => {
        toast({
          title: 'Update failed',
          description: err.message,
          variant: 'error',
        });
      }
    });
  };

  const handleViewContact = async () => {
    if (!selectedConv) return;
    setShowMenu(false);
    
    if (selectedConv.patientId) {
      navigate(`/patients/${selectedConv.patientId}`);
      return;
    }
    
    try {
      const cleanPhone = selectedConv.contactPhone.replace(/\D/g, '');
      const { data: lookupRes } = await apiClient.get<{ success: boolean; data: any[] }>('/patients/lookup', {
        params: { query: cleanPhone }
      });
      
      if (lookupRes.success && lookupRes.data && lookupRes.data.length > 0) {
        const matchingPatient = lookupRes.data[0];
        navigate(`/patients/${matchingPatient.regid || matchingPatient.id}`);
        toast({
          title: "Patient Record Located",
          description: `Directing to ${matchingPatient.name}'s profile page.`
        });
      } else {
        toast({
          title: "No Patient Profile Found",
          description: `No active patient record matches +${selectedConv.contactPhone}.`,
          variant: "default"
        });
      }
    } catch (err: any) {
      toast({
        title: "Lookup Failed",
        description: "Unable to query clinical registry.",
        variant: "error"
      });
    }
  };

  const handleArchiveChat = () => {
    if (!selectedConvId) return;
    
    const existingTags = (selectedConv as any)?.tags || [];
    const newTags = Array.isArray(existingTags) 
      ? (existingTags.includes('archived') ? existingTags : [...existingTags, 'archived'])
      : ['archived'];
      
    updateStatusMutation.mutate({ 
      id: selectedConvId, 
      status: 'closed',
      tags: newTags
    }, {
      onSuccess: () => {
        toast({
          title: "Chat Archived",
          description: "This conversation has been safely archived."
        });
        setSelectedConvId(null);
        setShowMenu(false);
      },
      onError: (err: any) => {
        toast({
          title: "Archive Failed",
          description: err.message,
          variant: "error"
        });
      }
    });
  };

  const handleBlockContact = () => {
    if (!selectedConvId) return;
    
    const existingTags = (selectedConv as any)?.tags || [];
    const newTags = Array.isArray(existingTags)
      ? (existingTags.includes('blocked') ? existingTags : [...existingTags, 'blocked'])
      : ['blocked'];
      
    updateStatusMutation.mutate({
      id: selectedConvId,
      status: 'closed',
      tags: newTags
    }, {
      onSuccess: () => {
        toast({
          title: "Contact Blocked",
          description: `+${selectedConv?.contactPhone} has been blocked and moved to resolved.`
        });
        setSelectedConvId(null);
        setShowMenu(false);
      },
      onError: (err: any) => {
        toast({
          title: "Block Failed",
          description: err.message,
          variant: "error"
        });
      }
    });
  };
  
  const handleUnarchiveChat = () => {
    if (!selectedConvId) return;
    
    const existingTags = (selectedConv as any)?.tags || [];
    const newTags = Array.isArray(existingTags)
      ? existingTags.filter((t: string) => t !== 'archived')
      : [];
      
    updateStatusMutation.mutate({ 
      id: selectedConvId, 
      status: 'open',
      tags: newTags
    }, {
      onSuccess: () => {
        toast({
          title: "Chat Unarchived",
          description: "This conversation has been restored to your active inbox."
        });
        setSelectedConvId(null);
        setShowMenu(false);
      },
      onError: (err: any) => {
        toast({
          title: "Unarchive Failed",
          description: err.message,
          variant: "error"
        });
      }
    });
  };

  const handleUnblockContact = () => {
    if (!selectedConvId) return;
    
    const existingTags = (selectedConv as any)?.tags || [];
    const newTags = Array.isArray(existingTags)
      ? existingTags.filter((t: string) => t !== 'blocked')
      : [];
      
    updateStatusMutation.mutate({
      id: selectedConvId,
      status: 'open',
      tags: newTags
    }, {
      onSuccess: () => {
        toast({
          title: "Contact Unblocked",
          description: `+${selectedConv?.contactPhone} has been successfully unblocked.`
        });
        setSelectedConvId(null);
        setShowMenu(false);
      },
      onError: (err: any) => {
        toast({
          title: "Unblock Failed",
          description: err.message,
          variant: "error"
        });
      }
    });
  };

  const handleTogglePin = () => {
    if (!selectedConvId) return;
    
    const existingTags = (selectedConv as any)?.tags || [];
    const isPinned = existingTags.includes('pinned');
    const newTags = isPinned
      ? existingTags.filter((t: string) => t !== 'pinned')
      : [...existingTags, 'pinned'];
      
    updateStatusMutation.mutate({
      id: selectedConvId,
      status: selectedConv?.status || 'open',
      tags: newTags
    }, {
      onSuccess: () => {
        toast({
          title: isPinned ? "Chat Unpinned" : "Chat Pinned",
          description: isPinned ? "Conversation removed from top." : "Conversation pinned to top."
        });
      },
      onError: (err: any) => {
        toast({
          title: "Pin Failed",
          description: err.message,
          variant: "error"
        });
      }
    });
  };

  const handleDeleteChat = () => {
    if (!selectedConvId) return;
    
    deleteConversationMutation.mutate(selectedConvId, {
      onSuccess: () => {
        toast({
          title: "Chat Deleted",
          description: "The conversation and all messages have been permanently removed."
        });
        setSelectedConvId(null);
        setShowMenu(false);
      },
      onError: (err: any) => {
        toast({
          title: "Delete Failed",
          description: err.message,
          variant: "error"
        });
      }
    });
  };

  React.useEffect(() => {
    console.log('[Inbox Debug] State Change:', {
      selectedConvId,
      loadingMsg,
      messagesCount: messages?.length,
      messages,
      msgError
    });
  }, [selectedConvId, loadingMsg, messages, msgError]);

  // Automatically mark selected conversation as read and optimistically clear badges
  React.useEffect(() => {
    if (selectedConvId) {
      markAsReadMutation.mutate(selectedConvId);
      setReadConvIds(prev => {
        const next = new Set(prev);
        next.add(selectedConvId);
        return next;
      });
    }
  }, [selectedConvId]);

  // Handle real-time incoming messages in currently active chat
  React.useEffect(() => {
    if (selectedConvId && messages?.length) {
      markAsReadMutation.mutate(selectedConvId);
    }
  }, [selectedConvId, messages?.length]);

  const [activeChannelFilter, setActiveChannelFilter] = useState('all');
  const [activeStatusFilter, setActiveStatusFilter] = useState('open');
  const [searchTerm, setSearchTerm] = useState('');

  const [messageText, setMessageText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{
    mediaId: string;
    type: 'document' | 'image' | 'video' | 'audio';
    fileName: string;
  } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  
  const scrollToBottom = (behavior: 'smooth' | 'auto' = 'smooth') => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    }, 50);
  };

  // Scroll to bottom when active conversation changes (instant scroll)
  React.useEffect(() => {
    if (selectedConvId && messages?.length) {
      scrollToBottom('auto');
    }
  }, [selectedConvId, messages?.length]);

  // Scroll to bottom when new messages arrive (smooth scroll)
  React.useEffect(() => {
    if (messages?.length) {
      scrollToBottom('smooth');
    }
  }, [messages?.length]);

  const sendMessageMutation = useSendMessage();

  const handleSend = () => {
    if (!selectedConvId) return;
    if (!messageText.trim() && !pendingAttachment) return;

    const payload: any = { 
      conversationId: selectedConvId, 
      content: messageText.trim() || undefined,
      mediaId: pendingAttachment?.mediaId,
      mediaType: pendingAttachment?.type,
      fileName: pendingAttachment?.fileName
    };

    if (replyingTo) {
      payload.metadata = {
        replyTo: {
          id: replyingTo.id,
          content: replyingTo.content,
          direction: replyingTo.direction
        }
      };
    }

    sendMessageMutation.mutate(payload, {
      onSuccess: () => {
        setReplyingTo(null);
      },
      onError: (err: any) => {
        const errorMsg = err?.response?.data?.message || err?.message || '';
        if (errorMsg.includes('131047') || errorMsg.includes('Re-engagement') || errorMsg.includes('conversation window') || errorMsg.includes('window')) {
          toast({
            title: 'Meta Security Restriction',
            description: 'This contact hasn\'t messaged you in 24 hours. Please click the yellow "Send Template" banner above the input field to start the conversation.',
            variant: 'error'
          });
        } else {
          toast({
            title: 'Failed to send message',
            description: errorMsg || 'An unknown error occurred.',
            variant: 'error'
          });
        }
      }
    });

    setMessageText('');
    setPendingAttachment(null);
    setShowEmojiPicker(false);
  };

  const handleDeleteMessage = (msg: any) => {
    if (!window.confirm('Are you sure you want to delete this message? This cannot be undone.')) return;
    deleteMessageMutation.mutate({ messageId: msg.id }, {
      onSuccess: () => {
        toast({ title: 'Message Deleted', description: 'The message has been removed from the chat history.' });
      },
      onError: (err: any) => {
        toast({ title: 'Failed to delete message', description: err.message, variant: 'error' });
      }
    });
  };

  const handleForwardMessage = (destConv: any) => {
    if (!forwardingMsg) return;
    
    sendMessageMutation.mutate({
      conversationId: destConv.id,
      content: forwardingMsg.content,
      mediaId: forwardingMsg.mediaId || undefined,
      mediaType: forwardingMsg.type === 'media' ? 'document' : undefined
    }, {
      onSuccess: () => {
        toast({ title: 'Message Forwarded', description: `Message forwarded to ${destConv.contactName || destConv.contactPhone}.` });
        setForwardingMsg(null);
      },
      onError: (err: any) => {
        toast({ title: 'Failed to forward message', description: err.message, variant: 'error' });
      }
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConvId) return;

    try {
      const response = await uploadMediaMutation.mutateAsync({
        conversationId: selectedConvId,
        file
      });

      setPendingAttachment({
        mediaId: response.mediaId,
        type: response.type,
        fileName: response.fileName
      });

      toast({
        title: 'Attachment prepared',
        description: `${response.fileName} is ready to send. Type a message or click Send.`,
      });
    } catch (err: any) {
      toast({
        title: 'Upload Failed',
        description: err?.response?.data?.message || err.message,
        variant: 'error'
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleStartChat = (contact: any) => {
    // Check if conversation already exists
    const existing = conversations?.find((c) => c.contactPhone === contact.phone);
    if (existing) {
      setSelectedConvId(existing.id);
    } else {
      toast({ title: 'New Conversation', description: `Initiating secure dialogue with ${contact.name}...` });
      createConversationMutation.mutate({
        channelId: Number(channelId || 1),
        contactPhone: contact.phone,
        contactName: contact.name,
      }, {
        onSuccess: (newConv) => {
          setSelectedConvId(newConv.id);
        }
      });
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
    if (activeStatusFilter === 'open' && (conv.status === 'resolved' || conv.status === 'closed')) return false;
    if (activeStatusFilter === 'resolved' && conv.status !== 'resolved' && conv.status !== 'closed') return false;

    // Channel filter
    // If channelType is not in WhatsAppConversation yet, we can add it or cast
    const c = conv as any;
    if (activeChannelFilter === 'wa' && c.channelType !== 'whatsapp') return false;
    if (activeChannelFilter === 'widget' && c.channelType !== 'widget') return false;
    if (activeChannelFilter === 'unread' && conv.unreadCount === 0) return false;

    return true;
  })?.sort((a: any, b: any) => {
    const aPinned = Array.isArray(a.tags) && a.tags.includes('pinned') ? 1 : 0;
    const bPinned = Array.isArray(b.tags) && b.tags.includes('pinned') ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned; // Pinned items go first
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
  });

  const selectedConv = conversations?.find((c) => c.id === selectedConvId);
  const isWindowActive = React.useMemo(() => {
    const sc = selectedConv as any;
    if (!sc?.lastIncomingMessageAt) return false;
    const lastIncoming = new Date(sc.lastIncomingMessageAt).getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return (Date.now() - lastIncoming) < twentyFourHours;
  }, [selectedConv]);

  const safeFormatTime = (timestamp: any, createdAt: any) => {
    try {
      const dateVal = timestamp || createdAt;
      if (!dateVal) return '';
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      return format(d, 'HH:mm');
    } catch (e) {
      return '';
    }
  };


  return (
    <div className="flex w-full max-w-full h-[calc(100vh-220px)] border border-[var(--pp-warm-4)] rounded-2xl overflow-hidden bg-[var(--bg-card)] shadow-[0_4px_24px_rgba(0,0,0,0.03)] animate-fade-in">
      <div className={`w-full md:w-80 lg:w-96 min-w-0 border-r border-[var(--pp-warm-3)] flex flex-col bg-[var(--pp-warm-1)]/40 backdrop-blur-md ${selectedConvId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-5 border-b border-[var(--pp-warm-3)] space-y-4 bg-white">
          <div className="flex justify-between items-center">
            <h3 className="text-[11px] font-extrabold text-[var(--pp-text-3)] uppercase tracking-[0.12em]">Clinical Team Chat</h3>
            <button 
              className="w-8 h-8 rounded-xl hover:bg-[var(--pp-warm-2)] flex items-center justify-center text-[var(--pp-blue)] transition-all border border-transparent hover:border-[var(--pp-warm-3)]"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--pp-text-3)]/50 transition-colors group-focus-within:text-[var(--pp-blue)]" size={14} />
            <input 
              className="pp-filter-search-input pl-10 h-10 text-xs font-semibold border-[var(--pp-warm-4)] focus:border-[var(--pp-blue)] focus:ring-4 focus:ring-[var(--pp-blue)]/5 transition-all rounded-xl w-full outline-none bg-[var(--pp-warm-1)]/30" 
              placeholder="Search conversations..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Tier 1: Channel Filters (Pill Style) */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[var(--pp-warm-2)] rounded-xl border border-[var(--pp-warm-3)]/60">
            {['all', 'wa', 'widget', 'assigned', 'unread'].map((f) => (
              <button
                key={f}
                onClick={() => setActiveChannelFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeChannelFilter === f 
                    ? 'bg-white text-[var(--pp-blue)] shadow-sm border border-[var(--pp-warm-3)]' 
                    : 'text-[var(--pp-text-3)] hover:text-[var(--pp-ink)]'
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
                className={`text-[11px] font-extrabold transition-all relative py-1 uppercase tracking-widest ${
                  activeStatusFilter === s 
                    ? 'text-[var(--pp-blue)]' 
                    : 'text-[var(--pp-text-3)] hover:text-[var(--pp-ink)]'
                }`}
              >
                {s}
                {activeStatusFilter === s && (
                  <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[var(--pp-blue)] rounded-full shadow-[0_1px_6px_rgba(37,99,235,0.3)]" />
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--pp-warm-3)]/40">
          {loadingConv ? (
            <div className="p-8 text-center text-[var(--pp-text-3)] text-xs font-bold animate-pulse uppercase tracking-widest">Loading chats...</div>
          ) : filteredConversations?.length === 0 ? (
            <div className="p-12 text-center text-[var(--pp-text-3)] italic text-sm">No clinical chats found.</div>
          ) : (
            filteredConversations?.map((conv: any) => (
              <div 
                key={conv.id}
                onClick={() => {
                  setSelectedConvId(conv.id);
                  setReadConvIds(prev => {
                    const next = new Set(prev);
                    next.add(conv.id);
                    return next;
                  });
                }}
                className={`p-4 cursor-pointer transition-all relative ${
                  selectedConvId === conv.id 
                    ? 'bg-white shadow-[0_4px_16px_rgba(0,0,0,0.015)]' 
                    : 'hover:bg-[var(--bg-card)]/40'
                }`}
              >
                {selectedConvId === conv.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[var(--pp-blue)] rounded-r-full" />
                )}
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--pp-blue-tint)] to-[var(--pp-blue-tint)]/60 flex items-center justify-center text-[var(--pp-blue)] font-bold text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] border border-[var(--pp-blue-border)]/30">
                    {(conv.contactName || conv.contactPhone).substring(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <h4 className={`font-bold text-[13px] truncate flex items-center gap-1.5 ${selectedConvId === conv.id ? 'text-[var(--pp-blue)]' : 'text-[var(--pp-ink)]'}`}>
                        {Array.isArray(conv.tags) && conv.tags.includes('pinned') && (
                          <Pin size={11} fill="currentColor" className="rotate-45 shrink-0 text-[var(--pp-blue)]" />
                        )}
                        <span className="truncate">{conv.contactName || `+${conv.contactPhone}`}</span>
                      </h4>
                      <span className="text-[9px] font-extrabold text-[var(--pp-text-3)] uppercase">
                        {conv.lastMessageAt ? format(new Date(conv.lastMessageAt), 'HH:mm') : ''}
                      </span>
                    </div>
                    <p className="text-[11px] truncate text-[var(--pp-text-3)] font-semibold">
                      {conv.lastMessageText || 'No messages yet'}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && !readConvIds.has(conv.id) && (
                    <div className="w-4 h-4 bg-[var(--pp-blue)] text-white text-[9px] font-bold flex items-center justify-center rounded-full mt-1">
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
      <div className={`flex-1 min-w-0 flex flex-col bg-[var(--bg-card)] ${selectedConvId ? 'flex' : 'hidden md:flex'}`}>
        {selectedConvId ? (
          <>
            <div className="px-6 py-4 border-b border-[var(--pp-warm-3)] flex justify-between items-center bg-[var(--bg-card)] shadow-sm z-10">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedConvId(null)}
                  className="md:hidden mr-1 p-1 text-[var(--pp-text-3)] hover:text-[var(--pp-blue)] hover:bg-[var(--pp-warm-2)] rounded-lg transition-all"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--pp-warm-2)] to-[var(--pp-warm-1)] flex items-center justify-center text-[var(--pp-blue)] border border-[var(--pp-warm-3)] shadow-sm">
                  <User size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--pp-ink)] leading-tight text-sm">{selectedConv?.contactName || `+${selectedConv?.contactPhone}`}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--pp-success-bg)] border border-[var(--pp-success-border)]/50">
                      <div className="w-1.5 h-1.5 bg-[var(--pp-success-fg)] rounded-full animate-pulse" />
                      <span className="text-[9px] font-extrabold text-[var(--pp-success-fg)] uppercase tracking-wider">Patient Active</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={handleTogglePin}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border ${
                    (selectedConv as any)?.tags?.includes('pinned')
                      ? 'text-[var(--pp-blue)] bg-[var(--pp-warm-2)] border-[var(--pp-warm-3)] shadow-sm' 
                      : 'text-[var(--pp-text-3)] hover:text-[var(--pp-blue)] hover:bg-[var(--pp-warm-2)] border-transparent hover:border-[var(--pp-warm-3)]'
                  }`}
                  title={(selectedConv as any)?.tags?.includes('pinned') ? "Unpin Chat" : "Pin Chat"}
                >
                  <Pin size={15} fill={(selectedConv as any)?.tags?.includes('pinned') ? "currentColor" : "none"} className={(selectedConv as any)?.tags?.includes('pinned') ? "rotate-45" : ""} />
                </button>
                <div className="relative">
                  <button 
                    onClick={() => setShowMenu(!showMenu)}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border ${
                      showMenu 
                        ? 'text-[var(--pp-blue)] bg-[var(--pp-warm-2)] border-[var(--pp-warm-3)] shadow-sm' 
                        : 'text-[var(--pp-text-3)] hover:text-[var(--pp-blue)] hover:bg-[var(--pp-warm-2)] border-transparent hover:border-[var(--pp-warm-3)]'
                    }`}
                  >
                    <MoreVertical size={15} />
                  </button>
                  
                  {showMenu && (
                    <>
                      {/* Overlay to close menu */}
                      <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                      
                      <div className="absolute right-0 mt-2 w-56 bg-[var(--bg-card)] border border-[var(--pp-warm-3)]/80 rounded-2xl shadow-2xl py-2 z-50 animate-scale-in text-left origin-top-right">
                        <div className="px-4 py-1.5 text-[10px] font-extrabold text-[var(--pp-text-3)] uppercase tracking-[0.12em]">Status</div>
                        
                        <button
                          onClick={() => handleUpdateStatus('open')}
                          className="w-full px-4 py-2 text-xs font-bold text-[var(--pp-text-2)] hover:bg-[var(--pp-warm-1)]/60 flex items-center gap-3 transition-colors text-left"
                        >
                          <MessageSquare size={14} className="text-[var(--pp-text-3)]" />
                          <span>Mark as Open</span>
                        </button>
                        
                        <button
                          onClick={() => handleUpdateStatus('closed')}
                          className="w-full px-4 py-2 text-xs font-bold text-[var(--pp-text-2)] hover:bg-[var(--pp-warm-1)]/60 flex items-center gap-3 transition-colors text-left"
                        >
                          <Check size={14} className="text-[var(--pp-text-3)]" />
                          <span>Mark as Resolved</span>
                        </button>
                        
                        <div className="border-t border-[var(--pp-warm-3)]/60 my-1.5" />
                        
                        <button
                          onClick={handleViewContact}
                          className="w-full px-4 py-2 text-xs font-bold text-[var(--pp-text-2)] hover:bg-[var(--pp-warm-1)]/60 flex items-center gap-3 transition-colors text-left"
                        >
                          <User size={14} className="text-[var(--pp-text-3)]" />
                          <span>View Contact</span>
                        </button>
                        
                        {Array.isArray((selectedConv as any)?.tags) && (selectedConv as any).tags.includes('archived') ? (
                          <button
                            onClick={handleUnarchiveChat}
                            className="w-full px-4 py-2 text-xs font-bold text-[var(--pp-text-2)] hover:bg-[var(--pp-warm-1)]/60 flex items-center gap-3 transition-colors text-left"
                          >
                            <Archive size={14} className="text-[var(--pp-blue)]" />
                            <span>Unarchive Chat</span>
                          </button>
                        ) : (
                          <button
                            onClick={handleArchiveChat}
                            className="w-full px-4 py-2 text-xs font-bold text-[var(--pp-text-2)] hover:bg-[var(--pp-warm-1)]/60 flex items-center gap-3 transition-colors text-left"
                          >
                            <Archive size={14} className="text-[var(--pp-text-3)]" />
                            <span>Archive Chat</span>
                          </button>
                        )}
                        
                        {Array.isArray((selectedConv as any)?.tags) && (selectedConv as any).tags.includes('blocked') ? (
                          <button
                            onClick={handleUnblockContact}
                            className="w-full px-4 py-2 text-xs font-bold text-[var(--pp-text-2)] hover:bg-[var(--pp-warm-1)]/60 flex items-center gap-3 transition-colors text-left"
                          >
                            <Ban size={14} className="text-[var(--pp-blue)]" />
                            <span>Unblock Contact</span>
                          </button>
                        ) : (
                          <button
                            onClick={handleBlockContact}
                            className="w-full px-4 py-2 text-xs font-bold text-[var(--pp-text-2)] hover:bg-[var(--pp-warm-1)]/60 flex items-center gap-3 transition-colors text-left"
                          >
                            <Ban size={14} className="text-[var(--pp-text-3)]" />
                            <span>Block Contact</span>
                          </button>
                        )}
                        
                        <div className="border-t border-[var(--pp-warm-3)]/60 my-1.5" />
                        
                        <button
                          onClick={handleDeleteChat}
                          className="w-full px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50/50 flex items-center gap-3 transition-colors text-left"
                        >
                          <Trash2 size={14} className="text-red-500" />
                          <span>Delete Chat</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-[var(--pp-warm-1)]/50 to-[var(--pp-warm-2)]/30">
              {loadingMsg ? (
                <div className="flex justify-center p-8 text-xs font-bold text-[var(--pp-text-3)] uppercase tracking-widest animate-pulse">Syncing Dialogue...</div>
              ) : (
                messages?.slice().reverse().map((msg: any) => (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col relative group ${msg.direction === 'outbound' ? 'items-end' : 'items-start'} w-full mb-3`}
                  >
                    <div className={`flex items-center gap-2 max-w-[75%] ${msg.direction === 'outbound' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div 
                        className={`p-3.5 px-4 rounded-[20px] shadow-[0_4px_16px_rgba(37,99,235,0.06)] border transition-all leading-relaxed ${
                          msg.direction === 'outbound' 
                            ? 'text-white rounded-tr-none border-white/10 bg-gradient-to-br from-[#2563EB] to-[#1E3A8A]' 
                            : 'bg-white text-[var(--pp-ink)] border-[var(--pp-warm-3)]/90 rounded-tl-none shadow-[0_2px_12px_rgba(0,0,0,0.01)]'
                        }`}
                      >
                        {msg.metadata?.replyTo && (
                          <div className={`mb-2 p-2 rounded-lg text-xs border-l-4 leading-normal flex flex-col gap-0.5 ${
                            msg.direction === 'outbound'
                              ? 'bg-[var(--bg-card)]/10 border-white/40 text-white/90'
                              : 'bg-[var(--pp-warm-2)] border-[var(--pp-blue)] text-[var(--pp-text-2)]'
                          }`}>
                            <span className="font-extrabold text-[9px] uppercase tracking-wider opacity-75">
                              {msg.metadata.replyTo.direction === 'outbound' ? 'You' : 'Patient'}
                            </span>
                            <span className="truncate italic font-medium">{msg.metadata.replyTo.content}</span>
                          </div>
                        )}
                        {msg.type === 'image' && msg.metadata?.mediaUrl && (
                          <div className="relative mt-1 mb-2">
                            <a href={msg.metadata.mediaUrl} target="_blank" rel="noreferrer">
                              <img src={msg.metadata.mediaUrl} alt="WhatsApp Image" className="max-w-full max-h-[250px] rounded-lg object-cover shadow-sm border border-[var(--pp-warm-3)] hover:opacity-90 transition-opacity" />
                            </a>
                          </div>
                        )}
                        {msg.type === 'video' && msg.metadata?.mediaUrl && (
                          <div className="relative mt-1 mb-2">
                            <video src={msg.metadata.mediaUrl} controls className="max-w-full max-h-[250px] rounded-lg shadow-sm border border-[var(--pp-warm-3)]" />
                          </div>
                        )}
                        {msg.type === 'document' && msg.metadata?.mediaUrl && (
                          <div className="relative mt-1 mb-2">
                            <a href={msg.metadata.mediaUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-black/5 rounded-lg border border-[var(--pp-warm-3)] hover:bg-black/10 transition-colors">
                              <FileText size={20} className="text-[var(--pp-blue)]" />
                              <span className="text-sm font-semibold underline truncate max-w-[200px]">{msg.metadata?.document?.filename || 'Download Document'}</span>
                            </a>
                          </div>
                        )}
                        {msg.type === 'audio' && msg.metadata?.mediaUrl && (
                          <div className="relative mt-1 mb-2">
                            <audio src={msg.metadata.mediaUrl} controls className="max-w-[250px] h-10" />
                          </div>
                        )}
                        <p className="text-[13px] leading-relaxed font-semibold whitespace-pre-wrap">{msg.content}</p>
                        <div className={`flex items-center gap-1.5 mt-2 ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                          <span className={`text-[8px] font-extrabold uppercase tracking-widest ${msg.direction === 'outbound' ? 'text-white/60' : 'text-[var(--pp-text-3)]'}`}>
                            {safeFormatTime(msg.timestamp, msg.createdAt)}
                          </span>
                          {msg.direction === 'outbound' && (
                            msg.status === 'read' 
                              ? <CheckCheck className="w-3 h-3 text-white animate-fade-in" /> 
                              : <Check className="w-3 h-3 text-white/50 animate-fade-in" />
                          )}
                        </div>
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center bg-[var(--bg-card)] border border-[var(--pp-warm-3)] shadow-md rounded-xl p-1 gap-0.5 z-10 shrink-0 relative">
                        <button 
                          onClick={() => setReactingTo(reactingTo?.id === msg.id ? null : msg)}
                          title="React"
                          className="p-1.5 text-[var(--pp-text-3)] hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                        >
                          <Smile size={13} />
                        </button>
                        <button 
                          onClick={() => setReplyingTo(msg)}
                          title="Reply"
                          className="p-1.5 text-[var(--pp-text-3)] hover:text-[var(--pp-blue)] hover:bg-[var(--pp-warm-2)] rounded-lg transition-all"
                        >
                          <CornerUpLeft size={13} />
                        </button>
                        <button 
                          onClick={() => setForwardingMsg(msg)}
                          title="Forward"
                          className="p-1.5 text-[var(--pp-text-3)] hover:text-[var(--pp-blue)] hover:bg-[var(--pp-warm-2)] rounded-lg transition-all"
                        >
                          <Forward size={13} />
                        </button>
                        <button 
                          onClick={() => handleDeleteMessage(msg)}
                          title="Delete"
                          className="p-1.5 text-[var(--pp-text-3)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                        
                        {/* Mini Reaction Picker */}
                        {reactingTo?.id === msg.id && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[var(--bg-card)] rounded-full shadow-lg border border-[var(--pp-warm-3)] p-1.5 flex gap-1 z-50 animate-slide-up">
                            {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => handleReact(msg, emoji)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-[var(--pp-warm-2)] rounded-full text-lg transition-all transform hover:scale-125"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {replyingTo && (
              <div className="px-6 py-2 bg-gradient-to-r from-[var(--pp-blue-tint)]/40 to-white border-t border-[var(--pp-warm-3)] flex items-center justify-between animate-fade-in z-20">
                <div className="flex items-center gap-2 border-l-4 border-[var(--pp-blue)] pl-3 py-0.5">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-extrabold text-[var(--pp-blue)] uppercase tracking-wider">
                      Replying to {replyingTo.direction === 'outbound' ? 'yourself' : 'patient'}
                    </span>
                    <p className="text-xs font-semibold text-[var(--pp-text-2)] truncate max-w-[500px]">
                      {replyingTo.content}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-[var(--pp-text-3)] hover:text-red-500 p-1 hover:bg-[var(--pp-warm-2)] rounded-lg transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {pendingAttachment && (
              <div className="px-6 py-2.5 bg-[var(--pp-warm-1)] border-t border-[var(--pp-warm-3)] flex items-center justify-between animate-fade-in z-20">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-[var(--pp-blue)]/10 text-[var(--pp-blue)] border border-[var(--pp-blue)]/20">
                    <FileText size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[var(--pp-ink)]">{pendingAttachment.fileName}</p>
                    <p className="text-[10px] text-[var(--pp-text-3)] font-extrabold uppercase tracking-wider">{pendingAttachment.type}</p>
                  </div>
                </div>
                <button
                  onClick={() => setPendingAttachment(null)}
                  className="text-[var(--pp-text-3)] hover:text-red-500 p-1 hover:bg-[var(--pp-warm-2)] rounded-lg transition-all"
                >
                  <Plus size={16} className="rotate-45" />
                </button>
              </div>
            )}

            {!isWindowActive && (
              <div className="px-6 py-3 bg-amber-50 dark:bg-amber-500/10 border-t border-b border-amber-200/60 flex items-center justify-between text-amber-800 text-xs font-semibold animate-fade-in z-20 gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 text-sm">💡</span>
                  <span>Meta Rule: The 24-hour message window is currently closed. You must send an approved template first.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all shadow-sm active:scale-95 whitespace-nowrap"
                >
                  Send Template
                </button>
              </div>
            )}

            <div className="p-4 border-t border-[var(--pp-warm-3)] bg-[var(--bg-card)] flex items-center gap-3">
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Attachment / Paperclip button */}
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMediaMutation.isPending}
                className="text-[var(--pp-text-3)] hover:text-[var(--pp-blue)] p-2 hover:bg-[var(--pp-warm-2)] rounded-xl transition-all border border-transparent hover:border-[var(--pp-warm-3)] flex items-center justify-center disabled:opacity-50"
              >
                {uploadMediaMutation.isPending ? (
                  <Loader2 size={18} className="animate-spin text-[var(--pp-blue)]" />
                ) : (
                  <Paperclip size={18} />
                )}
              </button>

              {/* Document / Template button */}
              <button 
                type="button"
                onClick={() => setIsTemplateModalOpen(true)}
                className="text-[var(--pp-text-3)] hover:text-[var(--pp-blue)] p-2 hover:bg-[var(--pp-warm-2)] rounded-xl transition-all border border-transparent hover:border-[var(--pp-warm-3)]"
              >
                <FileText size={18} />
              </button>

              {/* Message Text Input container */}
              <div className="flex-1 min-w-0 flex items-center bg-[var(--pp-warm-1)]/30 rounded-xl border border-[var(--pp-warm-4)] focus-within:border-[var(--pp-blue)] focus-within:ring-4 focus-within:ring-[var(--pp-blue)]/5 focus-within:bg-white transition-all px-3 py-1 relative">
                <textarea 
                  rows={1}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder={isWindowActive ? "Type a message..." : "Send template first..."} 
                  className="flex-1 min-w-0 bg-transparent border-none focus:ring-0 shadow-none py-2 px-1 text-sm font-semibold resize-none outline-none text-[var(--pp-ink)] placeholder-[var(--pp-text-3)]/60"
                />

                {/* Emoji Trigger Button */}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="text-[var(--pp-text-3)] hover:text-[var(--pp-blue)] p-1.5 hover:bg-[var(--pp-warm-2)] rounded-lg transition-all"
                >
                  <Smile size={18} />
                </button>

                {/* Emoji Picker Popover */}
                {showEmojiPicker && (
                  <div className="absolute bottom-full right-0 mb-2 z-50 shadow-2xl border border-[var(--pp-warm-3)] rounded-2xl overflow-hidden">
                    <EmojiPicker
                      onEmojiClick={(emojiData) => {
                        setMessageText(prev => prev + emojiData.emoji);
                        setShowEmojiPicker(false);
                      }}
                      width={320}
                      height={380}
                    />
                  </div>
                )}
              </div>

              {/* Send button */}
              <button 
                onClick={handleSend}
                disabled={sendMessageMutation.isPending || (!messageText.trim() && !pendingAttachment)}
                className="text-white w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-[0_2px_8px_rgba(37,99,235,0.2)] shrink-0 hover:brightness-105 active:scale-95 bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] disabled:from-[var(--pp-text-4)] disabled:to-[var(--pp-text-4)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <Send size={16} className="translate-x-[0.5px] translate-y-[-0.5px]" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[var(--pp-warm-1)]/30 p-12 text-center">
            <div className="w-20 h-20 bg-[var(--bg-card)] rounded-3xl shadow-[0_4px_16px_rgba(0,0,0,0.02)] border border-[var(--pp-warm-3)] flex items-center justify-center mb-6 text-[var(--pp-blue)]/20">
              <MessageSquare size={32} />
            </div>
            <h3 className="text-sm font-extrabold text-[var(--pp-ink)] uppercase tracking-[0.15em]">No Dialogue Selected</h3>
            <p className="text-[var(--pp-text-3)] mt-2 max-w-xs text-xs font-semibold leading-relaxed">
              Select a clinical conversation from the directory to start active dialogue.
            </p>
          </div>
        )}
      </div>
      <NewChatModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSelect={handleStartChat}
      />
      <ForwardModal
        isOpen={!!forwardingMsg}
        onClose={() => setForwardingMsg(null)}
        onForward={handleForwardMessage}
        conversations={conversations || []}
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
            parameters: variables.map((v: any) => {
              let textValue = v.value || '';
              if (v.type === 'fullName') {
                textValue = selectedConv.contactName || 'Patient';
              } else if (v.type === 'phone') {
                textValue = selectedConv.contactPhone || '';
              }
              return {
                type: 'text',
                text: textValue,
              };
            }),
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

