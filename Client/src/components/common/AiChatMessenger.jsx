import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  FiCpu, FiSend, FiX, FiMinimize2, FiTrash2, FiZap, 
  FiUser, FiMessageSquare, FiRefreshCw, FiHelpCircle, FiCheckCircle,
  FiBriefcase, FiTag, FiAlertTriangle, FiExternalLink, FiChevronRight,
  FiTruck, FiClock, FiCheckSquare, FiLifeBuoy
} from 'react-icons/fi';
import { IoMdChatboxes } from 'react-icons/io';
import { aiApi } from '../../api/aiApi';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const CRM_OPTIONS = [
  {
    icon: FiBriefcase,
    label: 'Job Openings & Hiring',
    query: 'What job vacancies and career opportunities are available?',
    color: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-600/50 shadow-xs font-extrabold'
  },
  {
    icon: FiTag,
    label: 'Product Prices & Rate Cards',
    query: 'What are the official price rates for Stone, Tea, and Rice?',
    color: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-600/50 shadow-xs font-extrabold'
  },
  {
    icon: FiClock,
    label: 'Attendance & Shift Check-In',
    query: 'How do I check in and check out for my attendance shift?',
    color: 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-900 dark:text-sky-200 border-sky-300 dark:border-sky-600/50 shadow-xs font-extrabold'
  },
  {
    icon: FiCheckSquare,
    label: 'Task Rules & Status Updates',
    query: 'What is the procedure for updating task status and attaching files?',
    color: 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-900 dark:text-purple-200 border-purple-300 dark:border-purple-600/50 shadow-xs font-extrabold'
  },
  {
    icon: FiTruck,
    label: 'Dispatch & Logistics Status',
    query: 'How do I track truck dispatches and freight logistics in CRM?',
    color: 'bg-teal-500/10 hover:bg-teal-500/20 text-teal-900 dark:text-teal-200 border-teal-300 dark:border-teal-600/50 shadow-xs font-extrabold'
  },
  {
    icon: FiLifeBuoy,
    label: 'Report an Issue / Support Ticket',
    query: 'How do I create a support ticket or report an issue in CRM?',
    color: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-600/50 shadow-xs font-extrabold'
  }
];

const JOB_RESPONSE = `💼 **India Trade Overseas — Career & Job Opportunities**

We currently have active job openings across multiple company divisions:

• **Sales Executive / Sales Manager:** B2B Client Acquisition & Lead Management.
• **HR Executive / HR Manager:** Staffing, Payroll Audit & Recruitment.
• **Transport & Logistics Supervisor:** Fleet Operations & Dispatch Controls.
• **Finance & Accounts Executive:** Invoicing, GST Audit & Ledger Settlement.
• **Digital Marketing Specialist:** Campaign Management & B2B Lead Gen.

🔗 **Direct Navigation Links:**
- 🌐 [Public Careers Page](/careers) — View detailed job specifications & apply online.
- ⚙️ [CRM Jobs Management Desk](/crm/jobs) — Internal job posting desk.
- 📄 [CRM Candidate Applications](/crm/applications) — Track candidate application pipelines.`;

const PRICE_RESPONSE = `🏷️ **India Trade Overseas — Product Prices & Live Rate Cards**

Here are the official price details and rate cards for our trade divisions:

🪨 **1. Stone Aggregate Division (Bhutan & Pakur)**
• **Pakur Black Stone:** ₹1,410 – ₹2,850 / MT (Location-wise e.g. Kolkata, Siliguri, Patna, Muzaffarpur and payment terms: 100% Advance, 50% Advance, COD).
• **Bhutan White Quartzite & Black Kamji:** ₹1,130 – ₹2,505 / MT (Stone Dust, 10MM, 20MM, 30/40MM, 60MM).
🔗 [Open Stone Division Hub & Rate Card](/stone)

🍵 **2. Prakriti Tea Division (Assam, Darjeeling, Dooars)**
• **Assam Upper Track CTC (BP):** ₹210 / Kg
• **Darjeeling Premium Orthodox (TGFOP1):** ₹420 / Kg
• **Dooars Western CTC (BOP):** ₹165 / Kg
• **Commercial Super Fine Dust:** ₹135 / Kg
• **Packs:** Retail (100g, 250g, 500g) | Trade (1kg, 5kg) | Bulk (20kg–50kg)
🔗 [Open Prakriti Tea Marketplace](/prakriti/tea)

🌾 **3. Rice & Agro Division**
• **Basmati (1121, 1509, Sugandha)** & **Non-Basmati (Parboiled, Swarna, Sona Masoori)** wholesale truckloads and export container rates.
🔗 [Open Rice Division Hub](/prakriti/rice)

📋 **Request Custom Quotation & Catalog:**
• 🔗 [Submit Request For Quote (RFQ)](/quote-request)
• 🌐 [View Full Product Catalog](/products)`;

const DISPATCH_RESPONSE = `🚚 **India Trade Overseas — Dispatch & Logistics Management**

Track truck dispatches, gate passes, and freight movement in real time:

• **Live Transit Dashboard:** View active tipper fleets, multi-axle freight loads, and delivery ETAs.
• **POD (Proof of Delivery):** Upload driver POD receipts and verify delivery confirmation.
• **Freight Telematics:** Track Bhutan & Pakur stone dispatches and tea/rice shipments.

🔗 **Direct Navigation Links:**
- 🚛 [CRM Dispatches Workspace](/crm/dispatches) — Dispatch board & tracking.
- 📦 [Transport Operations Manager](/crm/transport/manager) — Fleet management desk.
- 📱 [Driver Logistics App View](/crm/transport/driver) — Mobile driver portal.`;

const TICKET_RESPONSE = `❓ **India Trade Overseas — Support & Issue Escalation**

If you encounter technical issues, payment mismatches, or require administrative help:

• **Submit Helpdesk Ticket:** Raise an issue ticket with category, priority, and description.
• **HR & Admin Support:** Report attendance disputes, device approval delays, or leave overrides.

🔗 **Direct Navigation Links:**
- 🎫 [CRM Support Tickets Desk](/crm/tickets) — Log and track support tickets.
- 🔒 [CRM Help & Security](/crm/security) — Security and device permissions.`;

const WARNING_RESPONSE = `⚠️ **WARNING: UNRELATED QUERY DETECTED**

This AI Work Assistant is strictly restricted to **India Trade Overseas (ITO)** business operations, CRM tasks, Job openings, and Product price rates.

❌ *Your query is not related to company business or CRM operations.*

Please select one of the valid options above or ask about:
- 💼 **Job Openings & Careers** ([Public Careers](/careers), [CRM Jobs](/crm/jobs))
- 🏷️ **Product Prices & Rate Cards** ([Stone Hub](/stone), [Tea Hub](/prakriti/tea), [Rice Hub](/prakriti/rice))
- ⚡ **CRM Work, Attendance, Tasks, Leads & Freight**`;

const checkQueryIntent = (query) => {
  const q = query.toLowerCase().trim();

  // 1. Check if Job/Career related
  const isJob = /job|career|vacancy|vacancies|hiring|recruit|apply|position|opening|work at ito|naukri/i.test(q);
  if (isJob) return 'JOB';

  // 2. Check if Price/Rate related
  const isPrice = /price|rate|cost|kitna|kitne|dam|daam|rupee|rs|inr|pakur|bhutan|stone price|tea price|rice price|pricing|catalog|quotation|quote|rate card/i.test(q);
  if (isPrice) return 'PRICE';

  // 3. Check if Dispatch/Freight related
  const isDispatch = /dispatch|logistics|freight|truck|tipper|driver|shipment|pod|delivery|cargo/i.test(q);
  if (isDispatch) return 'DISPATCH';

  // 4. Check if Ticket/Support related
  const isTicket = /ticket|support|issue|report|problem|complain|dispute|bug|helpdesk/i.test(q);
  if (isTicket) return 'TICKET';

  // 5. Check if Company / CRM / Business related
  const isCompanyRelated = /ito|india trade|attendance|check in|check-in|checkout|check out|leave|task|crm|lead|dispatch|transport|invoice|payment|employee|manager|founder|product|tea|stone|rice|coal|buyer|distributor|security|ticket|report|client|dashboard|followup|profile|permission|role|prakriti|script|pitch|email|document/i.test(q);
  if (isCompanyRelated) return 'COMPANY_GENERAL';

  // 6. Greeting / Hello queries
  const isGreeting = /^(hi|hello|hey|greetings|good morning|good afternoon|good evening|namaste|help|who are you|what can you do)/i.test(q);
  if (isGreeting) return 'GREETING';

  return 'UNRELATED';
};

export default function AiChatMessenger() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('ito_ai_chat_history');
      if (saved) {
        return JSON.parse(saved).map(msg => ({
          ...msg,
          content: msg.content.replace('India Trade Overseas AI Assistant')
        }));
      }
    } catch (e) {
      console.error('Error loading AI chat history:', e);
    }
    return [
      {
        id: 'welcome-card',
        role: 'assistant',
        isWelcomeCard: true,
        content: `👋 Hello ${user?.fullName || 'Team Member'}! I am **India Trade Overseas AI Assistant**.\nI am here to help you with your daily CRM operations, product rates, job openings, and trade workflows.`,
        timestamp: new Date().toISOString()
      }
    ];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem('ito_ai_chat_history', JSON.stringify(messages.slice(-20)));
    } catch (e) {
      console.error('Error saving chat history:', e);
    }
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (textToSend = null) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: queryText,
      timestamp: new Date().toISOString()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    if (!textToSend) setInput('');

    const intent = checkQueryIntent(queryText);

    if (intent === 'UNRELATED') {
      const warningMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: WARNING_RESPONSE,
        timestamp: new Date().toISOString(),
        isWarning: true
      };
      setMessages(prev => [...prev, warningMsg]);
      return;
    }

    if (intent === 'JOB') {
      const jobMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: JOB_RESPONSE,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, jobMsg]);
      return;
    }

    if (intent === 'PRICE') {
      const priceMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: PRICE_RESPONSE,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, priceMsg]);
      return;
    }

    if (intent === 'DISPATCH') {
      const dispatchMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: DISPATCH_RESPONSE,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, dispatchMsg]);
      return;
    }

    if (intent === 'TICKET') {
      const ticketMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: TICKET_RESPONSE,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, ticketMsg]);
      return;
    }

    // For general company questions / pitch scripts / CRM rules: query NVIDIA AI backend
    setLoading(true);
    try {
      const apiPayload = newMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await aiApi.sendMessage(apiPayload, {
        name: user?.fullName,
        role: user?.role,
        department: user?.department
      });

      if (res.success && res.data?.reply) {
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: res.data.reply,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        toast.error(res.message || 'AI Response failed');
      }
    } catch (error) {
      console.error('AI Messenger Send Error:', error);
      toast.error(error.response?.data?.message || 'Failed to connect to India Trade Overseas AI assistant');
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '⚠️ *Sorry, I encountered a temporary connection issue. Please click retry or ask again.*',
          timestamp: new Date().toISOString(),
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    const initial = [
      {
        id: 'welcome-card',
        role: 'assistant',
        isWelcomeCard: true,
        content: `Chat cleared! 👋 Hello ${user?.fullName || 'Team Member'}! How can I assist you now?`,
        timestamp: new Date().toISOString()
      }
    ];
    setMessages(initial);
    localStorage.removeItem('ito_ai_chat_history');
    toast.success('Chat history cleared');
  };

  // Helper to format markdown formatting (bold, links, bullet points, line breaks)
  const renderFormattedContent = (content, isWarning = false) => {
    if (!content) return null;
    const lines = content.split('\n');

    return lines.map((line, idx) => {
      // Regex for markdown links: [Label](URL)
      const mdLinkRegex = /\[(.*?)\]\((.*?)\)/g;
      const parts = [];
      let lastIdx = 0;
      let match;

      while ((match = mdLinkRegex.exec(line)) !== null) {
        if (match.index > lastIdx) {
          parts.push(line.substring(lastIdx, match.index));
        }
        const label = match[1];
        const url = match[2];
        parts.push(
          <Link
            key={match.index}
            to={url}
            onClick={() => setIsOpen(false)}
            className="inline-flex items-center gap-1 font-extrabold text-emerald-700 dark:text-emerald-300 hover:underline bg-emerald-100 dark:bg-emerald-950 border border-emerald-400 dark:border-emerald-700 px-2 py-0.5 rounded text-[10px] mx-1 my-0.5 transition hover:scale-105"
          >
            {label} <FiExternalLink size={10} />
          </Link>
        );
        lastIdx = mdLinkRegex.lastIndex;
      }

      if (lastIdx < line.length) {
        parts.push(line.substring(lastIdx));
      }

      const lineContent = parts.length > 0 ? parts : line;

      // Handle bold formatting inside remaining text strings
      const renderedParts = Array.isArray(lineContent) ? lineContent.map((part, pIdx) => {
        if (typeof part === 'string') {
          const subParts = part.split(/(\*\*.*?\*\*)/g);
          return subParts.map((sub, sIdx) => {
            if (sub.startsWith('**') && sub.endsWith('**')) {
              return <strong key={sIdx} className={isWarning ? 'font-bold text-rose-600 dark:text-rose-300' : 'font-extrabold text-emerald-700 dark:text-emerald-400'}>{sub.slice(2, -2)}</strong>;
            }
            return sub;
          });
        }
        return part;
      }) : (
        line.split(/(\*\*.*?\*\*)/g).map((sub, sIdx) => {
          if (sub.startsWith('**') && sub.endsWith('**')) {
            return <strong key={sIdx} className={isWarning ? 'font-bold text-rose-600 dark:text-rose-300' : 'font-extrabold text-emerald-700 dark:text-emerald-400'}>{sub.slice(2, -2)}</strong>;
          }
          return sub;
        })
      );

      // Check bullet point
      if (line.trim().startsWith('• ') || line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <li key={idx} className="ml-3 list-disc my-0.5">
            {renderedParts}
          </li>
        );
      }

      return (
        <p key={idx} className={`${line.trim() === '' ? 'h-1.5' : 'my-0.5'}`}>
          {renderedParts}
        </p>
      );
    });
  };

  return (
    <div className="fixed bottom-5 right-5 z-[9999] font-sans">
      {/* FLOATING TRIGGER BUTTON */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="relative group flex items-center gap-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-4 py-3.5 rounded-full shadow-2xl border border-emerald-400/40 cursor-pointer backdrop-blur-md"
          title="Open AI Work Assistant"
        >
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <IoMdChatboxes size={22} className="text-emerald-200 animate-pulse" />
        </motion.button>
      )}

      {/* EXPANDABLE CHAT MODAL */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex flex-col w-[92vw] sm:w-[420px] h-[580px] max-h-[85vh] bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-emerald-500/30 overflow-hidden font-mono"
            style={{ boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25), 0 0 20px rgba(16, 185, 129, 0.15)' }}
          >
            {/* HEADER */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-emerald-600 dark:bg-gradient-to-r dark:from-emerald-900 dark:to-slate-900 text-white border-b border-emerald-500/30 shadow-sm font-mono">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 border border-white/30 rounded-xl text-white shadow-xs">
                  <IoMdChatboxes size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs sm:text-sm font-black text-white tracking-wider uppercase font-mono">ITO AI Assistant</h3>
                  </div>
                  <p className="text-[10px] text-emerald-100 font-bold flex items-center gap-1 font-mono">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Ready for ITO CRM, jobs & rates
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="p-1.5 text-emerald-100 hover:text-white hover:bg-white/20 rounded-lg transition cursor-pointer"
                  title="Clear Conversation"
                >
                  <FiTrash2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-emerald-100 hover:text-white hover:bg-white/20 rounded-lg transition cursor-pointer"
                  title="Minimize AI Chat"
                >
                  <FiMinimize2 size={14} />
                </button>
              </div>
            </div>

            {/* MESSAGES BODY */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs font-mono bg-slate-50/70 dark:bg-slate-950/80">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                        isUser
                          ? 'bg-teal-600 text-white shadow-xs'
                          : msg.isWarning
                          ? 'bg-rose-600 text-white'
                          : 'bg-emerald-600 text-white shadow-xs'
                      }`}
                    >
                      {isUser ? <FiUser size={12} /> : msg.isWarning ? <FiAlertTriangle size={12} /> : <IoMdChatboxes size={12} />}
                    </div>

                    <div className={`max-w-[88%] ${msg.isWelcomeCard ? 'w-full max-w-[90%]' : ''}`}>
                      {msg.isWelcomeCard ? (
                        <div className="space-y-3 w-full font-mono">
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3.5 rounded-2xl text-slate-800 dark:text-slate-100 font-bold leading-relaxed shadow-sm font-mono text-[11px]">
                            {renderFormattedContent(msg.content)}
                          </div>

                          {/* Daburshop-style Options Box */}
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-emerald-500/40 p-3.5 rounded-2xl space-y-3 shadow-md font-mono">
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                              <span className="text-[11px] font-extrabold text-slate-800 dark:text-white font-mono tracking-tight flex items-center gap-1.5 uppercase">
                                <FiHelpCircle className="text-emerald-600 dark:text-emerald-400" size={14} /> How can we assist you today?
                              </span>
                              <span className="text-[9px] font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700 font-mono uppercase">CRM Directives</span>
                            </div>

                            <div className="space-y-2 pt-1 font-mono">
                              {CRM_OPTIONS.map((opt, oIdx) => {
                                const IconComp = opt.icon;
                                return (
                                  <button
                                    key={oIdx}
                                    type="button"
                                    onClick={() => handleSend(opt.query)}
                                    disabled={loading}
                                    className={`w-full p-2.5 rounded-xl border text-left font-mono text-xs font-bold flex items-center justify-between transition-all duration-200 cursor-pointer group shadow-xs hover:scale-[1.01] ${opt.color}`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-current shrink-0 shadow-xs">
                                        <IconComp size={14} />
                                      </div>
                                      <span className="truncate text-xs font-bold text-slate-900 dark:text-white font-mono">{opt.label}</span>
                                    </div>
                                    <FiChevronRight size={15} className="opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition shrink-0" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`p-3 rounded-2xl leading-relaxed text-xs font-mono ${
                            isUser
                              ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-tr-none shadow-md font-bold'
                              : msg.isWarning
                              ? 'bg-rose-50 dark:bg-rose-950 border border-rose-300 dark:border-rose-600 text-rose-900 dark:text-rose-100 rounded-tl-none shadow-sm font-bold'
                              : msg.isError
                              ? 'bg-rose-50 dark:bg-rose-950 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100 rounded-tl-none font-bold'
                              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-none shadow-sm font-bold'
                          }`}
                        >
                          {renderFormattedContent(msg.content, msg.isWarning)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2 text-emerald-400/90 text-[10px] italic p-2 bg-emerald-950/30 border border-emerald-900/30 rounded-xl w-fit">
                  <FiRefreshCw size={12} className="animate-spin text-emerald-400" />
                  <span>India Trade Overseas AI is thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* INPUT FIELD */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask job, price rates, or CRM doubts..."
                disabled={loading}
                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:border-emerald-600 text-slate-900 dark:text-white font-bold text-xs px-3.5 py-2.5 rounded-xl outline-none transition disabled:opacity-50 placeholder:text-slate-400 shadow-inner font-mono"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl transition cursor-pointer disabled:cursor-not-allowed shadow-md font-extrabold border border-emerald-500"
              >
                <FiSend size={14} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
