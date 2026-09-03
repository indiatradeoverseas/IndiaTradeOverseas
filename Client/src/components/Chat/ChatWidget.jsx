import React, { useState, useEffect, useRef } from 'react';
import { FiMessageCircle, FiX, FiSend, FiCornerDownLeft, FiRefreshCw } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { chatApi } from '../../api/chat';
import { leadsApi } from '../../api/leads';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

// -----------------------------------------------------------------------------
// Guided lead-collection steps (bot asks these one-by-one instead of hardcoding).
// IMPORTANT: productCategory values must match the enum your backend/CRM accepts.
// If your API expects different values, edit PRODUCT_OPTIONS below.
// -----------------------------------------------------------------------------
const PRODUCT_OPTIONS = [
  { label: 'Stone', value: 'STONE' },
  { label: 'Coal', value: 'COAL' },
  { label: 'Minerals', value: 'MINERALS' },
  { label: 'Other', value: 'OTHER' },
];

const LEAD_STEPS = [
  { key: 'phone', question: 'Great! To create your enquiry, please share your phone number.', placeholder: 'e.g. 98765 43210', type: 'text' },
  { key: 'whatsAppNumber', question: 'Please share your WhatsApp number for instant updates.', placeholder: 'e.g. 98765 43210 (or same as phone)', type: 'text' },
  { key: 'productCategory', question: 'Which product are you interested in?', placeholder: '', type: 'options' },
  { key: 'quantity', question: 'What quantity do you require?', placeholder: 'e.g. 500 MT', type: 'text' },
  { key: 'destination', question: 'What is the delivery destination?', placeholder: 'e.g. Kishanganj, Bihar', type: 'text' },
  { key: 'targetDate', question: 'What is your requirement date / timeline?', placeholder: 'e.g. 2026-09-30 or Immediate', type: 'text' },
  { key: 'estimatedValue', question: 'What is your estimated requirement valuation / budget?', placeholder: 'e.g. ₹5,00,000 or $10,000', type: 'text' }
];

const EMPTY_LEAD = { phone: '', whatsAppNumber: '', productCategory: '', quantity: '', destination: '', targetDate: '', estimatedValue: '' };

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);
  // Remember how many messages we last scrolled for, so polling refreshes
  // (which replace the array but usually keep the same count) don't re-scroll.
  const prevMsgCountRef = useRef(0);

  const [leadFlow, setLeadFlow] = useState({ active: false, step: 0, data: EMPTY_LEAD });
  const [leadInput, setLeadInput] = useState('');
  const [creatingLead, setCreatingLead] = useState(false);

  useEffect(() => {
    const savedSessionId = sessionStorage.getItem('chatSessionId');
    if (savedSessionId) {
      loadSessionData(savedSessionId);
    }
  }, []);

  useEffect(() => {
    let intervalId;
    if (isOpen && session?.sessionId) {
      fetchMessages();
      intervalId = setInterval(fetchMessages, 4000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, session]);

  // Auto-scroll ONLY when the number of messages actually grows (a genuinely new
  // message) AND the user is at/near the bottom. Polling that returns the same
  // count will NOT scroll, so reading older messages is never interrupted.
  useEffect(() => {
    const grew = messages.length > prevMsgCountRef.current;
    prevMsgCountRef.current = messages.length;
    if (grew && shouldAutoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 80;
  };

  const resetChat = () => {
    sessionStorage.removeItem('chatSessionId');
    setSession(null);
    setMessages([]);
    setClientName('');
    setClientEmail('');
    setNewMessage('');
    setLeadFlow({ active: false, step: 0, data: { ...EMPTY_LEAD } });
    setLeadInput('');
    setCreatingLead(false);
    shouldAutoScrollRef.current = true;
    prevMsgCountRef.current = 0;
  };

  // Closing the widget clears the session so it always opens fresh next time.
  const handleCloseWidget = () => {
    setIsOpen(false);
    resetChat();
  };

  const loadSessionData = async (sessionId) => {
    try {
      const response = await chatApi.getMessages(sessionId);
      if (response.success) {
        setSession(response.data.session);
        setMessages(response.data.messages || []);
      }
    } catch (error) {
      console.error('Error loading chat session:', error);
      sessionStorage.removeItem('chatSessionId');
    }
  };

  const fetchMessages = async () => {
    if (!session?.sessionId) return;
    try {
      const response = await chatApi.getMessages(session.sessionId);
      if (response.success) {
        setMessages(response.data.messages || []);
      }
    } catch (error) {
      console.error('Error polling chat messages:', error);
    }
  };

  const handleStartChat = async (e) => {
    e.preventDefault();
    if (!clientName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    setLoading(true);
    try {
      const response = await chatApi.initSession(clientName, clientEmail);
      if (response.success) {
        setSession(response.data.session);
        sessionStorage.setItem('chatSessionId', response.data.session.sessionId);
        setMessages(response.data.messages || []);
        shouldAutoScrollRef.current = true;
        prevMsgCountRef.current = 0;
        toast.success('Chat session started');

        // GA4 tracking — chat started
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'chat_started', { method: 'chat_widget' });
        }
      }
    } catch (error) {
      console.error('Error starting chat session:', error);
      toast.error('Failed to initialize chat');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !session?.sessionId) return;
    const msgText = newMessage;
    setNewMessage('');
    shouldAutoScrollRef.current = true;

    const tempMsg = {
      _id: 'temp_' + Date.now(),
      sessionId: session.sessionId,
      sender: 'CLIENT',
      senderName: session.clientName,
      message: msgText,
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      const response = await chatApi.sendMessage(session.sessionId, msgText);
      if (response.success) {
        fetchMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Message delivery failed');
    }
  };

  const handleQuickOptionClick = async (messageText) => {
    if (!session?.sessionId) return;
    shouldAutoScrollRef.current = true;
    try {
      const response = await chatApi.sendMessage(session.sessionId, messageText);
      if (response.success) {
        fetchMessages();
      }
    } catch (error) {
      console.error('Error sending quick option message:', error);
    }
  };

  const startLeadFlow = () => {
    if (!session) return;
    setLeadFlow({ active: true, step: 0, data: { ...EMPTY_LEAD } });
    setLeadInput('');
  };

  const cancelLeadFlow = () => {
    setLeadFlow({ active: false, step: 0, data: { ...EMPTY_LEAD } });
    setLeadInput('');
  };

  const handleLeadStepSubmit = (rawValue) => {
    const step = LEAD_STEPS[leadFlow.step];
    const val = String(rawValue ?? leadInput).trim();

    if (!val) {
      toast.error('Please enter a value to continue');
      return;
    }
    if (step.key === 'phone' || step.key === 'whatsAppNumber') {
      const digits = val.replace(/\D/g, '');
      if (digits.length < 10 && val.length < 7) {
        toast.error('Please enter a valid phone / WhatsApp number');
        return;
      }
    }

    const newData = { ...leadFlow.data, [step.key]: val };
    const nextStep = leadFlow.step + 1;
    setLeadInput('');

    if (nextStep >= LEAD_STEPS.length) {
      submitLead(newData);
    } else {
      setLeadFlow({ active: true, step: nextStep, data: newData });
    }
  };

  const handleLeadInputSubmit = (e) => {
    e.preventDefault();
    handleLeadStepSubmit(leadInput);
  };

  const submitLead = async (finalData) => {
    if (!session) return;
    setCreatingLead(true);
    try {
      const chatLogsText = messages.map(m => `${m.senderName}: ${m.message}`).join("\n");
      const detailsSummary =
        `Lead details — Phone: ${finalData.phone}, WhatsApp: ${finalData.whatsAppNumber || finalData.phone}, ` +
        `Product: ${finalData.productCategory}, Quantity: ${finalData.quantity}, ` +
        `Destination: ${finalData.destination}, Requirement Date: ${finalData.targetDate || 'Immediate'}, ` +
        `Valuation/Budget: ${finalData.estimatedValue || 'Not specified'}`;

      const numericValue = Number((finalData.estimatedValue || '').replace(/[^0-9.]/g, '')) || undefined;

      const response = await leadsApi.createLead({
        customerName: session.clientName,
        email: session.clientEmail || 'chat@example.com',
        phone: finalData.phone,
        whatsAppNumber: finalData.whatsAppNumber || finalData.phone,
        productCategory: finalData.productCategory,
        quantity: finalData.quantity,
        destination: finalData.destination,
        targetDate: finalData.targetDate || undefined,
        leadValue: numericValue,
        chatSummary: chatLogsText ? `${chatLogsText}\n---\n${detailsSummary}` : detailsSummary
      });

      if (response.success) {
        // GA4 tracking — chat lead converted to CRM
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'chat_lead', { method: 'chat_widget' });
        }

        toast.success('CRM Lead generated successfully from this chat!', {
          icon: '🚀',
          style: { borderRadius: '2px', background: '#121D29', color: '#F2F4F7', border: '1px solid rgba(197,203,211,0.2)' }
        });

        // Lead created -> clear this session so the widget starts fresh next time.
        resetChat();
      }
    } catch (error) {
      console.error('Error creating lead from chat:', error);
      toast.error('Failed to create lead.');
      setCreatingLead(false);
    }
  };

  const currentStep = LEAD_STEPS[leadFlow.step];

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 font-sans antialiased">
      <AnimatePresence mode="wait">
        {!isOpen && (
          <motion.button
            key="chat-trigger-btn"
            onClick={() => setIsOpen(true)}
            aria-label="Open support chat"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-center w-14 h-14 bg-[#F2F4F7] text-[#040A12] rounded-full shadow-2xl transition-colors cursor-pointer border border-[#C5CBD3]/20"
          >
            <FiMessageCircle size={24} />
          </motion.button>
        )}

        {isOpen && (
          <motion.div
            key="chat-window-container"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 26 }}
            className="w-[calc(100vw-2rem)] sm:w-96 h-[80vh] max-h-[580px] sm:h-[530px] bg-[#0E1116] rounded-sm shadow-2xl border border-[#C5CBD3]/15 flex flex-col overflow-hidden"
          >
            {/* Header Area using Steel Dark Accents */}
            <div className="bg-[#040A12] text-[#C5CBD3] p-4 flex items-center justify-between border-b border-[#C5CBD3]/10 shrink-0 relative text-left">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  <div className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
                </div>
                <div>
                  <h4 className="font-serif font-normal text-sm tracking-wide uppercase text-[#F2F4F7]">Support Node</h4>
                  <p className="text-[9px] text-[#6D7886] font-mono tracking-widest uppercase font-bold mt-0.5">OPERATIONAL GRID VAULT</p>
                </div>
              </div>
              <div className="flex items-center space-x-1">
                {session && (
                  <button
                    onClick={resetChat}
                    aria-label="Start new chat"
                    title="Start new chat"
                    className="text-[#6D7886] hover:text-[#F2F4F7] p-1.5 rounded-sm hover:bg-[#0E1116] transition-all cursor-pointer"
                  >
                    <FiRefreshCw size={14} />
                  </button>
                )}
                <button
                  onClick={handleCloseWidget}
                  aria-label="Close chat"
                  className="text-[#6D7886] hover:text-[#F2F4F7] p-1.5 rounded-sm hover:bg-[#0E1116] transition-all cursor-pointer"
                >
                  <FiX size={16} />
                </button>
              </div>
            </div>

            {/* Core Chat Stream Area */}
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 p-4 overflow-y-auto bg-[#0E1116] flex flex-col space-y-4 custom-scrollbar"
            >
              {!session ? (
                <form
                  onSubmit={handleStartChat}
                  className="space-y-4 my-auto w-full max-w-sm mx-auto text-left"
                >
                  <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-[#121D29]/40 rounded-sm flex items-center justify-center mx-auto mb-3 border border-[#C5CBD3]/15 shadow-md">
                      <FiMessageCircle size={20} className="text-[#6D7886]" />
                    </div>
                    <h5 className="font-serif font-normal uppercase tracking-wide text-[#F2F4F7] text-base">Initialize Stream</h5>
                    <p className="text-[#6D7886] font-mono text-[9px] uppercase tracking-widest mt-1">Secure Channel Connection</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-[#6D7886] mb-1.5">
                      Full Name Designation *
                    </label>
                    <input
                      type="text"
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-[#040A12] border border-[#C5CBD3]/15 rounded-sm px-3.5 py-2.5 text-xs text-[#F2F4F7] focus:outline-none focus:border-[#F2F4F7]/40 placeholder-[#6D7886] font-light"
                      placeholder="Enter identification name"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-[#6D7886] mb-1.5">
                      Email Coordinate Address <span className="text-[#6D7886]/60 text-[9px] font-normal normal-case font-sans">(Optional)</span>
                    </label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full bg-[#040A12] border border-[#C5CBD3]/15 rounded-sm px-3.5 py-2.5 text-xs text-[#F2F4F7] focus:outline-none focus:border-[#F2F4F7]/40 placeholder-[#6D7886] font-light"
                      placeholder="name@company.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#F2F4F7] text-[#040A12] font-mono font-bold text-[10px] uppercase tracking-widest py-3 rounded-sm cursor-pointer shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-4"
                  >
                    {loading ? 'Establishing Node...' : 'Connect Stream'}
                  </button>
                </form>
              ) : (
                <>
                  {messages.map((msg, index) => {
                    const isClient = msg.sender === 'CLIENT';
                    const isSystem = msg.sender === 'SYSTEM';

                    if (isSystem) {
                      return (
                        <div
                          key={msg._id || index}
                          className="flex justify-center px-2 py-1 shrink-0"
                        >
                          <span className="inline-block bg-[#040A12]/60 text-[9px] font-mono text-[#6D7886] px-3 py-0.5 rounded-sm border border-[#C5CBD3]/10 uppercase tracking-widest text-center">
                            {msg.message}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg._id || index}
                        className={`flex flex-col max-w-[80%] shrink-0 ${isClient ? 'items-end ml-auto' : 'items-start mr-auto'}`}
                      >
                        <span className="text-[9px] font-mono uppercase tracking-widest text-[#6D7886] mb-1 px-1">
                          {isClient ? 'You' : msg.senderName}
                        </span>
                        <div
                          className={`rounded-sm px-3.5 py-2.5 text-xs leading-relaxed shadow-md break-words border text-left ${
                            isClient
                              ? 'bg-[#121D29] border-[#C5CBD3]/25 text-[#F2F4F7] rounded-tr-none'
                              : 'bg-[#040A12] border-[#C5CBD3]/10 text-[#C5CBD3] rounded-tl-none'
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* GUIDED LEAD COLLECTION PANEL (bot asks phone/product/qty/dest) */}
            {session && leadFlow.active && (
              <div className="px-4 py-3 bg-[#040A12] border-t border-[#C5CBD3]/10 space-y-3 shrink-0 text-left">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-mono font-bold text-[#6D7886] uppercase tracking-widest">
                    Enquiry · Step {leadFlow.step + 1} / {LEAD_STEPS.length}
                  </p>
                  <button
                    type="button"
                    onClick={cancelLeadFlow}
                    disabled={creatingLead}
                    className="text-[9px] font-mono uppercase tracking-widest text-[#6D7886] hover:text-[#F2F4F7] transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Cancel
                  </button>
                </div>

                <p className="text-xs text-[#F2F4F7] leading-relaxed">
                  {currentStep.question}
                </p>

                {currentStep.type === 'options' ? (
                  <div className="flex flex-wrap gap-1.5">
                    {PRODUCT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={creatingLead}
                        onClick={() => handleLeadStepSubmit(opt.value)}
                        className="px-2.5 py-1.5 text-[9px] font-mono uppercase bg-[#0E1116] border border-[#C5CBD3]/15 rounded-sm text-[#C5CBD3] hover:border-[#C5CBD3]/40 transition-colors cursor-pointer disabled:opacity-40"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <form onSubmit={handleLeadInputSubmit} className="flex items-center space-x-2">
                    <input
                      type="text"
                      autoFocus
                      value={leadInput}
                      onChange={(e) => setLeadInput(e.target.value)}
                      placeholder={currentStep.placeholder}
                      disabled={creatingLead}
                      className="flex-1 px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/15 focus:border-[#F2F4F7]/40 text-xs rounded-sm outline-none text-[#F2F4F7] placeholder-[#6D7886] font-light font-sans disabled:opacity-40"
                    />
                    <button
                      type="submit"
                      disabled={creatingLead || !leadInput.trim()}
                      className="w-9 h-9 rounded-sm bg-[#F2F4F7] text-[#040A12] hover:bg-[#C5CBD3] disabled:opacity-20 disabled:cursor-not-allowed transition duration-150 shadow-md flex items-center justify-center cursor-pointer shrink-0"
                    >
                      <FiSend size={13} />
                    </button>
                  </form>
                )}

                {creatingLead && (
                  <p className="text-[9px] font-mono uppercase tracking-widest text-[#6D7886]">
                    Generating CRM node...
                  </p>
                )}
              </div>
            )}

            {/* Quick Action Matrix Channels (hidden while collecting a lead) */}
            {session && !leadFlow.active && (
              <div className="px-4 py-3 bg-[#040A12]/40 border-t border-[#C5CBD3]/10 space-y-2 shrink-0 text-left">
                <p className="text-[9px] font-mono font-bold text-[#6D7886] uppercase tracking-widest flex items-center">
                  <FiCornerDownLeft size={10} className="mr-1" />
                  Quick Payload Inquiries
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-[80px] overflow-y-auto custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => handleQuickOptionClick("I want to inquire about Stone Aggregates delivery.")}
                    className="px-2.5 py-1 text-[9px] font-mono uppercase bg-[#0E1116] border border-[#C5CBD3]/15 rounded-sm text-[#C5CBD3] hover:border-[#C5CBD3]/40 transition-colors cursor-pointer"
                  >
                    Stone Manifest
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickOptionClick("I need Coal bulk pricing.")}
                    className="px-2.5 py-1 text-[9px] font-mono uppercase bg-[#0E1116] border border-[#C5CBD3]/15 rounded-sm text-[#C5CBD3] hover:border-[#C5CBD3]/40 transition-colors cursor-pointer"
                  >
                    Coal Volume
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickOptionClick("I need a quote for minerals.")}
                    className="px-2.5 py-1 text-[9px] font-mono uppercase bg-[#0E1116] border border-[#C5CBD3]/15 rounded-sm text-[#C5CBD3] hover:border-[#C5CBD3]/40 transition-colors cursor-pointer"
                  >
                    Minerals Matrix
                  </button>
                  <button
                    type="button"
                    onClick={startLeadFlow}
                    className="px-2.5 py-1 text-[9px] font-mono uppercase bg-[#F2F4F7] text-[#040A12] font-bold rounded-sm hover:bg-[#C5CBD3] transition-colors cursor-pointer shadow-sm"
                  >
                    Request Quote
                  </button>
                  <Link
                    to="/contact"
                    className="px-2.5 py-1 text-[9px] font-mono uppercase bg-[#0E1116] border border-[#C5CBD3]/15 rounded-sm text-[#C5CBD3] hover:border-[#C5CBD3]/40 transition-colors text-center inline-block"
                  >
                    Contact Desk
                  </Link>
                </div>
              </div>
            )}

            {/* Input Form Control Desk (hidden while collecting a lead) */}
            {session && !leadFlow.active && (
              <form onSubmit={handleSendMessage} className="p-3 bg-[#040A12] border-t border-[#C5CBD3]/10 flex items-center space-x-2 shrink-0">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type secure response payload..."
                  className="flex-1 px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/15 focus:border-[#F2F4F7]/40 text-xs rounded-sm outline-none text-[#F2F4F7] placeholder-[#6D7886] font-light font-sans"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-9 h-9 rounded-sm bg-[#F2F4F7] text-[#040A12] hover:bg-[#C5CBD3] disabled:opacity-20 disabled:cursor-not-allowed transition duration-150 shadow-md flex items-center justify-center cursor-pointer shrink-0"
                >
                  <FiSend size={13} />
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}