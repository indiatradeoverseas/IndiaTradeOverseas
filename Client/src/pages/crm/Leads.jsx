import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { leadsApi } from '../../api/leads';
import { adminApi } from '../../api/admin';
import { employeesApi } from '../../api/employees';
import { taskApi } from '../../api/task';
import { salesTrialApi } from '../../api/salesTrialApi';
import SalesCalculatorModal from '../../components/crm/SalesCalculatorModal';
import { DownloadButton } from '../../components/ui/AnimatedActionButton';
import {
  FiPlus, FiSearch, FiEye, FiFilter, FiDownload,
  FiClock, FiX, FiList, FiColumns, FiMessageSquare, FiMail, FiPhoneCall, FiPhoneOff, FiPhoneMissed,
  FiUpload, FiFileText, FiAlertCircle, FiMic, FiZap, FiUser, FiUserCheck, FiUsers, FiCalendar, FiTrash2,
  FiImage, FiEdit, FiRotateCw, FiSun, FiCrop, FiCheck
} from 'react-icons/fi';
import { BsCalculator } from 'react-icons/bs';
import { useAuth } from '../../hooks/useAuth';
import { API_URL, getFileUrl } from '../../config/env';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import CallRecordingModal from '../../components/crm/CallRecordingModal';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

// Staggered animation configurations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.02, delayChildren: 0.1 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 120, damping: 20 } }
};

const LEAD_FIELDS = [
  { value: 'customerName', label: 'Consignee Name *' },
  { value: 'phone', label: 'Phone Number *' },
  { value: 'whatsAppNumber', label: 'WhatsApp Number' },
  { value: 'productCategory', label: 'Product Category *' },
  { value: 'companyName', label: 'Company Name' },
  { value: 'email', label: 'Email Address' },
  { value: 'leadValue', label: 'Lead Value (INR)' },
  { value: 'country', label: 'Country' },
  { value: 'targetDate', label: 'Requirement / Last Update Date' },
  { value: 'priority', label: 'Priority / Temp (HOT/WARM/COLD)' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'destination', label: 'Destination' },
  { value: 'chatSummary', label: 'Executive Discussion / Notes' },
  { value: 'remarks', label: 'Remarks / Internal Notes' }
];

export default function Leads() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('ALL'); // 'ALL' | 'MY' | 'UNASSIGNED' | 'ASSIGNED' | [id]
  const [filterCategory, setFilterCategory] = useState('ALL'); // 'ALL' | 'TEA' | 'RICE' | 'STONE' | 'COAL' | 'TRANSPORT'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [leadTab, setLeadTab] = useState('ACTIVE'); // 'ACTIVE' | 'COMPLETED' | 'WORKLOAD' | 'ALL'
  const [filterPriority, setFilterPriority] = useState('ALL'); // 'ALL' | 'HOT' | 'WARM' | 'COLD'
  const [showAnalyticsGraph, setShowAnalyticsGraph] = useState(true);
  const [graphViewMode, setGraphViewMode] = useState('BAR'); // 'BAR' | 'PIE' | 'ALL'

  const pipelineAnalytics = useMemo(() => {
    const totalLeads = leads.length;
    let totalGrossValue = 0;
    let totalWonValue = 0;
    let totalLostValue = 0;
    let activeValue = 0;

    let wonCount = 0;
    let lostCount = 0;
    let activeCount = 0;
    let newLeadCount = 0;
    let inDiscussionCount = 0;

    const categoryTotals = {};

    leads.forEach(l => {
      const val = Number(l.leadValue) || 0;
      const st = String(l.stage || '').toUpperCase();
      const cat = String(l.productCategory || 'Uncategorized').toUpperCase();

      totalGrossValue += val;

      if (['CLOSED_WON', 'DEAL_WON', 'ORDER_CONFIRMED', 'DISPATCH_PENDING', 'DISPATCH_PLANNED', 'PAYMENT_PENDING', 'DOCUMENT_PENDING', 'COMPLETED'].includes(st)) {
        wonCount++;
        totalWonValue += val;
      } else if (['CLOSED_LOST', 'DEAD', 'LOST', 'CANCELLED', 'EXPIRED'].includes(st)) {
        lostCount++;
        totalLostValue += val;
      } else {
        activeCount++;
        activeValue += val;
        if (st.includes('NEW')) newLeadCount++;
        else inDiscussionCount++;
      }

      if (!categoryTotals[cat]) {
        categoryTotals[cat] = { name: cat, count: 0, value: 0 };
      }
      categoryTotals[cat].count += 1;
      categoryTotals[cat].value += val;
    });

    const conversionRate = totalLeads > 0 ? Math.round((wonCount / totalLeads) * 100) : 0;

    const stageChartData = [
      { name: 'New Lead', count: newLeadCount, value: leads.filter(l => (l.stage || '').toUpperCase().includes('NEW')).reduce((s, x) => s + Number(x.leadValue || 0), 0), fill: '#06b6d4' },
      { name: 'In Discussion', count: inDiscussionCount, value: leads.filter(l => !(l.stage || '').toUpperCase().includes('NEW') && !['CLOSED_WON', 'DEAL_WON', 'ORDER_CONFIRMED', 'CLOSED_LOST', 'DEAD', 'LOST'].includes((l.stage || '').toUpperCase())).reduce((s, x) => s + Number(x.leadValue || 0), 0), fill: '#6366f1' },
      { name: 'Deals Won', count: wonCount, value: totalWonValue, fill: '#10b981' },
      { name: 'Lost/Dead', count: lostCount, value: totalLostValue, fill: '#f43f5e' }
    ];

    const categoryChartData = Object.values(categoryTotals).map(c => ({
      name: c.name,
      value: c.value,
      count: c.count
    }));

    return {
      totalLeads,
      totalGrossValue,
      totalWonValue,
      totalLostValue,
      activeValue,
      activeCount,
      wonCount,
      lostCount,
      conversionRate,
      pendingRemindersCount: reminders.length,
      stageChartData,
      categoryChartData
    };
  }, [leads, reminders]);

  const { duplicateLeadIds, duplicateLeadDetails } = useMemo(() => {
    const dupIds = new Set();
    const dupDetails = new Map();

    const phoneMap = new Map();
    const emailMap = new Map();
    const nameCompMap = new Map();

    (leads || []).forEach(l => {
      if (!l) return;
      const lId = String(l._id || '');

      if (l.duplicateOf) {
        dupIds.add(lId);
        dupDetails.set(lId, 'Flagged in database as duplicate lead');
      }

      // Phone matching
      const rawPhone = (l.phone || l.phoneMasked || '').replace(/\D/g, '');
      if (rawPhone.length >= 7) {
        const pKey = rawPhone.slice(-10);
        if (!phoneMap.has(pKey)) phoneMap.set(pKey, []);
        phoneMap.get(pKey).push(l);
      }

      // Email matching
      const rawEmail = (l.email || l.emailMasked || '').trim().toLowerCase();
      if (rawEmail && !rawEmail.includes('indiatradeoverseas.com') && rawEmail.includes('@')) {
        if (!emailMap.has(rawEmail)) emailMap.set(rawEmail, []);
        emailMap.get(rawEmail).push(l);
      }

      // Consignee + Company name matching
      const cName = (l.customerName || '').trim().toLowerCase();
      const compName = (l.companyName || '').trim().toLowerCase();
      if (cName.length > 2 && compName.length > 2) {
        const ncKey = `${cName}|${compName}`;
        if (!nameCompMap.has(ncKey)) nameCompMap.set(ncKey, []);
        nameCompMap.get(ncKey).push(l);
      }
    });

    const registerDuplicates = (groupMap, matchType) => {
      groupMap.forEach((group) => {
        if (group.length > 1) {
          group.forEach((lead) => {
            const id = String(lead._id);
            dupIds.add(id);
            const existingReason = dupDetails.get(id);
            const otherLead = group.find(g => String(g._id) !== id);
            const otherCode = otherLead?.leadCode || otherLead?.customerName || 'another lead';
            const reason = `Matches ${matchType} with ${otherCode}`;
            dupDetails.set(id, existingReason ? `${existingReason}, ${reason}` : reason);
          });
        }
      });
    };

    registerDuplicates(phoneMap, 'phone number');
    registerDuplicates(emailMap, 'email address');
    registerDuplicates(nameCompMap, 'consignee & company name');

    return { duplicateLeadIds: dupIds, duplicateLeadDetails: dupDetails };
  }, [leads]);


  const isAssignedToMe = (lead) => {
    if (!user || !lead || !lead.assignedTo) return false;
    const assigned = lead.assignedTo;
    const assignedId = (typeof assigned === 'object' && assigned !== null) ? String(assigned._id || '') : String(assigned || '');
    const myId = String(user._id || '');
    const myEmpId = user.employeeDbId ? String(user.employeeDbId) : '';
    const myEmail = user.email ? user.email.toLowerCase() : '';
    const assignedEmail = (typeof assigned === 'object' && assigned !== null && assigned.email) ? assigned.email.toLowerCase() : '';

    return (
      (assignedId && (assignedId === myId || (myEmpId && assignedId === myEmpId))) ||
      (assignedEmail && myEmail && assignedEmail === myEmail)
    );
  };

  const isUnassigned = (lead) => {
    if (!lead || !lead.assignedTo) return true;
    const assigned = lead.assignedTo;
    if (typeof assigned === 'object' && assigned !== null) {
      const name = assigned.fullName || assigned.name || assigned.email || assigned.employeeId || (assigned._id ? String(assigned._id) : '');
      if (!name || String(name).toLowerCase() === 'unassigned' || String(name).trim() === '') return true;
      return false;
    }
    if (typeof assigned === 'string') {
      const s = assigned.trim().toLowerCase();
      if (!s || s === 'unassigned' || s === 'null' || s === 'undefined') return true;
      return false;
    }
    return true;
  };

  const getLeadValuationDisplay = (lead) => {
    if (!lead) return '—';
    if (lead.leadValue && Number(lead.leadValue) > 0) {
      return `₹${Number(lead.leadValue).toLocaleString('en-IN')}`;
    }
    if (lead.estimatedValue && String(lead.estimatedValue).trim().length > 0) {
      return String(lead.estimatedValue).trim();
    }
    const text = lead.chatSummary || lead.remarks || '';
    if (text) {
      const match = text.match(/(?:Valuation|Budget|Value|Valuation\/Budget)[^\n:]*[:—]\s*([^\n,]+)/i);
      if (match && match[1] && match[1].trim() !== 'Not specified') {
        return match[1].trim();
      }
    }
    return '—';
  };

  // Toggle between Table and Visual Kanban Board
  const [viewMode, setViewMode] = useState('TABLE'); // 'TABLE' | 'KANBAN'

  // Excel / CSV Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [columnMappings, setColumnMappings] = useState({});
  const [importDefaultPriority, setImportDefaultPriority] = useState('ALL');
  const [importing, setImporting] = useState(false);

  // Image Upload & Editing State
  const [uploadedImage, setUploadedImage] = useState(null); // { file, dataUrl, name }
  const [imageEditMode, setImageEditMode] = useState(false);
  const [imageRotation, setImageRotation] = useState(0);
  const [imageBrightness, setImageBrightness] = useState(100);
  const [imageContrast, setImageContrast] = useState(100);
  const [deletedRowIndices, setDeletedRowIndices] = useState(new Set());
  const [deletedColIndices, setDeletedColIndices] = useState(new Set());
  const imageCanvasRef = useRef(null);
  const imagePreviewRef = useRef(null);

  // Call Recording & Sales Calculator Modal State
  const [showCallModal, setShowCallModal] = useState(false);
  const [showSalesCalc, setShowSalesCalc] = useState(false);

  // Call Outcome Disposition & Multi-Call History Modal State
  const [callLogModalOpen, setCallLogModalOpen] = useState(false);
  const [callTargetLead, setCallTargetLead] = useState(null);
  const [callOutcomeSelect, setCallOutcomeSelect] = useState('CONNECTED');
  const [callNotesInput, setCallNotesInput] = useState('');
  const [callNextFollowupInput, setCallNextFollowupInput] = useState('');
  const [callSubmitting, setCallSubmitting] = useState(false);
  const [callHistoryList, setCallHistoryList] = useState([]);

  const openCallLogModal = async (lead) => {
    setCallTargetLead(lead);
    setCallOutcomeSelect(lead.lastCallOutcome || 'CONNECTED');
    setCallNotesInput(lead.chatSummary || lead.remarks || '');
    setCallNextFollowupInput(lead.nextFollowupAt ? new Date(lead.nextFollowupAt).toISOString().split('T')[0] : '');
    setCallHistoryList([]);
    setCallLogModalOpen(true);

    try {
      const res = await leadsApi.getLeadById(lead._id);
      if (res?.success && res?.data?.activities) {
        setCallHistoryList(res.data.activities || []);
      } else if (res?.activities) {
        setCallHistoryList(res.activities || []);
      }
    } catch (err) {
      console.warn('Notice fetching call history activities:', err.message);
    }
  };

  const handleLogCallSubmit = async (e) => {
    e.preventDefault();
    if (!callTargetLead) return;

    setCallSubmitting(true);
    try {
      const res = await leadsApi.logCallOutcome(callTargetLead._id, {
        callOutcome: callOutcomeSelect,
        notes: callNotesInput,
        nextFollowupAt: callNextFollowupInput
      });

      if (res?.success || res) {
        toast.success(`Call logged as ${callOutcomeSelect}! 📞`);
        setCallLogModalOpen(false);
        setCallTargetLead(null);
        fetchLeads();
      }
    } catch (err) {
      console.error('Call logging error:', err);
      toast.error(err.response?.data?.message || 'Failed to log call outcome');
    } finally {
      setCallSubmitting(false);
    }
  };

  // Calendar Date Filtering & LOI State
  const [dateFilterMode, setDateFilterMode] = useState('ALL'); // 'ALL' | 'TODAY' | 'YESTERDAY' | 'PICK_DATE'
  const [selectedDate, setSelectedDate] = useState('');

  const [showLOIModal, setShowLOIModal] = useState(false);
  const [loiTargetLeadId, setLoiTargetLeadId] = useState('');
  const [loiFile, setLoiFile] = useState(null);
  const [loiNotes, setLoiNotes] = useState('');
  const [uploadingLOI, setUploadingLOI] = useState(false);

  const toLocalDateStr = (d) => {
    if (!d) return null;
    const date = new Date(d);
    if (isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getFilteredByDate = (items = []) => {
    if (dateFilterMode === 'ALL') return items;

    const todayStr = toLocalDateStr(new Date());
    const yestDate = new Date();
    yestDate.setDate(yestDate.getDate() - 1);
    const yesterdayStr = toLocalDateStr(yestDate);

    let targetDateStr = '';
    if (dateFilterMode === 'TODAY') targetDateStr = todayStr;
    else if (dateFilterMode === 'YESTERDAY') targetDateStr = yesterdayStr;
    else if (dateFilterMode === 'PICK_DATE' && selectedDate) targetDateStr = selectedDate;

    if (!targetDateStr) return items;

    return items.filter(item => {
      const createdStr = toLocalDateStr(item.createdAt || item.date || item.uploadedAt);
      const updatedStr = toLocalDateStr(item.updatedAt || item.assignedAt);
      const targetStr = toLocalDateStr(item.targetDate);
      const followupStr = toLocalDateStr(item.nextFollowupAt);

      return (
        createdStr === targetDateStr ||
        updatedStr === targetDateStr ||
        targetStr === targetDateStr ||
        followupStr === targetDateStr
      );
    });
  };

  const handleLOISubmit = async (e) => {
    e.preventDefault();
    if (!loiTargetLeadId) {
      toast.error('Please select a lead for the LOI document');
      return;
    }
    if (!loiFile) {
      toast.error('Please select an LOI document file');
      return;
    }

    setUploadingLOI(true);
    try {
      const formData = new FormData();
      formData.append('file', loiFile);
      if (loiNotes) formData.append('notes', loiNotes);

      const res = await leadsApi.uploadLOIDocument(loiTargetLeadId, formData);
      if (res.success) {
        toast.success('LOI Document uploaded & saved to Google Drive!');
        setShowLOIModal(false);
        setLoiFile(null);
        setLoiNotes('');
        setLoiTargetLeadId('');
        fetchLeads();
      } else {
        toast.error(res.message || 'LOI upload failed');
      }
    } catch (err) {
      console.error('LOI upload error:', err);
      toast.error(err.response?.data?.message || 'Failed to upload LOI document');
    } finally {
      setUploadingLOI(false);
    }
  };

  // Bulk Assignment State
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [executives, setExecutives] = useState([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [assigningBulk, setAssigningBulk] = useState(false);

  const [newLead, setNewLead] = useState({
    customerName: '',
    phone: '',
    productCategory: 'STONE',
    companyName: '',
    country: '',
    whatsAppNumber: '',
    email: '',
    quantity: '',
    destination: '',
    targetDate: '',
    leadValue: '',
    assignedTo: '',
    source: 'MANUAL'
  });

  const stages = [
    'NEW_LEAD', 'ASSIGNED', 'CONTACTED', 'LEAD_QUALIFICATION', 'FOLLOW_UP', 
    'REQUIREMENT_CAPTURED', 'REQUIREMENT_RECEIVED', 'QUOTATION_REQUIRED', 
    'QUOTATION_SENT', 'QUOTATION_APPROVED', 'NEGOTIATION', 'SAMPLE_SENT', 
    'PRICE_DISCUSSION', 'PAYMENT_DISCUSSION', 'PO_RECEIVED', 'ORDER_CONFIRMED', 
    'DISPATCH_PENDING', 'PAYMENT_PENDING', 'CLOSED_WON', 'CLOSED_LOST'
  ];

  const isManagerOrAdmin = 
    ['ADMIN', 'MANAGER', 'SALES_MANAGER', 'HR_MANAGER', 'FOUNDER', 'CEO', 'SUPER_ADMIN', 'CO_FOUNDER'].includes((user?.role || '').toUpperCase()) ||
    (user?.role && user.role.toUpperCase().endsWith('_MANAGER')) ||
    (user?.role && user.role.toLowerCase().includes('manager')) ||
    (user?.role && user.role.toUpperCase().includes('CEO')) ||
    user?.department === 'ADMIN' ||
    user?.department === 'MANAGEMENT' ||
    (user?.position && (
      user.position.toLowerCase().includes('admin') ||
      user.position.toLowerCase().includes('manager') ||
      user.position.toLowerCase().includes('founder') ||
      user.position.toLowerCase().includes('ceo')
    ));

  useEffect(() => {
    fetchLeads();
    fetchReminders();
    if (isManagerOrAdmin) {
      fetchExecutives();
    }
  }, [filterStage, user, isManagerOrAdmin]);

  const fetchLeads = async () => {
    try {
      const params = filterStage ? { stage: filterStage } : {};
      if (!isManagerOrAdmin || user?.role === 'SALES_TRIAL' || user?.role === 'SALES_EXECUTIVE') {
        params.myLeadsOnly = 'true';
      }
      const response = await leadsApi.getLeads(params);
      if (response.success) setLeads(response.data.leads || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const triggerWhatsApp = (eOrPhone, phone, lead) => {
    let e = null;
    let targetPhone = '';
    let targetLead = null;

    if (eOrPhone && typeof eOrPhone === 'object' && (eOrPhone.stopPropagation || eOrPhone.nativeEvent)) {
      e = eOrPhone;
      targetPhone = phone;
      targetLead = lead;
    } else {
      targetPhone = eOrPhone;
      targetLead = phone;
    }

    if (e) {
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      if (typeof e.preventDefault === 'function') e.preventDefault();
    }

    let num = (targetPhone || targetLead?.whatsAppNumber || targetLead?.phone || '').replace(/[^0-9]/g, '');
    if (!num) {
      return toast.error('No valid phone number available for this client');
    }
    if (num.length === 10) num = '91' + num;
    const clientName = targetLead?.customerName || 'Client';
    const message = encodeURIComponent(`Hello ${clientName},\n\nThis is regarding your inquiry with India Trade Overseas (Ref: ${targetLead?.leadCode || 'N/A'}).`);
    window.open(`https://api.whatsapp.com/send?phone=${num}&text=${message}`, '_blank');
  };

  const triggerEmail = (eOrEmail, email, lead) => {
    let e = null;
    let targetEmail = '';
    let targetLead = null;

    if (eOrEmail && typeof eOrEmail === 'object' && (eOrEmail.stopPropagation || eOrEmail.nativeEvent)) {
      e = eOrEmail;
      targetEmail = email;
      targetLead = lead;
    } else {
      targetEmail = eOrEmail;
      targetLead = email;
    }

    if (e) {
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      if (typeof e.preventDefault === 'function') e.preventDefault();
    }

    const clientEmail = (
      targetEmail ||
      targetLead?.email ||
      targetLead?.customerEmail ||
      targetLead?.emailMasked ||
      (targetLead?.customerName ? `${targetLead.customerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@indiatradeoverseas.com` : '')
    );

    if (!clientEmail) {
      return toast.error('No email address available for this client');
    }

    const subject = encodeURIComponent(`India Trade Overseas - Lead Communication (${targetLead?.leadCode || targetLead?.customerName || 'Inquiry'})`);
    const body = encodeURIComponent(`Hello ${targetLead?.customerName || 'Client'},\n\nWe are following up regarding your inquiry with India Trade Overseas (Reference: ${targetLead?.leadCode || 'N/A'})...\n\nBest regards,\nIndia Trade Overseas`);

    const mailtoUrl = `mailto:${clientEmail}?subject=${subject}&body=${body}`;

    const link = document.createElement('a');
    link.href = mailtoUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();

    toast.success(`Opening email client for ${clientEmail}...`, { id: 'email-toast' });
  };

  const fetchReminders = async () => {
    try {
      const response = await leadsApi.getDueReminders();
      if (response?.success) setReminders(response.data.reminders || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchExecutives = async () => {
    try {
      let list = [];
      const res = await employeesApi.getEmployees({ department: 'sales' });
      if (res.success && res.data?.employees && res.data.employees.length > 0) {
        list = res.data.employees;
      } else {
        const fallbackRes = await taskApi.getEmployeesByDepartment('SALES');
        if (fallbackRes.success && fallbackRes.employees) {
          list = fallbackRes.employees;
        }
      }
      let filteredRegular = list.filter(e => {
        const dept = String(e.department || '').toUpperCase().trim();
        const role = String(e.role || '').toUpperCase().trim();
        const name = String(e.fullName || e.name || '').toUpperCase().trim();

        const isNonSales = name.includes('SYSTEM ADMIN') || name.includes('ADMINISTRATOR') || role === 'SUPER_ADMIN' || role === 'ADMIN' || dept === 'ADMIN' || dept === 'IT' || dept === 'HR' || dept === 'ACCOUNTS' || dept === 'PROCUREMENT' || dept === 'STONE' || dept === 'TRANSPORT' || dept === 'OPERATIONS';

        const isSalesDept = dept === 'SALES' || dept === 'SALES_TRIAL' || dept === 'CRM' || role.includes('SALES') || role.includes('CRM');

        return isSalesDept && !isNonSales && String(e.status || e.employmentStatus || 'ACTIVE').toUpperCase() !== 'INACTIVE';
      });

      // Fetch active Sales Trial Users & merge with executives list
      try {
        const trialRes = await salesTrialApi.getTrialUsers();
        if (trialRes && trialRes.success) {
          const trialUsersList = trialRes.data?.users || [];
          const activeTrial = trialUsersList.filter(u => u.status === 'ACTIVE' || u.isApproved);
          
          const seen = new Set(filteredRegular.map(e => String(e._id || e.employeeId || '')));
          activeTrial.forEach(u => {
            const uId = String(u._id || u.trialId || '');
            if (uId && !seen.has(uId)) {
              seen.add(uId);
              filteredRegular.push({
                _id: u._id,
                name: `${u.fullName || u.name} (${u.trialId || 'Sales Trial'})`,
                fullName: `${u.fullName || u.name} (${u.trialId || 'Sales Trial'})`,
                email: u.email,
                department: 'SALES_TRIAL',
                position: 'Sales Trial Executive',
                role: 'SALES_TRIAL',
                employeeId: u.trialId,
                isTrial: true
              });
            }
          });
        }
      } catch (errTrial) {
        console.warn('Trial users fetch notice in Leads:', errTrial.message);
      }

      setExecutives(filteredRegular);
    } catch (err) {
      console.error("Failed to load sales team:", err);
    }
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newLead,
        leadValue: newLead.leadValue ? Number(newLead.leadValue) : undefined,
        whatsAppNumber: newLead.whatsAppNumber || newLead.phone
      };
      const response = await leadsApi.createLead(payload);
      if (response.success) {
        toast.success(`Lead Node Created. Priority Score: ${response.data?.lead?.score || response.data?.leadScore || 'Calculated'}`);
        setShowCreateModal(false);
        setNewLead({
          customerName: '', phone: '', productCategory: 'STONE', companyName: '',
          country: '', whatsAppNumber: '', email: '', quantity: '',
          destination: '', leadValue: '', assignedTo: '', source: 'MANUAL'
        });
        fetchLeads();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create lead.');
    }
  };

  const handleExportLeads = async () => {
    const role = (user?.role || '').toUpperCase();
    const isFounderOrAdmin =
      ['ADMIN', 'FOUNDER', 'CEO', 'SUPER_ADMIN', 'CO_FOUNDER'].includes(role) ||
      user?.department === 'ADMIN' ||
      user?.department === 'MANAGEMENT' ||
      (user?.position && (user.position.toLowerCase().includes('admin') || user.position.toLowerCase().includes('founder') || user.position.toLowerCase().includes('ceo')));
    const canExport = isFounderOrAdmin || user?.exportPermission === true;

    if (!canExport) {
      toast.error("Export Restricted: Managers cannot export database unless granted permission by Founder!");
      return;
    }

    try {
      const deviceHash = localStorage.getItem('deviceHash') || 'dev-device-hash';

      try {
        await adminApi.logExportAttempt({
          deviceHash,
          metadata: { userAgent: navigator.userAgent, leadsCount: leads.length }
        });
      } catch (auditErr) {
        console.warn("Export audit log endpoint unattached. Proceeding with CSV download fallback.");
      }

      const csvContent = "data:text/csv;charset=utf-8,Code,Customer,Phone,Category,Stage,Value\n"
        + leads.map(l => `"${l.leadCode}","${l.customerName}","${l.phoneMasked || ''}","${l.productCategory}","${l.stage}","${l.leadValue || 0}"`).join("\n");

      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csvContent));
      link.setAttribute("download", `ITO_Leads_Registry_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Database exported safely!");
    } catch (error) {
      toast.error("Export execution failed.");
      throw error;
    }
  };

  // CSV Parser
  const parseCSV = (text) => {
    const lines = [];
    let row = [""];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          row[row.length - 1] += '"';
          i++; // skip quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push("");
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        lines.push(row);
        row = [""];
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(row);
    }
    return lines;
  };

  // Auto-detect CSV fields
  const autoDetectMappings = (firstRow) => {
    const mappings = {};
    firstRow.forEach((val, colIdx) => {
      const cleanVal = val.toLowerCase().trim();
      if (cleanVal.includes('whatsapp') || cleanVal === 'wa') {
        mappings[colIdx] = 'whatsAppNumber';
      } else if (cleanVal.includes('company') || cleanVal.includes('enterprise')) {
        mappings[colIdx] = 'companyName';
      } else if (cleanVal.includes('customer') || cleanVal.includes('consignee') || cleanVal.includes('client') || cleanVal.includes('name')) {
        mappings[colIdx] = 'customerName';
      } else if (cleanVal.includes('phone') || cleanVal.includes('mobile') || cleanVal.includes('contact') || cleanVal.includes('tel') || cleanVal.includes('telephony')) {
        mappings[colIdx] = 'phone';
      } else if (cleanVal.includes('category') || cleanVal.includes('product') || cleanVal.includes('material') || cleanVal.includes('commodity')) {
        mappings[colIdx] = 'productCategory';
      } else if (cleanVal.includes('email') || cleanVal.includes('mail')) {
        mappings[colIdx] = 'email';
      } else if (cleanVal.includes('value') || cleanVal.includes('price') || cleanVal.includes('valuation') || cleanVal.includes('amount')) {
        mappings[colIdx] = 'leadValue';
      } else if (cleanVal.includes('country') || cleanVal.includes('region')) {
        mappings[colIdx] = 'country';
      } else if (cleanVal.includes('date') || cleanVal.includes('created') || cleanVal.includes('time') || cleanVal.includes('update') || cleanVal.includes('modified')) {
        mappings[colIdx] = 'targetDate';
      } else if (cleanVal.includes('priority') || cleanVal.includes('temp') || cleanVal.includes('temperature') || cleanVal.includes('hot') || cleanVal.includes('warm') || cleanVal.includes('cold') || cleanVal.includes('quality')) {
        mappings[colIdx] = 'priority';
      } else if (cleanVal.includes('quantity') || cleanVal.includes('mass') || cleanVal.includes('qty')) {
        mappings[colIdx] = 'quantity';
      } else if (cleanVal.includes('destination') || cleanVal.includes('discharge') || cleanVal.includes('port')) {
        mappings[colIdx] = 'destination';
      } else if (cleanVal.includes('remark') || cleanVal.includes('note') || cleanVal.includes('discussion') || cleanVal.includes('conversation') || cleanVal.includes('chat') || cleanVal.includes('summary') || cleanVal.includes('baat')) {
        mappings[colIdx] = 'chatSummary';
      }
    });
    return mappings;
  };

  const getColumnLetter = (colIdx) => {
    let temp = colIdx;
    let letter = '';
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  const loadPdfJs = () => {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) return resolve(window.pdfjsLib);
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve(window.pdfjsLib);
        } else {
          reject(new Error("PDF.js library failed to load"));
        }
      };
      script.onerror = () => reject(new Error("Failed to load PDF script from CDN"));
      document.head.appendChild(script);
    });
  };

  const parsePdfBuffer = async (arrayBuffer) => {
    const pdfjsLib = await loadPdfJs();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const allRows = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const lineMap = new Map();
      for (const item of textContent.items) {
        if (!item.str || !item.str.trim()) continue;
        const yKey = Math.round((item.transform[5] || 0) / 4) * 4;
        if (!lineMap.has(yKey)) lineMap.set(yKey, []);
        lineMap.get(yKey).push(item);
      }

      const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);

      for (const yKey of sortedYs) {
        const lineItems = lineMap.get(yKey);
        lineItems.sort((a, b) => (a.transform[4] || 0) - (b.transform[4] || 0));

        const lineText = lineItems.map(it => it.str).join(' ').trim();
        if (!lineText) continue;

        let cells = [];
        if (lineText.includes(',')) {
          cells = parseCSV(lineText)[0] || [lineText];
        } else if (lineText.includes('\t')) {
          cells = lineText.split('\t');
        } else if (lineText.includes('|')) {
          cells = lineText.split('|');
        } else {
          cells = lineText.split(/\s{2,}/);
        }

        cells = cells.map(c => String(c).trim()).filter(Boolean);
        if (cells.length > 0) {
          allRows.push(cells);
        }
      }
    }

    return allRows;
  };

  // --- Image Upload Handlers ---
  const handleImageUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage({ file, dataUrl: event.target.result, name: file.name });
      setImageEditMode(true);
      setImageRotation(0);
      setImageBrightness(100);
      setImageContrast(100);
      toast.success(`Image loaded: ${file.name}`);
    };
    reader.onerror = () => toast.error('Failed to read image file.');
    reader.readAsDataURL(file);
  };

  const handleImageRotate = () => {
    setImageRotation(prev => (prev + 90) % 360);
  };

  const handleImageDone = () => {
    setImageEditMode(false);
    toast.success('Image saved! You can now manually enter data from the image, or upload a spreadsheet instead.');
  };

  const handleImageDelete = () => {
    setUploadedImage(null);
    setImageEditMode(false);
    setImageRotation(0);
    setImageBrightness(100);
    setImageContrast(100);
    toast('Image removed.', { icon: '🗑️' });
  };

  // --- Row Deletion Handler ---
  const handleDeleteRow = (rowIdx) => {
    setDeletedRowIndices(prev => {
      const next = new Set(prev);
      next.add(rowIdx);
      return next;
    });
    toast('Row removed from import.', { icon: '🗑️' });
  };

  const handleUndoDeleteRow = (rowIdx) => {
    setDeletedRowIndices(prev => {
      const next = new Set(prev);
      next.delete(rowIdx);
      return next;
    });
    toast.success('Row restored.');
  };

  // --- Column Deletion Handler ---
  const handleDeleteCol = (colIdx) => {
    setDeletedColIndices(prev => {
      const next = new Set(prev);
      next.add(colIdx);
      return next;
    });
    // Also remove the mapping for this column
    setColumnMappings(prev => {
      const next = { ...prev };
      delete next[colIdx];
      return next;
    });
    toast('Column removed from import.', { icon: '🗑️' });
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isPdf = fileName.endsWith('.pdf');
    const isImage = /\.(jpe?g|png|gif|bmp|webp|tiff?)$/i.test(fileName);

    // Reset deleted rows/cols on new file
    setDeletedRowIndices(new Set());
    setDeletedColIndices(new Set());

    // Handle Image files
    if (isImage) {
      handleImageUpload(file);
      return;
    }

    // Clear any previous image
    setUploadedImage(null);
    setImageEditMode(false);

    if (isPdf) {
      const toastId = toast.loading("Parsing PDF document...");
      try {
        const arrayBuffer = await file.arrayBuffer();
        const parsed = await parsePdfBuffer(arrayBuffer);
        toast.dismiss(toastId);

        if (parsed.length > 0) {
          setParsedRows(parsed);
          const auto = autoDetectMappings(parsed[0]);
          setColumnMappings(auto);
          toast.success(`Loaded ${parsed.length - 1 > 0 ? parsed.length - 1 : parsed.length} rows from PDF file!`);
        } else {
          toast.error("PDF file appears empty or text could not be extracted.");
        }
      } catch (err) {
        toast.dismiss(toastId);
        console.error("PDF parsing error:", err);
        toast.error("Failed to parse PDF file. Ensure it contains readable text.");
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let parsed = [];
        if (isExcel) {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          if (!firstSheetName) {
            return toast.error("Excel file has no visible sheets.");
          }
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          parsed = rawRows.map(row => 
            Array.isArray(row) ? row.map(cell => cell !== null && cell !== undefined ? String(cell) : '') : []
          );
        } else {
          const text = event.target.result;
          parsed = parseCSV(text);
        }

        if (parsed.length > 0) {
          setParsedRows(parsed);
          const auto = autoDetectMappings(parsed[0]);
          setColumnMappings(auto);
          toast.success(`Loaded ${parsed.length - 1} rows from spreadsheet!`);
        } else {
          toast.error("Spreadsheet file appears empty or unreadable.");
        }
      } catch (err) {
        console.error("Spreadsheet parsing error:", err);
        toast.error("Failed to parse spreadsheet file.");
      }
    };

    reader.onerror = () => {
      toast.error("Error reading spreadsheet file.");
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length <= 1 && !uploadedImage) {
      return toast.error("No data rows to import.");
    }

    const mappedFields = Object.values(columnMappings);
    if (!mappedFields.includes('customerName')) {
      return toast.error("Please map a column to 'Consignee Name *'.");
    }
    if (!mappedFields.includes('phone')) {
      return toast.error("Please map a column to 'Phone Number *'.");
    }
    if (!mappedFields.includes('productCategory')) {
      return toast.error("Please map a column to 'Product Category *'.");
    }

    setImporting(true);
    try {
      const leadsArray = [];
      for (let r = 1; r < parsedRows.length; r++) {
        // Skip deleted rows
        if (deletedRowIndices.has(r - 1)) continue;
        const row = parsedRows[r];
        if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

        const leadObj = {};
        Object.entries(columnMappings).forEach(([colIdx, field]) => {
          // Skip deleted columns
          if (deletedColIndices.has(Number(colIdx))) return;
          leadObj[field] = row[Number(colIdx)] || '';
        });

        if (!leadObj.productCategory) {
          leadObj.productCategory = 'STONE';
        } else {
          leadObj.productCategory = leadObj.productCategory.toUpperCase().trim();
          const validCategories = ['STONE', 'COAL', 'TEA', 'RICE', 'TRANSPORT'];
          if (!validCategories.includes(leadObj.productCategory)) {
            leadObj.productCategory = 'STONE';
          }
        }

        if (!leadObj.priority && !leadObj.temperature) {
          if (importDefaultPriority !== 'ALL') {
            leadObj.priority = importDefaultPriority;
          }
        } else {
          let p = String(leadObj.priority || leadObj.temperature || '').toUpperCase().trim();
          if (p.includes('HOT')) p = 'HOT';
          else if (p.includes('WARM')) p = 'WARM';
          else if (p.includes('COLD')) p = 'COLD';
          else if (importDefaultPriority !== 'ALL') p = importDefaultPriority;
          else p = '';
          
          if (p) leadObj.priority = p;
          else delete leadObj.priority;
        }

        leadsArray.push(leadObj);
      }

      if (leadsArray.length === 0) {
        setImporting(false);
        return toast.error("No valid lead records parsed.");
      }

      const res = await leadsApi.bulkImportLeads(leadsArray);
      if (res.success) {
        toast.success(`Successfully imported ${res.data?.successCount || leadsArray.length} leads! 🎉`);
        if (res.data?.errors && res.data.errors.length > 0) {
          toast.error(`Warnings: ${res.data.errors.length} rows had errors. Check console.`);
        }
        setShowImportModal(false);
        setParsedRows([]);
        setColumnMappings({});
        setDeletedRowIndices(new Set());
        setDeletedColIndices(new Set());
        setUploadedImage(null);
        setImageEditMode(false);
        fetchLeads();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Bulk lead ingestion failed.");
    } finally {
      setImporting(false);
    }
  };

  // Bulk Selection Helpers
  const handleSelectLead = (leadId) => {
    setSelectedLeadIds(prev => 
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const handleSelectAllLeads = () => {
    const pageIds = filteredLeads.map(l => l._id);
    const allSelectedOnPage = pageIds.every(id => selectedLeadIds.includes(id));
    if (allSelectedOnPage) {
      setSelectedLeadIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedLeadIds(prev => [...new Set([...prev, ...pageIds])]);
    }
  };

  const handleBulkAssign = async () => {
    if (selectedLeadIds.length === 0) {
      return toast.error("Please select at least one lead to assign.");
    }
    if (!assigneeId) {
      return toast.error("Please select an executive to assign leads to.");
    }

    setAssigningBulk(true);
    try {
      const res = await leadsApi.assignLeadsBulk({
        leadIds: selectedLeadIds,
        assignedTo: assigneeId
      });
      if (res.success) {
        toast.success(`Successfully assigned ${selectedLeadIds.length} leads! 🎉`);
        setSelectedLeadIds([]);
        setAssigneeId('');
        fetchLeads();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to execute bulk assignment.");
    } finally {
      setAssigningBulk(false);
    }
  };

  const [deleteConfirmLead, setDeleteConfirmLead] = useState(null); // single lead object or 'BULK'
  const [deletingLead, setDeletingLead] = useState(false);

  const handleDeleteSingleLead = (leadId, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const targetLead = leads.find(l => l._id === leadId);
    setDeleteConfirmLead(targetLead || leadId);
  };

  const confirmDeleteLeadAction = async () => {
    if (!deleteConfirmLead) return;
    setDeletingLead(true);
    try {
      if (deleteConfirmLead === 'BULK') {
        let successCount = 0;
        for (const id of selectedLeadIds) {
          try {
            await leadsApi.deleteLead(id);
            successCount++;
          } catch (err) {
            console.error('Failed to delete lead:', id, err);
          }
        }
        toast.success(`Successfully deleted ${successCount} leads!`);
        setSelectedLeadIds([]);
      } else {
        const leadId = typeof deleteConfirmLead === 'object' ? deleteConfirmLead._id : deleteConfirmLead;
        const res = await leadsApi.deleteLead(leadId);
        if (res?.success || res) {
          toast.success('Lead deleted successfully!');
        }
      }
      setDeleteConfirmLead(null);
      fetchLeads();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete lead.');
    } finally {
      setDeletingLead(false);
    }
  };

  const isWonOrDelivered = (stage) => {
    if (!stage) return false;
    const s = String(stage).toUpperCase().replace(/\s+/g, '_');
    return ['ORDER_CONFIRMED', 'DISPATCH_PENDING', 'DISPATCH_PLANNED', 'PAYMENT_PENDING', 'DOCUMENT_PENDING', 'CLOSED_WON', 'DEAL_WON', 'DELIVERED', 'COMPLETED'].includes(s);
  };

  const isOrderConfirmedStage = (stage) => {
    if (!stage) return false;
    const s = String(stage).toUpperCase().replace(/\s+/g, '_');
    return [
      'ORDER_CONFIRMED',
      'PO_RECEIVED',
      'LOI_PO_PENDING',
      'DISPATCH_PENDING',
      'DISPATCH_PLANNED',
      'PAYMENT_PENDING',
      'PAYMENT_DISCUSSION',
      'DOCUMENT_PENDING',
      'QUOTATION_APPROVED'
    ].includes(s);
  };

  const isNewOrAssignedLead = (stage) => {
    if (!stage) return false;
    const s = String(stage).toUpperCase().replace(/\s+/g, '_');
    return !isWonOrDelivered(s) && !isOrderConfirmedStage(s) && !['CLOSED_LOST', 'DEAL_LOST'].includes(s);
  };

  const isLost = (stage) => {
    if (!stage) return false;
    const s = String(stage).toUpperCase().replace(/\s+/g, '_');
    return ['CLOSED_LOST', 'DEAL_LOST'].includes(s);
  };

  const completedStages = [
    'CLOSED_WON', 'DEAL_WON', 'CLOSED_LOST', 'DEAL_LOST', 'DELIVERED', 'COMPLETED',
    'ORDER_CONFIRMED', 'DISPATCH_PENDING', 'DISPATCH_PLANNED', 'PAYMENT_PENDING'
  ];

  const activeLeads = leads.filter(l => !completedStages.includes((l.stage || '').toUpperCase()));
  const completedLeads = leads.filter(l => completedStages.includes((l.stage || '').toUpperCase()));

  const myLeadsCount = leads.filter(isAssignedToMe).length;
  const unassignedCount = leads.filter(isUnassigned).length;
  const assignedCount = leads.filter(l => !isUnassigned(l)).length;

  const filteredLeads = getFilteredByDate(leads).filter(lead => {
    if (!isManagerOrAdmin && !isAssignedToMe(lead)) return false;

    const stageUpper = (lead.stage || '').toUpperCase();
    const isCompleted = completedStages.includes(stageUpper);

    if (leadTab === 'ACTIVE' && isCompleted) return false;
    if (leadTab === 'COMPLETED' && !isCompleted) return false;
    if (leadTab === 'WON_DELIVERED' && !isWonOrDelivered(lead.stage)) return false;
    if (leadTab === 'ORDER_CONFIRM' && !isOrderConfirmedStage(lead.stage)) return false;
    if (leadTab === 'NEW_LEAD' && !isNewOrAssignedLead(lead.stage)) return false;
    if (leadTab === 'CALENDAR' && !lead.nextFollowupAt) return false;

    if (filterPriority !== 'ALL') {
      const pUpper = (lead.priority || 'WARM').toUpperCase();
      const isDateExpired = lead.targetDate && (new Date(lead.targetDate) < new Date(new Date().setHours(0,0,0,0))) && !completedStages.includes((lead.stage || '').toUpperCase());

      if (filterPriority === 'DEAD') {
        if (pUpper !== 'DEAD' && !isDateExpired) return false;
      } else if (filterPriority === 'DUPLICATE') {
        if (!duplicateLeadIds.has(String(lead._id))) return false;
      } else {
        if (isDateExpired || pUpper === 'DEAD') return false;
        if (pUpper !== filterPriority) return false;
      }
    }

    if (filterCategory !== 'ALL') {
      const catUpper = String(lead.productCategory || '').toUpperCase();
      const mainCategories = ['STONE', 'COAL', 'TEA', 'RICE', 'TRANSPORT'];
      if (filterCategory === 'OTHERS') {
        if (mainCategories.some(c => catUpper.includes(c))) return false;
      } else {
        if (!catUpper.includes(filterCategory)) return false;
      }
    }

    if (filterAssignee === 'MY') {
      if (!isAssignedToMe(lead)) return false;
    } else if (filterAssignee === 'UNASSIGNED') {
      if (!isUnassigned(lead)) return false;
    } else if (filterAssignee === 'ASSIGNED') {
      if (isUnassigned(lead)) return false;
    } else if (filterAssignee !== 'ALL') {
      const assigned = lead.assignedTo;
      const rawAssignedId = (typeof assigned === 'object' && assigned !== null) ? String(assigned._id || '') : String(assigned || '');
      const assignedName = (typeof assigned === 'object' && assigned !== null) ? (assigned.fullName || assigned.name || '') : String(assigned || '');
      const filterStr = String(filterAssignee).toLowerCase().trim();

      const matchId = rawAssignedId && rawAssignedId === String(filterAssignee);
      const matchName = assignedName && assignedName.toLowerCase().includes(filterStr);

      if (!matchId && !matchName) return false;
    }

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      (lead.customerName || '').toLowerCase().includes(searchLower) ||
      (lead.leadCode || '').toLowerCase().includes(searchLower) ||
      (lead.companyName || '').toLowerCase().includes(searchLower) ||
      (lead.productCategory || '').toLowerCase().includes(searchLower);

    return matchesSearch;
  }).sort((a, b) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowTime = tomorrow.getTime();

    const parseTargetMidnight = (lead) => {
      const raw = lead.targetDate || lead.nextFollowupAt;
      if (!raw) return null;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return null;
      const copy = new Date(d);
      copy.setHours(0, 0, 0, 0);
      return copy.getTime();
    };

    const targetA = parseTargetMidnight(a);
    const targetB = parseTargetMidnight(b);

    const getTargetRank = (t) => {
      if (t === null) return 5;
      if (t === todayTime) return 1;
      if (t === tomorrowTime) return 2;
      if (t > tomorrowTime) return 3;
      return 4;
    };

    const rankA = getTargetRank(targetA);
    const rankB = getTargetRank(targetB);

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    if (targetA && targetB && targetA !== targetB) {
      return targetA - targetB;
    }

    const createdA = new Date(a.createdAt || a.date || a.updatedAt || 0).getTime();
    const createdB = new Date(b.createdAt || b.date || b.updatedAt || 0).getTime();
    return createdB - createdA;
  });

  const executiveWorkloadSummary = useMemo(() => {
    const nameMap = new Map();

    const isStrictSalesUser = (dept, role, pos, name) => {
      const d = String(dept || '').toUpperCase().trim();
      const r = String(role || '').toUpperCase().trim();
      const p = String(pos || '').toUpperCase().trim();
      const n = String(name || '').toUpperCase().trim();

      if (n.includes('SYSTEM ADMIN') || n.includes('ADMINISTRATOR') || r === 'SUPER_ADMIN' || r === 'ADMIN' || d === 'ADMIN' || d === 'IT' || d === 'HR' || d === 'ACCOUNTS' || d === 'PROCUREMENT' || d === 'STONE' || d === 'TRANSPORT' || d === 'OPERATIONS') {
        return false;
      }

      return (
        d === 'SALES' || d === 'SALES_TRIAL' || d === 'CRM' ||
        r.includes('SALES') || r.includes('CRM') ||
        p.includes('SALES') || p.includes('CRM')
      );
    };

    // 1. Pre-populate from executives list (deduplicated by clean name)
    executives.forEach(emp => {
      const empName = (emp.fullName || emp.name || '').trim();
      if (!empName) return;

      const dept = emp.department || 'SALES';
      const role = emp.role || 'SALES_EXECUTIVE';
      const pos = emp.position || '';

      if (!isStrictSalesUser(dept, role, pos, empName)) return;

      const cleanKey = empName.toLowerCase();

      if (!nameMap.has(cleanKey)) {
        nameMap.set(cleanKey, {
          id: emp._id || emp.employeeId || cleanKey,
          name: empName,
          email: emp.email || '',
          department: dept,
          role: role,
          ids: new Set([String(emp._id || ''), String(emp.employeeId || ''), emp.email?.toLowerCase()].filter(Boolean)),
          totalCount: 0,
          activeCount: 0,
          completedCount: 0,
          hotCount: 0,
          totalValue: 0
        });
      } else {
        const existing = nameMap.get(cleanKey);
        if (emp._id) existing.ids.add(String(emp._id));
        if (emp.employeeId) existing.ids.add(String(emp.employeeId));
        if (emp.email) existing.ids.add(emp.email.toLowerCase());
      }
    });

    let unassignedCount = 0;
    let unassignedValue = 0;
    let unassignedHot = 0;

    // 2. Aggregate lead counts
    leads.forEach(lead => {
      const isCompleted = completedStages.includes((lead.stage || '').toUpperCase());
      const isHot = lead.priority === 'HOT';
      const val = Number(lead.leadValue || 0);

      if (isUnassigned(lead)) {
        unassignedCount++;
        unassignedValue += val;
        if (isHot) unassignedHot++;
      } else {
        const assigned = lead.assignedTo;
        let assignedName = '';
        let assignedDept = '';
        let assignedRole = '';

        if (typeof assigned === 'object' && assigned !== null) {
          assignedName = (assigned.fullName || assigned.name || assigned.email || '').trim();
          assignedDept = assigned.department || '';
          assignedRole = assigned.role || '';
        } else {
          assignedName = String(assigned || '').trim();
        }

        const rawId = (typeof assigned === 'object' && assigned !== null) ? String(assigned._id || '') : String(assigned || '');
        const emailStr = (typeof assigned === 'object' && assigned !== null && assigned.email) ? assigned.email.toLowerCase() : '';

        let target = null;
        const cleanKey = assignedName.toLowerCase();

        for (const [, entry] of nameMap) {
          if (
            (rawId && entry.ids.has(rawId)) ||
            (emailStr && entry.ids.has(emailStr)) ||
            (cleanKey && entry.name.toLowerCase() === cleanKey)
          ) {
            target = entry;
            break;
          }
        }

        if (target) {
          target.totalCount++;
          if (isCompleted) target.completedCount++;
          else target.activeCount++;
          if (isHot) target.hotCount++;
          target.totalValue += val;
        } else if (assignedName && isStrictSalesUser(assignedDept, assignedRole, '', assignedName)) {
          const newEntry = {
            id: rawId || cleanKey,
            name: assignedName,
            email: emailStr,
            department: assignedDept || 'SALES',
            role: assignedRole || 'SALES_EXECUTIVE',
            ids: new Set([rawId, emailStr, cleanKey].filter(Boolean)),
            totalCount: 1,
            activeCount: isCompleted ? 0 : 1,
            completedCount: isCompleted ? 1 : 0,
            hotCount: isHot ? 1 : 0,
            totalValue: val
          };
          nameMap.set(cleanKey, newEntry);
        }
      }
    });

    return {
      list: Array.from(nameMap.values())
        .filter(emp => emp.totalCount > 0 || executives.some(ex => (ex.fullName || ex.name || '').trim().toLowerCase() === emp.name.toLowerCase()))
        .sort((a, b) => b.totalCount - a.totalCount),
      unassigned: {
        totalCount: unassignedCount,
        totalValue: unassignedValue,
        hotCount: unassignedHot
      }
    };
  }, [leads, executives]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--crm-bg)] flex items-center justify-center">
        <div className="w-12 h-[1px] bg-[var(--crm-ink-soft)]/40 animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-screen w-full bg-[var(--crm-bg)] text-[var(--crm-ink-soft)] block pb-12">

      {/* Upper Context Header Panel */}
      <motion.div variants={blockVariants} className="w-full border-b border-[var(--crm-ink-soft)]/10 py-6 px-4 md:px-8 flex flex-col md:flex-row md:items-end justify-between gap-4 bg-[var(--crm-bg-sunken)]/40 backdrop-blur-sm">
        <div className="space-y-1 text-left">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--crm-ink-faint)] font-bold block font-mono">MODULE 03 & 04 // TRADE PIPELINE & SALES REGISTRY</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[var(--crm-heading)] uppercase tracking-tight">Leads & Global Inquiries</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto font-sans">
          {/* Table Badge */}
        

          <DownloadButton
            action={handleExportLeads}
            className="bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 font-bold text-[10px] uppercase tracking-wider h-[30px] px-2.5 rounded-sm transition-all disabled:cursor-default"
            icon={FiDownload}
            iconSize={11}
           
            busyLabel="Exporting..."
            doneLabel="Exported"
          />

          {isManagerOrAdmin && (
            <button 
              onClick={() => setShowImportModal(true)} 
              className="bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 font-bold text-[10px] uppercase tracking-wider h-[30px] px-2.5 rounded-sm flex items-center space-x-1 transition-all cursor-pointer"
            >
              <FiUpload size={11} /> 
            </button>
          )}

          <button
            onClick={() => setShowLOIModal(true)}
            className="bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 font-bold text-[10px] uppercase tracking-wider h-[30px] px-2.5 rounded-sm flex items-center space-x-1 transition-all cursor-pointer"
          >
            <FiFileText size={11} className="text-teal-600" /> <span>Upload LOI</span>
          </button>

          <button
            onClick={() => setShowCallModal(true)}
            className="bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 font-bold text-[10px] uppercase tracking-wider h-[30px] px-2.5 rounded-sm flex items-center space-x-1 transition-all cursor-pointer"
          >
            <FiMic size={11} className="animate-pulse text-rose-600" /> <span>Upload Recording</span>
          </button>

          <button
            onClick={() => setShowSalesCalc(true)}
            className="bg-teal-600 hover:bg-teal-500 text-white border border-teal-500/50 font-bold text-[10px] uppercase tracking-wider h-[30px] px-2.5 rounded-sm flex items-center space-x-1 transition-all cursor-pointer shadow-sm"
          >
            <BsCalculator size={12} /> <span>Sales Calculator 🧮</span>
          </button>

          <button onClick={() => setShowCreateModal(true)} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[10px] uppercase tracking-wider font-bold h-[30px] px-3 rounded-sm flex items-center space-x-1 transition-all cursor-pointer shadow-sm">
            <FiPlus size={12} /> 
          </button>
        </div>
      </motion.div>

      {/* Calendar Date Filter Bar */}
      <motion.div variants={blockVariants} className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-3 sm:p-4 rounded-sm shadow-sm font-sans text-xs flex flex-wrap justify-between items-center gap-3 text-left mx-4 md:mx-8 mt-4">
        <div className="flex items-center gap-2 text-[var(--crm-heading)] font-bold">
          <FiCalendar className="text-teal-500 animate-pulse" size={16} />
          <span className="text-[11px] uppercase tracking-wider font-sans">Date & Calendar Filter:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 font-sans">
          <button
            onClick={() => { setDateFilterMode('ALL'); setSelectedDate(''); }}
            className={`px-3 py-1.5 rounded-sm text-[10px] uppercase font-bold tracking-wider transition cursor-pointer ${
              dateFilterMode === 'ALL'
                ? 'bg-cyan-600 text-white border border-cyan-400 font-bold shadow'
                : 'bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 font-bold'
            }`}
          >
            All Dates
          </button>
          <button
            onClick={() => { setDateFilterMode('TODAY'); setSelectedDate(''); }}
            className={`px-3 py-1.5 rounded-sm text-[10px] uppercase font-bold tracking-wider transition cursor-pointer ${
              dateFilterMode === 'TODAY'
                ? 'bg-cyan-600 text-white border border-cyan-400 font-bold shadow'
                : 'bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 font-bold'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => { setDateFilterMode('YESTERDAY'); setSelectedDate(''); }}
            className={`px-3 py-1.5 rounded-sm text-[10px] uppercase font-bold tracking-wider transition cursor-pointer ${
              dateFilterMode === 'YESTERDAY'
                ? 'bg-cyan-600 text-white border border-cyan-400 font-bold shadow'
                : 'bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 font-bold'
            }`}
          >
            Yesterday
          </button>

          <div className="flex items-center gap-1.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] px-2.5 py-1 rounded-sm">
            <span className="text-[9px] uppercase text-[var(--crm-ink-faint)] font-bold font-sans">Pick Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setDateFilterMode(e.target.value ? 'PICK_DATE' : 'ALL');
              }}
              className="bg-transparent text-[var(--crm-heading)] text-[10px] outline-none font-sans cursor-pointer"
            />
          </div>

          {dateFilterMode !== 'ALL' && (
            <button
              onClick={() => { setDateFilterMode('ALL'); setSelectedDate(''); }}
              className="text-[9px] uppercase font-bold text-rose-500 hover:text-rose-400 underline ml-1 cursor-pointer font-sans"
            >
              Clear Filter
            </button>
          )}
        </div>

        <div className="text-[10px] text-[var(--crm-ink-faint)] font-sans">
          Showing: <strong className="text-teal-600 dark:text-teal-400 font-bold">{dateFilterMode === 'ALL' ? 'All Time' : dateFilterMode === 'TODAY' ? 'Today' : dateFilterMode === 'YESTERDAY' ? 'Yesterday' : selectedDate}</strong> 
          &bull; ({getFilteredByDate(leads).length} Leads Matched)
        </div>
      </motion.div>

      {/* Main Container Content */}
      <div className="w-full px-3 sm:px-6 md:px-8 py-6 space-y-5 bg-[var(--crm-bg)] min-w-0 overflow-x-hidden font-sans">

        {/* Module 4: Sales Performance Metrics & Graph Analytics Section */}
        <motion.div variants={blockVariants} className="space-y-4 font-sans">
          
          {/* Header Controls for Analytics & Graph */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--crm-bg-raised)] p-3 border border-[var(--crm-line)] rounded-sm">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wide text-[var(--crm-heading)]">
                SALES PIPELINE ANALYTICS & VISUAL GRAPH
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold border border-cyan-500/20">
                LIVE METRICS
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {showAnalyticsGraph && (
                <div className="flex items-center bg-[var(--crm-bg-sunken)] p-0.5 rounded border border-[var(--crm-line)]">
                  <button
                    onClick={() => setGraphViewMode('BAR')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded transition cursor-pointer ${
                      graphViewMode === 'BAR'
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'
                    }`}
                  >
                    📊 
                  </button>
                  <button
                    onClick={() => setGraphViewMode('PIE')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded transition cursor-pointer ${
                      graphViewMode === 'PIE'
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'
                    }`}
                  >
                    🥧 
                  </button>
                  <button
                    onClick={() => setGraphViewMode('ALL')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded transition cursor-pointer ${
                      graphViewMode === 'ALL'
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'
                    }`}
                  >
                    📈 Both Graphs
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowAnalyticsGraph(!showAnalyticsGraph)}
                className="px-3 py-1 bg-[var(--crm-bg-sunken)] hover:bg-[var(--crm-line)] border border-[var(--crm-line)] text-[var(--crm-heading)] rounded text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>{showAnalyticsGraph ? '🙈 Hide Graph' : '👁️ Show Graph'}</span>
              </button>
            </div>
          </div>

          {/* 7 Core Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            
            {/* 1. Active Pipeline */}
            <div className="p-3 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-sm hover:border-cyan-500/50 transition">
              <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold block mb-1">
                Active Pipeline
              </span>
              <span className="text-sm font-extrabold text-[var(--crm-heading)] block">
                {pipelineAnalytics.activeCount} Leads
              </span>
              <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold block mt-0.5">
                ₹{pipelineAnalytics.activeValue.toLocaleString('en-IN')}
              </span>
            </div>

            {/* 2. Gross Valuation */}
            <div className="p-3 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-sm hover:border-emerald-500/50 transition">
              <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold block mb-1">
                Gross Valuation
              </span>
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 block truncate">
                ₹{pipelineAnalytics.totalGrossValue.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-[var(--crm-ink-faint)] font-semibold block mt-0.5">
                {pipelineAnalytics.totalLeads} Total Records
              </span>
            </div>

            {/* 3. Pending Follow-ups */}
            <div className="p-3 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-sm hover:border-amber-500/50 transition">
              <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold block mb-1">
                Pending Follow-ups
              </span>
              <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 block">
                {pipelineAnalytics.pendingRemindersCount} Due
              </span>
              <span className="text-[10px] text-amber-500/80 font-semibold block mt-0.5">
                Action Items
              </span>
            </div>

            {/* 4. Conversion Rate */}
            <div className="p-3 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-sm hover:border-sky-500/50 transition">
              <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold block mb-1">
                Conversion Rate
              </span>
              <span className="text-sm font-extrabold text-sky-600 dark:text-sky-400 block">
                {pipelineAnalytics.conversionRate}%
              </span>
              <span className="text-[10px] text-sky-500/80 font-semibold block mt-0.5">
                {pipelineAnalytics.wonCount} / {pipelineAnalytics.totalLeads} Won
              </span>
            </div>

            {/* 5. Total Earnings (Won Revenue) */}
            <div className="p-3 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-sm hover:border-emerald-500/50 transition">
              <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold block mb-1">
                Total Earning
              </span>
              <span className="text-sm font-extrabold text-emerald-500 block truncate">
                ₹{pipelineAnalytics.totalWonValue.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-emerald-600/80 font-semibold block mt-0.5">
                Closed Deals ₹
              </span>
            </div>

            {/* 6. Total Lead Completed */}
            <div className="p-3 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-sm hover:border-teal-500/50 transition">
              <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold block mb-1">
                Total Lead Complete
              </span>
              <span className="text-sm font-extrabold text-teal-600 dark:text-teal-400 block">
                {pipelineAnalytics.wonCount} Completed
              </span>
              <span className="text-[10px] text-teal-500/80 font-semibold block mt-0.5">
                Deals Won
              </span>
            </div>

            {/* 7. Lost / Dead Leads */}
            <div className="p-3 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-sm hover:border-rose-500/50 transition">
              <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] font-bold block mb-1">
                Lost / Dead
              </span>
              <span className="text-sm font-extrabold text-rose-500 block">
                {pipelineAnalytics.lostCount} Lose
              </span>
              <span className="text-[10px] text-rose-400/80 font-semibold block mt-0.5 truncate">
                ₹{pipelineAnalytics.totalLostValue.toLocaleString('en-IN')}
              </span>
            </div>

          </div>

          {/* Interactive Recharts Graph Visualizations */}
          <AnimatePresence>
            {showAnalyticsGraph && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className={`grid gap-4 ${graphViewMode === 'ALL' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                  
                  {/* BAR CHART: Pipeline Stage Valuation */}
                  {(graphViewMode === 'BAR' || graphViewMode === 'ALL') && (
                    <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 rounded-sm">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--crm-line)]">
                        <h4 className="text-xs font-bold text-[var(--crm-heading)] uppercase tracking-wider flex items-center gap-1.5">
                          <span>📊 Stage Valuation & Lead Distribution</span>
                        </h4>
                        <span className="text-[10px] text-[var(--crm-ink-faint)]">Valuation in ₹ INR</span>
                      </div>
                      <div className="h-64 w-full min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={200}>
                          <BarChart data={pipelineAnalytics.stageChartData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--crm-ink-faint)' }} />
                            <YAxis
                              tick={{ fontSize: 10, fill: 'var(--crm-ink-faint)' }}
                              tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  const item = payload[0];
                                  return (
                                    <div className="bg-slate-900 border border-slate-700 p-2.5 rounded shadow-xl text-xs font-sans text-slate-100">
                                      <p className="font-bold text-teal-400 mb-1">{label}</p>
                                      <p className="text-slate-300">
                                        Valuation: <span className="font-bold text-emerald-400">₹{Number(item.value || 0).toLocaleString('en-IN')}</span>
                                      </p>
                                      <p className="text-slate-400 text-[11px]">
                                        Leads Count: <span className="font-bold text-sky-300">{item.payload.count}</span>
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                              {pipelineAnalytics.stageChartData.map((entry, idx) => (
                                <Cell key={`cell-${idx}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* PIE CHART: Product Category Distribution */}
                  {(graphViewMode === 'PIE' || graphViewMode === 'ALL') && (
                    <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 rounded-sm">
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--crm-line)]">
                        <h4 className="text-xs font-bold text-[var(--crm-heading)] uppercase tracking-wider flex items-center gap-1.5">
                          <span>🥧 Category Distribution & Value Share</span>
                        </h4>
                        <span className="text-[10px] text-[var(--crm-ink-faint)]">Product Categories</span>
                      </div>
                      <div className="h-64 w-full min-h-[250px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={200}>
                          <PieChart>
                            <Pie
                              data={pipelineAnalytics.categoryChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={85}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {pipelineAnalytics.categoryChartData.map((entry, index) => {
                                const colors = ['#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#3b82f6', '#64748b'];
                                return <Cell key={`pie-cell-${index}`} fill={colors[index % colors.length]} />;
                              })}
                            </Pie>
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  const item = payload[0];
                                  return (
                                    <div className="bg-slate-900 border border-slate-700 p-2.5 rounded shadow-xl text-xs font-sans text-slate-100">
                                      <p className="font-bold text-cyan-400 mb-1">{item.name}</p>
                                      <p className="text-slate-300">
                                        Valuation: <span className="font-bold text-emerald-400">₹{Number(item.value || 0).toLocaleString('en-IN')}</span>
                                      </p>
                                      <p className="text-slate-400 text-[11px]">
                                        Leads Count: <span className="font-bold text-sky-300">{item.payload.count}</span>
                                      </p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Legend
                              formatter={(value) => <span className="text-[11px] text-[var(--crm-heading)] font-semibold">{value}</span>}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>


        {/* Follow-up Reminder Stream */}
        {reminders.length > 0 && (
          <motion.div variants={blockVariants} className="p-4 bg-[var(--crm-warning-bg)] border border-[var(--crm-warning)]/30 flex justify-between items-center rounded-sm text-xs font-sans text-[var(--crm-warning)]">
            <div className="flex items-center space-x-2.5">
              <FiClock className="text-[var(--crm-warning)] animate-pulse" size={14} />
              <span>System logs track <strong>{reminders.length} follow-up records</strong> targeting execution today.</span>
            </div>
          </motion.div>
        )}

        {/* Lead Section Tab Switcher */}
        <motion.div variants={blockVariants} className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--crm-line)] pb-2 font-sans">
          <div className="flex flex-wrap items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
            <button
              onClick={() => setLeadTab('ALL')}
              className={`px-3 py-1.5 text-xs font-bold uppercase rounded-sm transition cursor-pointer flex items-center gap-1.5 border whitespace-nowrap ${
                leadTab === 'ALL'
                  ? 'bg-cyan-600 text-white border-cyan-400 font-bold shadow-sm'
                  : 'bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 font-bold'
              }`}
            >
              <span>All Lead</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                leadTab === 'ALL' ? 'bg-white/20 text-white border border-white/30' : 'bg-blue-300 text-blue-950 border border-blue-400/50'
              }`}>
                {leads.length}
              </span>
            </button>

            <button
              onClick={() => setLeadTab('WON_DELIVERED')}
              className={`px-3 py-1.5 text-xs font-bold uppercase rounded-sm transition cursor-pointer flex items-center gap-1.5 border whitespace-nowrap ${
                leadTab === 'WON_DELIVERED'
                  ? 'bg-emerald-600 text-white border-emerald-400 font-bold shadow-sm'
                  : 'bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 font-bold'
              }`}
            >
              <span>DEAL WON</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                leadTab === 'WON_DELIVERED' ? 'bg-white/20 text-white border border-white/30' : 'bg-blue-300 text-blue-950 border border-blue-400/50'
              }`}>
                {leads.filter(l => isWonOrDelivered(l.stage)).length}
              </span>
            </button>

            <button
              onClick={() => setLeadTab('ORDER_CONFIRM')}
              className={`px-3 py-1.5 text-xs font-bold uppercase rounded-sm transition cursor-pointer flex items-center gap-1.5 border whitespace-nowrap ${
                leadTab === 'ORDER_CONFIRM'
                  ? 'bg-cyan-600 text-white border-cyan-400 font-bold shadow-sm'
                  : 'bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 font-bold'
              }`}
            >
              <span>order Confirm</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                leadTab === 'ORDER_CONFIRM' ? 'bg-white/20 text-white border border-white/30' : 'bg-blue-300 text-blue-950 border border-blue-400/50'
              }`}>
                {leads.filter(l => isOrderConfirmedStage(l.stage)).length}
              </span>
            </button>

            <button
              onClick={() => setLeadTab('NEW_LEAD')}
              className={`px-3 py-1.5 text-xs font-bold uppercase rounded-sm transition cursor-pointer flex items-center gap-1.5 border whitespace-nowrap ${
                leadTab === 'NEW_LEAD'
                  ? 'bg-amber-600 text-white border-amber-400 font-bold shadow-sm'
                  : 'bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 font-bold'
              }`}
            >
              <span>New Lead</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                leadTab === 'NEW_LEAD' ? 'bg-white/20 text-white border border-white/30' : 'bg-blue-300 text-blue-950 border border-blue-400/50'
              }`}>
                {leads.filter(l => isNewOrAssignedLead(l.stage)).length}
              </span>
            </button>

            <button
              onClick={() => setLeadTab('WORKLOAD')}
              className={`px-3 py-1.5 text-xs font-bold uppercase rounded-sm transition cursor-pointer flex items-center gap-1.5 border whitespace-nowrap ${
                leadTab === 'WORKLOAD'
                  ? 'bg-indigo-600 text-white border-indigo-400 font-bold shadow-sm'
                  : 'bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 font-bold'
              }`}
            >
              <span>👥 Employee Workload</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                leadTab === 'WORKLOAD' ? 'bg-white/20 text-white border border-white/30' : 'bg-blue-300 text-blue-950 border border-blue-400/50'
              }`}>
                {executiveWorkloadSummary.list.length} Members
              </span>
            </button>
          </div>

          {leadTab === 'COMPLETED' && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded">
              ✓ Total Completed Valuation: ₹{completedLeads.reduce((s, l) => s + (l.leadValue || 0), 0).toLocaleString('en-IN')}
            </span>
          )}
        </motion.div>

        {/* Employee Lead Allocation Ribbon Matrix */}
        <motion.div variants={blockVariants} className="p-3 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded-sm font-sans text-xs shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiUsers className="text-sky-500" size={14} />
              <span className="text-[10px] text-[var(--crm-heading)] uppercase font-bold tracking-wider font-sans">
                {isManagerOrAdmin ? 'Employee Lead Distribution Summary' : 'My Assigned Leads Summary'}
              </span>
              <span className="text-[9px] text-[var(--crm-ink-faint)] hidden sm:inline font-sans">
                {isManagerOrAdmin ? '(Click any employee to filter their assigned leads)' : '(Filtered for your assigned workspace)'}
              </span>
            </div>
            {(filterAssignee !== 'ALL' || filterCategory !== 'ALL') && (
              <button
                onClick={() => { setFilterAssignee('ALL'); setFilterCategory('ALL'); }}
                className="text-[9px] text-rose-500 hover:underline uppercase font-bold cursor-pointer font-sans"
              >
                Clear Filters (Show All)
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar font-sans">
            {/* Unassigned Pill - Only for Sales Manager / Admin */}
            {isManagerOrAdmin && (
              <button
                onClick={() => setFilterAssignee(filterAssignee === 'UNASSIGNED' ? 'ALL' : 'UNASSIGNED')}
                className={`px-3.5 py-2 rounded-lg border text-[10px] font-black uppercase transition shrink-0 flex items-center gap-2 cursor-pointer shadow-xs ${
                  filterAssignee === 'UNASSIGNED'
                    ? 'bg-amber-600 text-white border-amber-700 font-black shadow-md'
                    : 'bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-700 hover:bg-amber-200 font-black'
                }`}
              >
                <FiAlertCircle size={14} className={filterAssignee === 'UNASSIGNED' ? 'text-white' : 'text-amber-600 dark:text-amber-400'} />
                <span>❓ Unassigned Pool</span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                  filterAssignee === 'UNASSIGNED' ? 'bg-white/25 text-white' : 'bg-amber-600 text-white'
                }`}>
                  {executiveWorkloadSummary.unassigned.totalCount} Leads
                </span>
              </button>
            )}

            {/* Logged-in User Pill */}
            <button
              onClick={() => setFilterAssignee(filterAssignee === 'MY' ? 'ALL' : 'MY')}
              className={`px-3.5 py-2 rounded-lg border text-[10px] font-black uppercase transition shrink-0 flex items-center gap-2 cursor-pointer shadow-xs ${
                filterAssignee === 'MY'
                  ? 'bg-emerald-600 text-white border-emerald-700 font-black shadow-md'
                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-950 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-200 font-black'
              }`}
            >
              <FiUser size={14} className={filterAssignee === 'MY' ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'} />
              <span>👤 Assigned to Me</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                filterAssignee === 'MY' ? 'bg-white/25 text-white' : 'bg-emerald-600 text-white'
              }`}>
                {myLeadsCount} Leads
              </span>
            </button>

            {/* Team Executives Pills - Only for Sales Manager / Admin */}
            {isManagerOrAdmin && executiveWorkloadSummary.list.map(emp => {
              const isSelected = String(filterAssignee) === String(emp.id);
              return (
                <button
                  key={emp.id}
                  onClick={() => setFilterAssignee(isSelected ? 'ALL' : emp.id)}
                  className={`px-3.5 py-2 rounded-lg border text-[10px] font-black uppercase transition shrink-0 flex items-center gap-2 cursor-pointer shadow-xs ${
                    isSelected
                      ? 'bg-cyan-600 text-white border-cyan-700 font-black shadow-md'
                      : 'bg-sky-100 dark:bg-sky-950/80 text-sky-950 dark:text-sky-200 border-sky-300 dark:border-sky-700 hover:bg-sky-200 font-black'
                  }`}
                >
                  <FiUserCheck size={14} className={isSelected ? "text-white" : "text-sky-600 dark:text-sky-400"} />
                  <span>{emp.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-cyan-600 text-white'
                  }`}>
                    {emp.totalCount}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Search & Filter Controls */}
        <motion.div variants={blockVariants} className="p-4 bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-sm flex flex-col md:flex-row gap-4 items-center font-sans">
          <div className="flex-1 w-full flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--crm-ink-faint)]" size={14} />
              <input
                type="text"
                placeholder="Search leads by customer, code, or company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-xs rounded-sm outline-none text-[var(--crm-heading)] focus:border-cyan-500 placeholder-[var(--crm-ink-faint)] font-sans"
              />
            </div>

            {/* Category Filter Dropdown */}
            <div className="w-full sm:w-auto shrink-0 flex items-center gap-2 font-sans">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className={`w-full sm:w-auto px-3.5 py-2.5 text-xs font-sans font-bold rounded-sm border outline-none cursor-pointer transition shadow-sm ${
                  filterCategory !== 'ALL'
                    ? 'bg-amber-600 text-white border-amber-400 font-bold'
                    : 'bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] border-[var(--crm-line)] hover:border-cyan-400'
                }`}
              >
                <option value="ALL" className="bg-[var(--crm-bg-raised)] text-[var(--crm-heading)]">All Categories</option>
                <option value="STONE" className="bg-[var(--crm-bg-raised)] text-[var(--crm-heading)]"> Stone</option>
                <option value="COAL" className="bg-[var(--crm-bg-raised)] text-[var(--crm-heading)]"> Coal</option>
                <option value="TEA" className="bg-[var(--crm-bg-raised)] text-[var(--crm-heading)]"> Tea</option>
                <option value="RICE" className="bg-[var(--crm-bg-raised)] text-[var(--crm-heading)]"> Rice</option>
                <option value="TRANSPORT" className="bg-[var(--crm-bg-raised)] text-[var(--crm-heading)]"> Transport</option>
                <option value="OTHERS" className="bg-[var(--crm-bg-raised)] text-[var(--crm-heading)]"> Others</option>
              </select>
            </div>
          </div>

          {/* Temperature Filters */}
          <div className="flex items-center gap-1.5 font-sans text-xs w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setFilterPriority('ALL')}
              className={`px-3 py-2 text-[10px] font-bold uppercase rounded-sm border transition cursor-pointer shrink-0 ${
                filterPriority === 'ALL'
                  ? 'bg-indigo-600 text-white border-indigo-400 font-bold shadow-sm'
                  : 'bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 font-bold'
              }`}
            >
              🌐 ALL LEADS (Date Wise)
            </button>
            <button
              onClick={() => setFilterPriority('HOT')}
              className={`px-3 py-2 text-[10px] font-bold uppercase rounded-sm border transition cursor-pointer flex items-center gap-1 shrink-0 ${
                filterPriority === 'HOT'
                  ? 'bg-rose-600 text-white border-rose-400 font-bold shadow-sm'
                  : 'bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 font-bold'
              }`}
            >
              🔥 Hot
            </button>
            <button
              onClick={() => setFilterPriority('WARM')}
              className={`px-3 py-2 text-[10px] font-bold uppercase rounded-sm border transition cursor-pointer flex items-center gap-1 shrink-0 ${
                filterPriority === 'WARM'
                  ? 'bg-amber-600 text-white border-amber-400 font-bold shadow-sm'
                  : 'bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 font-bold'
              }`}
            >
              ⚡ Warm
            </button>
            <button
              onClick={() => setFilterPriority('COLD')}
              className={`px-3 py-2 text-[10px] font-bold uppercase rounded-sm border transition cursor-pointer flex items-center gap-1 shrink-0 ${
                filterPriority === 'COLD'
                  ? 'bg-cyan-600 text-white border-cyan-400 font-bold shadow-sm'
                  : 'bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 font-bold'
              }`}
            >
              ❄️ Cold
            </button>
            <button
              onClick={() => setFilterPriority('DEAD')}
              className={`px-3 py-2 text-[10px] font-bold uppercase rounded-sm border transition cursor-pointer flex items-center gap-1 shrink-0 ${
                filterPriority === 'DEAD'
                  ? 'bg-zinc-800 text-zinc-100 border-zinc-600 font-bold shadow-sm'
                  : 'bg-zinc-300 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 border border-zinc-400 dark:border-zinc-700 hover:bg-zinc-400 font-bold'
              }`}
            >
              💀 Dead (Expired Date)
            </button>
            <button
              onClick={() => setFilterPriority('DUPLICATE')}
              className={`px-3 py-2 text-[10px] font-bold uppercase rounded-sm border transition cursor-pointer flex items-center gap-1 shrink-0 ${
                filterPriority === 'DUPLICATE'
                  ? 'bg-purple-600 text-white border-purple-400 font-bold shadow-sm ring-2 ring-purple-300'
                  : 'bg-purple-100 text-purple-950 border border-purple-300 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-700 font-bold'
              }`}
            >
              ⚠️ Duplicates ({duplicateLeadIds.size})
            </button>
          </div>
        </motion.div>

        {/* MODE 1: DATA TABLE VIEW */}
        {selectedLeadIds.length > 0 && isManagerOrAdmin && (
          <motion.div variants={blockVariants} className="bg-amber-950/90 border border-amber-600/50 p-3 rounded-sm font-mono text-xs text-amber-200 flex flex-wrap items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase tracking-wider">{selectedLeadIds.length} Leads Selected</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="bg-black/60 border border-amber-500/40 text-amber-100 text-xs px-2.5 py-1 rounded outline-none"
              >
                <option value="">Assign To...</option>
                {executives.map(e => (
                  <option key={e._id || e.employeeId} value={e._id || e.employeeId}>{e.fullName || e.name}</option>
                ))}
              </select>
              <button
                onClick={handleBulkAssign}
                disabled={assigningBulk}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-black font-bold uppercase text-[10px] rounded transition cursor-pointer"
              >
                {assigningBulk ? 'Assigning...' : 'Bulk Assign'}
              </button>
              <button
                onClick={() => setDeleteConfirmLead('BULK')}
                className="px-3 py-1 bg-rose-800 hover:bg-rose-700 text-white font-bold uppercase text-[10px] rounded transition cursor-pointer flex items-center gap-1 shadow-sm"
              >
                <FiTrash2 size={11} />
                <span>Delete Selected ({selectedLeadIds.length})</span>
              </button>
            </div>
          </motion.div>
        )}

        {viewMode === 'TABLE' ? (
          <motion.div variants={blockVariants} className="border border-[var(--crm-ink-soft)]/15 overflow-hidden w-full bg-[var(--crm-bg-raised)]/10 rounded-sm shadow-2xl">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto w-full custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[9px] uppercase tracking-widest font-mono font-bold border-b border-[var(--crm-ink-soft)]/15">
                    {isManagerOrAdmin && (
                      <th className="py-3.5 px-4 text-center w-12 shrink-0">
                        <input
                          type="checkbox"
                          checked={filteredLeads.length > 0 && filteredLeads.map(l => l._id).every(id => selectedLeadIds.includes(id))}
                          onChange={handleSelectAllLeads}
                          className="cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="py-3.5 px-5">Identifier</th>
                    <th className="py-3.5 px-5">Consignee Name</th>
                    <th className="py-3.5 px-5">Category / Location</th>
                    <th className="py-3.5 px-5 text-center">Target Timeline</th>
                    <th className="py-3.5 px-5 text-right">Valuation</th>
                    <th className="py-3.5 px-5 text-center">Pipeline Stage</th>
                    <th className="py-3.5 px-5 text-center">Executive / Owner</th>
                    <th className="py-3.5 px-5 text-center">LOI Status & Direct Communication</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--crm-ink-soft)]/10 text-xs">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={isManagerOrAdmin ? "9" : "8"} className="text-center py-16 opacity-40 font-mono uppercase tracking-widest text-[10px]">
                        No active inquiry manifests found for the selected date filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => {
                      const execName = typeof lead.assignedTo === 'object' && lead.assignedTo !== null
                        ? (lead.assignedTo.fullName || lead.assignedTo.name || lead.assignedTo.email || lead.assignedTo.employeeId || (lead.assignedTo._id ? String(lead.assignedTo._id) : 'Unassigned'))
                        : (lead.assignedTo || 'Unassigned');

                      return (
                      <tr 
                        key={lead._id} 
                        onClick={(e) => {
                          if (e.target.closest('input, button, a, select')) return;
                          navigate(`/crm/leads/${lead._id}`);
                        }}
                        className="hover:bg-[var(--crm-bg-raised)]/60 cursor-pointer transition-colors"
                      >
                        {isManagerOrAdmin && (
                          <td className="py-3.5 px-4 text-center shrink-0 w-12" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedLeadIds.includes(lead._id)}
                              onChange={() => handleSelectLead(lead._id)}
                              className="cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="py-3.5 px-5 font-mono font-bold text-[var(--crm-heading)] whitespace-nowrap">
                          <Link to={`/crm/leads/${lead._id}`} className="hover:underline text-[var(--crm-heading)]">
                            {lead.leadCode}
                          </Link>
                        </td>
                        <td className="py-3.5 px-5 min-w-[160px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link to={`/crm/leads/${lead._id}`} className="font-serif text-sm text-[var(--crm-heading)] hover:underline font-bold">
                              {lead.customerName}
                            </Link>
                            {((lead.priority || '').toUpperCase() === 'DEAD' || (lead.targetDate && new Date(lead.targetDate) < new Date(new Date().setHours(0,0,0,0)) && !completedStages.includes((lead.stage || '').toUpperCase()))) ? (
                              <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase font-mono bg-zinc-800 text-zinc-200 border border-zinc-600 shadow-xs">DEAD 💀</span>
                            ) : lead.priority === 'HOT' ? (
                              <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase font-mono bg-rose-600 text-white border border-rose-700 shadow-xs">HOT 🔥</span>
                            ) : lead.priority === 'WARM' ? (
                              <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase font-mono bg-amber-500 text-white border border-amber-600 shadow-xs">WARM ⚡</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase font-mono bg-cyan-600 text-white border border-cyan-700 shadow-xs">COLD ❄️</span>
                            )}
                            {duplicateLeadIds.has(String(lead._id)) && (
                              <span 
                                title={duplicateLeadDetails.get(String(lead._id)) || "Duplicate lead identified"}
                                className="px-2 py-0.5 rounded text-[8px] font-black uppercase font-mono bg-purple-900/80 text-purple-200 border border-purple-500 shadow-xs flex items-center gap-1 cursor-help"
                              >
                                ⚠️ DUPLICATE
                              </span>
                            )}
                            {lead.lastCallOutcome && (
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase shadow-xs flex items-center gap-1 ${
                                lead.lastCallOutcome === 'CONNECTED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' :
                                lead.lastCallOutcome === 'BUSY' ? 'bg-rose-950 text-rose-300 border border-rose-700' :
                                lead.lastCallOutcome === 'NO_ANSWER' ? 'bg-amber-950 text-amber-300 border border-amber-700' :
                                lead.lastCallOutcome === 'SWITCHED_OFF' ? 'bg-slate-900 text-slate-300 border border-slate-700' :
                                lead.lastCallOutcome === 'CALL_BACK' ? 'bg-sky-950 text-sky-300 border border-sky-700' :
                                'bg-purple-950 text-purple-300 border border-purple-700'
                              }`}>
                                📞 {lead.lastCallOutcome === 'CONNECTED' ? 'Connected' :
                                    lead.lastCallOutcome === 'BUSY' ? 'Busy' :
                                    lead.lastCallOutcome === 'NO_ANSWER' ? 'No Answer' :
                                    lead.lastCallOutcome === 'SWITCHED_OFF' ? 'Switched Off' :
                                    lead.lastCallOutcome === 'CALL_BACK' ? 'Call Back' : lead.lastCallOutcome}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[var(--crm-ink-faint)] font-mono">{lead.companyName || 'Private Enterprise'}</div>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="px-2.5 py-1 text-[9px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md border border-slate-300 dark:border-slate-700 shadow-xs mr-2">
                            {lead.productCategory}
                          </span>
                          <span className="text-[10px] text-[var(--crm-ink-faint)] font-mono">{lead.destination || lead.location || lead.country || 'India'}</span>
                        </td>
                        <td className="py-3.5 px-5 text-center font-mono text-[11px] whitespace-nowrap">
                          {lead.targetDate ? (
                            <span className="text-[11px] font-mono font-bold text-[var(--crm-heading)] whitespace-nowrap">
                              📅 {new Date(lead.targetDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[var(--crm-ink-faint)] font-mono">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-[var(--crm-positive)]">
                          {getLeadValuationDisplay(lead)}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          {['ORDER_CONFIRMED', 'DISPATCH_PENDING', 'DISPATCH_PLANNED', 'PAYMENT_PENDING', 'DOCUMENT_PENDING', 'CLOSED_WON', 'DEAL_WON'].includes((lead.stage || '').toUpperCase()) ? (
                            <span className="px-2.5 py-1 border text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-950/80 border-emerald-800 text-emerald-400 rounded shadow-sm">
                              ✓ {lead.stage?.replace(/_/g, ' ')}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 border text-[9px] font-mono font-bold uppercase bg-[var(--crm-bg-sunken)]/60 border-[var(--crm-ink-soft)]/10 text-[var(--crm-ink-soft)]">
                              {lead.stage?.replace(/_/g, ' ')}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-center font-mono text-[11px]">
                          {['ORDER_CONFIRMED', 'DISPATCH_PENDING', 'DISPATCH_PLANNED', 'PAYMENT_PENDING', 'DOCUMENT_PENDING', 'CLOSED_WON', 'DEAL_WON'].includes((lead.stage || '').toUpperCase()) ? (
                            <div className="space-y-0.5">
                              <span className="text-emerald-400 font-bold block">
                                ✓ {execName}
                              </span>
                              <span className="text-[8px] text-emerald-500/80 uppercase font-mono block">Completed Sales Owner</span>
                            </div>
                          ) : (
                            <span className="text-[var(--crm-heading)] font-semibold">
                              {execName}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-center font-mono" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-3">
                            {/* LOI Section */}
                            {lead.loiDocuments && lead.loiDocuments.length > 0 ? (
                              <div className="space-y-1 text-center">
                                <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-800 text-[8px] px-2 py-0.5 rounded font-bold uppercase inline-block">
                                  ✓ LOI ({lead.loiDocuments.length})
                                </span>
                                {lead.loiDocuments.map((loi, i) => (
                                  <a
                                    key={i}
                                    href={`${API_URL}/leads/${lead._id}/loi/${i}?token=${encodeURIComponent(localStorage.getItem('token') || '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block text-[9px] text-teal-400 hover:underline truncate max-w-[100px] mx-auto"
                                    title={loi.originalName}
                                  >
                                    📄 {loi.originalName}
                                  </a>
                                ))}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLoiTargetLeadId(lead._id);
                                    setShowLOIModal(true);
                                  }}
                                  className="text-[8px] uppercase font-bold text-teal-400 hover:text-teal-300 bg-teal-950/40 border border-teal-800/40 px-1.5 py-0.5 rounded cursor-pointer transition block mx-auto"
                                >
                                  + Add LOI
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLoiTargetLeadId(lead._id);
                                  setShowLOIModal(true);
                                }}
                                className="text-[9px] uppercase font-bold text-teal-400 hover:text-teal-300 bg-teal-950/40 border border-teal-800/40 px-2 py-1 rounded cursor-pointer transition shadow-sm inline-flex items-center gap-1"
                              >
                                + LOI
                              </button>
                            )}

                            {/* Direct Communication & Actions */}
                            <div className="flex items-center space-x-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openCallLogModal(lead);
                                }}
                                className="p-1.5 bg-amber-950/80 border border-amber-800/60 text-amber-400 hover:bg-amber-900 hover:text-amber-200 transition-all rounded-sm cursor-pointer shadow-sm inline-flex items-center justify-center"
                                title="Log Call Outcome & View Multi-Call History Timeline"
                              >
                                <FiPhoneCall size={13} />
                              </button>
                              <button
                                onClick={(e) => triggerWhatsApp(e, lead.whatsAppNumber || lead.phone, lead)}
                                className="p-1.5 bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 hover:bg-emerald-900 transition-all rounded-sm cursor-pointer shadow-sm inline-flex items-center justify-center"
                                title="Launch WhatsApp Chat"
                              >
                                <FiMessageSquare size={13} />
                              </button>
                              <button
                                onClick={(e) => triggerEmail(e, lead.email, lead)}
                                className="p-1.5 bg-sky-950/80 border border-sky-800/60 text-sky-400 hover:bg-sky-900 transition-all rounded-sm cursor-pointer shadow-sm inline-flex items-center justify-center"
                                title="Send Direct Email"
                              >
                                <FiMail size={13} />
                              </button>
                              {isManagerOrAdmin && (
                                <button
                                  onClick={(e) => handleDeleteSingleLead(lead._id, e)}
                                  className="p-1.5 bg-rose-950/80 border border-rose-800/60 text-rose-400 hover:bg-rose-900 hover:text-rose-200 transition-all rounded-sm cursor-pointer shadow-sm inline-flex items-center justify-center"
                                  title="Delete Lead Node"
                                >
                                  <FiTrash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards List View (< 768px screens) */}
            <div className="block md:hidden space-y-3 p-3">
              {filteredLeads.length === 0 ? (
                <div className="p-8 text-center opacity-40 font-mono text-xs uppercase tracking-widest border border-[var(--crm-ink-soft)]/15 rounded-sm">
                  No active inquiry manifests mapped.
                </div>
              ) : (
                filteredLeads.map((lead) => {
                  const execName = typeof lead.assignedTo === 'object' && lead.assignedTo !== null
                    ? (lead.assignedTo.fullName || lead.assignedTo.name || lead.assignedTo.email || lead.assignedTo.employeeId || (lead.assignedTo._id ? String(lead.assignedTo._id) : 'Unassigned'))
                    : (lead.assignedTo || 'Unassigned');

                  return (
                    <div 
                      key={lead._id} 
                      onClick={(e) => {
                        if (e.target.closest('input, button, a, select')) return;
                        navigate(`/crm/leads/${lead._id}`);
                      }}
                      className="bg-[var(--crm-bg-raised)]/40 border border-[var(--crm-ink-soft)]/20 hover:border-[var(--crm-heading)]/40 rounded p-3.5 space-y-3 text-left font-mono text-xs shadow-sm cursor-pointer transition-all"
                    >
                      {/* Header: Checkbox + Lead Code + Priority Badge */}
                      <div className="flex items-center justify-between gap-2 border-b border-[var(--crm-ink-soft)]/15 pb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {isManagerOrAdmin && (
                            <input
                              type="checkbox"
                              checked={selectedLeadIds.includes(lead._id)}
                              onChange={() => handleSelectLead(lead._id)}
                              className="cursor-pointer shrink-0 accent-teal-500"
                            />
                          )}
                          <span className="font-bold text-teal-400 text-xs truncate">{lead.leadCode}</span>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5">
                          {((lead.priority || '').toUpperCase() === 'DEAD' || (lead.targetDate && new Date(lead.targetDate) < new Date(new Date().setHours(0,0,0,0)) && !completedStages.includes((lead.stage || '').toUpperCase()))) ? (
                            <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase font-mono bg-zinc-800 text-zinc-200 border border-zinc-600 shadow-xs">DEAD 💀</span>
                          ) : lead.priority === 'HOT' ? (
                            <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase font-mono bg-rose-600 text-white border border-rose-700 shadow-xs">HOT 🔥</span>
                          ) : lead.priority === 'WARM' ? (
                            <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase font-mono bg-amber-500 text-white border border-amber-600 shadow-xs">WARM ⚡</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase font-mono bg-cyan-600 text-white border border-cyan-700 shadow-xs">COLD ❄️</span>
                          )}
                          {duplicateLeadIds.has(String(lead._id)) && (
                            <span 
                              title={duplicateLeadDetails.get(String(lead._id)) || "Duplicate lead identified"}
                              className="px-2 py-0.5 rounded text-[8px] font-black uppercase font-mono bg-purple-900/80 text-purple-200 border border-purple-500 shadow-xs cursor-help"
                            >
                              ⚠️ DUP
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Main Customer Info */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-serif text-sm text-[var(--crm-heading)] font-semibold truncate">{lead.customerName}</div>
                          <div className="text-[10px] text-[var(--crm-ink-faint)] truncate">{lead.companyName || 'Private Enterprise'}</div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="px-2 py-0.5 text-[9px] font-bold bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-soft)] rounded block">
                            {lead.productCategory}
                          </span>
                          {getLeadValuationDisplay(lead) !== '—' && (
                            <span className="text-[11px] font-bold text-emerald-400 block mt-1">{getLeadValuationDisplay(lead)}</span>
                          )}
                        </div>
                      </div>

                      {/* Stage & Owner info */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--crm-ink-soft)]/10 text-[10px] text-[var(--crm-ink-faint)]">
                        <div>
                          <span>Stage: </span>
                          <span className="text-teal-300 font-semibold">{lead.stage?.replace(/_/g, ' ')}</span>
                        </div>
                        <div>
                          <span>Owner: </span>
                          <span className="text-emerald-400 font-semibold">{execName}</span>
                        </div>
                      </div>

                      {/* Quick Communication Actions */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--crm-ink-soft)]/15">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => triggerWhatsApp(lead.whatsAppNumber || lead.phone)}
                            className="px-2.5 py-1.5 bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                          >
                            <FiMessageSquare size={12} /> WhatsApp
                          </button>
                          <button
                            onClick={() => triggerEmail(lead.email)}
                            className="px-2.5 py-1.5 bg-sky-950/60 border border-sky-800/50 text-sky-400 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                          >
                            <FiMail size={12} /> Email
                          </button>
                        </div>

                        <Link
                          to={`/crm/leads/${lead._id}`}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-sm"
                        >
                          <FiEye size={12} /> Details
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        ) : leadTab === 'WORKLOAD' ? (
          /* MODE 3: EMPLOYEE LEAD WORKLOAD MATRIX BOARD */
          <motion.div variants={blockVariants} className="space-y-6 text-left font-mono">
            <div className="p-4 bg-[var(--crm-bg-raised)]/30 border border-[var(--crm-ink-soft)]/15 rounded-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h2 className="text-base font-serif font-normal text-[var(--crm-heading)] uppercase tracking-wide">Employee Lead Allocation Matrix</h2>
                <p className="text-xs text-[var(--crm-ink-faint)] font-light mt-1">Detailed breakdown of lead volume, active deals, valuation, and hot priorities allocated per employee.</p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-3 py-1 bg-teal-950 text-teal-300 border border-teal-800 rounded font-bold">
                  Total Leads: {leads.length}
                </span>
                <span className="px-3 py-1 bg-amber-950 text-amber-300 border border-amber-800 rounded font-bold">
                  Unassigned: {executiveWorkloadSummary.unassigned.totalCount}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Unassigned Pool Summary Card */}
              <div className="p-5 bg-amber-950/20 border border-amber-800/40 rounded-sm space-y-4 text-left shadow-lg">
                <div className="flex items-center justify-between border-b border-amber-800/30 pb-2.5">
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase flex items-center gap-1.5">
                    <FiAlertCircle size={14} /> ❓ Unassigned Pool
                  </span>
                  <span className="px-2.5 py-1 rounded text-[10px] font-mono font-bold bg-amber-900/60 text-amber-200 border border-amber-700/50">
                    {executiveWorkloadSummary.unassigned.totalCount} Leads
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[var(--crm-ink-soft)]">
                  <div className="bg-[var(--crm-bg)] p-2 rounded border border-amber-900/20">
                    <span className="text-[9px] text-[var(--crm-ink-faint)] block">Valuation:</span>
                    <strong className="text-amber-300">₹{executiveWorkloadSummary.unassigned.totalValue.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="bg-[var(--crm-bg)] p-2 rounded border border-amber-900/20">
                    <span className="text-[9px] text-[var(--crm-ink-faint)] block">Hot Priority:</span>
                    <strong className="text-rose-400">🔥 {executiveWorkloadSummary.unassigned.hotCount}</strong>
                  </div>
                </div>

                <button
                  onClick={() => { setFilterAssignee('UNASSIGNED'); setLeadTab('ALL'); }}
                  className="w-full py-2.5 bg-amber-900/50 hover:bg-amber-900/80 text-amber-200 border border-amber-700/60 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  View Unassigned Leads ({executiveWorkloadSummary.unassigned.totalCount})
                </button>
              </div>

              {/* Logged in User Card */}
              <div className="p-5 bg-emerald-950/20 border border-emerald-800/40 rounded-sm space-y-4 text-left shadow-lg">
                <div className="flex items-center justify-between border-b border-emerald-800/30 pb-2.5">
                  <span className="text-xs font-mono font-bold text-emerald-400 uppercase flex items-center gap-1.5">
                    <FiUser size={14} /> 👤 My Assigned Workload
                  </span>
                  <span className="px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-emerald-900/60 text-emerald-200 border border-emerald-700/50">
                    {myLeadsCount} Leads
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[var(--crm-ink-soft)]">
                  <div className="bg-[var(--crm-bg)] p-2 rounded border border-emerald-900/20">
                    <span className="text-[9px] text-[var(--crm-ink-faint)] block">Gross Value:</span>
                    <strong className="text-emerald-400">₹{leads.filter(isAssignedToMe).reduce((s, l) => s + (l.leadValue || 0), 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="bg-[var(--crm-bg)] p-2 rounded border border-emerald-900/20">
                    <span className="text-[9px] text-[var(--crm-ink-faint)] block">Hot Deals:</span>
                    <strong className="text-rose-400">🔥 {leads.filter(l => isAssignedToMe(l) && l.priority === 'HOT').length}</strong>
                  </div>
                </div>

                <button
                  onClick={() => { setFilterAssignee('MY'); setLeadTab('ALL'); }}
                  className="w-full py-2.5 bg-emerald-900/50 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-700/60 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition cursor-pointer"
                >
                  View My Leads ({myLeadsCount})
                </button>
              </div>

              {/* Team Executive Cards */}
              {executiveWorkloadSummary.list.map(emp => (
                <div key={emp.id} className="p-5 bg-[var(--crm-bg-raised)]/30 border border-[var(--crm-ink-soft)]/20 rounded-sm space-y-4 text-left shadow-lg">
                  <div className="flex items-center justify-between border-b border-[var(--crm-ink-soft)]/15 pb-2.5">
                    <div>
                      <span className="text-xs font-serif font-bold text-[var(--crm-heading)] block">{emp.name}</span>
                      <span className="text-[9px] font-mono text-[var(--crm-ink-faint)] uppercase">{emp.department} • {emp.role}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-teal-950 text-teal-300 border border-teal-800">
                      {emp.totalCount} Leads
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono text-[10px] bg-[var(--crm-bg-sunken)] p-2.5 rounded border border-[var(--crm-ink-soft)]/10">
                    <div>Active: <strong className="text-teal-400">{emp.activeCount}</strong></div>
                    <div>Won: <strong className="text-emerald-400">{emp.completedCount}</strong></div>
                    <div>Hot 🔥: <strong className="text-rose-400">{emp.hotCount}</strong></div>
                    <div>Value: <strong className="text-[var(--crm-positive)]">₹{emp.totalValue.toLocaleString('en-IN')}</strong></div>
                  </div>

                  <button
                    onClick={() => { setFilterAssignee(emp.id); setLeadTab('ALL'); }}
                    className="w-full py-2.5 bg-teal-950/80 hover:bg-teal-900 text-teal-300 border border-teal-800/80 rounded text-[10px] font-mono font-bold uppercase tracking-wider transition cursor-pointer"
                  >
                    Filter {emp.name}'s Leads ({emp.totalCount})
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          /* MODE 2: CLEAN KANBAN PIPELINE BOARD */
          <motion.div variants={blockVariants} className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar">
            {stages.map((stageKey) => {
              const stageLeads = filteredLeads.filter(l => l.stage === stageKey);
              return (
                <div key={stageKey} className="w-72 min-w-[280px] bg-[var(--crm-bg-raised)]/20 border border-[var(--crm-ink-soft)]/15 p-3 rounded-sm flex flex-col space-y-3">
                  <div className="flex items-center justify-between border-b border-[var(--crm-ink-soft)]/10 pb-2">
                    <span className="text-[10px] font-mono font-bold uppercase text-[var(--crm-heading)]">
                      {stageKey.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] font-mono bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 px-2 py-0.5 text-[var(--crm-ink-faint)] rounded-sm">
                      {stageLeads.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[60vh] custom-scrollbar">
                    {stageLeads.length === 0 ? (
                      <div className="text-center py-8 text-[10px] font-mono text-[var(--crm-ink-faint)] uppercase tracking-wider">
                        Empty Stage
                      </div>
                    ) : (
                      stageLeads.map((item) => (
                        <div 
                          key={item._id} 
                          onClick={(e) => {
                            if (e.target.closest('input, button, a, select')) return;
                            navigate(`/crm/leads/${item._id}`);
                          }}
                          className="p-3 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 rounded-sm space-y-2 text-left hover:border-[var(--crm-heading)]/40 transition-all cursor-pointer"
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-[9px] font-mono font-bold text-[var(--crm-ink-faint)]">{item.leadCode}</span>
                            <span className="text-[9px] font-mono font-bold text-[var(--crm-warning)]">
                              Score: {item.score ?? item.leadScore ?? '—'}
                            </span>
                          </div>
                          <div className="font-serif text-xs font-bold text-[var(--crm-heading)]">{item.customerName}</div>
                          <div className="text-[10px] font-mono text-[var(--crm-ink-faint)]">{item.productCategory} • {item.country || 'IN'}</div>
                          {item.leadValue ? (
                            <div className="text-xs font-mono font-bold text-[var(--crm-positive)]">
                              ₹{item.leadValue.toLocaleString('en-IN')}
                            </div>
                          ) : null}
                          <div className="pt-2 border-t border-[var(--crm-ink-soft)]/10 flex justify-between items-center text-[10px] font-mono">
                            <button onClick={() => triggerWhatsApp(item.whatsAppNumber || item.phone)} className="text-[var(--crm-positive)] hover:underline cursor-pointer">
                              WhatsApp
                            </button>
                            <Link to={`/crm/leads/${item._id}`} className="text-[var(--crm-ink-soft)] hover:text-[var(--crm-heading)]">
                              View Details →
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

      </div>

      {/* Creation Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-2xl p-6 w-full max-w-xl shadow-2xl relative text-[var(--crm-ink-soft)] text-left"
            >
              <div className="flex justify-between items-center mb-5 border-b border-[var(--crm-line)] pb-4 text-left">
                <div>
                  <h2 className="text-lg font-bold text-[var(--crm-heading)]">Provision New Lead Node</h2>
                  <p className="text-[10px] text-[var(--crm-ink-faint)] tracking-wider uppercase font-medium mt-0.5">Automated Trade Route Sequence</p>
                </div>
                <button type="button" onClick={() => setShowCreateModal(false)} className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] p-1 font-bold text-base cursor-pointer">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateLead} className="space-y-4 font-sans text-xs text-left max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider mb-1">Consignee Legal Name *</label>
                    <input type="text" required value={newLead.customerName} onChange={(e) => setNewLead({ ...newLead, customerName: e.target.value })} className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-heading)]/40 text-sm rounded-xl outline-none text-[var(--crm-heading)] placeholder-slate-500" placeholder="Corporate buyer identity" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider mb-1">Company Name</label>
                    <input type="text" value={newLead.companyName} onChange={(e) => setNewLead({ ...newLead, companyName: e.target.value })} className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-heading)]/40 text-sm rounded-xl outline-none text-[var(--crm-heading)] placeholder-slate-500" placeholder="Legal Enterprise Designation" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider mb-1">Country</label>
                    <input type="text" value={newLead.country} onChange={(e) => setNewLead({ ...newLead, country: e.target.value })} className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-heading)]/40 text-sm rounded-xl outline-none text-[var(--crm-heading)] placeholder-slate-500" placeholder="Target Region Hub" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider mb-1">Telephony Target *</label>
                    <input type="tel" required value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-heading)]/40 text-sm rounded-xl outline-none text-[var(--crm-heading)] placeholder-slate-500" placeholder="Protected telecom line" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider mb-1">WhatsApp Vector</label>
                    <input type="tel" value={newLead.whatsAppNumber} onChange={(e) => setNewLead({ ...newLead, whatsAppNumber: e.target.value })} className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-heading)]/40 text-sm rounded-xl outline-none text-[var(--crm-heading)] placeholder-slate-500" placeholder="WhatsApp Line" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider mb-1">Corporate Email Coordinates</label>
                    <input type="email" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-heading)]/40 text-sm rounded-xl outline-none text-[var(--crm-heading)] placeholder-slate-500" placeholder="procurement@node.com" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider mb-1">Commodity Sector *</label>
                    <select required value={newLead.productCategory} onChange={(e) => setNewLead({ ...newLead, productCategory: e.target.value })} className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-heading)]/40 text-sm rounded-xl outline-none cursor-pointer text-[var(--crm-heading)]">
                      <option value="STONE">STONE</option>
                      <option value="COAL">COAL</option>
                      <option value="TEA">TEA</option>
                      <option value="RICE">RICE</option>
                      <option value="TRANSPORT">TRANSPORT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider mb-1">Requirement Date</label>
                    <input type="date" value={newLead.targetDate} onChange={(e) => setNewLead({ ...newLead, targetDate: e.target.value })} className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-heading)]/40 text-sm rounded-xl outline-none cursor-pointer text-[var(--crm-heading)]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-wider mb-1">Valuation / Budget (INR)</label>
                    <input type="number" value={newLead.leadValue} onChange={(e) => setNewLead({ ...newLead, leadValue: e.target.value })} className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] focus:border-[var(--crm-heading)]/40 text-sm rounded-xl outline-none text-[var(--crm-heading)] placeholder-slate-500" placeholder="Deal Valuation" />
                  </div>
                </div>

                <div className="flex space-x-3 pt-4 border-t border-[var(--crm-line)] mt-4">
                  <button type="submit" className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-[var(--crm-bg-sunken)] bg-[var(--crm-heading)] hover:opacity-90 transition cursor-pointer">
                    Commit Node Record
                  </button>
                  <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-[var(--crm-ink-soft)] bg-[var(--crm-bg)] border border-[var(--crm-line)] hover:bg-[var(--crm-bg-raised)] transition cursor-pointer">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Excel Spreadsheet / Image Ingestion Modal */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/15 rounded-sm p-6 w-full max-w-4xl shadow-2xl relative text-[var(--crm-ink-soft)] flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-5 border-b border-[var(--crm-ink-soft)]/10 pb-4 text-left shrink-0">
                <div>
                  <h2 className="text-base font-serif font-normal uppercase text-[var(--crm-heading)]">Spreadsheet / PDF / Image Bulk Ingestion</h2>
                  <p className="text-[9px] text-[var(--crm-ink-faint)] tracking-widest uppercase font-mono font-bold mt-1">Upload CSV / Excel / PDF / Photo files to parse and ingest lead records</p>
                </div>
                <button type="button" onClick={() => { setShowImportModal(false); setParsedRows([]); setColumnMappings({}); setUploadedImage(null); setImageEditMode(false); setDeletedRowIndices(new Set()); setDeletedColIndices(new Set()); }} className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] p-1 rounded-sm cursor-pointer">
                  <FiX size={16} />
                </button>
              </div>

              {/* IMAGE EDITING VIEW */}
              {uploadedImage && imageEditMode ? (
                <div className="flex-1 flex flex-col space-y-4 overflow-hidden text-left">
                  {/* Image editing toolbar */}
                  <div className="p-3 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <FiImage size={14} className="text-teal-400" />
                      <span className="font-bold text-[var(--crm-heading)] uppercase tracking-wider">Image Editor</span>
                      <span className="text-[var(--crm-ink-faint)] text-[10px] truncate max-w-[200px]" title={uploadedImage.name}>{uploadedImage.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleImageRotate}
                        className="px-3 py-1.5 rounded border border-[var(--crm-line)] text-[10px] font-bold uppercase transition cursor-pointer hover:border-teal-500 hover:text-teal-400 flex items-center gap-1.5 text-[var(--crm-ink-soft)]"
                        title="Rotate 90°"
                      >
                        <FiRotateCw size={12} /> Rotate
                      </button>
                      <button
                        type="button"
                        onClick={handleImageDelete}
                        className="px-3 py-1.5 rounded border border-rose-800/50 text-[10px] font-bold uppercase transition cursor-pointer hover:bg-rose-950/40 text-rose-400 flex items-center gap-1.5"
                        title="Delete Image"
                      >
                        <FiTrash2 size={12} /> Delete
                      </button>
                      <button
                        type="button"
                        onClick={handleImageDone}
                        className="px-3 py-1.5 rounded border border-teal-600 bg-teal-600 text-white text-[10px] font-bold uppercase transition cursor-pointer hover:bg-teal-500 flex items-center gap-1.5"
                        title="Save & Continue"
                      >
                        <FiCheck size={12} /> Done
                      </button>
                    </div>
                  </div>

                  {/* Brightness & Contrast sliders */}
                  <div className="flex flex-wrap gap-4 p-3 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded-sm text-xs font-mono">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <FiSun size={12} className="text-amber-400 shrink-0" />
                      <span className="text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] w-20 shrink-0">Brightness</span>
                      <input
                        type="range"
                        min="30"
                        max="200"
                        value={imageBrightness}
                        onChange={(e) => setImageBrightness(Number(e.target.value))}
                        className="flex-1 h-1 accent-amber-400 cursor-pointer"
                      />
                      <span className="text-[10px] text-[var(--crm-ink-soft)] w-10 text-right">{imageBrightness}%</span>
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <FiCrop size={12} className="text-sky-400 shrink-0" />
                      <span className="text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] w-20 shrink-0">Contrast</span>
                      <input
                        type="range"
                        min="30"
                        max="200"
                        value={imageContrast}
                        onChange={(e) => setImageContrast(Number(e.target.value))}
                        className="flex-1 h-1 accent-sky-400 cursor-pointer"
                      />
                      <span className="text-[10px] text-[var(--crm-ink-soft)] w-10 text-right">{imageContrast}%</span>
                    </div>
                  </div>

                  {/* Image preview with editing applied */}
                  <div className="flex-1 overflow-auto border border-[var(--crm-line)] rounded-sm bg-black/60 flex items-center justify-center p-4 min-h-[300px]">
                    <img
                      ref={imagePreviewRef}
                      src={uploadedImage.dataUrl}
                      alt="Uploaded preview"
                      className="max-w-full max-h-[55vh] object-contain rounded shadow-lg transition-all duration-300"
                      style={{
                        transform: `rotate(${imageRotation}deg)`,
                        filter: `brightness(${imageBrightness}%) contrast(${imageContrast}%)`
                      }}
                    />
                  </div>

                  {/* Info banner */}
                  <div className="p-3 bg-sky-950/20 border border-sky-500/20 rounded-sm text-[11px] text-sky-400 flex items-start gap-2.5">
                    <FiAlertCircle className="shrink-0 mt-0.5" size={14} />
                    <div>
                      <strong className="font-bold">Tip:</strong> After reviewing the image, click <strong>Done</strong> to save. Then upload a spreadsheet file (CSV/Excel) to map the data, or use this image as a reference while manually creating leads.
                    </div>
                  </div>
                </div>
              ) : uploadedImage && !imageEditMode ? (
                /* IMAGE SAVED - Show thumbnail + option to re-edit or upload spreadsheet */
                <div className="flex-1 flex flex-col space-y-4 text-left">
                  {/* Saved image thumbnail strip */}
                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-sm flex items-center gap-4">
                    <div className="relative group">
                      <img
                        src={uploadedImage.dataUrl}
                        alt="Saved"
                        className="w-20 h-20 object-cover rounded border border-emerald-500/30"
                        style={{
                          transform: `rotate(${imageRotation}deg)`,
                          filter: `brightness(${imageBrightness}%) contrast(${imageContrast}%)`
                        }}
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 rounded">
                        <button onClick={() => setImageEditMode(true)} className="p-1.5 bg-teal-600 rounded text-white cursor-pointer" title="Re-edit">
                          <FiEdit size={10} />
                        </button>
                        <button onClick={handleImageDelete} className="p-1.5 bg-rose-600 rounded text-white cursor-pointer" title="Delete">
                          <FiTrash2 size={10} />
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono font-bold text-emerald-400 uppercase">📸 Image Saved</p>
                      <p className="text-[10px] text-[var(--crm-ink-faint)] truncate" title={uploadedImage.name}>{uploadedImage.name}</p>
                      <p className="text-[10px] text-[var(--crm-ink-soft)] mt-1">Hover thumbnail to re-edit or delete. Upload a spreadsheet below to map data.</p>
                    </div>
                  </div>

                  {parsedRows.length === 0 ? (
                    /* Upload spreadsheet area (with image already saved) */
                    <div className="flex-1 py-10 flex flex-col items-center justify-center border border-dashed border-[var(--crm-ink-soft)]/20 rounded-sm bg-[var(--crm-bg)]/20 group hover:border-teal-500/30 transition-colors relative min-h-[200px]">
                      <input
                        type="file"
                        accept=".csv, .xlsx, .xls, .pdf, application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, image/jpeg, image/png, image/gif, image/bmp, image/webp, image/tiff"
                        onChange={handleFileSelect}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <FiUpload size={28} className="text-[var(--crm-ink-faint)] group-hover:text-teal-400 transition-colors mb-2" />
                      <p className="text-xs uppercase font-mono font-bold text-[var(--crm-ink-soft)] tracking-wider">Upload Spreadsheet Data</p>
                      <p className="text-[10px] text-[var(--crm-ink-faint)] mt-1">Now upload a CSV / Excel / PDF to map the lead data, or another image</p>
                    </div>
                  ) : null}
                </div>
              ) : parsedRows.length === 0 ? (
                /* STEP 1: Upload Panel (original - now with image support) */
                <div className="flex-1 py-12 flex flex-col items-center justify-center border border-dashed border-[var(--crm-ink-soft)]/20 rounded-sm bg-[var(--crm-bg)]/20 group hover:border-teal-500/30 transition-colors relative min-h-[300px]">
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls, .pdf, application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, image/jpeg, image/png, image/gif, image/bmp, image/webp, image/tiff"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FiUpload size={32} className="text-[var(--crm-ink-faint)] group-hover:text-teal-400 transition-colors mb-3" />
                  <p className="text-xs uppercase font-mono font-bold text-[var(--crm-ink-soft)] tracking-wider">Select CSV / Excel / PDF / Image File</p>
                  <p className="text-[10px] text-[var(--crm-ink-faint)] mt-1">Click to browse or drag your .csv, .xlsx, .xls, .pdf, .jpg, .png file here (Max: 15MB)</p>
                  <div className="flex items-center gap-3 mt-4">
                    <span className="px-2.5 py-1 rounded text-[9px] font-mono font-bold bg-teal-950/60 text-teal-300 border border-teal-800/40">📊 Spreadsheet</span>
                    <span className="px-2.5 py-1 rounded text-[9px] font-mono font-bold bg-rose-950/60 text-rose-300 border border-rose-800/40">📄 PDF</span>
                    <span className="px-2.5 py-1 rounded text-[9px] font-mono font-bold bg-violet-950/60 text-violet-300 border border-violet-800/40">📸 Photo</span>
                  </div>
                </div>
              ) : (
                /* STEP 2: Spreadsheet Mapping and Grid View */
                <div className="flex-1 flex flex-col space-y-4 overflow-hidden text-left">
                  {/* Warning banner */}
                  <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-sm text-[11px] text-amber-400 flex items-start gap-2.5">
                    <FiAlertCircle className="shrink-0 mt-0.5" size={14} />
                    <div>
                      <strong className="font-bold">Verify Column Alignments:</strong> Map the spreadsheet columns to their matching database fields using the dropdown selectors below. Highlighted columns will be imported. Unmapped columns will be ignored. Required fields are marked with an asterisk (*).
                    </div>
                  </div>

                  {/* Default Lead Quality / Priority Option */}
                  <div className="p-3 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
                    <span className="font-bold text-[var(--crm-heading)] flex items-center gap-2">
                      Set Lead Temperature / Quality Tag for Import:
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { value: 'ALL', label: 'ALL LEADS (AUTO) 🌐', style: 'bg-indigo-600 text-white border-indigo-700 font-bold' },
                        { value: 'HOT', label: 'HOT 🔥', style: 'bg-rose-600 text-white border-rose-700 font-bold' },
                        { value: 'WARM', label: 'WARM ⚡', style: 'bg-amber-500 text-white border-amber-600 font-bold' },
                        { value: 'COLD', label: 'COLD ❄️', style: 'bg-cyan-600 text-white border-cyan-700 font-bold' },
                        { value: 'DEAD', label: 'DEAD 💀', style: 'bg-zinc-800 text-zinc-200 border-zinc-700 font-bold' }
                      ].map(t => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setImportDefaultPriority(t.value)}
                          className={`px-3 py-1.5 rounded border text-[10px] font-bold uppercase transition cursor-pointer ${
                            importDefaultPriority === t.value
                              ? `${t.style} ring-1 ring-current font-black`
                              : 'border-[var(--crm-line)] text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Excel Spreadsheet View */}
                  <div className="overflow-auto border border-[var(--crm-line)] rounded-sm bg-black/40 text-[10px] font-mono custom-scrollbar relative flex-1">
                    <table className="w-full border-collapse border border-[var(--crm-line)]">
                      <thead className="sticky top-0 bg-[var(--crm-bg-sunken)] z-10">
                        {/* Field mapping selectors */}
                        <tr className="border-b border-[var(--crm-line)]">
                          <th className="p-2 border-r border-[var(--crm-line)] bg-slate-900/60 font-mono font-bold text-[10px] text-center w-12 shrink-0">MAP</th>
                          {parsedRows[0].map((_, colIdx) => {
                            if (deletedColIndices.has(colIdx)) return null;
                            return (
                              <th key={colIdx} className="p-2 border-r border-[var(--crm-line)] min-w-[150px] bg-slate-900/40">
                                <div className="flex items-center gap-1">
                                  <select
                                    value={columnMappings[colIdx] || ''}
                                    onChange={(e) => setColumnMappings({ ...columnMappings, [colIdx]: e.target.value })}
                                    className="flex-1 p-1 bg-black border border-[var(--crm-line)] rounded-sm text-[10px] text-[var(--crm-heading)] font-mono outline-none cursor-pointer"
                                  >
                                    <option value="">[Unmapped]</option>
                                    {LEAD_FIELDS.map(f => (
                                      <option key={f.value} value={f.value}>{f.label}</option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCol(colIdx)}
                                    className="p-1 text-rose-500/40 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors cursor-pointer shrink-0"
                                    title={`Delete column ${getColumnLetter(colIdx)}`}
                                  >
                                    <FiTrash2 size={10} />
                                  </button>
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                        {/* Excel coordinate letters and original CSV header name */}
                        <tr className="border-b border-[var(--crm-line)] text-slate-400">
                          <th className="p-2 border-r border-[var(--crm-line)] bg-slate-900/40 text-center font-mono font-bold">#</th>
                          {parsedRows[0].map((hdr, colIdx) => {
                            if (deletedColIndices.has(colIdx)) return null;
                            return (
                              <th key={colIdx} className="p-2 border-r border-[var(--crm-line)] text-left font-mono font-semibold bg-slate-900/20">
                                <span className="text-[10px] text-teal-400 block mb-0.5">{getColumnLetter(colIdx)}</span>
                                <span className="truncate block font-sans text-xs text-[var(--crm-heading)]" title={hdr}>{hdr || '[Empty Column]'}</span>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.slice(1, 51).map((row, rowIdx) => {
                          // Skip deleted rows
                          if (deletedRowIndices.has(rowIdx)) return null;

                          const phoneCol = Object.entries(columnMappings).find(([_, f]) => f === 'phone')?.[0];
                          const nameCol = Object.entries(columnMappings).find(([_, f]) => f === 'customerName')?.[0];
                          const rPhone = phoneCol !== undefined ? String(row[Number(phoneCol)] || '').replace(/\D/g, '').slice(-10) : '';
                          const rName = nameCol !== undefined ? String(row[Number(nameCol)] || '').trim().toLowerCase() : '';

                          const isRowDup = (rPhone && rPhone.length >= 7 && leads.some(l => (l.phone || l.phoneMasked || '').replace(/\D/g, '').slice(-10) === rPhone)) ||
                                           (rName && rName.length > 2 && leads.some(l => (l.customerName || '').trim().toLowerCase() === rName));

                          return (
                            <tr key={rowIdx} className={`border-b border-[var(--crm-line)] transition-colors ${isRowDup ? 'bg-purple-950/30 hover:bg-purple-900/40' : 'hover:bg-[var(--crm-bg-raised)]/20'}`}>
                              <td className="p-2 border-r border-[var(--crm-line)] bg-[var(--crm-bg-sunken)]/60 text-center font-mono font-bold text-[var(--crm-ink-faint)] select-none shrink-0 w-12">
                                <div className="flex items-center justify-center gap-1">
                                  {isRowDup ? <span title="Matches existing lead in database" className="text-purple-400 font-bold cursor-help">⚠️ {rowIdx + 1}</span> : rowIdx + 1}
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteRow(rowIdx); }}
                                    className="ml-0.5 p-0.5 text-rose-500/40 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                                    title={`Delete row ${rowIdx + 1}`}
                                  >
                                    <FiTrash2 size={10} />
                                  </button>
                                </div>
                              </td>
                              {row.map((cell, colIdx) => {
                                if (deletedColIndices.has(colIdx)) return null;
                                const isMapped = !!columnMappings[colIdx];
                                return (
                                  <td 
                                    key={colIdx} 
                                    className={`p-2 border-r border-[var(--crm-line)] text-left truncate max-w-[200px] ${
                                      isMapped ? (isRowDup ? 'bg-purple-950/40 text-purple-200 font-medium border-l border-purple-500/20' : 'bg-teal-950/20 text-teal-300 font-medium border-l border-teal-500/20') : 'opacity-40 text-slate-400'
                                    }`}
                                    title={cell}
                                  >
                                    {cell}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Deleted rows undo bar */}
                  {(deletedRowIndices.size > 0 || deletedColIndices.size > 0) && (
                    <div className="p-2 bg-rose-950/20 border border-rose-500/20 rounded-sm text-[10px] text-rose-400 flex items-center justify-between font-mono flex-wrap gap-2">
                      <span>
                        {deletedRowIndices.size > 0 && <><strong>{deletedRowIndices.size}</strong> row(s) removed</>}
                        {deletedRowIndices.size > 0 && deletedColIndices.size > 0 && ' · '}
                        {deletedColIndices.size > 0 && <><strong>{deletedColIndices.size}</strong> column(s) removed</>}
                      </span>
                      <div className="flex gap-2">
                        {deletedRowIndices.size > 0 && (
                          <button
                            type="button"
                            onClick={() => { setDeletedRowIndices(new Set()); toast.success('All deleted rows restored.'); }}
                            className="px-2 py-1 border border-rose-700/50 rounded text-[9px] uppercase font-bold hover:bg-rose-950/60 transition cursor-pointer"
                          >
                            Undo Rows
                          </button>
                        )}
                        {deletedColIndices.size > 0 && (
                          <button
                            type="button"
                            onClick={() => { setDeletedColIndices(new Set()); toast.success('All deleted columns restored.'); }}
                            className="px-2 py-1 border border-amber-700/50 rounded text-[9px] uppercase font-bold hover:bg-amber-950/60 transition cursor-pointer text-amber-400"
                          >
                            Undo Columns
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Saved image reference strip (if image was uploaded alongside spreadsheet) */}
                  {uploadedImage && !imageEditMode && (
                    <div className="p-2 bg-violet-950/20 border border-violet-500/20 rounded-sm flex items-center gap-3">
                      <img
                        src={uploadedImage.dataUrl}
                        alt="Reference"
                        className="w-12 h-12 object-cover rounded border border-violet-500/30"
                        style={{
                          transform: `rotate(${imageRotation}deg)`,
                          filter: `brightness(${imageBrightness}%) contrast(${imageContrast}%)`
                        }}
                      />
                      <span className="text-[10px] font-mono text-violet-300 flex-1 truncate">📸 Reference image: {uploadedImage.name}</span>
                      <button onClick={() => setImageEditMode(true)} className="p-1.5 border border-violet-600/40 rounded text-violet-300 hover:bg-violet-950/40 cursor-pointer" title="Re-edit image">
                        <FiEdit size={10} />
                      </button>
                      <button onClick={handleImageDelete} className="p-1.5 border border-rose-600/40 rounded text-rose-400 hover:bg-rose-950/40 cursor-pointer" title="Remove image">
                        <FiTrash2 size={10} />
                      </button>
                    </div>
                  )}

                  {/* Actions footer inside Step 2 */}
                  <div className="flex items-center justify-between pt-4 border-t border-[var(--crm-ink-soft)]/10 shrink-0">
                    <p className="text-[11px] font-mono text-[var(--crm-ink-faint)]">
                      Total spreadsheet rows loaded: <strong className="text-[var(--crm-heading)]">{parsedRows.length - 1 - deletedRowIndices.size} records</strong>
                      {deletedRowIndices.size > 0 && <span className="text-rose-400 ml-1">({deletedRowIndices.size} removed)</span>}
                    </p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => { setParsedRows([]); setColumnMappings({}); setDeletedRowIndices(new Set()); setDeletedColIndices(new Set()); }}
                        className="px-4 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-soft)] text-xs font-bold uppercase rounded-sm transition-colors cursor-pointer"
                      >
                        Reset File
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmImport}
                        disabled={importing}
                        className="px-6 py-2.5 bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)] text-xs font-bold uppercase rounded-sm hover:bg-[var(--crm-ink-soft)] transition-colors disabled:opacity-40 cursor-pointer shadow-md"
                      >
                        {importing ? 'Ingesting Spreadsheet...' : 'Confirm Bulk Import'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {isManagerOrAdmin && selectedLeadIds.length > 0 && (
          <motion.div
            initial={{ y: 80, x: '-50%', opacity: 0 }}
            animate={{ y: 0, x: '-50%', opacity: 1 }}
            exit={{ y: 80, x: '-50%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 w-[90%] max-w-xl bg-slate-950/90 border border-teal-500/30 backdrop-blur-md p-4 rounded-sm shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-left"
          >
            <div className="flex items-center gap-3">
              <span className="bg-teal-950/50 text-teal-400 border border-teal-500/20 px-2.5 py-1 rounded-sm font-bold">
                {selectedLeadIds.length} Selected
              </span>
              <button 
                onClick={() => setSelectedLeadIds([])}
                className="text-[var(--crm-ink-faint)] hover:text-white transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full sm:w-56 px-3 py-2 bg-black border border-[var(--crm-line)] rounded-sm outline-none text-[var(--crm-heading)] appearance-none cursor-pointer"
                >
                  <option value="">Choose Executive...</option>
                  {executives.map(e => (
                    <option key={e._id} value={e._id} className="bg-black">{e.name || e.fullName} ({e.email})</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--crm-ink-faint)]">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <button
                onClick={handleBulkAssign}
                disabled={assigningBulk}
                className="bg-teal-600 hover:bg-teal-500 text-white font-bold uppercase tracking-wider px-4 py-2 rounded-sm transition-all disabled:opacity-40 cursor-pointer shrink-0"
              >
                {assigningBulk ? 'Assigning...' : 'Assign Leads'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CallRecordingModal
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        leads={leads}
        onSuccess={async (recording) => {
          try {
            if (recording?.leadId) {
              const lId = typeof recording.leadId === 'object' ? recording.leadId._id : recording.leadId;
              await leadsApi.updateStage(lId, { newStage: 'REQUIREMENT_CAPTURED' });
            }
          } catch (err) { }
          await fetchLeads();
        }}
      />

      {/* LOI UPLOAD MODAL */}
      {showLOIModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowLOIModal(false)}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/20 rounded-lg p-6 w-full max-w-lg shadow-2xl text-left font-mono space-y-4"
          >
            <div className="flex justify-between items-center border-b border-[var(--crm-ink-soft)]/20 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--crm-heading)] flex items-center gap-2">
                <FiFileText className="text-teal-400" size={16} /> Upload LOI (Letter of Intent)
              </h3>
              <button onClick={() => setShowLOIModal(false)} className="text-xs text-[var(--crm-ink-faint)] hover:text-white font-bold">✕</button>
            </div>

            <form onSubmit={handleLOISubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1.5">Select Target Lead *</label>
                <select
                  required
                  value={loiTargetLeadId}
                  onChange={(e) => setLoiTargetLeadId(e.target.value)}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-heading)] px-3 py-2.5 rounded-sm outline-none focus:border-teal-500 transition cursor-pointer"
                >
                  <option value="">-- Choose Lead --</option>
                  {leads.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.customerName} ({d.leadCode || 'N/A'}) - {d.productCategory}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1.5">Select LOI Document File * (PDF, DOCX, Image)</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={(e) => setLoiFile(e.target.files[0])}
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-heading)] px-3 py-2 rounded-sm outline-none cursor-pointer file:bg-teal-950 file:text-teal-300 file:border file:border-teal-800 file:rounded-sm file:px-2 file:py-1 file:mr-2 file:text-[9px] file:uppercase file:font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-[var(--crm-ink-faint)] mb-1.5">Optional Notes / Buyer Terms</label>
                <textarea
                  rows={3}
                  value={loiNotes}
                  onChange={(e) => setLoiNotes(e.target.value)}
                  placeholder="e.g. Buyer sent signed LOI for 500 Tons Tea at $1,200/Ton..."
                  className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-heading)] p-2.5 rounded-sm outline-none focus:border-teal-500 transition resize-none font-sans"
                />
              </div>

              <div className="bg-teal-950/30 border border-teal-900/40 p-3 rounded-sm text-[9px] text-teal-300">
                ☁️ LOI will be saved on server & automatically backed up to <strong>Google Drive</strong> for Sales Manager verification.
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={uploadingLOI}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white py-2.5 font-bold uppercase text-[9px] tracking-widest rounded-sm transition cursor-pointer"
                >
                  {uploadingLOI ? 'Uploading to Drive & Server...' : 'Confirm Upload LOI'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLOIModal(false)}
                  className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-soft)] px-4 py-2.5 font-bold uppercase text-[9px] tracking-widest rounded-sm transition cursor-pointer hover:bg-[var(--crm-bg-raised)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmLead && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--crm-bg-raised)] border border-rose-800/60 p-6 rounded-sm max-w-md w-full font-mono space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400">
              <FiAlertCircle size={24} />
              <h3 className="text-lg font-serif font-normal uppercase text-[var(--crm-heading)]">Confirm Delete Lead</h3>
            </div>
            <p className="text-xs text-[var(--crm-ink-soft)] leading-relaxed">
              {deleteConfirmLead === 'BULK'
                ? `Are you sure you want to permanently delete ${selectedLeadIds.length} selected lead records? This action cannot be undone.`
                : `Are you sure you want to permanently delete lead "${typeof deleteConfirmLead === 'object' ? (deleteConfirmLead.leadCode || deleteConfirmLead.customerName) : deleteConfirmLead}"?`}
            </p>
            <div className="flex justify-end gap-3 pt-2 border-t border-[var(--crm-ink-soft)]/15">
              <button
                onClick={() => setDeleteConfirmLead(null)}
                disabled={deletingLead}
                className="px-4 py-2 bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/20 text-xs font-bold uppercase text-[var(--crm-heading)] rounded cursor-pointer hover:bg-[var(--crm-bg)]"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteLeadAction}
                disabled={deletingLead}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold uppercase rounded cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <FiTrash2 size={13} />
                <span>{deletingLead ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOG CALL OUTCOME & MULTI-CALL HISTORY MODAL */}
      <AnimatePresence>
        {callLogModalOpen && callTargetLead && (
          <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/20 rounded-lg p-6 w-full max-w-3xl shadow-2xl relative text-[var(--crm-ink-soft)] flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-4 border-b border-[var(--crm-ink-soft)]/10 pb-4 shrink-0">
                <div className="flex items-center gap-3 text-left">
                  <span className="p-2.5 rounded bg-amber-950/80 border border-amber-800/60 text-amber-400">
                    <FiPhoneCall size={20} />
                  </span>
                  <div>
                    <h2 className="text-base font-serif font-bold text-[var(--crm-heading)] uppercase tracking-wide">Log Call Outcome & Discussion</h2>
                    <p className="text-xs text-[var(--crm-ink-faint)] font-mono">
                      Lead: <span className="text-teal-400 font-bold">{callTargetLead.customerName}</span> ({callTargetLead.leadCode})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setCallLogModalOpen(false); setCallTargetLead(null); }}
                  className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] p-1.5 rounded-sm cursor-pointer"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Scrollable Container */}
              <div className="flex-1 overflow-y-auto space-y-5 pr-1 custom-scrollbar text-left font-sans">
                {/* Form to Log Current Call */}
                <form onSubmit={handleLogCallSubmit} className="space-y-4 bg-[var(--crm-bg-sunken)]/60 border border-[var(--crm-line)] rounded-lg p-4">
                  <div>
                    <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--crm-heading)] mb-2">
                      Select Call Disposition / Outcome *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                      {[
                        { id: 'CONNECTED', label: 'Connected 🟢', style: 'border-emerald-600 bg-emerald-950/40 text-emerald-300' },
                        { id: 'BUSY', label: 'Busy 🔴', style: 'border-rose-600 bg-rose-950/40 text-rose-300' },
                        { id: 'NO_ANSWER', label: 'No Answer 🟡', style: 'border-amber-600 bg-amber-950/40 text-amber-300' },
                        { id: 'SWITCHED_OFF', label: 'Switched Off ⚪', style: 'border-slate-600 bg-slate-900/40 text-slate-300' },
                        { id: 'CALL_BACK', label: 'Call Back Requested 🔵', style: 'border-sky-600 bg-sky-950/40 text-sky-300' },
                        { id: 'WRONG_NUMBER', label: 'Wrong Number 🟣', style: 'border-purple-600 bg-purple-950/40 text-purple-300' }
                      ].map(item => (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => setCallOutcomeSelect(item.id)}
                          className={`p-2.5 rounded border font-bold uppercase text-[11px] transition cursor-pointer flex items-center justify-center text-center ${
                            callOutcomeSelect === item.id
                              ? `${item.style} ring-2 ring-current font-black shadow-md scale-[1.02]`
                              : 'border-[var(--crm-line)] text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] bg-[var(--crm-bg)]/40'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes / Conversation Details */}
                  <div>
                    <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--crm-heading)] mb-1">
                      Call Discussion Notes / Conversation Remarks
                    </label>
                    <textarea
                      rows={3}
                      value={callNotesInput}
                      onChange={(e) => setCallNotesInput(e.target.value)}
                      placeholder="Enter details of conversation with client..."
                      className="w-full p-2.5 bg-[var(--crm-bg)] border border-[var(--crm-line)] rounded text-xs outline-none text-[var(--crm-heading)] placeholder-slate-500 font-sans focus:border-teal-500"
                    />
                  </div>

                  {/* Next Followup Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--crm-heading)] mb-1">
                        Next Follow-Up Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={callNextFollowupInput}
                        onChange={(e) => setCallNextFollowupInput(e.target.value)}
                        className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-line)] text-xs rounded text-[var(--crm-heading)] outline-none focus:border-teal-500 font-mono"
                      />
                    </div>

                    <div className="pt-2 sm:pt-4 flex justify-end">
                      <button
                        type="submit"
                        disabled={callSubmitting}
                        className="w-full sm:w-auto px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider rounded transition cursor-pointer shadow-md font-mono"
                      >
                        {callSubmitting ? 'Recording Call...' : 'Save Call Entry 📞'}
                      </button>
                    </div>
                  </div>
                </form>

                {/* Timeline History Section */}
                <div className="border-t border-[var(--crm-line)] pt-4">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--crm-heading)] mb-3 flex items-center gap-2">
                    <FiClock className="text-amber-400" />
                    Multi-Call History & Activity Timeline ({callHistoryList.length})
                  </h3>

                  {callHistoryList.length === 0 ? (
                    <div className="p-6 text-center text-xs font-mono text-[var(--crm-ink-faint)] border border-dashed border-[var(--crm-line)] rounded">
                      No previous call logs recorded for this lead yet.
                    </div>
                  ) : (
                    <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-[var(--crm-line)]">
                      {callHistoryList.map((act, idx) => {
                        const actor = act.performer || act.metadata?.performedByName || 'Executive';
                        const actorName = typeof actor === 'object' ? (actor.fullName || actor.name || actor.email || 'Executive') : String(actor);
                        const outcome = act.metadata?.callOutcome || (act.actionType === 'CALL_LOGGED' ? 'CALL' : act.actionType);

                        return (
                          <div key={act._id || idx} className="relative pl-8 text-xs font-mono">
                            <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-amber-500 border-2 border-[var(--crm-bg-raised)]" />
                            <div className="bg-[var(--crm-bg-sunken)]/80 border border-[var(--crm-line)] rounded p-3 text-left space-y-1">
                              <div className="flex items-center justify-between flex-wrap gap-2 text-[11px]">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-[var(--crm-heading)]">{actorName}</span>
                                  {outcome && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-950 text-amber-300 border border-amber-800">
                                      {outcome}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-[var(--crm-ink-faint)]">
                                  {new Date(act.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="text-[11px] text-[var(--crm-ink-soft)] font-sans whitespace-pre-wrap">
                                {act.note || act.metadata?.notes || 'Call recorded'}
                              </p>
                              {act.nextFollowupAt && (
                                <div className="text-[10px] text-teal-400 font-mono pt-1">
                                  📌 Next Follow-Up: {new Date(act.nextFollowupAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SALES CALCULATOR MODAL */}
      <SalesCalculatorModal
        isOpen={showSalesCalc}
        onClose={() => setShowSalesCalc(false)}
      />
    </motion.div>
  );
}