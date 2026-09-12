import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiMessageSquare,
  FiSend,
  FiPaperclip,
  FiUsers,
  FiSearch,
  FiShield,
  FiHash,
  FiUser,
  FiRefreshCw,
  FiTag,
  FiX,
  FiImage,
  FiBriefcase,
  FiZap,
  FiCheckSquare,
  FiCheck
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { managerChatApi } from '../../api/managerChat';
import { socketService } from '../../services/socket';

export default function ManagerChatSupport() {
  const { user } = useAuth();
  
  // Set of all possible IDs/emails for the currently logged-in user
  const myIdsSet = useMemo(() => {
    return new Set(
      [
        String(user?._id || ''),
        String(user?.id || ''),
        String(user?.employeeDbId || ''),
        String(user?.employeeId || ''),
        user?.email ? String(user.email).toLowerCase() : ''
      ].filter(Boolean)
    );
  }, [user]);

  // Active channel/participant selection ('GENERAL' or user ID)
  const [selectedChannel, setSelectedChannel] = useState('GENERAL'); // 'GENERAL' or target userId
  const [selectedParticipant, setSelectedParticipant] = useState({
    _id: 'GENERAL',
    fullName: 'General Leadership Hub',
    name: 'General Leadership Hub',
    role: 'ALL MANAGERS & FOUNDER',
    department: 'LEADERSHIP'
  });

  // Set of all possible IDs/emails for the selected participant
  const targetIdsSet = useMemo(() => {
    if (selectedChannel === 'GENERAL') return new Set(['GENERAL']);
    return new Set(
      [
        String(selectedParticipant._id || ''),
        String(selectedParticipant.employeeId || ''),
        selectedParticipant.email ? String(selectedParticipant.email).toLowerCase() : '',
        ...(selectedParticipant.allIds || []).map(String)
      ].filter(Boolean)
    );
  }, [selectedChannel, selectedParticipant]);

  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [leadCodeInput, setLeadCodeInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch Participants & Initial Messages
  useEffect(() => {
    fetchParticipants();
  }, []);

  useEffect(() => {
    fetchMessages(selectedChannel);
  }, [selectedChannel]);

  // Socket Connection & Real-time message & read status listeners
  useEffect(() => {
    const skt = socketService.connect(user);
    if (skt) {
      const handleReceiveMsg = (msg) => {
        if (!msg) return;

        const isGeneral = msg.recipientId === 'GENERAL' && selectedChannel === 'GENERAL';
        
        const isSenderMe = myIdsSet.has(String(msg.senderId)) || (user?.email && msg.senderEmail && String(msg.senderEmail).toLowerCase() === String(user.email).toLowerCase());
        const isRecipientMe = myIdsSet.has(String(msg.recipientId));

        const isSenderTarget = targetIdsSet.has(String(msg.senderId)) || (selectedParticipant.email && msg.senderEmail && String(msg.senderEmail).toLowerCase() === String(selectedParticipant.email).toLowerCase());
        const isRecipientTarget = targetIdsSet.has(String(msg.recipientId));

        const isMyDM = selectedChannel !== 'GENERAL' && (
          (isSenderMe && isRecipientTarget) || (isSenderTarget && isRecipientMe)
        );

        if (isGeneral || isMyDM) {
          setMessages(prev => {
            if (prev.some(m => String(m._id || m.id) === String(msg._id || msg.id))) return prev;
            return [...prev, msg];
          });

          // Mark message as read automatically if receiving while on this active channel
          if (isSenderTarget) {
            managerChatApi.markRead(selectedChannel);
          }
        }
      };

      const handleReadReceipt = (data) => {
        if (!data) return;
        // Update all my sent messages in the stream to reflect read/seen status
        setMessages(prev => prev.map(m => {
          const sentByMe = myIdsSet.has(String(m.senderId)) || (user?.email && m.senderEmail && String(m.senderEmail).toLowerCase() === String(user.email).toLowerCase());
          if (sentByMe) {
            return { ...m, isRead: true };
          }
          return m;
        }));
      };

      skt.on('manager_chat_receive', handleReceiveMsg);
      skt.on('manager_chat_read', handleReadReceipt);
      return () => {
        skt.off('manager_chat_receive', handleReceiveMsg);
        skt.off('manager_chat_read', handleReadReceipt);
      };
    }
  }, [user, selectedChannel, selectedParticipant, myIdsSet, targetIdsSet]);

  const fetchParticipants = async () => {
    try {
      const res = await managerChatApi.getParticipants();
      if (res && res.success) {
        setParticipants(res.data?.participants || []);
      }
    } catch (err) {
      console.error('Error fetching chat participants:', err);
    }
  };

  const fetchMessages = async (channelId) => {
    setLoading(true);
    try {
      const res = await managerChatApi.getMessages({ recipientId: channelId });
      if (res && res.success) {
        setMessages(res.data?.chats || []);
        managerChatApi.markRead(channelId);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
      toast.error('Failed to load chat history');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChannel = (p) => {
    setSelectedChannel(p._id);
    setSelectedParticipant(p);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() && !attachmentUrl) return;

    setSending(true);
    try {
      const payload = {
        recipientId: selectedChannel,
        recipientName: selectedParticipant.fullName || selectedParticipant.name,
        message: chatInput.trim(),
        attachmentUrl,
        leadCode: leadCodeInput.trim()
      };

      const res = await managerChatApi.sendMessage(payload);
      if (res && res.success) {
        const chatDoc = res.data?.chat || {
          _id: `msg_${Date.now()}`,
          senderId: String(user?._id || user?.id || ''),
          senderEmail: user?.email || '',
          senderName: user?.fullName || user?.name || 'User',
          senderRole: user?.role || 'MANAGER',
          senderDepartment: user?.department || 'GENERAL',
          recipientId: selectedChannel,
          recipientName: selectedParticipant.fullName || selectedParticipant.name,
          message: chatInput.trim(),
          attachmentUrl,
          leadCode: leadCodeInput.trim(),
          isRead: false,
          readBy: [String(user?._id || ''), user?.email].filter(Boolean),
          createdAt: new Date(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => {
          if (prev.some(m => String(m._id || m.id) === String(chatDoc._id || chatDoc.id))) return prev;
          return [...prev, chatDoc];
        });

        setChatInput('');
        setAttachmentUrl('');
        setLeadCodeInput('');
      }
    } catch (err) {
      console.error('Error sending manager message:', err);
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const filteredParticipants = participants.filter(p => {
    const name = (p.fullName || p.name || '').toLowerCase();
    const role = (p.role || '').toLowerCase();
    const dept = (p.department || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    return name.includes(term) || role.includes(term) || dept.includes(term);
  });

  return (
    <div className="crm-portal min-h-[calc(100vh-100px)] flex flex-col font-sans antialiased text-[var(--crm-ink-soft)] bg-[var(--crm-bg)]">
      
      {/* Header Deck */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[var(--crm-line)] pb-4 mb-4 gap-3">
        <div>
          <span className="text-[9px] uppercase tracking-[0.25em] font-bold font-mono text-[var(--crm-ink-faint)] block">
            Leadership Operations & Executive Network
          </span>
          <h1 className="text-xl sm:text-2xl font-bold font-mono uppercase tracking-wider text-[var(--crm-heading)] mt-0.5 flex items-center gap-2">
            Executive Manager & Founder Chat
          </h1>
        </div>
        <div className="flex items-center gap-2 font-mono">
          <button
            onClick={() => {
              fetchParticipants();
              fetchMessages(selectedChannel);
              toast.success('Chat synchronized 🔄');
            }}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[9px] uppercase px-3 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <FiRefreshCw size={12} /> Refresh Sync
          </button>
        </div>
      </div>

      {/* Main Workspace Interface Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[580px]">
        
        {/* Left Sidebar - Channels & Manager Directory (Col Span 4) */}
        <div className="lg:col-span-4 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 rounded-lg shadow-sm flex flex-col h-[580px]">
          
          {/* Header Block inside left panel */}
          <div className="flex justify-between items-center mb-3 font-mono border-b border-[var(--crm-line)] pb-3">
            <div>
              <h3 className="text-xs uppercase tracking-widest text-[var(--crm-heading)] font-bold flex items-center gap-1.5">
                <FiZap className="text-amber-400 shrink-0" size={14} /> EXECUTIVE DIRECTORY
              </h3>
              <p className="text-[9px] text-[var(--crm-ink-faint)]">Leadership channels & direct lines.</p>
            </div>
            <span className="bg-amber-950/80 text-amber-400 text-[8px] px-1.5 py-0.5 rounded font-bold border border-amber-800">
              HQ NET
            </span>
          </div>

          {/* Search Box */}
          <div className="mb-3">
            <div className="relative font-mono">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--crm-ink-faint)]" size={13} />
              <input
                type="text"
                placeholder="Search manager or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] focus:border-teal-500 text-[var(--crm-heading)] text-xs rounded outline-none font-sans"
              />
            </div>
          </div>

          {/* Channels & Direct Messages List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
            
            {/* Team Leadership Channel */}
            <div>
              <div className="px-1 mb-1 text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--crm-ink-faint)]">
                General Leadership Hub
              </div>
              <div
                onClick={() => handleSelectChannel({
                  _id: 'GENERAL',
                  fullName: 'General Leadership Hub',
                  name: 'General Leadership Hub',
                  role: 'ALL MANAGERS & FOUNDER',
                  department: 'LEADERSHIP'
                })}
                className={`p-3 border rounded-md cursor-pointer transition flex items-center justify-between gap-2 font-mono ${
                  selectedChannel === 'GENERAL'
                    ? 'bg-teal-950/60 border-teal-500 text-white'
                    : 'bg-[var(--crm-bg-sunken)]/40 border-[var(--crm-line)] hover:border-teal-700/50'
                }`}
              >
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <FiHash className="text-amber-400 shrink-0" size={15} />
                    <span className="font-bold text-[var(--crm-heading)] text-xs truncate"># General Leadership Desk</span>
                    <span className="bg-amber-950/80 text-amber-400 text-[8px] px-1.5 py-0.5 rounded font-bold border border-amber-800">
                      LEADERSHIP
                    </span>
                  </div>
                  <p className="text-[9px] text-[var(--crm-ink-faint)] truncate pl-5">All Department Managers + Founder</p>
                </div>
              </div>
            </div>

            {/* Direct Messages Directory */}
            <div>
              <div className="px-1 mb-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-[var(--crm-ink-faint)] flex justify-between items-center">
                <span>Direct Executive Messages</span>
                <span className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[8px] text-[var(--crm-ink-faint)] px-1.5 py-0.5 rounded font-mono">
                  {filteredParticipants.length} MANAGERS
                </span>
              </div>

              <div className="space-y-2">
                {filteredParticipants.length === 0 ? (
                  <div className="py-12 text-center text-[var(--crm-ink-faint)] uppercase text-[9px] font-mono border border-dashed border-[var(--crm-line)] rounded">
                    No managers found in directory
                  </div>
                ) : (
                  filteredParticipants.map((p, pIdx) => {
                    const isSelected = selectedChannel === p._id || (p.allIds && p.allIds.includes(selectedChannel));
                    return (
                      <div
                        key={p._id || `participant_${pIdx}`}
                        onClick={() => handleSelectChannel(p)}
                        className={`p-3 border rounded-md cursor-pointer transition flex items-center justify-between gap-2 font-mono ${
                          isSelected
                            ? 'bg-teal-950/60 border-teal-500 text-white'
                            : 'bg-[var(--crm-bg-sunken)]/40 border-[var(--crm-line)] hover:border-teal-700/50'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-[var(--crm-heading)] text-xs truncate max-w-[140px]">
                              {p.fullName || p.name}
                            </span>
                            <span className="bg-amber-950/80 text-amber-400 text-[8px] px-1.5 py-0.5 rounded font-bold border border-amber-800 uppercase">
                              {p.department || 'HQ'}
                            </span>
                          </div>
                          <p className="text-[9px] text-[var(--crm-ink-faint)] truncate">
                            {p.position || p.role || 'Executive'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-teal-900/60 text-teal-200 border border-teal-700/50 uppercase">
                            CHAT
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Right Chat Terminal Viewport (Col Span 8) */}
        <div className="lg:col-span-8 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-5 rounded-lg shadow-sm flex flex-col h-[580px]">
          
          {/* Chat Stream Header */}
          <div className="border-b border-[var(--crm-line)] pb-3 flex justify-between items-center shrink-0 font-mono">
            <div>
              <h3 className="text-xs uppercase tracking-widest text-[var(--crm-heading)] font-bold flex items-center gap-2">
                <FiMessageSquare className="text-teal-400" size={15} /> 
                {selectedChannel === 'GENERAL'
                  ? 'CHATTING WITH: GENERAL LEADERSHIP HUB'
                  : `CHATTING WITH: ${selectedParticipant.fullName || selectedParticipant.name} (${selectedParticipant.department || 'HQ'})`}
              </h3>
              <p className="text-[9px] text-[var(--crm-ink-faint)]">
                {selectedChannel === 'GENERAL'
                  ? 'Broadcast channel for all department managers & founder.'
                  : '1-on-1 direct coaching line & lead query channel.'}
              </p>
            </div>

            {selectedChannel !== 'GENERAL' && (
              <span className="bg-amber-950/80 text-amber-400 text-[8px] px-2 py-1 rounded font-bold border border-amber-800 uppercase font-mono hidden sm:inline-block">
                🔒 1-ON-1 DIRECT LINE
              </span>
            )}
          </div>

          {/* Message Stream Body */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto my-3 pr-2 space-y-3 custom-scrollbar text-xs font-sans">
            {loading ? (
              <div className="h-full flex items-center justify-center text-[var(--crm-ink-faint)] font-mono uppercase tracking-widest text-[9px] animate-pulse">
                Loading executive chat history...
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[var(--crm-ink-faint)] font-mono uppercase tracking-widest text-[9px] text-center px-4">
                NO MESSAGE HISTORY YET. SEND A MESSAGE TO {selectedParticipant.fullName || selectedParticipant.name.toUpperCase()}!
              </div>
            ) : (
              messages.map((msg, msgIdx) => {
                const isMe = myIdsSet.has(String(msg.senderId)) || (user?.email && msg.senderEmail && String(msg.senderEmail).toLowerCase() === String(user.email).toLowerCase());
                const isSeen = Boolean(msg.isRead) || (msg.readBy && msg.readBy.some(id => !myIdsSet.has(String(id))));

                return (
                  <div
                    key={msg._id || `msg_${msgIdx}`}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    {/* Message Bubble Container */}
                    <div
                      className={`max-w-[80%] rounded-lg p-3 space-y-1 shadow-sm ${
                        isMe
                          ? 'bg-teal-600 text-white'
                          : 'bg-indigo-950/90 border border-indigo-800 text-[var(--crm-heading)]'
                      }`}
                    >
                      {/* Sender Header */}
                      <div className="flex justify-between items-center gap-4 text-[9px] font-mono font-bold opacity-80 border-b border-white/10 pb-1">
                        <span>{msg.senderName} ({msg.senderDepartment || msg.senderRole || 'MANAGER'})</span>
                      </div>

                      {/* Associated Lead Code Tag */}
                      {msg.leadCode && (
                        <div className="mb-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/20 text-amber-200 font-mono text-[9px]">
                          <FiTag size={10} /> Lead Code: <strong>{msg.leadCode}</strong>
                        </div>
                      )}

                      {/* Message Content */}
                      <div className="leading-relaxed break-words font-sans text-xs pt-1">
                        {msg.message}
                      </div>

                      {/* Attachment Link */}
                      {msg.attachmentUrl && (
                        <div className="mt-1 pt-1 border-t border-white/20">
                          <a
                            href={msg.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-mono text-amber-200 underline inline-flex items-center gap-1"
                          >
                            <FiImage size={10} /> View Attachment
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Timestamp & WhatsApp Seen Double Ticks */}
                    <div className="flex items-center gap-1.5 text-[8px] text-[var(--crm-ink-faint)] font-mono mt-0.5 px-1">
                      <span>{msg.time || new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMe && (
                        isSeen ? (
                          <div className="flex items-center -space-x-1.5" title="Seen by recipient">
                            <FiCheck className="text-teal-300 font-bold" size={12} />
                            <FiCheck className="text-teal-300 font-bold" size={12} />
                          </div>
                        ) : (
                          <div className="flex items-center -space-x-1.5" title="Delivered">
                            <FiCheck className="text-white/40" size={12} />
                            <FiCheck className="text-white/40" size={12} />
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="shrink-0 border-t border-[var(--crm-line)] pt-3 font-mono">
            
            {/* Associated Lead Tag Indicator */}
            {leadCodeInput && (
              <div className="mb-2 inline-flex items-center gap-2 bg-amber-950/60 border border-amber-500/40 text-amber-300 text-[9px] font-mono px-2.5 py-1 rounded">
                <FiTag size={10} /> Tagged Lead: <strong>{leadCodeInput}</strong>
                <button onClick={() => setLeadCodeInput('')} className="hover:text-white cursor-pointer ml-1">
                  <FiX size={12} />
                </button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
              
              {/* Insert Lead Code Button */}
              <button
                type="button"
                onClick={() => {
                  const code = prompt('Enter Lead Code (e.g. LD-178903-504):');
                  if (code) setLeadCodeInput(code.trim());
                }}
                className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-ink-faint)] hover:text-white p-2.5 rounded transition cursor-pointer"
                title="Tag a Lead Code"
              >
                <FiTag size={14} />
              </button>

              {/* Text Input Field */}
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  selectedChannel === 'GENERAL'
                    ? 'Type message to General Leadership Hub...'
                    : `Type message to ${selectedParticipant.fullName || selectedParticipant.name}...`
                }
                className="flex-1 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] text-xs px-3.5 py-2.5 rounded outline-none focus:border-teal-500 transition font-sans placeholder:font-mono placeholder:text-[11px]"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={sending || (!chatInput.trim() && !attachmentUrl)}
                className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-mono font-bold text-xs px-4 py-2.5 rounded transition flex items-center justify-center cursor-pointer"
              >
                <FiSend size={14} />
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
