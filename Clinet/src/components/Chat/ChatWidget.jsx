import React, { useState, useEffect, useRef } from 'react';
import { FiMessageCircle, FiX, FiSend, FiCornerDownLeft } from 'react-icons/fi';
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
          style: { borderRadius: '10px', background: '#333', color: '#fff' }
        });
      }
    } catch (error) {
      console.error('Error creating lead from chat:', error);
      toast.error('Failed to create lead.');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 font-sans antialiased">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open support chat"
          className="flex items-center justify-center w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <FiMessageCircle size={26} />
        </button>
      )}

      {/* Chat Window Container */}
      {isOpen && (
        <div className="w-[calc(100vw-2rem)] sm:w-96 h-[80vh] max-h-[600px] sm:h-[550px] bg-white rounded-2xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">

          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-2.5 h-2.5 bg-green-400 rounded-full"></div>
                <div className="absolute inset-0 w-2.5 h-2.5 bg-green-400 rounded-full animate-ping opacity-75"></div>
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base leading-tight">ITO AI Support</h4>
                <p className="text-[10px] sm:text-xs text-blue-100 font-medium tracking-wide">Grow With ITO</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-all duration-200"
            >
              <FiX size={18} />
            </button>
          </div>

          {/* Chat Logs / Welcome Screen */}
          <div className="flex-1 p-4 overflow-y-auto bg-gradient-to-b from-slate-50 to-white flex flex-col space-y-4 custom-scrollbar">
            {!session ? (
              <form onSubmit={handleStartChat} className="space-y-4 my-auto w-full max-w-sm mx-auto">
                <div className="text-center mb-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                    <FiMessageCircle size={28} className="text-white" />
                  </div>
                  <h5 className="font-bold text-slate-800 text-lg">Welcome! 👋</h5>
                  <p className="text-slate-500 text-xs sm:text-sm mt-1">Let's start our conversation!</p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-sm"
                    placeholder="Enter your name"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    Email Address <span className="text-gray-400 text-[11px] font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-sm"
                    placeholder="name@company.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-2.5 rounded-xl text-sm shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[42px]"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Initializing...</span>
                    </div>
                  ) : (
                    'Start Chat'
                  )}
                </button>
              </form>
            ) : (
              <>
                {messages.map((msg, index) => {
                  const isClient = msg.sender === 'CLIENT';
                  const isSystem = msg.sender === 'SYSTEM';

                  if (isSystem) {
                    return (
                      <div key={msg._id || index} className="flex justify-center px-2 py-1">
                        <span className="inline-block bg-slate-200/80 text-[10px] sm:text-xs text-slate-600 px-3 py-1 rounded-full font-medium text-center">
                          {msg.message}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg._id || index}
                      className={`flex flex-col animate-in slide-in-from-bottom-2 duration-200 max-w-[85%] ${isClient ? 'items-end ml-auto' : 'items-start mr-auto'
                        }`}
                    >
                      <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium mb-0.5 px-1">
                        {isClient ? 'You' : msg.senderName}
                      </span>
                      <div
                        className={`rounded-2xl px-3.5 py-2 text-xs sm:text-sm leading-relaxed shadow-sm break-words w-full ${isClient
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
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

          {/* Quick Actions Panel */}
          {session && (
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 space-y-2 shrink-0">
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center">
                <FiCornerDownLeft size={10} className="mr-1" />
                Quick Actions
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto custom-scrollbar">
                <button
                  type="button"
                  onClick={() => handleQuickOptionClick("I want to inquire about Stone Aggregates delivery.")}
                  className="px-2.5 py-1 text-[10px] bg-white border border-slate-200 rounded-full text-slate-700 hover:bg-slate-100 hover:border-slate-300 active:bg-slate-200 transition-all duration-150"
                >
                  🪨 Stone Aggregates
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickOptionClick("I need Coal bulk pricing.")}
                  className="px-2.5 py-1 text-[10px] bg-white border border-slate-200 rounded-full text-slate-700 hover:bg-slate-100 hover:border-slate-300 active:bg-slate-200 transition-all duration-150"
                >
                  🔥 Coal Bulk
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickOptionClick("I need a quote for minerals.")}
                  className="px-2.5 py-1 text-[10px] bg-white border border-slate-200 rounded-full text-slate-700 hover:bg-slate-100 hover:border-slate-300 active:bg-slate-200 transition-all duration-150"
                >
                  💎 Minerals Quote
                </button>
                <button
                  type="button"
                  onClick={handleCreateCrmLeadFromChat}
                  className="px-2.5 py-1 text-[10px] bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-full text-blue-700 hover:from-blue-100 hover:to-indigo-100 font-semibold transition-all duration-150"
                >
                  🚀 Create CRM Lead
                </button>
                <Link
                  to="/contact"
                  className="px-2.5 py-1 text-[10px] bg-white border border-slate-200 rounded-full text-slate-700 hover:bg-slate-100 hover:border-slate-300 active:bg-slate-200 transition-all duration-150 text-center"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          )}

          {/* Input Form Footer */}
          {session && (
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center space-x-2 shrink-0">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message here..."
                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm transition-all duration-200"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-md flex items-center justify-center min-w-[38px] min-h-[38px]"
              >
                <FiSend size={14} />
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}