import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { leadsApi } from '../../api/leads';
import { adminApi } from '../../api/admin';
import { employeesApi } from '../../api/employees';
import { taskApi } from '../../api/task';
import {
  FiPlus, FiSearch, FiEye, FiFilter, FiDownload,
  FiClock, FiX, FiList, FiColumns, FiMessageSquare, FiMail,
  FiUpload, FiFileText, FiAlertCircle, FiMic, FiZap, FiUser, FiUserCheck, FiUsers, FiCalendar
} from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { DownloadButton } from '../../components/ui/AnimatedActionButton';
import CallRecordingModal from '../../components/crm/CallRecordingModal';

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
  { value: 'productCategory', label: 'Product Category *' },
  { value: 'companyName', label: 'Company Name' },
  { value: 'email', label: 'Email Address' },
  { value: 'leadValue', label: 'Lead Value (INR)' },
  { value: 'country', label: 'Country' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'destination', label: 'Destination' }
];

export default function Leads() {
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
    if (!lead) return true;
    if (!lead.assignedTo) return true;
    if (typeof lead.assignedTo === 'string' && (lead.assignedTo.toLowerCase() === 'unassigned' || lead.assignedTo.trim() === '')) return true;
    return false;
  };

  // Toggle between Table and Visual Kanban Board
  const [viewMode, setViewMode] = useState('TABLE'); // 'TABLE' | 'KANBAN'

  // Excel / CSV Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [columnMappings, setColumnMappings] = useState({});
  const [importDefaultPriority, setImportDefaultPriority] = useState('WARM');
  const [importing, setImporting] = useState(false);

  // Call Recording Modal State
  const [showCallModal, setShowCallModal] = useState(false);

  // Calendar Date Filtering & LOI State
  const [dateFilterMode, setDateFilterMode] = useState('ALL'); // 'ALL' | 'TODAY' | 'YESTERDAY' | 'PICK_DATE'
  const [selectedDate, setSelectedDate] = useState('');

  const [showLOIModal, setShowLOIModal] = useState(false);
  const [loiTargetLeadId, setLoiTargetLeadId] = useState('');
  const [loiFile, setLoiFile] = useState(null);
  const [loiNotes, setLoiNotes] = useState('');
  const [uploadingLOI, setUploadingLOI] = useState(false);

  const getFilteredByDate = (items = []) => {
    if (dateFilterMode === 'ALL') return items;
    return items.filter(item => {
      const rawDate = item.createdAt || item.date || item.uploadedAt;
      if (!rawDate) return true;
      const itemDate = new Date(rawDate);
      const dStr = itemDate.toISOString().split('T')[0];

      if (dateFilterMode === 'TODAY') {
        const todayStr = new Date().toISOString().split('T')[0];
        return dStr === todayStr;
      }
      if (dateFilterMode === 'YESTERDAY') {
        const yest = new Date();
        yest.setDate(yest.getDate() - 1);
        const yestStr = yest.toISOString().split('T')[0];
        return dStr === yestStr;
      }
      if (dateFilterMode === 'PICK_DATE' && selectedDate) {
        return dStr === selectedDate;
      }
      return true;
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
    user?.role === 'ADMIN' ||
    user?.role === 'MANAGER' ||
    user?.role === 'SALES_MANAGER' ||
    user?.department === 'ADMIN' ||
    (user?.position && user.position.toLowerCase().includes('admin'));

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
      const response = await leadsApi.getLeads(params);
      if (response.success) setLeads(response.data.leads || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
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
      setExecutives(list.filter(e => 
        !String(e.role || '').toUpperCase().includes('MANAGER') &&
        !String(e.position || '').toUpperCase().includes('MANAGER')
      ));
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
      if (cleanVal.includes('name') || cleanVal.includes('customer') || cleanVal.includes('consignee')) {
        mappings[colIdx] = 'customerName';
      } else if (cleanVal.includes('phone') || cleanVal.includes('mobile') || cleanVal.includes('contact') || cleanVal.includes('tel')) {
        mappings[colIdx] = 'phone';
      } else if (cleanVal.includes('category') || cleanVal.includes('product') || cleanVal.includes('material') || cleanVal.includes('commodity')) {
        mappings[colIdx] = 'productCategory';
      } else if (cleanVal.includes('company') || cleanVal.includes('enterprise')) {
        mappings[colIdx] = 'companyName';
      } else if (cleanVal.includes('email') || cleanVal.includes('mail')) {
        mappings[colIdx] = 'email';
      } else if (cleanVal.includes('value') || cleanVal.includes('price') || cleanVal.includes('valuation')) {
        mappings[colIdx] = 'leadValue';
      } else if (cleanVal.includes('country') || cleanVal.includes('region')) {
        mappings[colIdx] = 'country';
      } else if (cleanVal.includes('quantity') || cleanVal.includes('mass') || cleanVal.includes('qty')) {
        mappings[colIdx] = 'quantity';
      } else if (cleanVal.includes('destination') || cleanVal.includes('discharge') || cleanVal.includes('port')) {
        mappings[colIdx] = 'destination';
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

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const parsed = parseCSV(text);
      if (parsed.length > 0) {
        setParsedRows(parsed);
        const auto = autoDetectMappings(parsed[0]);
        setColumnMappings(auto);
        toast.success(`Loaded ${parsed.length - 1} rows from spreadsheet!`);
      } else {
        toast.error("Spreadsheet file appears empty or unreadable.");
      }
    };
    reader.onerror = () => {
      toast.error("Error reading spreadsheet file.");
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length <= 1) {
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
        const row = parsedRows[r];
        if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

        const leadObj = {};
        Object.entries(columnMappings).forEach(([colIdx, field]) => {
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
          leadObj.priority = importDefaultPriority;
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

  const completedStages = ['CLOSED_WON', 'DEAL_WON', 'CLOSED_LOST', 'DEAL_LOST'];

  const activeLeads = leads.filter(l => !completedStages.includes((l.stage || '').toUpperCase()));
  const completedLeads = leads.filter(l => completedStages.includes((l.stage || '').toUpperCase()));

  const myLeadsCount = leads.filter(isAssignedToMe).length;
  const unassignedCount = leads.filter(isUnassigned).length;
  const assignedCount = leads.filter(l => !isUnassigned(l)).length;

  const filteredLeads = getFilteredByDate(leads).filter(lead => {
    const stageUpper = (lead.stage || '').toUpperCase();
    const isCompleted = completedStages.includes(stageUpper);

    if (leadTab === 'ACTIVE' && isCompleted) return false;
    if (leadTab === 'COMPLETED' && !isCompleted) return false;

    if (filterPriority !== 'ALL') {
      const pUpper = (lead.priority || 'WARM').toUpperCase();
      if (pUpper !== filterPriority) return false;
    }

    if (filterCategory !== 'ALL') {
      const catUpper = String(lead.productCategory || '').toUpperCase();
      if (!catUpper.includes(filterCategory)) return false;
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
      if (rawAssignedId !== String(filterAssignee)) return false;
    }

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      (lead.customerName || '').toLowerCase().includes(searchLower) ||
      (lead.leadCode || '').toLowerCase().includes(searchLower) ||
      (lead.companyName || '').toLowerCase().includes(searchLower) ||
      (lead.productCategory || '').toLowerCase().includes(searchLower);

    return matchesSearch;
  });

  const executiveWorkloadSummary = useMemo(() => {
    const map = new Map();

    executives.forEach(emp => {
      const idStr = String(emp._id || '');
      map.set(idStr, {
        id: idStr,
        name: emp.fullName || emp.name || 'Executive',
        email: emp.email || '',
        department: emp.department || 'SALES',
        role: emp.role || 'SALES_EXECUTIVE',
        totalCount: 0,
        activeCount: 0,
        completedCount: 0,
        hotCount: 0,
        totalValue: 0
      });
    });

    let unassignedCount = 0;
    let unassignedValue = 0;
    let unassignedHot = 0;

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
        const rawId = (typeof assigned === 'object' && assigned !== null) ? String(assigned._id || '') : String(assigned || '');
        let target = map.get(rawId);

        if (!target && typeof assigned === 'object' && assigned !== null && assigned.email) {
          target = Array.from(map.values()).find(e => e.email?.toLowerCase() === assigned.email.toLowerCase());
        }

        if (target) {
          target.totalCount++;
          if (isCompleted) target.completedCount++;
          else target.activeCount++;
          if (isHot) target.hotCount++;
          target.totalValue += val;
        } else {
          const name = (typeof assigned === 'object' && assigned !== null) ? (assigned.fullName || assigned.name || assigned.email) : String(assigned || '');
          map.set(rawId, {
            id: rawId,
            name: name || 'Executive',
            email: typeof assigned === 'object' ? assigned.email : '',
            department: 'SALES',
            role: 'SALES_EXECUTIVE',
            totalCount: 1,
            activeCount: isCompleted ? 0 : 1,
            completedCount: isCompleted ? 1 : 0,
            hotCount: isHot ? 1 : 0,
            totalValue: val
          });
        }
      }
    });

    return {
      list: Array.from(map.values()).sort((a, b) => b.totalCount - a.totalCount),
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

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Table Badge */}
          <div className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/20 px-2.5 py-1 rounded-sm font-mono text-[10px] font-bold text-[var(--crm-heading)] flex items-center gap-1">
            <FiList size={11} /> Table
          </div>

          <DownloadButton
            action={handleExportLeads}
            className="bg-[var(--crm-bg)] text-[var(--crm-ink-soft)] border border-[var(--crm-ink-soft)]/20 text-[10px] uppercase tracking-wider font-semibold h-[30px] px-2.5 rounded-sm transition-all hover:bg-[var(--crm-bg-raised)] disabled:cursor-default"
            icon={FiDownload}
            iconSize={11}
            idleLabel="Export"
            busyLabel="Exporting..."
            doneLabel="Exported"
          />

          {isManagerOrAdmin && (
            <button 
              onClick={() => setShowImportModal(true)} 
              className="bg-[var(--crm-bg)] hover:bg-[var(--crm-bg-raised)] text-[var(--crm-heading)] border border-[var(--crm-ink-soft)]/20 text-[10px] uppercase tracking-wider font-bold h-[30px] px-2.5 rounded-sm flex items-center space-x-1 transition-all cursor-pointer"
            >
              <FiUpload size={11} /> <span>Import</span>
            </button>
          )}

          <button
            onClick={() => setShowLOIModal(true)}
            className="bg-teal-950/80 hover:bg-teal-900 text-teal-300 border border-teal-800/50 text-[10px] uppercase tracking-wider font-bold h-[30px] px-2.5 rounded-sm flex items-center space-x-1 transition-all cursor-pointer shadow-sm"
          >
            <FiFileText size={11} className="text-teal-400" /> <span>Upload LOI</span>
          </button>

          <button
            onClick={() => setShowCallModal(true)}
            className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/40 text-[10px] uppercase tracking-wider font-bold h-[30px] px-2.5 rounded-sm flex items-center space-x-1 transition-all cursor-pointer shadow-sm"
          >
            <FiMic size={11} className="animate-pulse text-rose-400" /> <span>Upload Recording</span>
          </button>

          <button onClick={() => setShowCreateModal(true)} className="bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)] text-[10px] uppercase tracking-wider font-bold h-[30px] px-3 rounded-sm flex items-center space-x-1 transition-all hover:bg-[var(--crm-ink-soft)] cursor-pointer">
            <FiPlus size={12} /> <span>New Lead</span>
          </button>
        </div>
      </motion.div>

      {/* Calendar Date Filter Bar */}
      <motion.div variants={blockVariants} className="bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/20 p-3 sm:p-4 rounded-sm shadow-sm font-mono text-xs flex flex-wrap justify-between items-center gap-3 text-left mx-4 md:mx-8 mt-4">
        <div className="flex items-center gap-2 text-[var(--crm-heading)] font-bold">
          <FiCalendar className="text-teal-400 animate-pulse" size={16} />
          <span className="text-[11px] uppercase tracking-wider">Date & Calendar Filter:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => { setDateFilterMode('ALL'); setSelectedDate(''); }}
            className={`px-3 py-1.5 rounded-sm text-[10px] uppercase font-bold tracking-wider transition cursor-pointer ${
              dateFilterMode === 'ALL'
                ? 'bg-teal-600 text-white font-black shadow'
                : 'bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'
            }`}
          >
            All Dates
          </button>
          <button
            onClick={() => { setDateFilterMode('TODAY'); setSelectedDate(''); }}
            className={`px-3 py-1.5 rounded-sm text-[10px] uppercase font-bold tracking-wider transition cursor-pointer ${
              dateFilterMode === 'TODAY'
                ? 'bg-teal-600 text-white font-black shadow'
                : 'bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => { setDateFilterMode('YESTERDAY'); setSelectedDate(''); }}
            className={`px-3 py-1.5 rounded-sm text-[10px] uppercase font-bold tracking-wider transition cursor-pointer ${
              dateFilterMode === 'YESTERDAY'
                ? 'bg-teal-600 text-white font-black shadow'
                : 'bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'
            }`}
          >
            Yesterday
          </button>

          <div className="flex items-center gap-1.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/20 px-2.5 py-1 rounded-sm">
            <span className="text-[9px] uppercase text-[var(--crm-ink-faint)] font-bold">Pick Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setDateFilterMode(e.target.value ? 'PICK_DATE' : 'ALL');
              }}
              className="bg-transparent text-[var(--crm-heading)] text-[10px] outline-none font-mono cursor-pointer"
            />
          </div>

          {dateFilterMode !== 'ALL' && (
            <button
              onClick={() => { setDateFilterMode('ALL'); setSelectedDate(''); }}
              className="text-[9px] uppercase font-bold text-rose-400 hover:text-rose-300 underline ml-1 cursor-pointer"
            >
              Clear Filter
            </button>
          )}
        </div>

        <div className="text-[10px] text-[var(--crm-ink-faint)] font-mono">
          Showing: <strong className="text-teal-400 font-bold">{dateFilterMode === 'ALL' ? 'All Time' : dateFilterMode === 'TODAY' ? 'Today' : dateFilterMode === 'YESTERDAY' ? 'Yesterday' : selectedDate}</strong> 
          &bull; ({getFilteredByDate(leads).length} Leads Matched)
        </div>
      </motion.div>

      {/* Main Container Content */}
      <div className="w-full px-3 sm:px-6 md:px-8 py-6 space-y-5 bg-[var(--crm-bg)] min-w-0 overflow-x-hidden">

        {/* Module 4: Sales Performance Metrics Sub-Header */}
        <motion.div variants={blockVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[var(--crm-bg-raised)]/30 border border-[var(--crm-ink-soft)]/15 rounded-sm font-mono text-xs">
          <div>
            <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] block">Active Pipeline</span>
            <span className="text-base font-bold text-[var(--crm-heading)]">{leads.length} Records</span>
          </div>
          <div>
            <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] block">Gross Valuation</span>
            <span className="text-base font-bold text-[var(--crm-positive)]">
              ₹{leads.reduce((sum, l) => sum + (l.leadValue || 0), 0).toLocaleString('en-IN')}
            </span>
          </div>
          <div>
            <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] block">Pending Follow-ups</span>
            <span className="text-base font-bold text-[var(--crm-warning)]">{reminders.length} Due</span>
          </div>
          <div>
            <span className="text-[9px] uppercase tracking-wider text-[var(--crm-ink-faint)] block">Conversion Rate</span>
            <span className="text-base font-bold text-[var(--crm-info)]">
              {leads.length > 0 ? Math.round((leads.filter(l => ['CLOSED_WON', 'DEAL_WON'].includes(l.stage)).length / leads.length) * 100) : 0}%
            </span>
          </div>
        </motion.div>

        {/* Follow-up Reminder Stream */}
        {reminders.length > 0 && (
          <motion.div variants={blockVariants} className="p-4 bg-[var(--crm-warning-bg)] border border-[var(--crm-warning)]/20 flex justify-between items-center rounded-sm text-xs font-mono text-[var(--crm-warning)]">
            <div className="flex items-center space-x-2.5">
              <FiClock className="text-[var(--crm-warning)] animate-pulse" size={14} />
              <span>System logs track <strong>{reminders.length} follow-up records</strong> targeting execution today.</span>
            </div>
          </motion.div>
        )}

        {/* Lead Section Tab Switcher (Active Leads vs Completed Leads) */}
        <motion.div variants={blockVariants} className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--crm-ink-soft)]/15 pb-2 font-mono">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setLeadTab('ACTIVE')}
              className={`px-4 py-2 text-xs font-bold uppercase rounded-sm transition cursor-pointer flex items-center gap-2 border ${
                leadTab === 'ACTIVE'
                  ? 'bg-teal-950/80 text-teal-400 border-teal-800/80 shadow-sm'
                  : 'bg-[var(--crm-bg-raised)]/30 text-[var(--crm-ink-faint)] border-transparent hover:text-[var(--crm-heading)]'
              }`}
            >
              <span>🔥 Active Leads Pipeline</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-teal-900/60 text-teal-200 border border-teal-700/40">
                {activeLeads.length}
              </span>
            </button>

            <button
              onClick={() => setLeadTab('COMPLETED')}
              className={`px-4 py-2 text-xs font-bold uppercase rounded-sm transition cursor-pointer flex items-center gap-2 border ${
                leadTab === 'COMPLETED'
                  ? 'bg-emerald-950/90 text-emerald-400 border-emerald-800/90 shadow-sm'
                  : 'bg-[var(--crm-bg-raised)]/30 text-[var(--crm-ink-faint)] border-transparent hover:text-[var(--crm-heading)]'
              }`}
            >
              <span>🏆 Lead Complete Section</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-900/60 text-emerald-200 border border-emerald-700/40">
                {completedLeads.length}
              </span>
            </button>

            <button
              onClick={() => setLeadTab('ALL')}
              className={`px-4 py-2 text-xs font-bold uppercase rounded-sm transition cursor-pointer flex items-center gap-2 border ${
                leadTab === 'ALL'
                  ? 'bg-[var(--crm-bg-raised)] text-[var(--crm-heading)] border-[var(--crm-ink-soft)]/30'
                  : 'bg-[var(--crm-bg-raised)]/30 text-[var(--crm-ink-faint)] border-transparent hover:text-[var(--crm-heading)]'
              }`}
            >
              <span>📁 All Inquiries Registry</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-soft)] border border-[var(--crm-ink-soft)]/20">
                {leads.length}
              </span>
            </button>

            <button
              onClick={() => setLeadTab('WORKLOAD')}
              className={`px-4 py-2 text-xs font-bold uppercase rounded-sm transition cursor-pointer flex items-center gap-2 border ${
                leadTab === 'WORKLOAD'
                  ? 'bg-sky-950/90 text-sky-300 border-sky-800/90 shadow-sm'
                  : 'bg-[var(--crm-bg-raised)]/30 text-[var(--crm-ink-faint)] border-transparent hover:text-[var(--crm-heading)]'
              }`}
            >
              <span>👥 Employee Workload Allocation</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] bg-sky-900/60 text-sky-200 border border-sky-700/40">
                {executiveWorkloadSummary.list.length} Members
              </span>
            </button>
          </div>

          {leadTab === 'COMPLETED' && (
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider bg-emerald-950/40 border border-emerald-900/30 px-3 py-1 rounded">
              ✓ Total Completed Valuation: ₹{completedLeads.reduce((s, l) => s + (l.leadValue || 0), 0).toLocaleString('en-IN')}
            </span>
          )}
        </motion.div>

        {/* Employee Lead Allocation Ribbon Matrix */}
        <motion.div variants={blockVariants} className="p-3 bg-[var(--crm-bg-sunken)]/60 border border-[var(--crm-ink-soft)]/15 rounded-sm font-mono text-xs shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiUsers className="text-sky-400" size={14} />
              <span className="text-[10px] text-[var(--crm-heading)] uppercase font-bold tracking-wider">
                Employee Lead Distribution Summary
              </span>
              <span className="text-[9px] text-[var(--crm-ink-faint)] hidden sm:inline">
                (Click any employee to filter their assigned leads)
              </span>
            </div>
            {filterAssignee !== 'ALL' && (
              <button
                onClick={() => setFilterAssignee('ALL')}
                className="text-[9px] text-rose-400 hover:underline uppercase font-bold cursor-pointer"
              >
                Clear Filter (Show All)
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
            {/* Unassigned Pill */}
            <button
              onClick={() => setFilterAssignee(filterAssignee === 'UNASSIGNED' ? 'ALL' : 'UNASSIGNED')}
              className={`px-3 py-1.5 rounded-sm border text-[10px] font-bold uppercase transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                filterAssignee === 'UNASSIGNED'
                  ? 'bg-amber-950 text-amber-300 border-amber-600 shadow-md ring-1 ring-amber-500'
                  : 'bg-amber-950/30 text-amber-400/90 border-amber-800/40 hover:bg-amber-950/60'
              }`}
            >
              <FiAlertCircle size={12} />
              <span>❓ Unassigned Pool</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-900/80 text-amber-200 font-mono font-bold">
                {executiveWorkloadSummary.unassigned.totalCount} Leads
              </span>
            </button>

            {/* Logged-in User Pill */}
            <button
              onClick={() => setFilterAssignee(filterAssignee === 'MY' ? 'ALL' : 'MY')}
              className={`px-3 py-1.5 rounded-sm border text-[10px] font-bold uppercase transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                filterAssignee === 'MY'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600 shadow-md ring-1 ring-emerald-500'
                  : 'bg-emerald-950/30 text-emerald-400/90 border-emerald-800/40 hover:bg-emerald-950/60'
              }`}
            >
              <FiUser size={12} />
              <span>👤 Assigned to Me</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-900/80 text-emerald-200 font-mono font-bold">
                {myLeadsCount} Leads
              </span>
            </button>

            {/* Team Executives Pills */}
            {executiveWorkloadSummary.list.map(emp => {
              const isSelected = String(filterAssignee) === String(emp.id);
              return (
                <button
                  key={emp.id}
                  onClick={() => setFilterAssignee(isSelected ? 'ALL' : emp.id)}
                  className={`px-3 py-1.5 rounded-sm border text-[10px] font-bold uppercase transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-sky-950 text-sky-300 border-sky-600 shadow-md ring-1 ring-sky-500'
                      : emp.totalCount > 0
                      ? 'bg-[var(--crm-bg-raised)] text-[var(--crm-heading)] border-[var(--crm-ink-soft)]/20 hover:border-sky-500/50'
                      : 'bg-[var(--crm-bg)] text-[var(--crm-ink-faint)] border-[var(--crm-ink-soft)]/10 opacity-60'
                  }`}
                >
                  <FiUserCheck size={12} className={emp.totalCount > 0 ? "text-sky-400" : "text-[var(--crm-ink-faint)]"} />
                  <span>{emp.name}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                    emp.totalCount > 0 ? 'bg-sky-950 text-sky-300 border border-sky-800/60' : 'bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)]'
                  }`}>
                    {emp.totalCount} Leads
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Search & Filter Controls */}
        <motion.div variants={blockVariants} className="p-4 bg-[var(--crm-bg-raised)]/20 border border-[var(--crm-ink-soft)]/15 rounded-sm flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full relative">
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--crm-ink-faint)]" size={14} />
            <input
              type="text"
              placeholder="Search leads by customer, code, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 text-xs rounded-sm outline-none text-[var(--crm-heading)] focus:border-[var(--crm-heading)]/40 placeholder-[var(--crm-ink-faint)]"
            />
          </div>
          <div className="relative w-full md:w-56">
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 text-xs rounded-sm outline-none cursor-pointer appearance-none text-[var(--crm-heading)] font-mono"
            >
              <option value="" className="bg-[var(--crm-bg)]">All Pipeline Stages</option>
              {stages.map(st => <option key={st} value={st} className="bg-[var(--crm-bg)] text-[var(--crm-ink-soft)]">{st.replace(/_/g, ' ')}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[var(--crm-ink-faint)]">
              <FiFilter size={12} />
            </div>
          </div>

          {/* Temperature Filters */}
          <div className="flex items-center gap-1.5 font-mono text-xs w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setFilterPriority('ALL')}
              className={`px-3 py-2 text-[10px] font-bold uppercase rounded-sm border transition cursor-pointer shrink-0 ${
                filterPriority === 'ALL'
                  ? 'bg-[var(--crm-bg-raised)] text-[var(--crm-heading)] border-[var(--crm-ink-soft)]/30'
                  : 'bg-[var(--crm-bg)] text-[var(--crm-ink-faint)] border-transparent hover:text-[var(--crm-heading)]'
              }`}
            >
              All Temp
            </button>
            <button
              onClick={() => setFilterPriority('HOT')}
              className={`px-3 py-2 text-[10px] font-bold uppercase rounded-sm border transition cursor-pointer flex items-center gap-1 shrink-0 ${
                filterPriority === 'HOT'
                  ? 'bg-rose-950/80 text-rose-400 border-rose-800/80'
                  : 'bg-[var(--crm-bg)] text-[var(--crm-ink-faint)] border-transparent hover:text-rose-400'
              }`}
            >
              🔥 Hot
            </button>
            <button
              onClick={() => setFilterPriority('WARM')}
              className={`px-3 py-2 text-[10px] font-bold uppercase rounded-sm border transition cursor-pointer flex items-center gap-1 shrink-0 ${
                filterPriority === 'WARM'
                  ? 'bg-amber-950/80 text-amber-400 border-amber-800/80'
                  : 'bg-[var(--crm-bg)] text-[var(--crm-ink-faint)] border-transparent hover:text-amber-400'
              }`}
            >
              ⚡ Warm
            </button>
            <button
              onClick={() => setFilterPriority('COLD')}
              className={`px-3 py-2 text-[10px] font-bold uppercase rounded-sm border transition cursor-pointer flex items-center gap-1 shrink-0 ${
                filterPriority === 'COLD'
                  ? 'bg-cyan-950/80 text-cyan-400 border-cyan-800/80'
                  : 'bg-[var(--crm-bg)] text-[var(--crm-ink-faint)] border-transparent hover:text-cyan-400'
              }`}
            >
              ❄️ Cold
            </button>
          </div>
        </motion.div>

        {/* MODE 1: DATA TABLE VIEW */}
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
                    <th className="py-3.5 px-5">Category & Region</th>
                    <th className="py-3.5 px-5 text-right">Valuation</th>
                    <th className="py-3.5 px-5 text-center">Pipeline Stage</th>
                    <th className="py-3.5 px-5 text-center">Executive / Owner</th>
                    <th className="py-3.5 px-5 text-center">LOI Status</th>
                    <th className="py-3.5 px-5 text-center">Direct Communication</th>
                    <th className="py-3.5 px-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--crm-ink-soft)]/10 text-xs">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={isManagerOrAdmin ? "10" : "9"} className="text-center py-16 opacity-40 font-mono uppercase tracking-widest text-[10px]">
                        No active inquiry manifests found for the selected date filter.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => {
                      const execName = typeof lead.assignedTo === 'object' && lead.assignedTo
                        ? (lead.assignedTo.fullName || lead.assignedTo.name || lead.assignedTo.email)
                        : (lead.assignedTo || 'Unassigned');

                      return (
                      <tr key={lead._id} className="hover:bg-[var(--crm-bg-raised)]/40 transition-colors">
                        {isManagerOrAdmin && (
                          <td className="py-3.5 px-4 text-center shrink-0 w-12">
                            <input
                              type="checkbox"
                              checked={selectedLeadIds.includes(lead._id)}
                              onChange={() => handleSelectLead(lead._id)}
                              className="cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="py-3.5 px-5 font-mono font-bold text-[var(--crm-heading)] whitespace-nowrap">{lead.leadCode}</td>
                        <td className="py-3.5 px-5 min-w-[160px]">
                          <div className="flex items-center gap-2">
                            <span className="font-serif text-sm text-[var(--crm-heading)]">{lead.customerName}</span>
                            {lead.priority === 'HOT' && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase font-mono bg-rose-950/80 text-rose-400 border border-rose-800/50">HOT 🔥</span>
                            )}
                            {lead.priority === 'WARM' && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase font-mono bg-amber-950/80 text-amber-400 border border-amber-800/50">WARM ⚡</span>
                            )}
                            {lead.priority === 'COLD' && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase font-mono bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">COLD ❄️</span>
                            )}
                          </div>
                          <div className="text-[10px] text-[var(--crm-ink-faint)] font-mono">{lead.companyName || 'Private Enterprise'}</div>
                        </td>
                        <td className="py-3.5 px-5">
                          <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/10 text-[var(--crm-ink-soft)] rounded-sm mr-2">
                            {lead.productCategory}
                          </span>
                          <span className="text-[10px] text-[var(--crm-ink-faint)] font-mono">{lead.country || 'IN'}</span>
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-[var(--crm-positive)]">
                          {lead.leadValue ? `₹${lead.leadValue.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          {['CLOSED_WON', 'DEAL_WON'].includes((lead.stage || '').toUpperCase()) ? (
                            <span className="px-2.5 py-1 border text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-950/80 border-emerald-800 text-emerald-400 rounded shadow-sm">
                              🏆 CLOSED WON
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 border text-[9px] font-mono font-bold uppercase bg-[var(--crm-bg-sunken)]/60 border-[var(--crm-ink-soft)]/10 text-[var(--crm-ink-soft)]">
                              {lead.stage?.replace(/_/g, ' ')}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-5 text-center font-mono text-[11px]">
                          {['CLOSED_WON', 'DEAL_WON'].includes((lead.stage || '').toUpperCase()) ? (
                            <div className="space-y-0.5">
                              <span className="text-emerald-400 font-bold block">
                                ✓ {execName}
                              </span>
                              <span className="text-[8px] text-emerald-500/80 uppercase font-mono block">Completed Deal Owner</span>
                            </div>
                          ) : (
                            <span className="text-[var(--crm-heading)] font-semibold">
                              {execName}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-center font-mono">
                          {lead.loiDocuments && lead.loiDocuments.length > 0 ? (
                            <div className="space-y-1">
                              <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-800 text-[8px] px-2 py-0.5 rounded font-bold uppercase inline-block">
                                ✓ LOI ({lead.loiDocuments.length})
                              </span>
                              {lead.loiDocuments.map((loi, i) => (
                                <a
                                  key={i}
                                  href={(() => {
                                    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
                                    const baseUrl = import.meta.env.VITE_API_URL || (isLocal ? 'http://localhost:5000/api' : 'https://indiatradeoverseas-ito.onrender.com/api');
                                    const token = localStorage.getItem('token') || '';
                                    return `${baseUrl}/leads/${lead._id}/loi/${i}?token=${encodeURIComponent(token)}`;
                                  })()}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block text-[9px] text-teal-400 hover:underline truncate max-w-[120px] mx-auto"
                                  title={loi.originalName}
                                >
                                  📄 {loi.originalName}
                                </a>
                              ))}
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setLoiTargetLeadId(lead._id);
                                setShowLOIModal(true);
                              }}
                              className="text-[9px] uppercase font-bold text-teal-400 hover:text-teal-300 bg-teal-950/40 border border-teal-800/40 px-2 py-1 rounded cursor-pointer transition"
                            >
                              + LOI
                            </button>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => triggerWhatsApp(lead.whatsAppNumber || lead.phone)}
                              className="p-1.5 bg-[var(--crm-positive-bg)] border border-[var(--crm-positive)]/30 text-[var(--crm-positive)] hover:bg-[var(--crm-positive-bg)] transition-all rounded-sm cursor-pointer"
                              title="Launch WhatsApp Chat"
                            >
                              <FiMessageSquare size={13} />
                            </button>
                            <button
                              onClick={() => triggerEmail(lead.email)}
                              className="p-1.5 bg-[var(--crm-info-bg)] border border-[var(--crm-info)]/30 text-[var(--crm-info)] hover:bg-[var(--crm-info-bg)] transition-all rounded-sm cursor-pointer"
                              title="Send Direct Email"
                            >
                              <FiMail size={13} />
                            </button>
                          </div>
                        </td>

                        <td className="py-3.5 px-5 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => {
                                setLoiTargetLeadId(lead._id);
                                setShowLOIModal(true);
                              }}
                              className="p-1.5 border border-teal-800/50 bg-teal-950/60 hover:bg-teal-900 text-teal-300 transition-all rounded-sm cursor-pointer"
                              title="Upload LOI for Lead"
                            >
                              <FiFileText size={13} />
                            </button>
                            <Link
                              to={`/crm/leads/${lead._id}`}
                              className="inline-flex p-1.5 border border-[var(--crm-ink-soft)]/20 bg-[var(--crm-bg)] hover:bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] hover:text-[var(--crm-heading)] transition-all rounded-sm"
                            >
                              <FiEye size={13} />
                            </Link>
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
                  const execName = typeof lead.assignedTo === 'object' && lead.assignedTo
                    ? (lead.assignedTo.fullName || lead.assignedTo.name || lead.assignedTo.email)
                    : (lead.assignedTo || 'Unassigned');

                  return (
                    <div key={lead._id} className="bg-[var(--crm-bg-raised)]/40 border border-[var(--crm-ink-soft)]/20 rounded p-3.5 space-y-3 text-left font-mono text-xs shadow-sm">
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
                          {lead.priority === 'HOT' && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase font-mono bg-rose-950/80 text-rose-400 border border-rose-800/50">HOT 🔥</span>
                          )}
                          {lead.priority === 'WARM' && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase font-mono bg-amber-950/80 text-amber-400 border border-amber-800/50">WARM ⚡</span>
                          )}
                          {lead.priority === 'COLD' && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase font-mono bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">COLD ❄️</span>
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
                          {lead.leadValue ? (
                            <span className="text-[11px] font-bold text-emerald-400 block mt-1">₹{lead.leadValue.toLocaleString('en-IN')}</span>
                          ) : null}
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
                        <div key={item._id} className="p-3 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 rounded-sm space-y-2 text-left hover:border-[var(--crm-heading)]/40 transition-all">
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
              className="bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/15 rounded-sm p-6 w-full max-w-xl shadow-2xl relative text-[var(--crm-ink-soft)]"
            >
              <div className="flex justify-between items-center mb-5 border-b border-[var(--crm-ink-soft)]/10 pb-4 text-left">
                <div>
                  <h2 className="text-base font-serif font-normal uppercase text-[var(--crm-heading)]">Provision New Lead Node</h2>
                  <p className="text-[9px] text-[var(--crm-ink-faint)] tracking-widest uppercase font-mono font-bold mt-1">Automated Trade Route Sequence</p>
                </div>
                <button type="button" onClick={() => setShowCreateModal(false)} className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] p-1 rounded-sm">
                  <FiX size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateLead} className="space-y-4 font-sans text-xs text-left max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Consignee Legal Name *</label>
                    <input type="text" required value={newLead.customerName} onChange={(e) => setNewLead({ ...newLead, customerName: e.target.value })} className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-xs rounded-sm outline-none text-[var(--crm-heading)]" placeholder="Corporate buyer identity" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Company Name</label>
                    <input type="text" value={newLead.companyName} onChange={(e) => setNewLead({ ...newLead, companyName: e.target.value })} className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-xs rounded-sm outline-none text-[var(--crm-heading)]" placeholder="Legal Enterprise Designation" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Country</label>
                    <input type="text" value={newLead.country} onChange={(e) => setNewLead({ ...newLead, country: e.target.value })} className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-xs rounded-sm outline-none text-[var(--crm-heading)]" placeholder="Target Region Hub" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Telephony Target *</label>
                    <input type="tel" required value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-xs rounded-sm outline-none text-[var(--crm-heading)]" placeholder="Protected telecom line" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">WhatsApp Vector</label>
                    <input type="tel" value={newLead.whatsAppNumber} onChange={(e) => setNewLead({ ...newLead, whatsAppNumber: e.target.value })} className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-xs rounded-sm outline-none text-[var(--crm-heading)]" placeholder="WhatsApp Line" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Corporate Email Coordinates</label>
                    <input type="email" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-xs rounded-sm outline-none text-[var(--crm-heading)]" placeholder="procurement@node.com" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Commodity Sector *</label>
                    <select required value={newLead.productCategory} onChange={(e) => setNewLead({ ...newLead, productCategory: e.target.value })} className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-xs rounded-sm outline-none text-[var(--crm-heading)]">
                      <option value="STONE">STONE</option>
                      <option value="COAL">COAL</option>
                      <option value="TEA">TEA</option>
                      <option value="RICE">RICE</option>
                      <option value="TRANSPORT">TRANSPORT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Valuation (INR)</label>
                    <input type="number" value={newLead.leadValue} onChange={(e) => setNewLead({ ...newLead, leadValue: e.target.value })} className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-xs rounded-sm outline-none text-[var(--crm-heading)]" placeholder="Deal Value" />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-[var(--crm-ink-soft)]/10 mt-4">
                  <button type="submit" className="flex-1 bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)] text-xs font-bold py-3 uppercase rounded-sm hover:bg-[var(--crm-ink-soft)] transition-colors cursor-pointer">
                    Commit Node Record
                  </button>
                  <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-soft)] text-xs font-bold py-3 rounded-sm transition-colors cursor-pointer">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Excel Spreadsheet Ingestion Modal */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/15 rounded-sm p-6 w-full max-w-4xl shadow-2xl relative text-[var(--crm-ink-soft)] flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-5 border-b border-[var(--crm-ink-soft)]/10 pb-4 text-left shrink-0">
                <div>
                  <h2 className="text-base font-serif font-normal uppercase text-[var(--crm-heading)]">Spreadsheet Bulk Ingestion</h2>
                  <p className="text-[9px] text-[var(--crm-ink-faint)] tracking-widest uppercase font-mono font-bold mt-1">Upload CSV / Excel sheets to parse and ingest lead records</p>
                </div>
                <button type="button" onClick={() => { setShowImportModal(false); setParsedRows([]); setColumnMappings({}); }} className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] p-1 rounded-sm cursor-pointer">
                  <FiX size={16} />
                </button>
              </div>

              {parsedRows.length === 0 ? (
                /* STEP 1: Upload Panel */
                <div className="flex-1 py-12 flex flex-col items-center justify-center border border-dashed border-[var(--crm-ink-soft)]/20 rounded-sm bg-[var(--crm-bg)]/20 group hover:border-teal-500/30 transition-colors relative min-h-[300px]">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FiUpload size={32} className="text-[var(--crm-ink-faint)] group-hover:text-teal-400 transition-colors mb-3" />
                  <p className="text-xs uppercase font-mono font-bold text-[var(--crm-ink-soft)] tracking-wider">Select CSV spreadsheet file</p>
                  <p className="text-[10px] text-[var(--crm-ink-faint)] mt-1">Click to browse or drag your file here (Max: 15MB)</p>
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
                    <div className="flex items-center gap-2">
                      {[
                        { value: 'HOT', label: 'HOT 🔥', style: 'bg-rose-950/60 text-rose-400 border-rose-800/60' },
                        { value: 'WARM', label: 'WARM ⚡', style: 'bg-amber-950/60 text-amber-400 border-amber-800/60' },
                        { value: 'COLD', label: 'COLD ❄️', style: 'bg-cyan-950/60 text-cyan-400 border-cyan-800/60' }
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
                          {parsedRows[0].map((_, colIdx) => (
                            <th key={colIdx} className="p-2 border-r border-[var(--crm-line)] min-w-[150px] bg-slate-900/40">
                              <select
                                value={columnMappings[colIdx] || ''}
                                onChange={(e) => setColumnMappings({ ...columnMappings, [colIdx]: e.target.value })}
                                className="w-full p-1 bg-black border border-[var(--crm-line)] rounded-sm text-[10px] text-[var(--crm-heading)] font-mono outline-none cursor-pointer"
                              >
                                <option value="">[Unmapped]</option>
                                {LEAD_FIELDS.map(f => (
                                  <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                              </select>
                            </th>
                          ))}
                        </tr>
                        {/* Excel coordinate letters and original CSV header name */}
                        <tr className="border-b border-[var(--crm-line)] text-slate-400">
                          <th className="p-2 border-r border-[var(--crm-line)] bg-slate-900/40 text-center font-mono font-bold">#</th>
                          {parsedRows[0].map((hdr, colIdx) => (
                            <th key={colIdx} className="p-2 border-r border-[var(--crm-line)] text-left font-mono font-semibold bg-slate-900/20">
                              <span className="text-[10px] text-teal-400 block mb-0.5">{getColumnLetter(colIdx)}</span>
                              <span className="truncate block font-sans text-xs text-[var(--crm-heading)]" title={hdr}>{hdr || '[Empty Column]'}</span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.slice(1, 51).map((row, rowIdx) => (
                          <tr key={rowIdx} className="border-b border-[var(--crm-line)] hover:bg-[var(--crm-bg-raised)]/20 transition-colors">
                            <td className="p-2 border-r border-[var(--crm-line)] bg-[var(--crm-bg-sunken)]/60 text-center font-mono font-bold text-[var(--crm-ink-faint)] select-none shrink-0 w-12">
                              {rowIdx + 1}
                            </td>
                            {row.map((cell, colIdx) => {
                              const isMapped = !!columnMappings[colIdx];
                              return (
                                <td 
                                  key={colIdx} 
                                  className={`p-2 border-r border-[var(--crm-line)] text-left truncate max-w-[200px] ${
                                    isMapped ? 'bg-teal-950/20 text-teal-300 font-medium border-l border-teal-500/20' : 'opacity-40 text-slate-400'
                                  }`}
                                  title={cell}
                                >
                                  {cell}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Actions footer inside Step 2 */}
                  <div className="flex items-center justify-between pt-4 border-t border-[var(--crm-ink-soft)]/10 shrink-0">
                    <p className="text-[11px] font-mono text-[var(--crm-ink-faint)]">
                      Total spreadsheet rows loaded: <strong className="text-[var(--crm-heading)]">{parsedRows.length - 1} records</strong>
                    </p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => { setParsedRows([]); setColumnMappings({}); }}
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

      {/* Call Recording Modal */}
      <CallRecordingModal
        isOpen={showCallModal}
        onClose={() => setShowCallModal(false)}
        leads={leads}
        onSuccess={() => fetchLeads()}
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
    </motion.div>
  );
}