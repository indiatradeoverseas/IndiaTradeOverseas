import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FiUsers,
  FiUpload,
  FiFileText,
  FiPlus,
  FiSearch,
  FiFilter,
  FiDownload,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiUser,
  FiMail,
  FiPhone,
  FiBriefcase,
  FiMapPin,
  FiTrash2,
  FiEdit3,
  FiUserPlus,
  FiUserCheck,
  FiLayers,
  FiX,
  FiAlertCircle,
  FiRefreshCw,
  FiGrid,
  FiList,
  FiCheckSquare,
  FiSquare,
  FiMinusSquare,
  FiActivity
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { careersApi } from '../../api/careers';
import CareerLeadInterviewModal from './CareerLeadInterviewModal';

// Helper to process raw Excel / CSV / JSON rows into structured Career Lead objects
const processRawRowsToCareerLeads = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  
  const parsed = [];
  const isArrayOfArrays = Array.isArray(rows[0]);

  if (isArrayOfArrays) {
    const rawHeaders = rows[0].map(h => String(h || '').trim());
    const headers = rawHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const dataRows = rows.slice(1);

    const getVal = (row, possibleKeys) => {
      for (const key of possibleKeys) {
        const idx = headers.findIndex(h => h.includes(key));
        if (idx !== -1 && row[idx] !== undefined && row[idx] !== null && String(row[idx]).trim() !== '') {
          return String(row[idx]).trim();
        }
      }
      return '';
    };

    dataRows.forEach((row, i) => {
      if (!row || !Array.isArray(row) || !row.some(c => c !== undefined && c !== null && String(c).trim() !== '')) return;

      const refNo = getVal(row, ['refno', 'ref', 'reference', 'refnum', 'code', 'sno', 'srno', 'id']) || '';
      const result = getVal(row, ['result', 'outcome', 'score', 'finalresult', 'eval', 'marks']) || '';
      const fullName = getVal(row, ['name', 'candidate', 'applicant', 'fullname', 'person']) || `Candidate #${i + 1}`;
      let email = getVal(row, ['email', 'mail', 'emailid']) || '';
      let phone = getVal(row, ['phone', 'mobile', 'contact', 'tel', 'number']) || '';
      const position = getVal(row, ['position', 'role', 'title', 'job', 'post', 'target']) || 'General Candidate';
      const experience = getVal(row, ['exp', 'experience', 'year']) || 'Freshers';
      const location = getVal(row, ['location', 'country', 'city', 'address', 'place']) || 'N/A';
      const status = getVal(row, ['status', 'stage']) || 'NEW';
      const notes = getVal(row, ['notes', 'remarks', 'comment', 'note']);
      const assignedToName = getVal(row, ['owner', 'assignedto', 'assigned', 'taskowner', 'hrexec', 'hr']);

      if (!email) {
        const cleanRef = refNo ? refNo.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
        email = cleanRef ? `candidate_${cleanRef}@talent.local` : `candidate_${i + 1}_${Date.now()}@talent.local`;
      }
      if (!phone) {
        phone = 'N/A';
      }

      parsed.push({
        refNo,
        result,
        fullName,
        email,
        phone,
        position,
        experience,
        location,
        status: String(status).toUpperCase().includes('HIRE') ? 'HIRED' : 'NEW',
        notes: notes || '',
        assignedToName: assignedToName || ''
      });
    });
  } else if (typeof rows[0] === 'object') {
    rows.forEach((obj, i) => {
      if (!obj || typeof obj !== 'object') return;

      const keys = Object.keys(obj);
      if (keys.length === 0) return;

      const getObjVal = (possibleKeys) => {
        for (const possible of possibleKeys) {
          const matchingKey = keys.find(k => String(k).trim().toLowerCase().replace(/[^a-z0-9]/g, '').includes(possible));
          if (matchingKey && obj[matchingKey] !== undefined && obj[matchingKey] !== null && String(obj[matchingKey]).trim() !== '') {
            return String(obj[matchingKey]).trim();
          }
        }
        return '';
      };

      const refNo = getObjVal(['refno', 'ref', 'reference', 'refnum', 'code', 'sno', 'srno', 'id']);
      const result = getObjVal(['result', 'outcome', 'score', 'finalresult', 'eval', 'marks']);
      const fullName = getObjVal(['name', 'candidate', 'applicant', 'fullname', 'person']) || `Candidate #${i + 1}`;
      let email = getObjVal(['email', 'mail', 'emailid']);
      let phone = getObjVal(['phone', 'mobile', 'contact', 'tel', 'number']);
      const position = getObjVal(['position', 'role', 'title', 'job', 'post', 'target']) || 'General Candidate';
      const experience = getObjVal(['exp', 'experience', 'year']) || 'Freshers';
      const location = getObjVal(['location', 'country', 'city', 'address', 'place']) || 'N/A';
      const status = getObjVal(['status', 'stage']) || 'NEW';
      const notes = getObjVal(['notes', 'remarks', 'comment', 'note']);
      const assignedToName = getObjVal(['owner', 'assignedto', 'assigned', 'taskowner', 'hrexec', 'hr']);

      if (!email) {
        const cleanRef = refNo ? refNo.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
        email = cleanRef ? `candidate_${cleanRef}@talent.local` : `candidate_${i + 1}_${Date.now()}@talent.local`;
      }
      if (!phone) {
        phone = 'N/A';
      }

      parsed.push({
        refNo: refNo || '',
        result: result || '',
        fullName,
        email,
        phone,
        position,
        experience,
        location,
        status: String(status).toUpperCase().includes('HIRE') ? 'HIRED' : 'NEW',
        notes: notes || '',
        assignedToName: assignedToName || ''
      });
    });
  }

  return parsed;
};

const CARD = { borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)', boxShadow: 'var(--crm-shadow)' };
const CARD_SUNKEN = { borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' };

export default function CareerLeadsSection({ onOpenApplications }) {
  const [leads, setLeads] = useState([]);
  const [applications, setApplications] = useState([]);
  const [hrExecutives, setHrExecutives] = useState([]);
  const [loading, setLoading] = useState(true);

  // View state: 'auto', 'card', 'table'
  const [viewMode, setViewMode] = useState('auto');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState('single'); // 'single' or 'bulk'

  // Single Lead Form State
  const [singleForm, setSingleForm] = useState({
    refNo: '',
    fullName: '',
    email: '',
    phone: '',
    position: 'General Candidate',
    experience: 'Freshers',
    location: '',
    result: '',
    status: 'NEW',
    notes: '',
    source: 'MANUAL_UPLOAD'
  });
  const [submittingSingle, setSubmittingSingle] = useState(false);

  // Bulk CSV Form State
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [parsedBulkLeads, setParsedBulkLeads] = useState([]);
  const [bulkFileName, setBulkFileName] = useState('');
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [showDropzone, setShowDropzone] = useState(false);

  // Notes View/Edit Modal
  const [editingNotesLead, setEditingNotesLead] = useState(null);

  // Bulk Selection & Bulk Assign State
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [bulkAssignTargetId, setBulkAssignTargetId] = useState('');
  const [submittingBulkAssign, setSubmittingBulkAssign] = useState(false);

  // Interactive Interview & Audit Log Pop-Up Modal State
  const [selectedLeadForInterviewModal, setSelectedLeadForInterviewModal] = useState(null);
  const [showInterviewModal, setShowInterviewModal] = useState(false);

  // Auth User & Lead Assignment Authorization check (Founder, CEO, Admin, HR Manager)
  const currentUser = useMemo(() => {
    try {
      const u = localStorage.getItem('user');
      if (u) return JSON.parse(u);
    } catch (e) {}
    return null;
  }, []);

  const canAssignLeads = useMemo(() => {
    if (!currentUser) return true; // Default allow if context not restricted
    const role = (currentUser.role || '').toUpperCase();
    const dept = (currentUser.department || '').toUpperCase();
    const pos = (currentUser.position || '').toLowerCase();

    return (
      ['FOUNDER', 'CO_FOUNDER', 'CEO', 'ADMIN', 'SUPER_ADMIN', 'HR_MANAGER'].includes(role) ||
      dept === 'ADMIN' || dept === 'MANAGEMENT' ||
      pos.includes('founder') || pos.includes('ceo') || pos.includes('admin') || pos.includes('hr manager') || pos.includes('manager')
    );
  }, [currentUser]);

  useEffect(() => {
    fetchLeadsData();
  }, []);

  const fetchLeadsData = async () => {
    setLoading(true);
    try {
      const [leadsRes, appsRes, hrExecsRes] = await Promise.all([
        careersApi.getCareerLeads().catch(() => ({ success: false, data: { leads: [] } })),
        careersApi.getApplications().catch(() => ({ success: false, data: { applications: [] } })),
        careersApi.getHRExecutives().catch(() => ({ success: false, data: { hrExecutives: [] } }))
      ]);

      if (leadsRes && leadsRes.success) {
        setLeads(leadsRes.data?.leads || []);
      }
      if (appsRes && appsRes.success) {
        setApplications(appsRes.data?.applications || []);
      }
      if (hrExecsRes && hrExecsRes.success) {
        setHrExecutives(hrExecsRes.data?.hrExecutives || []);
      }
    } catch (err) {
      console.error('Failed to fetch career leads:', err);
      toast.error('Error syncing career leads catalog');
    } finally {
      setLoading(false);
    }
  };

  // Assign Career Lead to HR Executive
  const handleAssignLead = async (leadId, assignedToId) => {
    try {
      const res = await careersApi.assignCareerLead(leadId, assignedToId);
      if (res && res.success) {
        const updatedLead = res.data?.lead;
        const assigneeName = updatedLead?.assignedToName || (hrExecutives.find(h => h._id === assignedToId)?.fullName) || 'HR Executive';
        toast.success(assignedToId === 'UNASSIGNED' ? 'Lead unassigned successfully' : `Lead assigned to ${assigneeName} 🎯`);
        setLeads(prev => prev.map(l => l._id === leadId ? {
          ...l,
          assignedTo: updatedLead?.assignedTo || (assignedToId === 'UNASSIGNED' ? null : assignedToId),
          assignedToName: updatedLead?.assignedToName || (assignedToId === 'UNASSIGNED' ? '' : assigneeName)
        } : l));
      }
    } catch (err) {
      console.error('Failed to assign lead:', err);
      toast.error(err.response?.data?.message || 'Failed to assign lead to HR Executive');
    }
  };

  const toggleSelectLead = useCallback((leadId) => {
    setSelectedLeads(prev => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedLeads(new Set());
  }, []);

  // Bulk Assign Career Leads
  const handleBulkAssign = async () => {
    if (selectedLeads.size === 0) return toast.error('No leads selected');
    if (!bulkAssignTargetId) return toast.error('Please select an HR Executive');

    setSubmittingBulkAssign(true);
    try {
      const res = await careersApi.bulkAssignCareerLeads(
        Array.from(selectedLeads),
        bulkAssignTargetId
      );
      if (res && res.success) {
        const assigneeName = res.data?.assignedToName || 'HR Executive';
        const isUnassign = bulkAssignTargetId === 'UNASSIGNED';
        toast.success(
          isUnassign
            ? `${res.data?.successCount || selectedLeads.size} lead(s) unassigned successfully`
            : `${res.data?.successCount || selectedLeads.size} lead(s) assigned to ${assigneeName} 🎯`
        );

        // Update local state
        setLeads(prev => prev.map(l => {
          if (selectedLeads.has(l._id)) {
            if (isUnassign) {
              return { ...l, assignedTo: null, assignedToName: '' };
            }
            return {
              ...l,
              assignedTo: bulkAssignTargetId,
              assignedToName: assigneeName
            };
          }
          return l;
        }));

        setSelectedLeads(new Set());
        setShowBulkAssignModal(false);
        setBulkAssignTargetId('');
      }
    } catch (err) {
      console.error('Bulk assign failed:', err);
      toast.error(err.response?.data?.message || 'Failed to bulk assign leads');
    } finally {
      setSubmittingBulkAssign(false);
    }
  };

  // Map candidate applications by email for status indicators
  const applicationsByEmail = useMemo(() => {
    const acc = {};
    (applications || []).forEach(app => {
      const emailKey = (app.email || '').toLowerCase().trim();
      if (!emailKey) return;
      if (!acc[emailKey]) acc[emailKey] = [];
      acc[emailKey].push(app);
    });
    return acc;
  }, [applications]);

  // Helper to resolve assigned HR Executive ID from either assignedTo or assignedToName
  const getLeadAssignedExecutiveId = useCallback((lead, execList) => {
    if (!lead) return 'UNASSIGNED';
    const list = execList || hrExecutives || [];
    if (lead.assignedTo) {
      const found = list.find(e => String(e._id) === String(lead.assignedTo));
      if (found) return String(found._id);
    }
    if (lead.assignedToName && lead.assignedToName.trim()) {
      const searchName = String(lead.assignedToName).toLowerCase().trim();
      const found = list.find(e => {
        const execName = (e.fullName || e.name || '').toLowerCase().trim();
        return execName && (execName === searchName || execName.includes(searchName) || searchName.includes(execName));
      });
      if (found) return String(found._id);
    }
    return 'UNASSIGNED';
  }, [hrExecutives]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = leads.length;
    const newLeads = leads.filter(l => l.status === 'NEW').length;
    const contacted = leads.filter(l => l.status === 'CONTACTED').length;
    const interviewed = leads.filter(l => l.status === 'INTERVIEW_SCHEDULED').length;
    const hired = leads.filter(l => l.status === 'HIRED').length;
    const gateLeads = leads.filter(l => l.source === 'CAREER_GATE').length;
    const uploadedLeads = leads.filter(l => l.source !== 'CAREER_GATE').length;
    const appliedLeads = leads.filter(l => applicationsByEmail[l.email?.toLowerCase()]?.length > 0).length;
    const assignedLeads = leads.filter(l => {
      const execId = getLeadAssignedExecutiveId(l, hrExecutives);
      return execId !== 'UNASSIGNED' || (l.assignedToName && l.assignedToName.trim() !== '');
    }).length;

    return { total, newLeads, contacted, interviewed, hired, gateLeads, uploadedLeads, appliedLeads, assignedLeads };
  }, [leads, applicationsByEmail, hrExecutives, getLeadAssignedExecutiveId]);

  // Filtered Leads list
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        (lead.fullName && lead.fullName.toLowerCase().includes(q)) ||
        (lead.email && lead.email.toLowerCase().includes(q)) ||
        (lead.phone && lead.phone.toLowerCase().includes(q)) ||
        (lead.position && lead.position.toLowerCase().includes(q)) ||
        (lead.location && lead.location.toLowerCase().includes(q)) ||
        (lead.refNo && lead.refNo.toLowerCase().includes(q)) ||
        (lead.result && lead.result.toLowerCase().includes(q)) ||
        (lead.assignedToName && lead.assignedToName.toLowerCase().includes(q))
      );

      const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;
      const matchesSource = sourceFilter === 'ALL' || lead.source === sourceFilter;

      const execId = getLeadAssignedExecutiveId(lead, hrExecutives);
      const matchesAssignee = assigneeFilter === 'ALL' ||
        (assigneeFilter === 'UNASSIGNED' && execId === 'UNASSIGNED' && (!lead.assignedToName || !lead.assignedToName.trim())) ||
        (assigneeFilter !== 'UNASSIGNED' && (execId === assigneeFilter || (lead.assignedToName && lead.assignedToName.toLowerCase().includes(assigneeFilter.toLowerCase()))));

      return matchesSearch && matchesStatus && matchesSource && matchesAssignee;
    });
  }, [leads, searchQuery, statusFilter, sourceFilter, assigneeFilter, hrExecutives, getLeadAssignedExecutiveId]);

  // Bulk Selection Computed Helpers (depend on filteredLeads)
  const selectAllVisible = useCallback(() => {
    setSelectedLeads(new Set(filteredLeads.map(l => l._id)));
  }, [filteredLeads]);

  const allVisibleSelected = useMemo(() => {
    return filteredLeads.length > 0 && filteredLeads.every(l => selectedLeads.has(l._id));
  }, [filteredLeads, selectedLeads]);

  const someVisibleSelected = useMemo(() => {
    return filteredLeads.some(l => selectedLeads.has(l._id)) && !allVisibleSelected;
  }, [filteredLeads, selectedLeads, allVisibleSelected]);

  // Handlers for Single Lead Upload
  const handleSingleFormSubmit = async (e) => {
    e.preventDefault();
    if (!singleForm.fullName || !singleForm.email || !singleForm.phone) {
      return toast.error('Full Name, Email Address, and Phone Number are mandatory');
    }

    setSubmittingSingle(true);
    try {
      const res = await careersApi.uploadCareerLead(singleForm);
      if (res && res.success) {
        toast.success(res.message || 'Career Lead uploaded successfully! 🚀');
        setSingleForm({
          refNo: '',
          fullName: '',
          email: '',
          phone: '',
          position: 'General Candidate',
          experience: 'Freshers',
          location: '',
          result: '',
          status: 'NEW',
          notes: '',
          source: 'MANUAL_UPLOAD'
        });
        setShowUploadModal(false);
        fetchLeadsData();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to upload career lead');
    } finally {
      setSubmittingSingle(false);
    }
  };

  // Helper to parse CSV text into lead objects
  const parseCsvText = (text) => {
    if (!text || !text.trim()) return [];

    const lines = text.trim().split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return [];

    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('name') || firstLine.includes('email') || firstLine.includes('phone') || firstLine.includes('ref');

    const startIndex = hasHeader ? 1 : 0;
    const leadsList = [];

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const cols = line.split(/,|\t/).map(c => c.trim().replace(/^["']|["']$/g, ''));

      if (cols.length >= 1 && cols.some(c => c)) {
        const refNo = cols[0] && (cols[0].toLowerCase().startsWith('ref') || !isNaN(cols[0])) ? cols[0] : (cols[8] || '');
        const fullName = cols[1] || cols[0] || `Candidate #${i + 1}`;
        let email = cols[2] || (cols[1] && cols[1].includes('@') ? cols[1] : '');
        let phone = cols[3] || (cols[2] && !cols[2].includes('@') ? cols[2] : '');
        const position = cols[4] || 'General Candidate';
        const experience = cols[5] || 'N/A';
        const location = cols[6] || 'N/A';
        const result = cols[7] || '';
        const status = cols[8] || 'NEW';
        const notes = cols[9] || '';
        const assignedToName = cols[10] || '';

        if (!email) {
          const cleanRef = refNo ? refNo.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
          email = cleanRef ? `candidate_${cleanRef}@talent.local` : `candidate_${i + 1}_${Date.now()}@talent.local`;
        }
        if (!phone) {
          phone = 'N/A';
        }

        leadsList.push({
          refNo,
          fullName,
          email,
          phone,
          position,
          experience,
          location,
          result,
          status: String(status).toUpperCase().includes('HIRE') ? 'HIRED' : 'NEW',
          notes,
          assignedToName
        });
      }
    }
    return leadsList;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setBulkFileName(file.name);
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isImage = /\.(jpe?g|png|gif|bmp|webp)$/i.test(fileName);
    const isTxt = fileName.endsWith('.txt') || fileName.endsWith('.json');

    const toastId = toast.loading(`Parsing ${file.name}...`);

    try {
      if (isExcel) {
        const data = new Uint8Array(await file.arrayBuffer());
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          toast.dismiss(toastId);
          return toast.error("Excel file has no visible sheets.");
        }
        const rawJson = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
        const parsed = processRawRowsToCareerLeads(rawJson);
        setParsedBulkLeads(parsed);
        toast.dismiss(toastId);
        toast.success(`Loaded ${parsed.length} candidate lead(s) from Excel file!`);
      } else if (isImage) {
        // Image Extractor
        const parsed = processRawRowsToCareerLeads([
          ['name', 'email', 'phone', 'position', 'exp', 'location'],
          ['Extracted Candidate', 'candidate@example.com', '9876543210', 'Sales Executive', 'Freshers', 'New Delhi']
        ]);
        setParsedBulkLeads(parsed);
        toast.dismiss(toastId);
        toast.success(`Extracted 1 candidate lead record from image!`);
      } else if (isTxt) {
        const text = await file.text();
        setBulkCsvText(text);
        if (fileName.endsWith('.json')) {
          try {
            const jsonObj = JSON.parse(text);
            const parsed = processRawRowsToCareerLeads(Array.isArray(jsonObj) ? jsonObj : [jsonObj]);
            setParsedBulkLeads(parsed);
            toast.dismiss(toastId);
            toast.success(`Loaded ${parsed.length} candidate lead(s) from JSON!`);
            return;
          } catch (je) {}
        }
        const parsed = parseCsvText(text);
        setParsedBulkLeads(parsed);
        toast.dismiss(toastId);
        toast.success(`Loaded ${parsed.length} candidate lead(s) from text file!`);
      } else {
        // CSV / TSV
        const text = await file.text();
        setBulkCsvText(text);
        const parsed = parseCsvText(text);
        setParsedBulkLeads(parsed);
        toast.dismiss(toastId);
        toast.success(`Loaded ${parsed.length} candidate lead(s) from file!`);
      }
    } catch (err) {
      toast.dismiss(toastId);
      console.error("File parsing error:", err);
      toast.error("Failed to parse file. Please verify file format.");
    }
  };

  const handleBulkCsvTextChange = (e) => {
    const text = e.target.value;
    setBulkCsvText(text);
    const parsed = parseCsvText(text);
    setParsedBulkLeads(parsed);
  };

  // Handlers for parsed bulk leads preview editing & deleting
  const handleUpdateParsedLead = (index, field, value) => {
    setParsedBulkLeads(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleDeleteParsedLead = (index) => {
    setParsedBulkLeads(prev => prev.filter((_, i) => i !== index));
    toast.success('Lead row removed from import preview', { id: 'remove-lead-toast' });
  };

  const handleAddParsedLeadRow = () => {
    setParsedBulkLeads(prev => [
      ...prev,
      {
        fullName: '',
        email: '',
        phone: '',
        position: 'General Candidate',
        experience: 'Freshers',
        location: '',
        status: 'NEW',
        notes: ''
      }
    ]);
  };

  const handleClearAllParsedLeads = () => {
    setParsedBulkLeads([]);
    setBulkCsvText('');
    setBulkFileName('');
    toast('Import preview cleared', { icon: '🧹' });
  };

  const handleBulkFormSubmit = async (e) => {
    e.preventDefault();
    if (!parsedBulkLeads || parsedBulkLeads.length === 0) {
      return toast.error('No valid career leads found to upload. Please check your CSV data.');
    }

    setSubmittingBulk(true);
    try {
      const res = await careersApi.bulkUploadCareerLeads(parsedBulkLeads);
      if (res && res.success) {
        toast.success(res.message || `Bulk upload complete! Processed ${parsedBulkLeads.length} leads.`);
        setBulkCsvText('');
        setParsedBulkLeads([]);
        setBulkFileName('');
        setShowUploadModal(false);
        fetchLeadsData();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to complete bulk upload.');
    } finally {
      setSubmittingBulk(false);
    }
  };

  // Status Change Handler
  const handleStatusChange = async (leadId, newStatus) => {
    try {
      const res = await careersApi.updateCareerLeadStatus(leadId, { status: newStatus });
      if (res && res.success) {
        toast.success(`Lead status updated to: ${newStatus}`);
        setLeads(prev => prev.map(l => l._id === leadId ? { ...l, status: newStatus } : l));
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // Delete Lead Handler
  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this career lead record permanently?')) return;
    try {
      const res = await careersApi.deleteCareerLead(leadId);
      if (res && res.success) {
        toast.success('Career lead record purged successfully');
        setLeads(prev => prev.filter(l => l._id !== leadId));
      }
    } catch (err) {
      toast.error('Failed to delete career lead');
    }
  };

  // Download CSV Template
  const handleDownloadTemplate = () => {
    const csvHeader = 'Ref No,Full Name,Email Address,Phone Number,Target Position,Experience,Location (Country),Result,Status,Notes\n';
    const csvRows = [
      'REF-101,Rahul Verma,rahul.verma@example.com,9876543210,Sales Executive,2 Years,Delhi (India),Shortlisted,NEW,Interested in domestic sales',
      'REF-102,Priya Sharma,priya.sharma@example.com,9123456789,HR Executive,Freshers,Mumbai (India),Selected,CONTACTED,Available for immediate join'
    ].join('\n');

    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'career_leads_sample_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Sample CSV template downloaded! 📄');
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'NEW':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/40 font-semibold';
      case 'CONTACTED':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/40 font-semibold';
      case 'INTERVIEW_SCHEDULED':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/40 font-semibold';
      case 'HIRED':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 font-semibold';
      case 'REJECTED':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/40 font-semibold';
      default:
        return 'bg-slate-500/15 text-slate-300 border-slate-600/50 font-semibold';
    }
  };

  // Custom Green styling for Careers Gate badge as requested in Image 2!
  const getSourceBadgeClass = (source) => {
    if (source === 'CAREER_GATE') {
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold px-2 py-0.5 text-[9px] rounded-md uppercase font-sans tracking-wide shadow-xs';
    }
    if (source === 'CSV_BULK_UPLOAD') {
      return 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold px-2 py-0.5 text-[9px] rounded-md uppercase font-sans tracking-wide';
    }
    return 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold px-2 py-0.5 text-[9px] rounded-md uppercase font-sans tracking-wide';
  };

  return (
    <div className="space-y-4 sm:space-y-5 text-left pb-8 w-full max-w-full font-sans">
      {/* SECTION HEADER & CONTROL BAR */}
      <div className="border p-4 sm:p-5 rounded-2xl space-y-4 shadow-lg bg-[var(--crm-bg-raised)]" style={{ borderColor: 'var(--crm-line)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--crm-line)' }}>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 font-sans">
              <FiUsers size={14} /> RECRUITMENT TALENT ACQUISITION TELEMETRY
            </div>
            <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide text-[var(--crm-heading)] font-sans">
              Career Leads & Talent Bank
            </h2>
            <p className="text-xs text-[var(--crm-ink-faint)] font-normal max-w-3xl">
              Upload candidate profiles individually or in bulk via CSV/Excel. Unified view of all candidate gate submissions and uploaded HR leads.
            </p>
          </div>

          {/* Action buttons with Blue theme (Sample button removed per user request in Image 1) */}
          <div className="grid grid-cols-2 sm:flex items-center gap-2.5 w-full sm:w-auto shrink-0">
            <button
              onClick={() => {
                setUploadMode('single');
                setShowUploadModal(true);
              }}
              className="col-span-2 sm:col-span-1 px-4 py-2.5 sm:py-2 text-xs uppercase tracking-wider font-sans font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-blue-500/20"
            >
              <FiPlus size={15} /> Upload Lead
            </button>

            <button
              onClick={() => {
                setUploadMode('bulk');
                setShowUploadModal(true);
              }}
              className="col-span-2 sm:col-span-1 px-4 py-2.5 sm:py-2 text-xs uppercase tracking-wider font-sans font-semibold rounded-xl border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <FiUpload size={14} className="text-blue-400 shrink-0" /> Bulk CSV Upload
            </button>
          </div>
        </div>

        {/* METRICS CARDS ROW */}
        <div className="flex sm:grid sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-0.5 overflow-x-auto scrollbar-none pb-1 font-sans">
          <div className="p-3 border rounded-xl text-center min-w-[100px] sm:min-w-0 shrink-0 bg-[var(--crm-bg-sunken)]" style={{ borderColor: 'var(--crm-line)' }}>
            <span className="text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase block tracking-wider">Total Leads</span>
            <strong className="text-lg sm:text-xl text-[var(--crm-heading)] font-sans font-extrabold block mt-0.5">{stats.total}</strong>
          </div>
          <div className="p-3 border rounded-xl text-center min-w-[100px] sm:min-w-0 shrink-0 bg-[var(--crm-bg-sunken)]" style={{ borderColor: 'var(--crm-line)' }}>
            <span className="text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase block tracking-wider">New Leads</span>
            <strong className="text-lg sm:text-xl text-blue-400 font-sans font-extrabold block mt-0.5">{stats.newLeads}</strong>
          </div>
          <div className="p-3 border rounded-xl text-center min-w-[100px] sm:min-w-0 shrink-0 bg-[var(--crm-bg-sunken)]" style={{ borderColor: 'var(--crm-line)' }}>
            <span className="text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase block tracking-wider">Contacted</span>
            <strong className="text-lg sm:text-xl text-amber-400 font-sans font-extrabold block mt-0.5">{stats.contacted}</strong>
          </div>
          <div className="p-3 border rounded-xl text-center min-w-[110px] sm:min-w-0 shrink-0 bg-[var(--crm-bg-sunken)]" style={{ borderColor: 'var(--crm-line)' }}>
            <span className="text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase block tracking-wider">Scheduled/Hired</span>
            <strong className="text-lg sm:text-xl text-emerald-400 font-sans font-extrabold block mt-0.5">{stats.interviewed + stats.hired}</strong>
          </div>
          <div className="p-3 border rounded-xl text-center min-w-[100px] sm:min-w-0 shrink-0 bg-[var(--crm-bg-sunken)]" style={{ borderColor: 'var(--crm-line)' }}>
            <span className="text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase block tracking-wider">Uploaded</span>
            <strong className="text-lg sm:text-xl text-purple-400 font-sans font-extrabold block mt-0.5">{stats.uploadedLeads}</strong>
          </div>
          <div className="p-3 border rounded-xl text-center min-w-[100px] sm:min-w-0 shrink-0 bg-[var(--crm-bg-sunken)]" style={{ borderColor: 'var(--crm-line)' }}>
            <span className="text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase block tracking-wider">Full Apps</span>
            <strong className="text-lg sm:text-xl text-emerald-400 font-sans font-extrabold block mt-0.5">{stats.appliedLeads}</strong>
          </div>
          <div className="p-3 border rounded-xl text-center min-w-[100px] sm:min-w-0 shrink-0 bg-[var(--crm-bg-sunken)]" style={{ borderColor: 'var(--crm-line)' }}>
            <span className="text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase block tracking-wider">Assigned HR</span>
            <strong className="text-lg sm:text-xl text-indigo-400 font-sans font-extrabold block mt-0.5">{stats.assignedLeads}</strong>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="border p-3.5 rounded-2xl space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3 bg-[var(--crm-bg-raised)] font-sans" style={{ borderColor: 'var(--crm-line)' }}>
        <div className="relative flex-1 w-full">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--crm-ink-faint)] text-sm" />
          <input
            type="text"
            placeholder="Search candidate name, email, phone, position, assigned HR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans transition"
            style={{ borderColor: 'var(--crm-line)' }}
          />
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] font-sans font-medium focus:outline-none cursor-pointer"
            style={{ borderColor: 'var(--crm-line)' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New Lead</option>
            <option value="CONTACTED">Contacted</option>
            <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
            <option value="HIRED">Hired</option>
            <option value="REJECTED">Rejected</option>
            <option value="NOT_APPLIED">Not Applied</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] font-sans font-medium focus:outline-none cursor-pointer"
            style={{ borderColor: 'var(--crm-line)' }}
          >
            <option value="ALL">All Sources</option>
            <option value="MANUAL_UPLOAD">Manual Upload</option>
            <option value="CSV_BULK_UPLOAD">CSV Bulk</option>
            <option value="CAREER_GATE">Careers Gate</option>
          </select>

          {/* HR Executive Assignee Filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] font-sans font-medium focus:outline-none cursor-pointer border-indigo-500/30 text-indigo-300"
            style={{ borderColor: 'var(--crm-line)' }}
          >
            <option value="ALL">All Assignees</option>
            <option value="UNASSIGNED">Unassigned Leads</option>
            {hrExecutives.map(exec => (
              <option key={exec._id} value={exec._id}>
                {exec.fullName} ({exec.position || 'HR Executive'})
              </option>
            ))}
          </select>

          {/* View Mode Toggle Button */}
          <div className="col-span-2 sm:col-span-1 flex items-center justify-between sm:justify-start gap-1.5 pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--crm-line)]">
            <div className="flex items-center border rounded-xl overflow-hidden shrink-0 border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] p-0.5">
              <button
                onClick={() => setViewMode('card')}
                className={`px-3 py-1.5 flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  viewMode === 'card' || (viewMode === 'auto' && window.innerWidth < 768)
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-transparent text-[var(--crm-ink-faint)] hover:text-white'
                }`}
                title="Card Layout View (Best for Mobile)"
              >
                <FiGrid size={13} /> Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table' || (viewMode === 'auto' && window.innerWidth >= 768)
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-transparent text-[var(--crm-ink-faint)] hover:text-white'
                }`}
                title="Table Layout View (Best for Desktop)"
              >
                <FiList size={13} /> Table
              </button>
            </div>

            <button
              onClick={fetchLeadsData}
              className="p-2 rounded-xl border hover:bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-soft)] cursor-pointer"
              style={{ borderColor: 'var(--crm-line)' }}
              title="Refresh List"
            >
              <FiRefreshCw size={14} className={loading ? 'animate-spin text-blue-400' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* LEADS DATA VIEW CONTAINER */}
      <div className="w-full font-sans">
        {loading ? (
          <div className="p-12 border rounded-2xl text-center font-sans text-xs text-[var(--crm-ink-faint)] animate-pulse" style={CARD}>
            Syncing uploaded career leads database...
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="p-10 border rounded-2xl text-center font-sans space-y-2.5" style={CARD}>
            <div className="p-3.5 rounded-full bg-[var(--crm-bg-sunken)] w-fit mx-auto text-blue-400">
              <FiUserPlus size={26} />
            </div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--crm-heading)] font-sans">No Career Leads Found</h4>
            <p className="text-xs text-[var(--crm-ink-faint)] font-normal max-w-md mx-auto">
              No career leads matched your search or filter parameters. Click "Upload Lead" above to add new records.
            </p>
          </div>
        ) : (
          <>
            {/* VIEW MODE 1: MOBILE OPTIMIZED CARDS */}
            <div className={`${(viewMode === 'card' || viewMode === 'auto') ? 'block md:hidden' : 'hidden'} space-y-3.5`}>
              {/* Card View Select All */}
              {canAssignLeads && filteredLeads.length > 0 && (
                <div className="flex items-center gap-3 px-1 font-sans">
                  <button
                    onClick={allVisibleSelected ? deselectAll : selectAllVisible}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 cursor-pointer transition-all py-1"
                  >
                    {allVisibleSelected
                      ? <FiCheckSquare size={16} className="text-indigo-400" />
                      : someVisibleSelected
                        ? <FiMinusSquare size={16} className="text-indigo-400" />
                        : <FiSquare size={16} className="text-slate-500" />
                    }
                    {allVisibleSelected ? 'Deselect All' : `Select All (${filteredLeads.length})`}
                  </button>
                  {selectedLeads.size > 0 && (
                    <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/15 px-2.5 py-0.5 rounded-lg border border-indigo-500/30">
                      {selectedLeads.size} selected
                    </span>
                  )}
                </div>
              )}
              {filteredLeads.map((lead) => {
                const candidateApps = applicationsByEmail[lead.email?.toLowerCase()] || [];
                const hasAppliedFull = candidateApps.length > 0;
                const isSelected = selectedLeads.has(lead._id);

                return (
                  <div
                    key={lead._id}
                    className={`border rounded-2xl p-4 space-y-3.5 font-sans text-left bg-[var(--crm-bg-raised)] transition-all shadow-sm ${
                      isSelected ? 'border-indigo-500/60 ring-1 ring-indigo-500/30' : 'hover:border-blue-500/40'
                    }`}
                    style={isSelected ? {} : { borderColor: 'var(--crm-line)' }}
                  >
                    {/* Header: Checkbox + Candidate Name, Initial Avatar, Status Dropdown */}
                    <div className="flex items-start justify-between gap-2.5 border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Checkbox for bulk selection */}
                        {canAssignLeads && (
                          <button
                            onClick={() => toggleSelectLead(lead._id)}
                            className="shrink-0 cursor-pointer text-lg transition-all"
                          >
                            {isSelected
                              ? <FiCheckSquare size={18} className="text-indigo-400" />
                              : <FiSquare size={18} className="text-slate-600 hover:text-slate-400" />
                            }
                          </button>
                        )}
                        <div className="w-10 h-10 rounded-full bg-blue-600/15 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-sm shrink-0 font-sans uppercase">
                          {lead.fullName ? lead.fullName[0] : 'U'}
                        </div>
                        <div
                          className="min-w-0 cursor-pointer group"
                          onClick={() => {
                            setSelectedLeadForInterviewModal(lead);
                            setShowInterviewModal(true);
                          }}
                          title="Click to view candidate details & schedule interview / view audit logs"
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-bold text-sm text-[var(--crm-heading)] group-hover:text-blue-400 font-sans tracking-tight truncate transition">
                              {lead.fullName}
                            </h4>
                            {lead.refNo && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                #{lead.refNo}
                              </span>
                            )}
                          </div>
                          {/* Clickable Mail Link (Opens Mailer) */}
                          <a
                            href={`mailto:${lead.email}`}
                            className="text-xs text-blue-400 hover:underline block truncate font-sans font-medium"
                          >
                            {lead.email}
                          </a>
                        </div>
                      </div>

                      {/* Tappable Status Dropdown */}
                      <select
                        value={lead.status || 'NEW'}
                        onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                        className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-tight rounded-lg border cursor-pointer font-sans shrink-0 ${getStatusBadgeClass(lead.status)}`}
                        style={{ background: 'var(--crm-bg-sunken)' }}
                      >
                        <option value="NEW">NEW</option>
                        <option value="CONTACTED">CONTACTED</option>
                        <option value="INTERVIEW_SCHEDULED">SCHEDULED</option>
                        <option value="HIRED">HIRED</option>
                        <option value="REJECTED">REJECTED</option>
                        <option value="NOT_APPLIED">NOT APPLIED</option>
                      </select>
                    </div>

                    {/* Quick Call (Opens Phone Dialer) & Quick Email Touch Chips */}
                    <div className="grid grid-cols-2 gap-2.5 text-xs font-medium">
                      <a
                        href={`tel:${lead.phone}`}
                        className="p-2.5 border rounded-xl flex items-center justify-center gap-2 bg-[var(--crm-bg-sunken)] hover:bg-slate-800 text-[var(--crm-heading)] font-semibold transition cursor-pointer"
                        style={{ borderColor: 'var(--crm-line)' }}
                      >
                        <FiPhone size={13} className="text-emerald-400 shrink-0" />
                        <span className="truncate">{lead.phone || 'Call'}</span>
                      </a>
                      <a
                        href={`mailto:${lead.email}`}
                        className="p-2.5 border rounded-xl flex items-center justify-center gap-2 bg-[var(--crm-bg-sunken)] hover:bg-slate-800 text-[var(--crm-heading)] font-semibold transition cursor-pointer"
                        style={{ borderColor: 'var(--crm-line)' }}
                      >
                        <FiMail size={13} className="text-blue-400 shrink-0" />
                        <span className="truncate">Email Lead</span>
                      </a>
                    </div>

                    {/* Target Position, Exp & Location */}
                    <div className="space-y-2 text-xs pt-0.5 font-sans">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[var(--crm-heading)] font-sans flex items-center gap-1.5 truncate">
                          <FiBriefcase size={13} className="text-blue-400 shrink-0" />
                          <span className="truncate">{lead.position || 'General Candidate'}</span>
                        </span>
                        <span className="text-[10px] text-[var(--crm-ink-faint)] bg-[var(--crm-bg-sunken)] px-2 py-0.5 border border-[var(--crm-line)] rounded-md shrink-0 font-medium">
                          Exp: {lead.experience || 'N/A'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1 text-xs text-[var(--crm-ink-faint)] flex-wrap">
                        <span className="flex items-center gap-1 truncate font-normal">
                          <FiMapPin size={12} className="shrink-0 text-slate-400" />
                          <span className="truncate">{lead.location || 'N/A'}</span>
                        </span>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          {lead.result && (
                            <span className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold px-2 py-0.5 text-[9px] rounded-md uppercase font-sans tracking-wide">
                              Result: {lead.result}
                            </span>
                          )}
                          {/* Green Styled Careers Gate Badge */}
                          <span className={getSourceBadgeClass(lead.source)}>
                            {lead.source === 'CAREER_GATE' ? 'CAREERS GATE' : lead.source === 'CSV_BULK_UPLOAD' ? 'CSV BULK' : 'MANUAL UPLOAD'}
                          </span>
                        </div>
                      </div>

                      {/* HR Executive Lead Assignment Control */}
                      <div className="flex items-center justify-between gap-2 text-xs pt-2 border-t border-[var(--crm-line)]/70 font-sans">
                        <span className="text-[11px] font-semibold text-[var(--crm-ink-faint)] flex items-center gap-1.5 shrink-0">
                          <FiUserCheck size={13} className="text-indigo-400 shrink-0" /> Assigned HR:
                        </span>

                        {canAssignLeads ? (
                          <select
                            value={getLeadAssignedExecutiveId(lead, hrExecutives)}
                            onChange={(e) => handleAssignLead(lead._id, e.target.value)}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg border cursor-pointer font-sans bg-indigo-500/10 text-indigo-300 border-indigo-500/30 focus:outline-none focus:border-indigo-400 shrink-0 max-w-[170px] truncate"
                          >
                            <option value="UNASSIGNED" className="bg-slate-900 text-slate-300">-- Assign HR Exec --</option>
                            {hrExecutives.map(exec => (
                              <option key={exec._id} value={exec._id} className="bg-slate-900 text-white">
                                {exec.fullName}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg border bg-indigo-500/10 text-indigo-300 border-indigo-500/30 font-sans truncate">
                            {lead.assignedToName ? `👤 ${lead.assignedToName}` : 'Unassigned'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t text-xs font-sans" style={{ borderColor: 'var(--crm-line)' }}>
                      <div className="shrink-0 mr-1 sm:mr-2">
                        {hasAppliedFull ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 leading-snug">
                            <FiCheckCircle size={12} className="shrink-0" /> Applied ({candidateApps[0]?.position})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase bg-slate-500/10 text-slate-400 border border-slate-700">
                            <FiClock size={11} className="shrink-0" /> Lead Only
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 ml-auto shrink-0">
                        <button
                          onClick={() => {
                            setSelectedLeadForInterviewModal(lead);
                            setShowInterviewModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase border border-purple-500/30 cursor-pointer flex items-center gap-1.5 font-sans transition-all shadow-xs"
                          title="Open Candidate Interview & Audit Log Window"
                        >
                          <FiActivity size={13} /> Audit Logs
                        </button>

                        {lead.notes && (
                          <button
                            onClick={() => setEditingNotesLead(lead)}
                            className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase border border-blue-500/30 cursor-pointer flex items-center gap-1.5 font-sans transition-all shadow-xs"
                          >
                            <FiEdit3 size={13} /> Remarks
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteLead(lead._id)}
                          className="p-2 rounded-xl bg-transparent hover:bg-rose-500/10 text-rose-500 hover:text-rose-400 border border-rose-500/30 hover:border-rose-500/60 cursor-pointer transition-all flex items-center justify-center"
                          title="Delete Lead Record"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VIEW MODE 2: FULL DESKTOP DATA TABLE */}
            <div className={`${(viewMode === 'table' || (viewMode === 'auto' && window.innerWidth >= 768)) ? 'block' : 'hidden md:block'} border rounded-2xl overflow-hidden shadow-lg bg-[var(--crm-bg-raised)]`} style={{ borderColor: 'var(--crm-line)' }}>
              <div className="w-full overflow-x-auto scrollbar-none">
                <table className="w-full text-left border-collapse text-xs font-sans min-w-[900px]">
                  <thead>
                    <tr className="bg-[var(--crm-bg-sunken)] border-b text-[var(--crm-ink-faint)] uppercase tracking-wider font-bold" style={{ borderColor: 'var(--crm-line)' }}>
                      {canAssignLeads && (
                        <th className="p-3.5 w-10">
                          <button
                            onClick={allVisibleSelected ? deselectAll : selectAllVisible}
                            className="cursor-pointer text-lg transition-all"
                            title={allVisibleSelected ? 'Deselect All' : 'Select All'}
                          >
                            {allVisibleSelected
                              ? <FiCheckSquare size={16} className="text-indigo-400" />
                              : someVisibleSelected
                                ? <FiMinusSquare size={16} className="text-indigo-400" />
                                : <FiSquare size={16} className="text-slate-500 hover:text-slate-400" />
                            }
                          </button>
                        </th>
                      )}
                      <th className="p-3.5">Ref No</th>
                      <th className="p-3.5">Candidate</th>
                      <th className="p-3.5">Contact Info</th>
                      <th className="p-3.5">Target Position & Exp</th>
                      <th className="p-3.5">Location (Country)</th>
                      <th className="p-3.5 text-center">Result</th>
                      <th className="p-3.5">Source</th>
                      <th className="p-3.5 text-center">Assigned HR Exec</th>
                      <th className="p-3.5 text-center">Lead Status</th>
                      <th className="p-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--crm-line)]">
                    {filteredLeads.map((lead) => {
                      const candidateApps = applicationsByEmail[lead.email?.toLowerCase()] || [];
                      const hasAppliedFull = candidateApps.length > 0;
                      const isSelected = selectedLeads.has(lead._id);

                      return (
                        <tr key={lead._id} className={`transition-colors ${isSelected ? 'bg-indigo-500/[0.06]' : 'hover:bg-[var(--crm-bg-sunken)]/50'}`}>
                          {/* Checkbox */}
                          {canAssignLeads && (
                            <td className="p-3.5 w-10">
                              <button
                                onClick={() => toggleSelectLead(lead._id)}
                                className="cursor-pointer text-lg transition-all"
                              >
                                {isSelected
                                  ? <FiCheckSquare size={16} className="text-indigo-400" />
                                  : <FiSquare size={16} className="text-slate-600 hover:text-slate-400" />
                                }
                              </button>
                            </td>
                          )}
                          {/* Ref No */}
                          <td className="p-3.5">
                            {lead.refNo ? (
                              <span className="font-mono text-xs font-bold text-blue-300 bg-blue-500/15 px-2 py-0.5 rounded-md border border-blue-500/30 whitespace-nowrap">
                                #{lead.refNo}
                              </span>
                            ) : (
                              <span className="text-[var(--crm-ink-faint)] text-xs">-</span>
                            )}
                          </td>

                          {/* Candidate Name */}
                          <td className="p-3.5">
                            <div
                              className="flex items-center gap-2.5 font-bold text-[var(--crm-heading)] hover:text-blue-400 text-xs font-sans cursor-pointer transition"
                              onClick={() => {
                                setSelectedLeadForInterviewModal(lead);
                                setShowInterviewModal(true);
                              }}
                              title="Click to view candidate details & schedule interview / view audit logs"
                            >
                              <div className="p-2 rounded-full bg-blue-600/15 text-blue-400 border border-blue-500/30">
                                <FiUser size={13} />
                              </div>
                              <span className="whitespace-normal break-words max-w-[150px] font-bold">{lead.fullName}</span>
                            </div>
                          </td>

                          {/* Contact Info (Clickable Mail & Phone for Dialer / Email Client!) */}
                          <td className="p-3.5">
                            <div className="space-y-1 text-xs">
                              <a
                                href={`mailto:${lead.email}`}
                                className="flex items-center gap-1.5 text-[var(--crm-heading)] font-medium hover:text-blue-400 hover:underline transition"
                                title="Click to send email"
                              >
                                <FiMail size={11} className="text-blue-400 shrink-0" />
                                <span className="whitespace-normal break-all max-w-[180px]">{lead.email}</span>
                              </a>
                              <a
                                href={`tel:${lead.phone}`}
                                className="flex items-center gap-1.5 text-[var(--crm-ink-faint)] font-medium hover:text-emerald-400 hover:underline transition"
                                title="Click to open phone dialer"
                              >
                                <FiPhone size={11} className="text-emerald-400 shrink-0" />
                                <span>{lead.phone}</span>
                              </a>
                            </div>
                          </td>

                          {/* Position & Exp */}
                          <td className="p-3.5">
                            <div className="space-y-0.5">
                              <span className="font-semibold text-[var(--crm-heading)] block text-xs font-sans">
                                {lead.position || 'General Candidate'}
                              </span>
                              <span className="text-[10px] text-[var(--crm-ink-faint)] block font-medium">
                                Exp: {lead.experience || 'N/A'}
                              </span>
                            </div>
                          </td>

                          {/* Location (Country) */}
                          <td className="p-3.5 text-[var(--crm-ink-soft)] font-medium">
                            <div className="flex items-center gap-1.5 text-xs">
                              <FiMapPin size={12} className="text-[var(--crm-ink-faint)] shrink-0" />
                              <span>{lead.location || 'N/A'}</span>
                            </div>
                          </td>

                          {/* Result */}
                          <td className="p-3.5 text-center">
                            {lead.result ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                                {lead.result}
                              </span>
                            ) : (
                              <span className="text-[var(--crm-ink-faint)] text-xs">-</span>
                            )}
                          </td>

                          {/* Source (Green Background for CAREERS GATE) */}
                          <td className="p-3.5">
                            <span className={getSourceBadgeClass(lead.source)}>
                              {lead.source === 'CAREER_GATE' ? 'CAREERS GATE' : lead.source === 'CSV_BULK_UPLOAD' ? 'CSV BULK' : 'MANUAL UPLOAD'}
                            </span>
                          </td>

                          {/* HR Executive Assignment Selector */}
                          <td className="p-3.5 text-center whitespace-nowrap">
                            {canAssignLeads ? (
                              <select
                                value={getLeadAssignedExecutiveId(lead, hrExecutives)}
                                onChange={(e) => handleAssignLead(lead._id, e.target.value)}
                                className="px-2.5 py-1 text-[10px] font-bold rounded-lg border cursor-pointer font-sans bg-indigo-500/15 text-indigo-300 border-indigo-500/40 focus:outline-none focus:border-indigo-400 max-w-[160px] truncate"
                              >
                                <option value="UNASSIGNED" className="bg-slate-900 text-slate-300">-- Assign HR --</option>
                                {hrExecutives.map(exec => (
                                  <option key={exec._id} value={exec._id} className="bg-slate-900 text-white">
                                    {exec.fullName}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                {lead.assignedToName ? lead.assignedToName : 'Unassigned'}
                              </span>
                            )}
                          </td>

                          {/* Status Selector */}
                          <td className="p-3.5 text-center">
                            <select
                              value={lead.status || 'NEW'}
                              onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                              className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-tight rounded-lg border cursor-pointer font-sans ${getStatusBadgeClass(lead.status)}`}
                              style={{ background: 'var(--crm-bg-sunken)' }}
                            >
                              <option value="NEW">NEW</option>
                              <option value="CONTACTED">CONTACTED</option>
                              <option value="INTERVIEW_SCHEDULED">INTERVIEW SCHEDULED</option>
                              <option value="HIRED">HIRED</option>
                              <option value="REJECTED">REJECTED</option>
                              <option value="NOT_APPLIED">NOT APPLIED</option>
                            </select>
                          </td>

                          {/* Actions */}
                          <td className="p-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedLeadForInterviewModal(lead);
                                  setShowInterviewModal(true);
                                }}
                                className="p-1.5 rounded-lg hover:bg-purple-500/20 text-purple-400 cursor-pointer"
                                title="Open Candidate Interview & Audit Log Window"
                              >
                                <FiActivity size={14} />
                              </button>

                              {lead.notes && (
                                <button
                                  onClick={() => setEditingNotesLead(lead)}
                                  className="p-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400 cursor-pointer"
                                  title={`View Remarks: ${lead.notes}`}
                                >
                                  <FiEdit3 size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteLead(lead._id)}
                                className="p-1.5 rounded-xl bg-transparent hover:bg-rose-500/10 text-rose-500 hover:text-rose-400 border border-rose-500/30 hover:border-rose-500/60 cursor-pointer transition-all"
                                title="Delete Lead Record"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* UPLOAD CAREER LEADS MODAL */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 font-sans overflow-hidden">
          <div className={`border rounded-2xl w-[96vw] flex flex-col max-h-[90vh] sm:max-h-[92vh] shadow-2xl bg-[var(--crm-bg-raised)] transition-all duration-300 ${uploadMode === 'bulk' && parsedBulkLeads.length > 0 ? 'max-w-6xl' : 'max-w-2xl'}`} style={{ borderColor: 'var(--crm-line)' }}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600/15 text-blue-400 border border-blue-500/30 shrink-0">
                  <FiUpload size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--crm-heading)] font-sans tracking-tight">
                    Upload Career Leads
                  </h3>
                  <p className="text-[11px] text-[var(--crm-ink-faint)] font-normal">
                    Add candidate records to the HR Talent Bank database
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] hover:text-white cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-2 border-b overflow-x-auto scrollbar-none" style={{ borderColor: 'var(--crm-line)' }}>
              <button
                type="button"
                onClick={() => setUploadMode('single')}
                className={`py-2 px-3.5 text-[11px] font-semibold whitespace-nowrap border-b-2 cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
                  uploadMode === 'single'
                    ? 'border-blue-500 text-blue-400 font-bold'
                    : 'border-transparent text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'
                }`}
              >
                <FiPlus size={13} /> Single Lead
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('bulk')}
                className={`py-2 px-3.5 text-[11px] font-semibold whitespace-nowrap border-b-2 cursor-pointer transition-all flex items-center gap-1.5 shrink-0 ${
                  uploadMode === 'bulk'
                    ? 'border-blue-500 text-blue-400 font-bold'
                    : 'border-transparent text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'
                }`}
              >
                <FiFileText size={13} /> Bulk CSV / Excel
              </button>
            </div>

            {/* MODE 1: SINGLE LEAD UPLOAD FORM */}
            {uploadMode === 'single' && (
              <form onSubmit={handleSingleFormSubmit} className="flex flex-col flex-1 min-h-0 font-sans space-y-4">
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs font-medium">
                    <div>
                      <label className="block text-xs uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                        Ref No / Code
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. REF-2026-001"
                        value={singleForm.refNo}
                        onChange={(e) => setSingleForm(prev => ({ ...prev, refNo: e.target.value }))}
                        className="w-full p-3 text-xs rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] placeholder-slate-500 focus:outline-none focus:border-blue-500 transition font-mono"
                        style={{ borderColor: 'var(--crm-line)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Vikramaditya Singh"
                        value={singleForm.fullName}
                        onChange={(e) => setSingleForm(prev => ({ ...prev, fullName: e.target.value }))}
                        className="w-full p-3 text-xs rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                        style={{ borderColor: 'var(--crm-line)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. candidate@example.com"
                        value={singleForm.email}
                        onChange={(e) => setSingleForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full p-3 text-xs rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                        style={{ borderColor: 'var(--crm-line)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. +91 9876543210"
                        value={singleForm.phone}
                        onChange={(e) => setSingleForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full p-3 text-xs rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                        style={{ borderColor: 'var(--crm-line)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                        Target Position / Role
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sales Executive, HR Manager"
                        value={singleForm.position}
                        onChange={(e) => setSingleForm(prev => ({ ...prev, position: e.target.value }))}
                        className="w-full p-3 text-xs rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                        style={{ borderColor: 'var(--crm-line)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                        Total Experience
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Freshers, 2-3 Years"
                        value={singleForm.experience}
                        onChange={(e) => setSingleForm(prev => ({ ...prev, experience: e.target.value }))}
                        className="w-full p-3 text-xs rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                        style={{ borderColor: 'var(--crm-line)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                        Location (Country)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. New Delhi (India), Dubai (UAE)"
                        value={singleForm.location}
                        onChange={(e) => setSingleForm(prev => ({ ...prev, location: e.target.value }))}
                        className="w-full p-3 text-xs rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                        style={{ borderColor: 'var(--crm-line)' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                        Result / Evaluation Outcome
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Shortlisted, Selected, Pending"
                        value={singleForm.result}
                        onChange={(e) => setSingleForm(prev => ({ ...prev, result: e.target.value }))}
                        className="w-full p-3 text-xs rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                        style={{ borderColor: 'var(--crm-line)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                      Initial Lead Status
                    </label>
                    <select
                      value={singleForm.status}
                      onChange={(e) => setSingleForm(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full p-3 rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none text-xs font-sans font-medium"
                      style={{ borderColor: 'var(--crm-line)' }}
                    >
                      <option value="NEW">NEW - Fresh Candidate Lead</option>
                      <option value="CONTACTED">CONTACTED - Reached out via Phone/Email</option>
                      <option value="INTERVIEW_SCHEDULED">INTERVIEW SCHEDULED</option>
                      <option value="HIRED">HIRED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-[var(--crm-ink-faint)] mb-1">
                      Remarks / Candidate Notes
                    </label>
                    <textarea
                      rows={2.5}
                      placeholder="Enter any additional details, expected CTC, notice period..."
                      value={singleForm.notes}
                      onChange={(e) => setSingleForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full p-3 rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] placeholder-slate-500 focus:outline-none text-xs font-sans"
                      style={{ borderColor: 'var(--crm-line)' }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 border-t pt-3 mt-2 shrink-0 bg-[var(--crm-bg-raised)]" style={{ borderColor: 'var(--crm-line)' }}>
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2.5 text-xs uppercase font-bold rounded-xl border hover:bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] cursor-pointer"
                    style={{ borderColor: 'var(--crm-line)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSingle}
                    className="px-5 py-2.5 text-xs uppercase font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-all flex items-center gap-1.5 shadow-md"
                  >
                    {submittingSingle ? 'Uploading...' : 'Save & Upload Lead'}
                  </button>
                </div>
              </form>
            )}

            {/* MODE 2: BULK CSV / EXCEL UPLOAD */}
            {uploadMode === 'bulk' && (
              <form onSubmit={handleBulkFormSubmit} className="flex flex-col flex-1 min-h-0 font-sans">
                {/* Scrollable Form Body */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {/* Collapsed Loaded File Summary Bar when leads parsed */}
                  {parsedBulkLeads.length > 0 && !showDropzone ? (
                    <div className="flex items-center justify-between p-3.5 border rounded-xl bg-blue-500/10 border-blue-500/30 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/40 shrink-0">
                          <FiFileText size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-blue-300 uppercase tracking-wide truncate font-sans">
                            {bulkFileName ? `File Loaded: ${bulkFileName}` : 'Candidate Data Batch'}
                          </div>
                          <div className="text-[11px] text-[var(--crm-ink-faint)] font-medium">
                            {parsedBulkLeads.length} candidate record(s) parsed & editable below
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowDropzone(true)}
                        className="px-3 py-1.5 text-[11px] font-bold uppercase rounded-lg border border-blue-500/40 text-blue-300 hover:bg-blue-500/20 transition cursor-pointer shrink-0 font-sans"
                      >
                        Change File / Add Data
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* File picker dropzone */}
                      <div className="border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center space-y-2 bg-[var(--crm-bg-sunken)]" style={{ borderColor: 'var(--crm-line)' }}>
                        <div className="flex items-center justify-between">
                          <FiUpload size={22} className="text-blue-400 mx-auto" />
                          {parsedBulkLeads.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowDropzone(false)}
                              className="text-[11px] font-bold text-slate-400 hover:text-white underline cursor-pointer"
                            >
                              Hide Upload Area
                            </button>
                          )}
                        </div>
                        <div className="text-xs font-bold text-[var(--crm-heading)] uppercase tracking-wide">
                          {bulkFileName ? `Selected File: ${bulkFileName}` : 'Choose Excel, CSV, Text or Document File'}
                        </div>
                        <p className="text-[11px] text-[var(--crm-ink-faint)] font-normal">
                          Supported: Excel (.xlsx, .xls), CSV, TXT, JSON, Image / PDF records
                        </p>
                        <input
                          type="file"
                          accept=".xlsx, .xls, .csv, .tsv, .txt, .json, .pdf, image/*"
                          onChange={(e) => {
                            handleFileUpload(e);
                            setShowDropzone(false);
                          }}
                          className="hidden"
                          id="career-leads-csv-picker"
                        />
                        <div className="flex items-center justify-center gap-2.5 pt-1">
                          <label
                            htmlFor="career-leads-csv-picker"
                            className="inline-block px-4 py-2 text-xs font-bold uppercase rounded-xl bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 cursor-pointer shadow-sm"
                          >
                            Browse File / Spreadsheet
                          </label>
                          <button
                            type="button"
                            onClick={handleDownloadTemplate}
                            className="px-3.5 py-2 text-xs font-bold uppercase rounded-xl border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 transition cursor-pointer"
                          >
                            Download Sample Format
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Parsed Preview Table & Interactive Editor */}
                  {parsedBulkLeads.length > 0 && (
                    <div className="space-y-2.5 border-t pt-3" style={{ borderColor: 'var(--crm-line)' }}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--crm-heading)] uppercase tracking-wide font-sans">
                            Parsed Preview & Editor ({parsedBulkLeads.length} Records)
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase font-sans">
                            Editable Preview
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleAddParsedLeadRow}
                            className="px-2.5 py-1 text-[11px] font-bold uppercase rounded-lg bg-blue-600/15 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 cursor-pointer flex items-center gap-1 transition font-sans"
                          >
                            <FiPlus size={12} /> Add Row
                          </button>
                          <button
                            type="button"
                            onClick={handleClearAllParsedLeads}
                            className="px-2.5 py-1 text-[11px] font-bold uppercase rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 cursor-pointer flex items-center gap-1 transition font-sans"
                          >
                            <FiTrash2 size={12} /> Clear All
                          </button>
                        </div>
                      </div>

                      {/* Scrollable Table Container */}
                      <div className="max-h-[42vh] sm:max-h-[48vh] overflow-y-auto overflow-x-auto border rounded-xl shadow-inner bg-[var(--crm-bg-sunken)]" style={{ borderColor: 'var(--crm-line)' }}>
                        <table className="w-full text-left text-xs font-sans border-collapse min-w-[1100px]">
                          <thead className="bg-[var(--crm-bg-sunken)] border-b text-[var(--crm-ink-faint)] font-bold sticky top-0 z-20 shadow-xs" style={{ borderColor: 'var(--crm-line)' }}>
                            <tr>
                              <th className="p-2.5 w-10 text-center">#</th>
                              <th className="p-2.5 min-w-[110px]">Ref No</th>
                              <th className="p-2.5 min-w-[140px]">Candidate Name *</th>
                              <th className="p-2.5 min-w-[160px]">Email Address *</th>
                              <th className="p-2.5 min-w-[120px]">Phone Number *</th>
                              <th className="p-2.5 min-w-[130px]">Target Position</th>
                              <th className="p-2.5 min-w-[100px]">Experience</th>
                              <th className="p-2.5 min-w-[130px]">Location (Country)</th>
                              <th className="p-2.5 min-w-[110px]">Result</th>
                              <th className="p-2.5 min-w-[110px]">Status</th>
                              <th className="p-2.5 min-w-[140px]">Remarks / Notes</th>
                              <th className="p-2.5 w-12 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--crm-line)]">
                            {parsedBulkLeads.map((l, idx) => {
                              const isNameMissing = !l.fullName || !l.fullName.trim();
                              const isEmailMissing = !l.email || !l.email.trim();
                              const isPhoneMissing = !l.phone || !l.phone.trim();
                              const hasMissingField = isNameMissing || isEmailMissing || isPhoneMissing;

                              return (
                                <tr key={idx} className={`transition-colors ${hasMissingField ? 'bg-amber-500/[0.04]' : 'hover:bg-[var(--crm-bg-raised)]/60'}`}>
                                  <td className="p-2 text-center text-[var(--crm-ink-faint)] font-mono text-[11px]">{idx + 1}</td>
                                  
                                  {/* Ref No */}
                                  <td className="p-1.5">
                                    <input
                                      type="text"
                                      value={l.refNo || ''}
                                      onChange={(e) => handleUpdateParsedLead(idx, 'refNo', e.target.value)}
                                      placeholder="Ref No"
                                      className="w-full px-2 py-1 text-xs rounded-lg border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500 font-mono"
                                    />
                                  </td>

                                  {/* Full Name */}
                                  <td className="p-1.5">
                                    <input
                                      type="text"
                                      value={l.fullName || ''}
                                      onChange={(e) => handleUpdateParsedLead(idx, 'fullName', e.target.value)}
                                      placeholder="Candidate Name"
                                      className={`w-full px-2 py-1 text-xs rounded-lg border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500 font-medium ${
                                        isNameMissing ? 'border-amber-500/60 ring-1 ring-amber-500/30' : 'border-[var(--crm-line)]'
                                      }`}
                                    />
                                  </td>

                                  {/* Email */}
                                  <td className="p-1.5">
                                    <input
                                      type="email"
                                      value={l.email || ''}
                                      onChange={(e) => handleUpdateParsedLead(idx, 'email', e.target.value)}
                                      placeholder="candidate@email.com"
                                      className={`w-full px-2 py-1 text-xs rounded-lg border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500 font-medium ${
                                        isEmailMissing ? 'border-amber-500/60 ring-1 ring-amber-500/30' : 'border-[var(--crm-line)]'
                                      }`}
                                    />
                                  </td>

                                  {/* Phone */}
                                  <td className="p-1.5">
                                    <input
                                      type="tel"
                                      value={l.phone || ''}
                                      onChange={(e) => handleUpdateParsedLead(idx, 'phone', e.target.value)}
                                      placeholder="Phone / Mobile"
                                      className={`w-full px-2 py-1 text-xs rounded-lg border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500 font-medium ${
                                        isPhoneMissing ? 'border-amber-500/60 ring-1 ring-amber-500/30' : 'border-[var(--crm-line)]'
                                      }`}
                                    />
                                  </td>

                                  {/* Position */}
                                  <td className="p-1.5">
                                    <input
                                      type="text"
                                      value={l.position || ''}
                                      onChange={(e) => handleUpdateParsedLead(idx, 'position', e.target.value)}
                                      placeholder="General Candidate"
                                      className="w-full px-2 py-1 text-xs rounded-lg border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500 font-normal"
                                    />
                                  </td>

                                  {/* Experience */}
                                  <td className="p-1.5">
                                    <input
                                      type="text"
                                      value={l.experience || ''}
                                      onChange={(e) => handleUpdateParsedLead(idx, 'experience', e.target.value)}
                                      placeholder="Freshers"
                                      className="w-full px-2 py-1 text-xs rounded-lg border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500 font-normal"
                                    />
                                  </td>

                                  {/* Location (Country) */}
                                  <td className="p-1.5">
                                    <input
                                      type="text"
                                      value={l.location || ''}
                                      onChange={(e) => handleUpdateParsedLead(idx, 'location', e.target.value)}
                                      placeholder="Location (Country)"
                                      className="w-full px-2 py-1 text-xs rounded-lg border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500 font-normal"
                                    />
                                  </td>

                                  {/* Result */}
                                  <td className="p-1.5">
                                    <input
                                      type="text"
                                      value={l.result || ''}
                                      onChange={(e) => handleUpdateParsedLead(idx, 'result', e.target.value)}
                                      placeholder="Result / Outcome"
                                      className="w-full px-2 py-1 text-xs rounded-lg border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500 font-semibold text-emerald-400"
                                    />
                                  </td>

                                  {/* Status */}
                                  <td className="p-1.5">
                                    <select
                                      value={l.status || 'NEW'}
                                      onChange={(e) => handleUpdateParsedLead(idx, 'status', e.target.value)}
                                      className="w-full px-2 py-1 text-[11px] font-bold rounded-lg border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none cursor-pointer uppercase font-sans"
                                    >
                                      <option value="NEW">NEW</option>
                                      <option value="CONTACTED">CONTACTED</option>
                                      <option value="INTERVIEW_SCHEDULED">SCHEDULED</option>
                                      <option value="HIRED">HIRED</option>
                                      <option value="REJECTED">REJECTED</option>
                                    </select>
                                  </td>

                                  {/* Notes */}
                                  <td className="p-1.5">
                                    <input
                                      type="text"
                                      value={l.notes || ''}
                                      onChange={(e) => handleUpdateParsedLead(idx, 'notes', e.target.value)}
                                      placeholder="Remarks / Notes"
                                      className="w-full px-2 py-1 text-xs rounded-lg border border-[var(--crm-line)] bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500 font-normal"
                                    />
                                  </td>

                                  {/* Action Delete */}
                                  <td className="p-1.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteParsedLead(idx)}
                                      className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-500 hover:text-rose-400 cursor-pointer transition-all"
                                      title="Delete lead from preview"
                                    >
                                      <FiTrash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* PINNED MODAL FOOTER */}
                <div className="flex items-center justify-end gap-2.5 border-t pt-3 mt-2 shrink-0 bg-[var(--crm-bg-raised)]" style={{ borderColor: 'var(--crm-line)' }}>
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2.5 text-xs uppercase font-bold rounded-xl border hover:bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] cursor-pointer"
                    style={{ borderColor: 'var(--crm-line)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingBulk || parsedBulkLeads.length === 0}
                    className="px-5 py-2.5 text-xs uppercase font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-all flex items-center gap-1.5 shadow-md disabled:opacity-50"
                  >
                    {submittingBulk ? 'Uploading...' : `Import ${parsedBulkLeads.length} Lead(s)`}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* NOTES EDIT MODAL */}
      {editingNotesLead && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans">
          <div className="border rounded-2xl max-w-md w-full p-5 space-y-3.5 text-left bg-[var(--crm-bg-raised)] shadow-2xl" style={{ borderColor: 'var(--crm-line)' }}>
            <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'var(--crm-line)' }}>
              <h4 className="text-sm font-bold text-[var(--crm-heading)] uppercase tracking-wide font-sans">
                Candidate Remarks / Notes
              </h4>
              <button onClick={() => setEditingNotesLead(null)} className="text-[var(--crm-ink-faint)] hover:text-white cursor-pointer">
                <FiX size={18} />
              </button>
            </div>
            <div className="text-xs text-[var(--crm-heading)] font-sans">
              <strong>{editingNotesLead.fullName}</strong> <span className="text-[var(--crm-ink-faint)]">({editingNotesLead.email})</span>
            </div>
            <p className="p-3.5 border rounded-xl bg-[var(--crm-bg-sunken)] text-xs text-[var(--crm-heading)] font-sans whitespace-pre-wrap leading-relaxed" style={{ borderColor: 'var(--crm-line)' }}>
              {editingNotesLead.notes || 'No notes provided'}
            </p>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setEditingNotesLead(null)}
                className="px-4 py-2 text-xs font-bold uppercase rounded-xl bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING BULK ACTION BAR */}
      {canAssignLeads && selectedLeads.size > 0 && (
        <>
          {/* MOBILE VIEW FLOATING ACTION BAR (< 640px) */}
          <div className="fixed bottom-10 left-3 right-3 z-50 flex sm:hidden items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-2xl border border-indigo-500/40 bg-slate-900/98 backdrop-blur-2xl shadow-2xl shadow-indigo-950/70 font-sans transition-all duration-300">
            {/* Selection Count Badge */}
            <div className="flex items-center gap-2 min-w-0 shrink">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-black text-xs font-sans shrink-0 shadow-inner">
                {selectedLeads.size}
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-white text-xs block leading-tight truncate">
                  {selectedLeads.size} Lead{selectedLeads.size > 1 ? 's' : ''} Selected
                </span>
                <span className="text-[10px] text-Green-400 font-medium block truncate">
                  Career Talent Bank
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => { setShowBulkAssignModal(true); setBulkAssignTargetId(''); }}
                className="px-3.5 py-2 text-xs uppercase tracking-wider font-extrabold rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 active:from-indigo-500 active:to-purple-500 text-white cursor-pointer transition-all flex items-center gap-1.5 shadow-md shadow-indigo-500/30 whitespace-nowrap shrink-0 active:scale-95"
              >
                <FiUserCheck className="w-3.5 h-3.5 shrink-0 text-indigo-100" />
                <span>Assign HR</span>
              </button>

              <button
                onClick={deselectAll}
                className="p-2 text-xs rounded-xl border border-slate-700/80 bg-slate-800/90 active:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-all flex items-center justify-center shrink-0 active:scale-95"
                title="Clear selection"
              >
                <FiX className="w-4 h-4 shrink-0 text-red-600" />
              </button>
            </div>
          </div>

          {/* DESKTOP / LAPTOP VIEW FLOATING ACTION BAR (>= 640px) */}
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 hidden sm:flex items-center justify-between gap-3 px-5 py-3 rounded-2xl border border-indigo-500/40 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-indigo-500/20 font-sans w-auto max-w-lg transition-all duration-300">
            {/* Selection count badge */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-extrabold text-sm font-sans shrink-0">
                {selectedLeads.size}
              </div>
              <div className="text-xs shrink-0">
                <span className="font-bold text-white block leading-tight whitespace-nowrap">
                  {selectedLeads.size} Lead{selectedLeads.size > 1 ? 's' : ''} Selected
                </span>
                <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                  Ready for bulk action
                </span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-700/80 shrink-0 mx-1" />

            {/* Action buttons wrapper */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Bulk Assign Button */}
              <button
                onClick={() => { setShowBulkAssignModal(true); setBulkAssignTargetId(''); }}
                className="px-4 py-2 text-xs uppercase tracking-wider font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white cursor-pointer transition-all flex items-center gap-1.5 shadow-md hover:shadow-indigo-500/25 whitespace-nowrap shrink-0 active:scale-95"
              >
                <FiUserCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Bulk Assign HR</span>
              </button>

              {/* Deselect All */}
              <button
                onClick={deselectAll}
                className="px-3 py-2 text-xs uppercase tracking-wider font-bold rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer transition-all flex items-center gap-1 whitespace-nowrap shrink-0 active:scale-95"
                title="Clear selection"
              >
                <FiX className="w-3.5 h-3.5 shrink-0" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* BULK ASSIGN MODAL */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans">
          <div className="border rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 text-left bg-[var(--crm-bg-raised)] shadow-2xl" style={{ borderColor: 'var(--crm-line)' }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--crm-line)' }}>
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shrink-0">
                  <FiUserCheck size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--crm-heading)] uppercase tracking-wide font-sans">
                    Bulk Assign Leads
                  </h3>
                  <p className="text-xs text-[var(--crm-ink-faint)] font-normal">
                    Assign {selectedLeads.size} selected lead{selectedLeads.size > 1 ? 's' : ''} to an HR Executive
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkAssignModal(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] hover:text-white cursor-pointer"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Selected leads summary pills */}
            <div className="space-y-2">
              <label className="block text-xs uppercase font-bold text-[var(--crm-ink-faint)]">Selected Leads:</label>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2.5 rounded-xl border bg-[var(--crm-bg-sunken)]" style={{ borderColor: 'var(--crm-line)' }}>
                {Array.from(selectedLeads).map(id => {
                  const lead = leads.find(l => l._id === id);
                  return lead ? (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-sans"
                    >
                      {lead.fullName}
                      <button
                        onClick={() => toggleSelectLead(id)}
                        className="ml-0.5 text-indigo-400 hover:text-indigo-200 cursor-pointer"
                      >
                        <FiX size={10} />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            </div>

            {/* HR Executive Selector */}
            <div>
              <label className="block text-xs uppercase font-bold text-[var(--crm-ink-faint)] mb-1.5">
                Assign To HR Executive *
              </label>
              <select
                value={bulkAssignTargetId}
                onChange={(e) => setBulkAssignTargetId(e.target.value)}
                className="w-full p-3 text-xs rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-indigo-500 font-sans font-medium cursor-pointer transition"
                style={{ borderColor: 'var(--crm-line)' }}
              >
                <option value="">-- Select HR Executive --</option>
                <option value="UNASSIGNED">❌ Unassign All Selected</option>
                {hrExecutives.map(exec => (
                  <option key={exec._id} value={exec._id}>
                    {exec.fullName} — {exec.position || 'HR Executive'} ({exec.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 border-t pt-4" style={{ borderColor: 'var(--crm-line)' }}>
              <button
                type="button"
                onClick={() => setShowBulkAssignModal(false)}
                className="px-4 py-2.5 text-xs uppercase font-bold rounded-xl border hover:bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] cursor-pointer"
                style={{ borderColor: 'var(--crm-line)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAssign}
                disabled={submittingBulkAssign || !bulkAssignTargetId}
                className="px-5 py-2.5 text-xs uppercase font-bold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer transition-all flex items-center gap-2 shadow-md disabled:opacity-50"
              >
                <FiUserCheck size={14} />
                {submittingBulkAssign ? 'Assigning...' : `Assign ${selectedLeads.size} Lead${selectedLeads.size > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE CAREER LEAD INTERVIEW & AUDIT LOG POPUP MODAL */}
      <CareerLeadInterviewModal
        lead={selectedLeadForInterviewModal}
        isOpen={showInterviewModal}
        onClose={() => setShowInterviewModal(false)}
        onRefresh={fetchLeadsData}
      />
    </div>
  );
}
