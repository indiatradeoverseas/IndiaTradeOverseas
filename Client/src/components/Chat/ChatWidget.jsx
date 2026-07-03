import React, { useState, useEffect, useRef } from 'react';
import { FiMessageCircle, FiX, FiSend, FiCornerDownLeft } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { chatApi } from '../../api/chat';
import { leadsApi } from '../../api/leads';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        toast.success('Chat session started');
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
    try {
      const response = await chatApi.sendMessage(session.sessionId, messageText);
      if (response.success) {
        fetchMessages();
      }
    } catch (error) {
      console.error('Error sending quick option message:', error);
    }
  };

  const handleCreateCrmLeadFromChat = async () => {
    if (!session) return;
    try {
      const chatLogsText = messages.map(m => `${m.senderName}: ${m.message}`).join("\n");
      const response = await leadsApi.createLead({
        customerName: session.clientName,
        email: session.clientEmail || 'chat@example.com',
        phone: '9876543210',
        productCategory: 'STONE',
        quantity: '500 MT',
        destination: 'Kishanganj, Bihar',
        chatSummary: chatLogsText || 'Lead created from support chat widget.'
      });
      if (response.success) {
        toast.success('CRM Lead generated successfully from this chat!', {
          icon: '🚀',
          style: { borderRadius: '6px', background: '#0B2D5B', color: '#FBF7EF', border: '1px solid #C99B38' }
        });
      }
    } catch (error) {
      console.error('Error creating lead from chat:', error);
      toast.error('Failed to create lead.');
    }
  };

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
            className="flex items-center justify-center w-14 h-14 bg-[#0B2D5B] text-[#FBF7EF] border border-[#C99B38]/40 rounded-full shadow-2xl hover:bg-[#0B2D5B]/90 transition-colors"
          >
            <FiMessageCircle size={24} className="text-[#C99B38]" />
          </motion.button>
        )}

        {isOpen && (
          <motion.div
            key="chat-window-container"
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-[calc(100vw-2rem)] sm:w-96 h-[80vh] max-h-[600px] sm:h-[550px] bg-[#FBF7EF] rounded-lg shadow-2xl border border-[#C99B38]/30 flex flex-col overflow-hidden"
          >
            {/* Header Area using Corporate Navy & Gold Accents */}
            <div className="bg-[#0B2D5B] text-[#FBF7EF] p-4 flex items-center justify-between shadow-md shrink-0 relative">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#C99B38]" />
              <div className="flex items-center space-x-3 mt-0.5">
                <div className="relative">
                  <div className="w-2 h-2 bg-[#C99B38] rounded-full"></div>
                  <div className="absolute inset-0 w-2 h-2 bg-[#C99B38] rounded-full animate-ping opacity-75"></div>
                </div>
                <div>
                  <h4 className="font-serif font-semibold text-sm sm:text-base tracking-wide leading-tight text-white">ITO AI Support</h4>
                  <p className="text-[10px] text-[#C99B38] font-medium tracking-widest uppercase">Grow With ITO</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
                className="text-[#FBF7EF]/70 hover:text-white hover:bg-white/10 p-1.5 rounded transition-all duration-200"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Core Chat Stream Backed by Premium Ivory */}
            <div className="flex-1 p-4 overflow-y-auto bg-[#FBF7EF] flex flex-col space-y-4 custom-scrollbar">
              <AnimatePresence initial={false}>
                {!session ? (
                  <motion.form
                    key="chat-init-form"
                    onSubmit={handleStartChat}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4 my-auto w-full max-w-sm mx-auto"
                  >
                    <div className="text-center mb-5">
                      <div className="w-14 h-14 bg-[#0B2D5B] rounded-full flex items-center justify-center mx-auto mb-3 border border-[#C99B38]/30 shadow-md">
                        <FiMessageCircle size={24} className="text-[#C99B38]" />
                      </div>
                      <h5 className="font-serif font-semibold text-[#0B2D5B] text-lg">Welcome</h5>
                      <p className="text-[#0B2D5B]/60 text-xs mt-1">Initiate a secure support conversation</p>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#0B2D5B]/80">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full bg-white border border-[#0B2D5B]/20 rounded px-3 py-2 text-[#0B2D5B] focus:outline-none focus:border-[#C99B38] transition-all text-sm"
                        placeholder="Enter your name"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#0B2D5B]/80">
                        Email Address <span className="text-[#0B2D5B]/40 text-[10px] font-normal normal-case">(Optional)</span>
                      </label>
                      <input
                        type="email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        className="w-full bg-white border border-[#0B2D5B]/20 rounded px-3 py-2 text-[#0B2D5B] focus:outline-none focus:border-[#C99B38] transition-all text-sm"
                        placeholder="name@company.com"
                      />
                    </div>

                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileHover={{ scale: loading ? 1 : 1.01 }}
                      whileTap={{ scale: loading ? 1 : 0.99 }}
                      className="w-full mt-2 bg-[#0B2D5B] text-[#FBF7EF] font-medium tracking-wide py-2.5 rounded border border-transparent hover:border-[#C99B38]/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[42px]"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#FBF7EF] border-t-transparent"></div>
                          <span>Connecting...</span>
                        </div>
                      ) : (
                        'Start Chat'
                      )}
                    </motion.button>
                  </motion.form>
                ) : (
                  <>
                    {messages.map((msg, index) => {
                      const isClient = msg.sender === 'CLIENT';
                      const isSystem = msg.sender === 'SYSTEM';

                      if (isSystem) {
                        return (
                          <motion.div 
                            key={msg._id || index} 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex justify-center px-2 py-1"
                          >
                            <span className="inline-block bg-[#0B2D5B]/5 text-[10px] text-[#0B2D5B]/70 px-3 py-1 rounded border border-[#0B2D5B]/10 font-medium text-center">
                              {msg.message}
                            </span>
                          </motion.div>
                        );
                      }

                      return (
                        <motion.div
                          key={msg._id || index}
                          initial={{ opacity: 0, y: 10, x: isClient ? 10 : -10 }}
                          animate={{ opacity: 1, y: 0, x: 0 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className={`flex flex-col max-w-[85%] ${isClient ? 'items-end ml-auto' : 'items-start mr-auto'}`}
                        >
                          <span className="text-[10px] text-[#0B2D5B]/50 font-medium mb-0.5 px-1">
                            {isClient ? 'You' : msg.senderName}
                          </span>
                          <div
                            className={`rounded px-3.5 py-2 text-xs sm:text-sm leading-relaxed shadow-sm break-words w-full ${
                              isClient
                                ? 'bg-[#0B2D5B] text-[#FBF7EF] border border-transparent'
                                : 'bg-white text-[#0B2D5B] border border-[#0B2D5B]/10'
                            }`}
                          >
                            {msg.message}
                          </div>
                        </motion.div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Quick Action Navigation Buttons */}
            {session && (
              <div className="px-4 py-2.5 bg-white border-t border-[#0B2D5B]/10 space-y-1.5 shrink-0">
                <p className="text-[9px] font-bold text-[#0B2D5B]/60 uppercase tracking-widest flex items-center">
                  <FiCornerDownLeft size={10} className="mr-1 text-[#C99B38]" />
                  Quick Actions
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto custom-scrollbar">
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={() => handleQuickOptionClick("I want to inquire about Stone Aggregates delivery.")}
                    className="px-2.5 py-1 text-[10px] bg-[#FBF7EF] border border-[#0B2D5B]/10 rounded text-[#0B2D5B] hover:border-[#C99B38] transition-colors"
                  >
                    🪨 Stone Aggregates
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={() => handleQuickOptionClick("I need Coal bulk pricing.")}
                    className="px-2.5 py-1 text-[10px] bg-[#FBF7EF] border border-[#0B2D5B]/10 rounded text-[#0B2D5B] hover:border-[#C99B38] transition-colors"
                  >
                    🔥 Coal Bulk
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={() => handleQuickOptionClick("I need a quote for minerals.")}
                    className="px-2.5 py-1 text-[10px] bg-[#FBF7EF] border border-[#0B2D5B]/10 rounded text-[#0B2D5B] hover:border-[#C99B38] transition-colors"
                  >
                    💎 Minerals Quote
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={handleCreateCrmLeadFromChat}
                    className="px-2.5 py-1 text-[10px] bg-[#0B2D5B] border border-transparent rounded text-[#FBF7EF] font-semibold hover:border-[#C99B38]/50 transition-colors"
                  >
                    🚀 Create CRM Lead
                  </motion.button>
                  <Link
                    to="/contact"
                    className="px-2.5 py-1 text-[10px] bg-[#FBF7EF] border border-[#0B2D5B]/10 rounded text-[#0B2D5B] hover:border-[#C99B38] transition-colors text-center inline-block"
                  >
                    Contact Us
                  </Link>
                </div>
              </div>
            )}

            {/* Active Text Input Bar */}
            {session && (
              <form onSubmit={handleSendMessage} className="p-3 bg-[#FBF7EF] border-t border-[#0B2D5B]/10 flex items-center space-x-2 shrink-0">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message here..."
                  className="flex-1 px-3 py-2 bg-white border border-[#0B2D5B]/20 rounded outline-none focus:border-[#C99B38] text-sm transition-all text-[#0B2D5B] placeholder-[#0B2D5B]/30"
                />
                <motion.button
                  type="submit"
                  disabled={!newMessage.trim()}
                  whileHover={{ scale: newMessage.trim() ? 1.05 : 1 }}
                  whileTap={{ scale: newMessage.trim() ? 0.95 : 1 }}
                  className="p-2.5 rounded bg-[#0B2D5B] text-[#FBF7EF] border border-transparent hover:border-[#C99B38]/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center min-w-[38px] min-h-[38px]"
                >
                  <FiSend size={14} className={newMessage.trim() ? "text-[#C99B38]" : "text-white"} />
                </motion.button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}