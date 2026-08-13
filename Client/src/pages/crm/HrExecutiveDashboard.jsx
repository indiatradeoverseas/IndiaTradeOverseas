import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCheckSquare,
  FiCalendar,
  FiList,
  FiClock,
  FiAlertCircle,
  FiUser,
  FiPlus,
  FiTrash2,
  FiInfo,
  FiCheckCircle,
  FiFileText,
  FiShield,
  FiMessageSquare,
  FiAward,
  FiSend
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { ticketsApi } from '../../api/tickets';

// Motion variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.1 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 18 } }
};

export default function HrExecutiveDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('tasks');

  // Shared state (synchronized with HR Manager Dashboard via local storage)
  const [tasks, setTasks] = useState([]);
  const [interviews, setInterviews] = useState([]);

  // Local state - Daily Checklist
  const [checklist, setChecklist] = useState([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  // Local state - Document Telemetry Verification (Local persistence fallback)
  const [documentRegistry, setDocumentRegistry] = useState(() => {
    const defaultRegistry = [
      { employeeId: 'EMP_201', fullName: 'Vikram Aditya', department: 'SALES', aadhaarVerified: false, panVerified: false, bankVerified: false },
      { employeeId: 'EMP_202', fullName: 'Shalini Murthy', department: 'IT', aadhaarVerified: true, panVerified: false, bankVerified: false },
      { employeeId: 'EMP_203', fullName: 'Rajesh Yadav', department: 'TRANSPORT', aadhaarVerified: true, panVerified: true, bankVerified: true }
    ];
    return JSON.parse(localStorage.getItem('hr_documents_telemetry_registry')) || defaultRegistry;
  });

  // Helpdesk Grievance tickets
  const [ticketsList, setTicketsList] = useState([]);
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Selected interview for feedback modal
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [candidateRating, setCandidateRating] = useState(5);
  const [interviewStatus, setInterviewStatus] = useState('PENDING');

  useEffect(() => {
    // Load tasks & interviews
    const storedTasks = JSON.parse(localStorage.getItem('assigned_hr_tasks')) || [];
    const storedInterviews = JSON.parse(localStorage.getItem('scheduled_interviews')) || [];
    setTasks(storedTasks);
    setInterviews(storedInterviews);

    // Load user-specific checklist
    const storedChecklist = JSON.parse(localStorage.getItem(`hr_executive_checklist_${user?.employeeId}`)) || [
      { id: 'item_1', text: 'Audit daily biometric attendance logs', completed: false },
      { id: 'item_2', text: 'Filter new resume submissions from the Careers portal', completed: false },
      { id: 'item_3', text: 'Contact scheduled panel candidates for verification', completed: false },
      { id: 'item_4', text: 'Verify pending documents for newly boarded employees', completed: false },
      { id: 'item_5', text: 'Compile daily recruitment pipeline summaries for Manager review', completed: false }
    ];
    setChecklist(storedChecklist);

    // Load support tickets/grievances
    fetchTickets();
  }, [user]);

  useEffect(() => {
    localStorage.setItem('hr_documents_telemetry_registry', JSON.stringify(documentRegistry));
  }, [documentRegistry]);

  const fetchTickets = async () => {
    try {
      const res = await ticketsApi.getTickets().catch(() => null);
      if (res && res.success) {
        setTicketsList(res.data.tickets || []);
      } else {
        // Fallback mock helpdesk grievances
        const mockTickets = [
          { _id: 't_1', ticketCode: 'GRI-2026-09', title: 'Salary Discrepancy - Leave Deductions', description: 'My salary check for July had an extra day leave deduction though it was approved.', status: 'OPEN', priority: 'HIGH', createdBy: { fullName: 'Sunil Kumar' }, createdAt: new Date(Date.now() - 86400000).toISOString(), comments: [] },
          { _id: 't_2', ticketCode: 'GRI-2026-10', title: 'Policy Doubt - Maternity/Paternity Leave', description: 'Seeking details on paid paternity leave durations for new fathers.', status: 'INVESTIGATING', priority: 'MEDIUM', createdBy: { fullName: 'Neha Sharma' }, createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), comments: [] }
        ];
        setTicketsList(mockTickets);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Synchronize state helpers
  const saveTasks = (newTasks) => {
    setTasks(newTasks);
    localStorage.setItem('assigned_hr_tasks', JSON.stringify(newTasks));
  };

  const saveInterviews = (newInterviews) => {
    setInterviews(newInterviews);
    localStorage.setItem('scheduled_interviews', JSON.stringify(newInterviews));
  };

  const saveChecklist = (newChecklist) => {
    setChecklist(newChecklist);
    localStorage.setItem(`hr_executive_checklist_${user?.employeeId}`, JSON.stringify(newChecklist));
  };

  // Complete tasks
  const handleToggleTaskStatus = (taskId) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const nextStatus = t.status === 'PENDING' ? 'COMPLETED' : 'PENDING';
        toast.success(nextStatus === 'COMPLETED' ? 'Task marked as Completed! 🎉' : 'Task status restored to Pending');
        return { ...t, status: nextStatus };
      }
      return t;
    });
    saveTasks(updated);
  };

  // Checklist items
  const handleToggleChecklist = (id) => {
    const updated = checklist.map(item => {
      if (item.id === id) return { ...item, completed: !item.completed };
      return item;
    });
    saveChecklist(updated);
  };

  const handleAddChecklistItem = (e) => {
    e.preventDefault();
    if (!newChecklistItem.trim()) return;

    const newItem = {
      id: `check_${Date.now()}`,
      text: newChecklistItem.trim(),
      completed: false
    };

    saveChecklist([...checklist, newItem]);
    setNewChecklistItem('');
    toast.success('Checklist operation registered successfully');
  };

  const handleDeleteChecklistItem = (id) => {
    const updated = checklist.filter(item => item.id !== id);
    saveChecklist(updated);
  };

  // Interview actions
  const handleOpenFeedback = (interview) => {
    setSelectedInterview(interview);
    setFeedbackText(interview.feedback || '');
    setCandidateRating(interview.rating || 5);
    setInterviewStatus(interview.status || 'PENDING');
  };

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    if (!feedbackText.trim()) {
      return toast.error('Please enter interview remarks');
    }

    const updated = interviews.map(i => {
      if (i.id === selectedInterview.id) {
        return {
          ...i,
          status: interviewStatus,
          rating: candidateRating,
          feedback: `Rating: ${candidateRating}/10 | ${feedbackText}`
        };
      }
      return i;
    });

    saveInterviews(updated);
    toast.success('Interview outcome and logs saved! 🎙️');
    setSelectedInterview(null);
  };

  // Document Verification Telemetry toggle
  const handleVerifyDocument = (employeeId, field) => {
    const updated = documentRegistry.map(emp => {
      if (emp.employeeId === employeeId) {
        const nextVal = !emp[field];
        toast.success(`${field.replace('Verified', '').toUpperCase()} verification toggled successfully!`);
        return { ...emp, [field]: nextVal };
      }
      return emp;
    });
    setDocumentRegistry(updated);
  };

  // Support Helpdesk Grievance updates
  const handleUpdateTicketStatus = async (ticketId, status) => {
    try {
      const res = await ticketsApi.updateStatus(ticketId, status).catch(() => null);
      if (res && res.success) {
        toast.success(`Grievance status updated to: ${status}`);
        fetchTickets();
      } else {
        setTicketsList(prev => prev.map(t => t._id === ticketId ? { ...t, status } : t));
        toast.success(`Grievance status updated to: ${status} (Local Sandbox)`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update ticket status');
    }
  };

  const handleAddTicketComment = async (e) => {
    e.preventDefault();
    if (!newTicketMessage.trim() || !selectedTicket) return;

    try {
      const res = await ticketsApi.addComment(selectedTicket._id, newTicketMessage).catch(() => null);
      if (res && res.success) {
        toast.success('Comment logged');
        setNewTicketMessage('');
        fetchTickets();
        // Refresh selected ticket view
        setSelectedTicket(prev => ({
          ...prev,
          comments: [...(prev.comments || []), { senderName: user?.fullName || 'HR Executive', message: newTicketMessage, createdAt: new Date().toISOString() }]
        }));
      } else {
        // Fallback local modification
        const updatedMsg = { senderName: user?.fullName || 'HR Executive', message: newTicketMessage, createdAt: new Date().toISOString() };
        setTicketsList(prev => prev.map(t => {
          if (t._id === selectedTicket._id) {
            return { ...t, comments: [...(t.comments || []), updatedMsg] };
          }
          return t;
        }));
        setSelectedTicket(prev => ({
          ...prev,
          comments: [...(prev.comments || []), updatedMsg]
        }));
        setNewTicketMessage('');
        toast.success('Comment logged (Local Sandbox)');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter tasks & interviews for current logged-in employee
  const myTasks = tasks.filter(t => t.assignedTo === user?.employeeId);
  const myInterviews = interviews.filter(i => i.interviewerId === user?.employeeId);

  // Statistics
  const pendingTasksCount = myTasks.filter(t => t.status === 'PENDING').length;
  const pendingInterviewsCount = myInterviews.filter(i => i.status === 'PENDING').length;
  const checklistCompletionRate = checklist.length > 0
    ? Math.round((checklist.filter(item => item.completed).length / checklist.length) * 100)
    : 0;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-8 font-sans antialiased text-[var(--crm-ink-soft)] bg-[var(--crm-bg)] block pb-12 w-full max-w-full overflow-x-hidden"
    >
      {/* Header Panel Option */}
      <motion.div variants={blockVariants} className="w-full border-b border-[var(--crm-line)] py-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="space-y-1 text-left flex-1 min-w-0">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--crm-accent)] font-bold block font-mono">Operations Console</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[var(--crm-heading)] tracking-tight uppercase">HR Executive Dashboard</h1>
          <p className="text-xs text-[var(--crm-ink-faint)] font-light max-w-2xl mt-1">
            Manage your daily tasks, scheduled candidate panels, verify onboarding documents, and resolve internal employee grievances.
          </p>
        </div>
        <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] px-4 py-2 text-[10px] font-mono font-bold text-[var(--crm-heading)] tracking-widest uppercase rounded-sm select-none shrink-0">
          Code // {user?.employeeId} (Executive)
        </div>
      </motion.div>

      {/* Tabs navigation */}
      <motion.div variants={blockVariants} className="border-b border-[var(--crm-line)] flex overflow-x-auto scrollbar-none w-full max-w-full">
        <nav className="flex space-x-6 min-w-max">
          {[
            { id: 'tasks', label: `My Tasks (${pendingTasksCount})`, icon: FiCheckSquare },
            { id: 'interviews', label: `Interview Board (${pendingInterviewsCount})`, icon: FiCalendar },
            { id: 'telemetry', label: 'Documents Telemetry', icon: FiShield },
            { id: 'helpdesk', label: `Helpdesk Grievances (${ticketsList.filter(t => t.status === 'OPEN').length})`, icon: FiMessageSquare },
            { id: 'checklist', label: `Daily Checklist (${checklistCompletionRate}%)`, icon: FiList }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 border-b-2 text-[11px] uppercase tracking-widest font-mono font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-[var(--crm-accent)] text-[var(--crm-heading)]'
                  : 'border-transparent text-[var(--crm-ink-faint)] hover:text-[var(--crm-ink-soft)]'
              }`}
            >
              <tab.icon size={13} className={activeTab === tab.id ? 'text-[var(--crm-accent)]' : 'text-inherit'} />
              {tab.label}
            </button>
          ))}
        </nav>
      </motion.div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="space-y-6 text-left"
        >
          {/* MY TASKS PANEL */}
          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <div className="bg-[var(--crm-bg-raised)]/20 p-4 border border-[var(--crm-line)] rounded-sm flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold">Assigned Tasks ({myTasks.length})</h3>
                  <p className="text-[11px] text-[var(--crm-ink-faint)] font-light mt-1 font-sans">Review operational directives assigned by the HR Manager.</p>
                </div>
              </div>

              {myTasks.length === 0 ? (
                <div className="bg-[var(--crm-bg-raised)]/10 border border-[var(--crm-line)] py-16 rounded-sm text-center text-xs font-mono uppercase text-[var(--crm-ink-faint)]">
                  No active tasks assigned to you.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {myTasks.map((t) => (
                    <div
                      key={t.id}
                      className={`bg-[var(--crm-bg-raised)]/30 border p-5 rounded-sm shadow-xl flex flex-col justify-between transition-all duration-300 ${
                        t.status === 'COMPLETED'
                          ? 'border-[var(--crm-positive)]/25 opacity-75'
                          : 'border-[var(--crm-line)] hover:border-[var(--crm-accent)]/35'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[9px] font-mono font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider">
                            DUE: {new Date(t.dueDate).toLocaleDateString()}
                          </span>
                          <span className={`text-[8px] font-mono font-bold px-2 py-0.5 border rounded-sm ${
                            t.priority === 'HIGH' ? 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border-[var(--crm-danger)]/25' :
                            t.priority === 'LOW' ? 'bg-[var(--crm-info-bg)] text-[var(--crm-info)] border-[var(--crm-info)]/25' :
                            'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/25'
                          }`}>
                            {t.priority}
                          </span>
                        </div>
                        <div>
                          <h4 className={`font-serif text-base font-normal leading-tight text-[var(--crm-heading)] ${
                            t.status === 'COMPLETED' ? 'line-through text-[var(--crm-ink-faint)]' : ''
                          }`}>
                            {t.title}
                          </h4>
                          <p className="text-xs font-light text-[var(--crm-ink-soft)] mt-2 italic">"{t.description}"</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[var(--crm-line)] flex items-center justify-between">
                        <span className="text-[10px] text-[var(--crm-ink-faint)] font-mono">BY: {t.assignedBy}</span>
                        <button
                          onClick={() => handleToggleTaskStatus(t.id)}
                          className={`px-3 py-1 text-[10px] font-mono font-bold uppercase rounded-sm border transition duration-200 cursor-pointer ${
                            t.status === 'COMPLETED'
                              ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20'
                              : 'bg-[var(--crm-bg)] text-[var(--crm-heading)] border-[var(--crm-line)] hover:bg-[var(--crm-bg-raised)]'
                          }`}
                        >
                          {t.status === 'COMPLETED' ? 'COMPLETED' : 'MARK COMPLETED'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* INTERVIEWS PANEL */}
          {activeTab === 'interviews' && (
            <div className="space-y-6">
              <div className="bg-[var(--crm-bg-raised)]/20 p-4 border border-[var(--crm-line)] rounded-sm">
                <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold">Candidate Interview Board ({myInterviews.length})</h3>
                <p className="text-[11px] text-[var(--crm-ink-faint)] font-light mt-1 font-sans">Conduct panels, record outcomes, and submit feedback recommendations.</p>
              </div>

              {myInterviews.length === 0 ? (
                <div className="bg-[var(--crm-bg-raised)]/10 border border-[var(--crm-line)] py-16 rounded-sm text-center text-xs font-mono uppercase text-[var(--crm-ink-faint)]">
                  No panels scheduled for your verification.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myInterviews.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[var(--crm-bg-raised)]/30 border border-[var(--crm-line)] p-5 rounded-sm shadow-xl flex flex-col justify-between hover:border-[var(--crm-accent)]/35 transition-all duration-300"
                    >
                      <div className="space-y-3 text-left">
                        <div className="flex justify-between items-center w-full">
                          <span className="text-[10px] font-mono text-[var(--crm-ink-soft)] bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-2.5 py-0.5 rounded-sm">
                            {item.date} @ {item.time}
                          </span>
                          <span className={`text-[9px] font-bold font-mono px-2 py-0.5 border rounded-sm ${
                            item.status === 'PASSED' || item.status === 'HELD' || item.status === 'COMPLETED' ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20' :
                            item.status === 'FAILED' || item.status === 'CANCELLED' ? 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border-[var(--crm-danger)]/20' :
                            'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/20 animate-pulse'
                          }`}>
                            {item.status}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-serif text-base font-normal text-[var(--crm-heading)]">
                            {item.candidateName}
                          </h4>
                          <p className="text-xs text-[var(--crm-ink-soft)] font-light mt-1">
                            Target Position: <strong className="text-[var(--crm-heading)] font-medium font-mono">{item.position}</strong>
                          </p>
                          <p className="text-[10px] text-[var(--crm-ink-faint)] font-mono mt-0.5">{item.candidateEmail}</p>
                        </div>

                        {item.notes && (
                          <div className="bg-[var(--crm-bg-sunken)]/60 border border-[var(--crm-line)] p-2.5 rounded-sm text-[11px]">
                            <span className="text-[9px] font-mono font-bold text-[var(--crm-ink-faint)] uppercase block">Manager Note:</span>
                            <span className="italic">"{item.notes}"</span>
                          </div>
                        )}

                        {item.feedback && (
                          <div className="bg-[var(--crm-positive-bg)] border border-[var(--crm-positive)]/20 p-2.5 rounded-sm text-[11px] text-[var(--crm-positive)]">
                            <span className="text-[9px] font-mono font-bold uppercase block text-[var(--crm-positive)]/80">Submitted Evaluation:</span>
                            <span>"{item.feedback}"</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-5 pt-3.5 border-t border-[var(--crm-line)]">
                        {item.status === 'PENDING' ? (
                          <button
                            onClick={() => handleOpenFeedback(item)}
                            className="w-full bg-[var(--crm-heading)] hover:bg-[var(--crm-ink-soft)] text-[var(--crm-bg-sunken)] py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition duration-200 cursor-pointer shadow-md text-center"
                          >
                            Conduct & Log Outcome
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenFeedback(item)}
                            className="w-full bg-[var(--crm-bg)] border border-[var(--crm-line)] hover:bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition duration-200 cursor-pointer text-center"
                          >
                            Edit Outcome & Remarks
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DOCUMENTS TELEMETRY PANEL */}
          {activeTab === 'telemetry' && (
            <div className="space-y-6">
              <div className="bg-[var(--crm-bg-raised)]/20 p-4 border border-[var(--crm-line)] rounded-sm">
                <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold">Onboarding Documents Verification Telemetry</h3>
                <p className="text-[11px] text-[var(--crm-ink-faint)] font-light mt-1">Cross-check Aadhaar, PAN, and Bank Account records for validation compliance.</p>
              </div>

              {/* Document Registry Table */}
              <div className="bg-[var(--crm-bg-raised)]/10 rounded-sm border border-[var(--crm-line)] shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[10px] font-mono uppercase border-b border-[var(--crm-line)]">
                        <th className="py-3.5 px-5">Employee Name & ID</th>
                        <th className="py-3.5 px-5">Department</th>
                        <th className="py-3.5 px-5 text-center">Aadhaar Card</th>
                        <th className="py-3.5 px-5 text-center">PAN Card</th>
                        <th className="py-3.5 px-5 text-center">Bank Account details</th>
                        <th className="py-3.5 px-5 text-center">Fulfillment Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--crm-line)] text-xs">
                      {documentRegistry.map((item) => {
                        const allVerified = item.aadhaarVerified && item.panVerified && item.bankVerified;
                        return (
                          <tr key={item.employeeId} className="hover:bg-[var(--crm-bg-raised)]/40 transition-colors">
                            <td className="py-4 px-5">
                              <div className="font-serif text-sm font-semibold text-[var(--crm-heading)]">{item.fullName}</div>
                              <div className="text-[10px] text-[var(--crm-ink-faint)] font-mono">{item.employeeId}</div>
                            </td>
                            <td className="py-4 px-5 font-mono uppercase font-semibold text-[var(--crm-ink-soft)]">{item.department}</td>
                            
                            {/* Aadhaar */}
                            <td className="py-4 px-5 text-center">
                              <button
                                onClick={() => handleVerifyDocument(item.employeeId, 'aadhaarVerified')}
                                className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-sm border transition-all ${
                                  item.aadhaarVerified ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20' : 'bg-transparent text-[var(--crm-ink-faint)] border-[var(--crm-line)]'
                                }`}
                              >
                                {item.aadhaarVerified ? 'Verified' : 'Verify'}
                              </button>
                            </td>

                            {/* PAN */}
                            <td className="py-4 px-5 text-center">
                              <button
                                onClick={() => handleVerifyDocument(item.employeeId, 'panVerified')}
                                className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-sm border transition-all ${
                                  item.panVerified ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20' : 'bg-transparent text-[var(--crm-ink-faint)] border-[var(--crm-line)]'
                                }`}
                              >
                                {item.panVerified ? 'Verified' : 'Verify'}
                              </button>
                            </td>

                            {/* Bank Details */}
                            <td className="py-4 px-5 text-center">
                              <button
                                onClick={() => handleVerifyDocument(item.employeeId, 'bankVerified')}
                                className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-sm border transition-all ${
                                  item.bankVerified ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20' : 'bg-transparent text-[var(--crm-ink-faint)] border-[var(--crm-line)]'
                                }`}
                              >
                                {item.bankVerified ? 'Verified' : 'Verify'}
                              </button>
                            </td>

                            {/* Status badge */}
                            <td className="py-4 px-5 text-center">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase border rounded-sm ${
                                allVerified ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/25' : 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/25'
                              }`}>
                                {allVerified ? <FiCheckCircle size={10} /> : <FiAlertCircle size={10} />}
                                {allVerified ? 'VERIFIED' : 'PENDING'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* HELPDESK TICKETS PANEL */}
          {activeTab === 'helpdesk' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[600px]">
              {/* Ticket Cards side scroll */}
              <div className="lg:col-span-5 border border-[var(--crm-line)] bg-[var(--crm-bg-raised)]/10 p-4 rounded-sm overflow-y-auto custom-scrollbar space-y-2 h-[300px] lg:h-full">
                <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--crm-ink-faint)] font-bold mb-4 border-b border-[var(--crm-line)] pb-1.5 flex justify-between items-center">
                  <span>Open Helpdesk Grievances</span>
                  <FiMessageSquare size={12} className="text-[var(--crm-accent)]" />
                </h3>
                {ticketsList.length === 0 ? (
                  <p className="text-xs text-[var(--crm-ink-faint)] text-center py-12 italic font-mono uppercase">No grievances recorded.</p>
                ) : (
                  ticketsList.map((ticket) => (
                    <button
                      key={ticket._id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`w-full text-left p-4 rounded-sm border transition-all duration-150 flex flex-col gap-2 cursor-pointer ${
                        selectedTicket?._id === ticket._id
                          ? 'bg-[var(--crm-bg-raised)] border-[var(--crm-accent)]/55 text-[var(--crm-heading)] shadow-inner'
                          : 'bg-[var(--crm-bg)]/40 border-[var(--crm-line)] text-[var(--crm-ink-soft)] hover:bg-[var(--crm-bg-raised)]/30'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-serif text-sm font-semibold truncate text-[var(--crm-heading)]">{ticket.title}</span>
                        <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 border rounded-sm uppercase ${
                          ticket.priority === 'HIGH' ? 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border-[var(--crm-danger)]/20' : 'bg-transparent text-[var(--crm-ink-faint)] border-[var(--crm-line)]'
                        }`}>
                          {ticket.priority}
                        </span>
                      </div>
                      <p className="text-[10.5px] font-mono text-[var(--crm-ink-faint)] uppercase">CODE: {ticket.ticketCode} | BY: {ticket.createdBy?.fullName || 'Employee'}</p>
                      <p className="text-xs text-[var(--crm-ink-soft)] line-clamp-2 italic font-light">"{ticket.description}"</p>
                      <div className="flex justify-between items-center w-full mt-2 border-t border-[var(--crm-line)] pt-2 text-[9px] font-mono text-[var(--crm-ink-faint)]">
                        <span className={`px-2 py-0.5 border rounded-sm font-bold uppercase ${
                          ticket.status === 'RESOLVED' ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20' : 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/20'
                        }`}>
                          {ticket.status}
                        </span>
                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Chat Console Grievance */}
              <div className="lg:col-span-7 border border-[var(--crm-line)] bg-[var(--crm-bg-raised)]/20 rounded-sm overflow-hidden flex flex-col h-[450px] lg:h-full shadow-lg">
                {selectedTicket ? (
                  <>
                    <div className="bg-[var(--crm-bg-sunken)] border-b border-[var(--crm-line)] p-4 flex justify-between items-center text-left shrink-0">
                      <div>
                        <h3 className="font-serif text-sm font-semibold text-[var(--crm-heading)] uppercase tracking-wide">
                          {selectedTicket.title}
                        </h3>
                        <p className="text-[10px] text-[var(--crm-ink-faint)] font-mono mt-0.5">
                          CODE: {selectedTicket.ticketCode} | Submitter: {selectedTicket.createdBy?.fullName || 'Employee'}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {selectedTicket.status !== 'RESOLVED' ? (
                          <button
                            onClick={() => handleUpdateTicketStatus(selectedTicket._id, 'RESOLVED')}
                            className="bg-[var(--crm-positive-bg)] border border-[var(--crm-positive)]/35 text-[var(--crm-positive)] hover:bg-[var(--crm-positive)] hover:text-[var(--crm-bg-sunken)] px-3 py-1.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-md"
                          >
                            Resolve Grievance
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateTicketStatus(selectedTicket._id, 'OPEN')}
                            className="bg-[var(--crm-warning-bg)] border border-[var(--crm-warning)]/35 text-[var(--crm-warning)] hover:bg-[var(--crm-warning)] hover:text-[var(--crm-bg-sunken)] px-3 py-1.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-md"
                          >
                            Reopen
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Chat Description & Comments */}
                    <div className="flex-1 p-6 overflow-y-auto space-y-4 flex flex-col bg-[var(--crm-bg-sunken)]/20 custom-scrollbar">
                      {/* Original description card */}
                      <div className="bg-[var(--crm-bg)]/60 border border-[var(--crm-line)] p-4 rounded-sm text-left space-y-1.5">
                        <span className="text-[9px] font-mono font-bold text-[var(--crm-ink-faint)] uppercase block">Original Description</span>
                        <p className="text-xs text-[var(--crm-ink-soft)] font-light leading-relaxed">
                          "{selectedTicket.description}"
                        </p>
                      </div>

                      {/* Comments feed */}
                      {selectedTicket.comments && selectedTicket.comments.map((comment, idx) => (
                        <div key={idx} className="flex flex-col items-start animate-fadeIn">
                          <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--crm-ink-faint)] mb-1 px-1">
                            {comment.senderName}
                          </span>
                          <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] text-xs text-left p-3.5 rounded-sm max-w-[80%] leading-relaxed shadow-sm">
                            {comment.message}
                          </div>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleAddTicketComment} className="p-4 bg-[var(--crm-bg-sunken)] border-t border-[var(--crm-line)] flex items-center space-x-3 shrink-0">
                      <input
                        type="text"
                        value={newTicketMessage}
                        onChange={(e) => setNewTicketMessage(e.target.value)}
                        placeholder="Type response logs or policy recommendations..."
                        className="flex-1 px-4 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] text-xs rounded-sm outline-none text-[var(--crm-heading)] placeholder-[var(--crm-ink-faint)]"
                      />
                      <button
                        type="submit"
                        disabled={!newTicketMessage.trim()}
                        className="p-2.5 rounded-sm bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)] hover:bg-[var(--crm-ink-soft)] disabled:opacity-20 disabled:cursor-not-allowed transition duration-150 shadow-md cursor-pointer"
                      >
                        <FiSend size={14} />
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                    <FiMessageSquare size={36} className="mb-3 text-[var(--crm-ink-faint)] opacity-60" />
                    <p className="text-[10px] font-mono uppercase tracking-widest font-medium text-[var(--crm-ink-faint)]">Select a grievance case thread to review.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CHECKLIST PANEL */}
          {activeTab === 'checklist' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Daily Checklist Tracker */}
              <div className="lg:col-span-8 border border-[var(--crm-line)] rounded-sm p-6 bg-[var(--crm-bg-raised)]/10 shadow-md">
                <div className="flex justify-between items-center mb-4 border-b border-[var(--crm-line)] pb-2.5">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--crm-ink-faint)] font-bold flex items-center gap-1.5">
                    <FiList className="text-[var(--crm-accent)]" /> Daily Operational Protocol
                  </h3>
                  <span className="text-[10px] font-mono text-[var(--crm-accent)] bg-[var(--crm-accent-bg)] border border-[var(--crm-accent)]/20 px-2 py-0.5 rounded-sm">
                    {checklistCompletionRate}% COMPLETED
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1 bg-[var(--crm-bg-sunken)] rounded-full mb-6 overflow-hidden">
                  <div
                    className="h-full bg-[var(--crm-accent)] transition-all duration-300"
                    style={{ width: `${checklistCompletionRate}%` }}
                  />
                </div>

                {checklist.length === 0 ? (
                  <p className="py-12 text-center text-xs text-[var(--crm-ink-faint)] font-mono uppercase">Your daily checklist is empty.</p>
                ) : (
                  <div className="space-y-3">
                    {checklist.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3.5 bg-[var(--crm-bg-sunken)]/60 border border-[var(--crm-line)] rounded-sm hover:border-[var(--crm-accent)]/30 transition-colors"
                      >
                        <label className="flex items-center gap-3 cursor-pointer select-none text-xs text-left w-full mr-2">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => handleToggleChecklist(item.id)}
                            className="rounded-sm border-[var(--crm-line)] text-[var(--crm-bg-raised)] w-4 h-4 cursor-pointer accent-[var(--crm-accent)] shrink-0"
                          />
                          <span className={`${item.completed ? 'line-through text-[var(--crm-ink-faint)]' : 'text-[var(--crm-heading)] font-light'}`}>
                            {item.text}
                          </span>
                        </label>
                        <button
                          onClick={() => handleDeleteChecklistItem(item.id)}
                          className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-danger)] p-1 shrink-0 transition-colors"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add checklist item */}
              <div className="lg:col-span-4 border border-[var(--crm-line)] rounded-sm p-6 bg-[var(--crm-bg-raised)]/10 shadow-md h-fit">
                <h3 className="text-xs font-mono uppercase tracking-widest text-[var(--crm-ink-faint)] mb-4 font-bold border-b border-[var(--crm-line)] pb-2 flex items-center gap-1.5">
                  <FiPlus className="text-[var(--crm-accent)]" /> Add Daily Protocol Item
                </h3>
                <form onSubmit={handleAddChecklistItem} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Protocol Description *</label>
                    <textarea
                      required
                      rows={3}
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      placeholder="e.g. Schedule follow-ups for junior designer candidates..."
                      className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-xs outline-none resize-none text-[var(--crm-heading)] font-sans"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[var(--crm-heading)] hover:bg-[var(--crm-ink-soft)] text-[var(--crm-bg-sunken)] py-2 text-xs font-bold uppercase tracking-wider rounded-sm transition duration-200 cursor-pointer shadow-md"
                  >
                    Add Protocol
                  </button>
                </form>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* FEEDBACK & OUTCOME MODAL */}
      {selectedInterview && (
        <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-center justify-center z-[70] p-4">
          <div className="bg-[var(--crm-bg-raised)] rounded-sm p-6 w-full max-w-md border border-[var(--crm-line)] shadow-2xl text-left overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[var(--crm-line)]">
              <div>
                <h2 className="font-serif text-lg text-[var(--crm-heading)] uppercase tracking-wide">Record Interview Outcome</h2>
                <p className="text-[10px] text-[var(--crm-ink-faint)] font-mono mt-0.5">CANDIDATE: {selectedInterview.candidateName}</p>
              </div>
              <button onClick={() => setSelectedInterview(null)} className="text-[var(--crm-ink-faint)] hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleFeedbackSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Interview Outcome Status *</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setInterviewStatus('PASSED')}
                    className={`flex-1 py-2 rounded-sm text-xs font-mono font-bold uppercase transition duration-150 border cursor-pointer ${
                      interviewStatus === 'PASSED'
                        ? 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/50 shadow-md'
                        : 'bg-transparent text-[var(--crm-ink-faint)] border-[var(--crm-line)] hover:border-white hover:text-white'
                    }`}
                  >
                    Pass
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterviewStatus('FAILED')}
                    className={`flex-1 py-2 rounded-sm text-xs font-mono font-bold uppercase transition duration-150 border cursor-pointer ${
                      interviewStatus === 'FAILED'
                        ? 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border-[var(--crm-danger)]/50 shadow-md'
                        : 'bg-transparent text-[var(--crm-ink-faint)] border-[var(--crm-line)] hover:border-white hover:text-white'
                    }`}
                  >
                    Fail
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterviewStatus('PENDING')}
                    className={`flex-1 py-2 rounded-sm text-xs font-mono font-bold uppercase transition duration-150 border cursor-pointer ${
                      interviewStatus === 'PENDING'
                        ? 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/50 shadow-md'
                        : 'bg-transparent text-[var(--crm-ink-faint)] border-[var(--crm-line)] hover:border-white hover:text-white'
                    }`}
                  >
                    Pending
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Candidate Rating (1-10 Scale) *</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={candidateRating}
                    onChange={(e) => setCandidateRating(Number(e.target.value))}
                    className="w-full accent-[var(--crm-accent)] cursor-pointer h-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] rounded-full appearance-none"
                  />
                  <span className="font-mono text-base font-bold text-[var(--crm-accent)] shrink-0 border border-[var(--crm-line)] bg-[var(--crm-bg)] px-2.5 py-1 rounded-sm min-w-[42px] text-center">
                    {candidateRating}/10
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Candidate Remarks & Evaluation *</label>
                <textarea
                  required
                  rows={4}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Record evaluation logs, technical ratings, soft skills performance, and recommendations..."
                  className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-accent)]/55 rounded-sm text-xs outline-none resize-none text-[var(--crm-heading)] font-sans"
                />
              </div>
              <div className="flex space-x-3 pt-3 border-t border-[var(--crm-line)]">
                <button type="submit" className="flex-1 py-2.5 bg-[var(--crm-accent)] text-[var(--crm-bg-sunken)] hover:bg-[var(--crm-accent-soft)] rounded-sm font-bold uppercase tracking-wider transition-colors cursor-pointer">
                  Save Logs
                </button>
                <button type="button" onClick={() => setSelectedInterview(null)} className="flex-1 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] hover:bg-[var(--crm-bg-raised)] rounded-sm text-[var(--crm-ink-soft)] font-bold uppercase tracking-wider transition-colors cursor-pointer">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}