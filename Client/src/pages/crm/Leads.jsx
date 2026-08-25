import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { leadsApi } from '../../api/leads';
import { adminApi } from '../../api/admin';
import { employeesApi } from '../../api/employees';
import { taskApi } from '../../api/task';
import {
  FiPlus, FiSearch, FiEye, FiFilter, FiDownload,
  FiClock, FiX, FiList, FiColumns, FiMessageSquare, FiMail,
  FiUpload, FiFileText, FiAlertCircle
} from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { DownloadButton } from '../../components/ui/AnimatedActionButton';

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
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Toggle between Table and Visual Kanban Board
  const [viewMode, setViewMode] = useState('TABLE'); // 'TABLE' | 'KANBAN'

  // Excel / CSV Import State
  const [showImportModal, setShowImportModal] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [columnMappings, setColumnMappings] = useState({});
  const [importing, setImporting] = useState(false);

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

  const filteredLeads = leads.filter(lead =>
    (lead.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lead.leadCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lead.companyName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* View Mode Toggle */}
          <div className="flex bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 rounded-sm p-1 font-mono text-[10px]">
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1.5 rounded-sm uppercase tracking-wider font-bold transition-all ${viewMode === 'TABLE' ? 'bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)]' : 'text-[var(--crm-ink-faint)] hover:text-[var(--crm-ink-soft)]'}`}
            >
              <FiList className="inline mr-1" /> Table
            </button>
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`px-3 py-1.5 rounded-sm uppercase tracking-wider font-bold transition-all ${viewMode === 'KANBAN' ? 'bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)]' : 'text-[var(--crm-ink-faint)] hover:text-[var(--crm-ink-soft)]'}`}
            >
              <FiColumns className="inline mr-1" /> Pipeline
            </button>
          </div>

          <DownloadButton
            action={handleExportLeads}
            className="bg-[var(--crm-bg)] text-[var(--crm-ink-soft)] border border-[var(--crm-ink-soft)]/20 text-[11px] uppercase tracking-widest font-semibold h-[42px] px-4 rounded-sm transition-all hover:bg-[var(--crm-bg-raised)] disabled:cursor-default"
            icon={FiDownload}
            iconSize={13}
            idleLabel="Export"
            busyLabel="Exporting..."
            doneLabel="Exported"
          />

          {isManagerOrAdmin && (
            <button 
              onClick={() => setShowImportModal(true)} 
              className="bg-[var(--crm-bg)] hover:bg-[var(--crm-bg-raised)] text-[var(--crm-heading)] border border-[var(--crm-ink-soft)]/20 text-[11px] uppercase tracking-widest font-bold h-[42px] px-4 rounded-sm flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <FiUpload size={13} /> <span>Import</span>
            </button>
          )}

          <button onClick={() => setShowCreateModal(true)} className="bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)] text-[11px] uppercase tracking-widest font-bold h-[42px] px-5 rounded-sm flex items-center space-x-1.5 transition-all hover:bg-[var(--crm-ink-soft)]">
            <FiPlus size={14} /> <span>New Lead</span>
          </button>
        </div>
      </motion.div>

      {/* Main Container Content */}
      <div className="w-full px-4 md:px-8 py-6 space-y-5 bg-[var(--crm-bg)]">

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
        </motion.div>

        {/* MODE 1: DATA TABLE VIEW */}
        {viewMode === 'TABLE' ? (
          <motion.div variants={blockVariants} className="border border-[var(--crm-ink-soft)]/15 overflow-hidden w-full bg-[var(--crm-bg-raised)]/10 rounded-sm shadow-2xl">
            <div className="overflow-x-auto w-full block custom-scrollbar">
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
                    <th className="py-3.5 px-5 text-center">Direct Communication</th>
                    <th className="py-3.5 px-5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--crm-ink-soft)]/10 text-xs">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={isManagerOrAdmin ? "8" : "7"} className="text-center py-16 opacity-40 font-mono uppercase tracking-widest text-[10px]">
                        No active inquiry manifests mapped.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
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
                        <td className="py-3.5 px-5 font-mono font-bold text-[var(--crm-heading)]">{lead.leadCode}</td>
                        <td className="py-3.5 px-5">
                          <div className="font-serif text-sm text-[var(--crm-heading)]">{lead.customerName}</div>
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
                          <span className="px-2 py-0.5 border text-[9px] font-mono font-bold uppercase bg-[var(--crm-bg-sunken)]/60 border-[var(--crm-ink-soft)]/10 text-[var(--crm-ink-soft)]">
                            {lead.stage?.replace(/_/g, ' ')}
                          </span>
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
                          <Link
                            to={`/crm/leads/${lead._id}`}
                            className="inline-flex p-2 border border-[var(--crm-ink-soft)]/20 bg-[var(--crm-bg)] hover:bg-[var(--crm-bg-raised)] text-[var(--crm-ink-soft)] hover:text-[var(--crm-heading)] transition-all rounded-sm"
                          >
                            <FiEye size={13} />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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

    </motion.div>
  );
}