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
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { managerChatApi } from '../../api/managerChat';
import { socketService } from '../../services/socket';
import { playNotificationSound } from '../../utils/sound';

export default function ManagerChatSupport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
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

          // Trigger audio chime and toast notification if received from someone else
          if (!isSenderMe) {
            playNotificationSound();
            const senderInfo = msg.senderName ? `${msg.senderName} (${msg.senderRole || msg.senderDepartment || 'Staff'})` : 'Executive';
            toast(`💬 Message from ${senderInfo}: "${(msg.message || 'Attachment').slice(0, 40)}"`, {
              duration: 5000,
              icon: '🔔',
              style: { background: '#0f172a', color: '#38bdf8', border: '1px solid #0284c7' }
            });
          }

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

  const renderMessageContent = (content, isMe = false) => {
    if (!content) return null;
    const parts = content.split(/(\b(?:LD|LEAD)-[A-Za-z0-9-]+|\b[0-9a-fA-F]{24}\b)/g);
    return (
      <span>
        {parts.map((part, idx) => {
          if (/^(?:LD|LEAD)-/i.test(part) || /^[0-9a-fA-F]{24}$/.test(part)) {
            return (
              <button
                key={idx}
                type="button"
                onClick={() => navigate(`/crm/leads/${part}`)}
                className={
                  isMe
                    ? "bg-white/25 hover:bg-white/40 text-white border border-white/40 font-mono font-bold text-[11px] px-2 py-0.5 rounded mx-0.5 inline-flex items-center gap-1 transition cursor-pointer shadow-xs"
                    : "bg-teal-50 dark:bg-teal-950 hover:bg-teal-100 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-700 font-mono font-bold text-[11px] px-2 py-0.5 rounded mx-0.5 inline-flex items-center gap-1 transition cursor-pointer shadow-xs"
                }
                title={`Click to open Lead Manifest (${part})`}
              >
                📄 {part} ↗
              </button>
            );
          }
          return part;
        })}
      </span>
    );
  };

  const filteredParticipants = participants.filter(p => {
    const name = (p.fullName || p.name || '').toLowerCase();
    const role = (p.role || '').toLowerCase();
    const dept = (p.department || '').toLowerCase();
    const term = searchTerm.toLowerCase();
    return name.includes(term) || role.includes(term) || dept.includes(term);
  });

  const getRoleBadgeStyle = (dept, isSelected) => {
    if (isSelected) {
      return 'bg-white/20 text-white border-white/30';
    }
    const d = (dept || '').toUpperCase();
    if (d.includes('ADMIN') || d.includes('FOUNDER')) return 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800';
    if (d.includes('MANAGEMENT') || d.includes('EXECUTIVE') || d.includes('CEO')) return 'bg-sky-100 dark:bg-sky-950 text-sky-900 dark:text-sky-200 border-sky-300 dark:border-sky-800';
    if (d.includes('SALES')) return 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800';
    return 'bg-teal-100 dark:bg-teal-950 text-teal-900 dark:text-teal-200 border-teal-300 dark:border-teal-800';
  };

  return (
    <div className="crm-portal min-h-[calc(100vh-100px)] flex flex-col font-sans antialiased text-slate-900 dark:text-slate-100 bg-[var(--crm-bg)]">
      
      {/* Header Deck */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 dark:border-slate-800 pb-4 mb-4 gap-3">
        <div>
          <span className="text-[10px] uppercase tracking-[0.25em] font-bold font-mono text-teal-600 dark:text-teal-400 block">
            Leadership Operations & Executive Network
          </span>
          <h1 className="text-xl sm:text-2xl font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-slate-100 mt-0.5 flex items-center gap-2">
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
            className="bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs uppercase px-4 py-2 rounded-lg transition cursor-pointer flex items-center gap-2 shadow-sm border border-slate-700 dark:border-slate-300"
          >
            <FiRefreshCw size={13} /> Refresh Sync
          </button>
        </div>
      </div>

      {/* Main Workspace Interface Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[620px]">
        
        {/* Left Sidebar - Channels & Manager Directory (Col Span 4) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm flex flex-col h-[620px]">
          
          {/* Header Block inside left panel */}
          <div className="flex justify-between items-center mb-3 font-mono border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-xs uppercase tracking-widest text-slate-900 dark:text-slate-100 font-bold flex items-center gap-1.5">
                <FiZap className="text-teal-500 shrink-0" size={14} /> EXECUTIVE DIRECTORY
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">Leadership channels & direct lines.</p>
            </div>
            <span className="bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-300 text-[9px] px-2 py-0.5 rounded-full font-bold border border-teal-300 dark:border-teal-700">
              HQ NET
            </span>
          </div>

          {/* Search Box */}
          <div className="mb-3">
            <div className="relative font-mono">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search manager or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:border-teal-500 text-slate-900 dark:text-slate-100 text-xs rounded-lg outline-none font-sans font-bold placeholder:font-normal placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Channels & Direct Messages List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar">
            
            {/* Team Leadership Channel */}
            <div>
              <div className="px-1 mb-1 text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
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
                className={`p-3.5 border rounded-xl cursor-pointer transition-all duration-150 flex items-center justify-between gap-2 font-mono ${
                  selectedChannel === 'GENERAL'
                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white border-transparent shadow-md'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-teal-400'
                }`}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <FiHash className={selectedChannel === 'GENERAL' ? 'text-teal-100 shrink-0' : 'text-teal-600 dark:text-teal-400 shrink-0'} size={15} />
                    <span className={`font-bold text-xs truncate ${selectedChannel === 'GENERAL' ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                      # General Leadership Desk
                    </span>
                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold border ${selectedChannel === 'GENERAL' ? 'bg-white/20 text-white border-white/30' : 'bg-teal-100 dark:bg-teal-950 text-teal-900 dark:text-teal-200 border-teal-300 dark:border-teal-800'}`}>
                      LEADERSHIP
                    </span>
                  </div>
                  <p className={`text-[10px] truncate pl-5 font-semibold ${selectedChannel === 'GENERAL' ? 'text-teal-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    All Department Managers + Founder
                  </p>
                </div>
              </div>
            </div>

            {/* Direct Messages Directory */}
            <div>
              <div className="px-1 mb-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex justify-between items-center">
                <span>Direct Executive Messages</span>
                <span className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[9px] text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-mono font-bold">
                  {filteredParticipants.length} MANAGERS
                </span>
              </div>

              <div className="space-y-2">
                {filteredParticipants.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 uppercase text-[10px] font-mono border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                    No managers found in directory
                  </div>
                ) : (
                  filteredParticipants.map((p, pIdx) => {
                    const isSelected = selectedChannel === p._id || (p.allIds && p.allIds.includes(selectedChannel));
                    const roleBadgeClass = getRoleBadgeStyle(p.department || p.role, isSelected);

                    return (
                      <div
                        key={p._id || `participant_${pIdx}`}
                        onClick={() => handleSelectChannel(p)}
                        className={`p-3.5 border rounded-xl cursor-pointer transition-all duration-150 flex items-center justify-between gap-2 font-mono ${
                          isSelected
                            ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white border-transparent shadow-md'
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-teal-400'
                        }`}
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`font-bold text-xs truncate max-w-[140px] ${isSelected ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                              {p.fullName || p.name}
                            </span>
                            <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold border uppercase ${roleBadgeClass}`}>
                              {p.department || 'HQ'}
                            </span>
                          </div>
                          <p className={`text-[10px] truncate font-semibold ${isSelected ? 'text-teal-100' : 'text-slate-500 dark:text-slate-400'}`}>
                            {p.position || p.role || 'Executive'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <span className={`text-[9px] font-mono px-2.5 py-1 rounded-md font-bold uppercase transition ${
                            isSelected
                              ? 'bg-white text-teal-900 shadow-xs'
                              : 'bg-teal-600 text-white hover:bg-teal-700 shadow-xs'
                          }`}>
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
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm flex flex-col h-[620px]">
          
          {/* Chat Stream Header */}
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3.5 flex justify-between items-center shrink-0 font-mono">
            <div>
              <h3 className="text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 font-bold flex items-center gap-2">
                <FiMessageSquare className="text-teal-600 dark:text-teal-400" size={16} /> 
                {selectedChannel === 'GENERAL'
                  ? 'CHATTING WITH: GENERAL LEADERSHIP HUB'
                  : `CHATTING WITH: ${selectedParticipant.fullName || selectedParticipant.name} (${selectedParticipant.department || 'HQ'})`}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                {selectedChannel === 'GENERAL'
                  ? 'Broadcast channel for all department managers & founder.'
                  : '1-on-1 direct coaching line & lead query channel.'}
              </p>
            </div>

            {selectedChannel !== 'GENERAL' && (
              <span className="bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-300 text-[9px] px-2.5 py-1 rounded-full font-bold border border-teal-300 dark:border-teal-700 uppercase font-mono hidden sm:inline-block">
                🔒 1-ON-1 DIRECT LINE
              </span>
            )}
          </div>

          {/* Message Stream Body */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto my-3 pr-2 space-y-3 custom-scrollbar text-xs font-sans">
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-400 font-mono uppercase tracking-widest text-[10px] font-bold animate-pulse">
                Loading executive chat history...
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 font-mono uppercase tracking-widest text-[10px] font-bold text-center px-4">
                NO MESSAGE HISTORY YET. SEND A MESSAGE TO {selectedParticipant.fullName || selectedParticipant.name.toUpperCase()}!
              </div>
            ) : (
              messages.map((msg, msgIdx) => {
                const isMe = myIdsSet.has(String(msg.senderId)) || (user?.email && msg.senderEmail && String(msg.senderEmail).toLowerCase() === String(user.email).toLowerCase());
                const isSeen = Boolean(msg.isRead) || (msg.readBy && msg.readBy.some(id => !myIdsSet.has(String(id))));
                const isImage = msg.attachmentUrl && /\.(png|jpe?g|webp|gif)$/i.test(msg.attachmentUrl);

                return (
                  <div
                    key={msg._id || `msg_${msgIdx}`}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    {/* Message Bubble Container */}
                    <div
                      className={`max-w-[80%] rounded-2xl p-3.5 space-y-1.5 shadow-sm ${
                        isMe
                          ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-tr-none'
                          : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-tl-none font-bold'
                      }`}
                    >
                      {/* Sender Header */}
                      <div className={`flex justify-between items-center gap-4 text-[10px] font-mono font-bold border-b pb-1 ${
                        isMe ? 'text-teal-100 border-white/20' : 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}>
                        <span>From: <strong className={isMe ? 'text-white' : 'text-slate-900 dark:text-slate-100'}>{msg.senderName}</strong> ({msg.senderDepartment || msg.senderRole || 'MANAGER'})</span>
                      </div>

                      {/* Associated Lead Code Tag */}
                      {msg.leadCode && (
                        <button
                          type="button"
                          onClick={() => navigate(`/crm/leads/${msg.leadCode}`)}
                          className={
                            isMe
                              ? "mb-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white border border-white/40 font-mono text-[11px] font-bold cursor-pointer transition shadow-xs"
                              : "mb-1 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-900 dark:text-teal-200 border border-teal-300 dark:border-teal-700 hover:bg-teal-100 font-mono text-[11px] font-bold cursor-pointer transition shadow-xs"
                          }
                          title={`Click to open lead details for ${msg.leadCode}`}
                        >
                          <FiTag size={11} className={isMe ? 'text-white' : 'text-teal-600 dark:text-teal-400'} />
                          <span>Lead Code: <strong className="underline font-extrabold">{msg.leadCode}</strong> ↗</span>
                        </button>
                      )}

                      {/* Message Content */}
                      {msg.message && (
                        <div className={`leading-relaxed break-words font-sans text-xs pt-0.5 ${
                          isMe ? 'font-semibold text-white' : 'font-bold text-slate-900 dark:text-slate-100'
                        }`}>
                          {renderMessageContent(msg.message, isMe)}
                        </div>
                      )}

                      {/* Inline Image Preview Thumbnail */}
                      {isImage && (
                        <div className="mt-2 space-y-1">
                          <img
                            src={msg.attachmentUrl}
                            alt="Attachment preview"
                            onClick={() => window.open(msg.attachmentUrl, '_blank')}
                            className="max-h-56 max-w-full rounded-lg border border-white/20 object-cover cursor-pointer hover:opacity-90 transition shadow-md"
                          />
                          <div className={`text-[9px] font-mono flex items-center justify-between ${isMe ? 'text-teal-100' : 'text-slate-500 dark:text-slate-400'}`}>
                            <span>Image sent by <strong>{msg.senderName}</strong></span>
                            <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">Full View ↗</a>
                          </div>
                        </div>
                      )}

                      {/* Generic Attachment Link if not image */}
                      {msg.attachmentUrl && !isImage && (
                        <div className={`mt-1 pt-1 border-t ${isMe ? 'border-white/20' : 'border-slate-200 dark:border-slate-700'}`}>
                          <a
                            href={msg.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-[10px] font-mono underline inline-flex items-center gap-1 ${isMe ? 'text-teal-100' : 'text-teal-700 dark:text-teal-300'}`}
                          >
                            <FiImage size={10} /> View Attachment (Sent by {msg.senderName})
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Timestamp & WhatsApp Seen Double Ticks */}
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-500 dark:text-slate-400 font-mono font-bold mt-1 px-1">
                      <span>{msg.time || new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMe && (
                        isSeen ? (
                          <div className="flex items-center -space-x-1.5" title="Seen by recipient">
                            <FiCheck className="text-teal-600 dark:text-teal-400 font-bold" size={13} />
                            <FiCheck className="text-teal-600 dark:text-teal-400 font-bold" size={13} />
                          </div>
                        ) : (
                          <div className="flex items-center -space-x-1.5" title="Delivered">
                            <FiCheck className="text-slate-400" size={13} />
                            <FiCheck className="text-slate-400" size={13} />
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
          <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 pt-3 font-mono">
            
            {/* Associated Lead Tag Indicator */}
            {leadCodeInput && (
              <div className="mb-2.5 inline-flex items-center gap-2 bg-teal-50 dark:bg-teal-950 border border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-200 text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg shadow-xs">
                <FiTag size={12} className="text-teal-600 dark:text-teal-400" /> Tagged Lead: <strong>{leadCodeInput}</strong>
                <button onClick={() => setLeadCodeInput('')} className="hover:text-slate-900 dark:hover:text-white cursor-pointer ml-1">
                  <FiX size={13} />
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
                className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400 p-2.5 rounded-lg transition cursor-pointer"
                title="Tag a Lead Code"
              >
                <FiTag size={15} />
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
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs px-4 py-2.5 rounded-lg outline-none focus:border-teal-500 font-sans font-bold placeholder:font-mono placeholder:font-normal placeholder:text-slate-400"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={sending || (!chatInput.trim() && !attachmentUrl)}
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 text-white font-mono font-bold text-xs px-5 py-2.5 rounded-lg transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FiSend size={15} />
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
