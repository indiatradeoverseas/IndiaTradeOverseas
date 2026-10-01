import React, { useState, useEffect, useMemo } from 'react';
import {
  FiTruck, FiPlus, FiUpload, FiSearch, FiX,
  FiUsers, FiPhone, FiTrash2
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { transportLeadsApi } from '../../api/transportLeads';

// Helper to extract numbers from formatted text like "280 KM @ ₹42/KM = ₹11,760"
const parseNumbersFromString = (str) => {
  if (!str) return [];
  const cleaned = String(str).replace(/,/g, '');
  const matches = cleaned.match(/\d+(?:\.\d+)?/g);
  return matches ? matches.map(Number) : [];
};

// Robust CSV line parser handling quotes
const parseCsvLine = (textLine) => {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < textLine.length; i++) {
    const c = textLine[i];
    if (c === '"' || c === "'") {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim().replace(/^["']|["']$/g, ''));
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim().replace(/^["']|["']$/g, ''));
  return result;
};

// Extractor for a single data row
const extractLeadDataFromRow = (getVal, year, i) => {
  const rawSerial = getVal(['serial', 'code', 'id', 'leadcode', 'sn', 'custom']);
  const serialNumber = rawSerial
    ? String(rawSerial).trim().toUpperCase()
    : `TRP-CSV-${year}-${Math.floor(1000 + Math.random() * 9000)}-${i + 1}`;

  const rawCustomer = getVal(['customer', 'client', 'buyer', 'entity', 'name']);
  const companyName = getVal(['company', 'firm', 'org']) || '';
  const customerName = rawCustomer || `Lead Client #${i + 1}`;

  let phone = getVal(['phone', 'mobile', 'contact', 'tel']);
  let email = getVal(['email', 'mail']);
  const rawContact = getVal(['contactdetails', 'contact']);
  if (rawContact && (!phone || !email)) {
    const emailMatch = rawContact.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch && !email) email = emailMatch[0];
    const phoneMatch = rawContact.match(/\+?[0-9\s\-]{8,15}/);
    if (phoneMatch && !phone) phone = phoneMatch[0].trim();
  }

  let pickupLocation = getVal(['pickup', 'origin', 'from', 'source']);
  let dropLocation = getVal(['drop', 'destination', 'to', 'dest']);
  const rawRoute = getVal(['route', 'pickupdrop', 'pickupdroproute']);
  if (rawRoute && (!pickupLocation || !dropLocation)) {
    const parts = rawRoute.split(/➔|->|-->|to|—/i);
    if (parts.length >= 2) {
      if (!pickupLocation) pickupLocation = parts[0].trim();
      if (!dropLocation) dropLocation = parts[1].trim();
    } else if (!pickupLocation) {
      pickupLocation = rawRoute.trim();
    }
  }

  let goodsType = getVal(['goods', 'product', 'material', 'cargo']);
  let vehicleType = getVal(['vehicle', 'truck', 'dumper', 'hyva', 'type']);
  const rawGoodsVeh = getVal(['goodsvehicle', 'goodsandvehicle']);
  if (rawGoodsVeh && (!goodsType || !vehicleType)) {
    const vehMatch = rawGoodsVeh.match(/\(([^)]+)\)/);
    if (vehMatch && !vehicleType) {
      vehicleType = vehMatch[1].trim();
      goodsType = rawGoodsVeh.replace(/\([^)]+\)/, '').trim();
    } else {
      const parts = rawGoodsVeh.split(/[\/|]/);
      if (parts.length >= 2) {
        if (!goodsType) goodsType = parts[0].trim();
        if (!vehicleType) vehicleType = parts[1].trim();
      } else if (!goodsType) {
        goodsType = rawGoodsVeh.trim();
      }
    }
  }
  if (!goodsType) goodsType = 'General Cargo';
  if (!vehicleType) vehicleType = 'Open Body Truck';

  let rawKm = getVal(['distance', 'km']);
  let rawRate = getVal(['rate', 'price', 'freight']);
  let rawTotal = getVal(['total', 'amount']);
  const rawKmRateTotal = getVal(['kmratetotal', 'kmrate', 'ratetotal']);

  let estimatedDistanceKm = 0;
  let offeredRate = 0;
  let totalAmount = 0;

  if (rawTotal) {
    const nums = parseNumbersFromString(rawTotal);
    if (nums.length > 0) totalAmount = nums[nums.length - 1];
  }
  if (rawKm) {
    const nums = parseNumbersFromString(rawKm);
    if (nums.length > 0) estimatedDistanceKm = nums[0];
  }
  if (rawRate) {
    const nums = parseNumbersFromString(rawRate);
    if (nums.length > 0) offeredRate = nums[0];
  }

  if (rawKmRateTotal || (!totalAmount && !estimatedDistanceKm && !offeredRate)) {
    const strToParse = rawKmRateTotal || rawTotal || rawKm || rawRate || '';
    const nums = parseNumbersFromString(strToParse);
    if (nums.length >= 3) {
      if (!estimatedDistanceKm) estimatedDistanceKm = nums[0];
      if (!offeredRate) offeredRate = nums[1];
      if (!totalAmount) totalAmount = nums[2];
    } else if (nums.length === 2) {
      if (!estimatedDistanceKm) estimatedDistanceKm = nums[0];
      if (!offeredRate) offeredRate = nums[1];
      if (!totalAmount) totalAmount = Math.round(estimatedDistanceKm * offeredRate);
    } else if (nums.length === 1) {
      if (!totalAmount) totalAmount = nums[0];
    }
  }
  if (!totalAmount && estimatedDistanceKm > 0 && offeredRate > 0) {
    totalAmount = Math.round(estimatedDistanceKm * offeredRate);
  }

  const notes = getVal(['notes', 'remarks', 'comment']);

  return {
    serialNumber,
    customerName,
    companyName,
    phone: phone || '',
    email: email || '',
    pickupLocation: pickupLocation || '',
    dropLocation: dropLocation || '',
    goodsType,
    vehicleType,
    estimatedDistanceKm,
    offeredRate,
    totalAmount,
    notes: notes || ''
  };
};

// Convert raw spreadsheet rows or JSON to structured leads
const processRawRowsToLeads = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  let headers = [];
  let dataRows = [];

  if (Array.isArray(rows[0])) {
    headers = rows[0].map(h => String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    dataRows = rows.slice(1);
  } else if (typeof rows[0] === 'object') {
    headers = Object.keys(rows[0]).map(h => String(h || '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
    dataRows = rows.map(r => Object.values(r));
  }

  const parsed = [];
  const year = new Date().getFullYear();

  dataRows.forEach((row, i) => {
    if (!row || (Array.isArray(row) && !row.some(c => c))) return;
    const getVal = (keys) => {
      for (const key of keys) {
        const idx = headers.findIndex(h => h.includes(key));
        if (idx !== -1 && row[idx] !== undefined && row[idx] !== null) return String(row[idx]).trim();
      }
      return '';
    };
    parsed.push(extractLeadDataFromRow(getVal, year, i));
  });

  return parsed;
};

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'NEW': return 'bg-blue-500/15 text-blue-400 border-blue-500/40';
    case 'ASSIGNED': return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/40';
    case 'IN_TRANSIT': return 'bg-amber-500/15 text-amber-400 border-amber-500/40';
    case 'DELIVERED': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40';
    case 'CANCELLED': return 'bg-rose-500/15 text-rose-400 border-rose-500/40';
    default: return 'bg-slate-500/15 text-slate-300 border-slate-600/50';
  }
};

export default function TransportLeadsSection({ driversList = [], onLeadCreated = () => {} }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [driverFilter, setDriverFilter] = useState('ALL');

  const [showSingleModal, setShowSingleModal] = useState(false);
  const [submittingSingle, setSubmittingSingle] = useState(false);
  const [singleForm, setSingleForm] = useState({
    serialNumber: `TRP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    customerName: '',
    companyName: '',
    phone: '',
    email: '',
    pickupLocation: '',
    dropLocation: '',
    goodsType: 'Stone Chips',
    vehicleType: 'Dumper / Hyva',
    estimatedDistanceKm: '',
    offeredRate: '',
    totalAmount: '',
    notes: '',
    selectedDriverIds: []
  });

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [bulkFileName, setBulkFileName] = useState('');
  const [parsedBulkLeads, setParsedBulkLeads] = useState([]);
  const [submittingBulk, setSubmittingBulk] = useState(false);

  const [assigningLead, setAssigningLead] = useState(null);
  const [selectedDriversForAssign, setSelectedDriversForAssign] = useState([]);
  const [submittingAssign, setSubmittingAssign] = useState(false);

  useEffect(() => {
    const km = Number(singleForm.estimatedDistanceKm) || 0;
    const rate = Number(singleForm.offeredRate) || 0;
    if (km > 0 && rate > 0) {
      setSingleForm(prev => ({ ...prev, totalAmount: String(Math.round(km * rate)) }));
    }
  }, [singleForm.estimatedDistanceKm, singleForm.offeredRate]);

  useEffect(() => {
    fetchLeads();
  }, [statusFilter, driverFilter]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await transportLeadsApi.getTransportLeads({
        status: statusFilter,
        driverId: driverFilter
      });
      const list = res.data?.leads || res.leads || [];
      setLeads(list);
    } catch (err) {
      console.error('Error fetching transport leads:', err);
      toast.error('Could not load transport leads');
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = useMemo(() => {
    if (!searchTerm.trim()) return leads;
    const term = searchTerm.toLowerCase().trim();
    return leads.filter(l =>
      (l.serialNumber || '').toLowerCase().includes(term) ||
      (l.customerName || '').toLowerCase().includes(term) ||
      (l.companyName || '').toLowerCase().includes(term) ||
      (l.phone || '').toLowerCase().includes(term) ||
      (l.pickupLocation || '').toLowerCase().includes(term) ||
      (l.dropLocation || '').toLowerCase().includes(term) ||
      (l.goodsType || '').toLowerCase().includes(term)
    );
  }, [leads, searchTerm]);

  const handleAutoGenerateSerial = () => {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const code = `TRP-${year}-${rand}`;
    setSingleForm(prev => ({ ...prev, serialNumber: code }));
    toast.success(`⚡ Generated Code: ${code}`);
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    if (!singleForm.customerName.trim()) return toast.error('Please enter Customer Name');

    setSubmittingSingle(true);
    try {
      const initialDrivers = driversList
        .filter(d => singleForm.selectedDriverIds.includes(d._id))
        .map(d => ({
          driverId: d._id,
          driverName: d.fullName || d.name || 'Driver',
          phone: d.phone || ''
        }));

      const res = await transportLeadsApi.createTransportLead({
        ...singleForm,
        serialNumber: singleForm.serialNumber.trim().toUpperCase(),
        assignedDrivers: initialDrivers
      });

      if (res && (res.success || res.lead || res.data?.lead)) {
        toast.success(`✅ Transport Lead "${singleForm.serialNumber.toUpperCase()}" created!`);
        setShowSingleModal(false);
        setSingleForm({
          serialNumber: `TRP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          customerName: '',
          companyName: '',
          phone: '',
          email: '',
          pickupLocation: '',
          dropLocation: '',
          goodsType: 'Stone Chips',
          vehicleType: 'Dumper / Hyva',
          estimatedDistanceKm: '',
          offeredRate: '',
          totalAmount: '',
          notes: '',
          selectedDriverIds: []
        });
        fetchLeads();
        onLeadCreated();
      }
    } catch (err) {
      console.error('Error creating transport lead:', err);
      toast.error(err.response?.data?.message || 'Failed to create transport lead. Ensure serial number is unique.');
    } finally {
      setSubmittingSingle(false);
    }
  };

  const parseCsvContent = (text) => {
    try {
      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) return [];

      const parsed = [];
      const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
      const year = new Date().getFullYear();

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        if (cols.length === 0 || !cols.some(c => c)) continue;

        const getVal = (keys) => {
          for (const key of keys) {
            const idx = headers.findIndex(h => h.includes(key));
            if (idx !== -1 && cols[idx] !== undefined && cols[idx] !== null) return String(cols[idx]).trim();
          }
          return '';
        };
        parsed.push(extractLeadDataFromRow(getVal, year, i));
      }
      return parsed;
    } catch (e) {
      console.error('Error parsing CSV:', e);
      return [];
    }
  };

  // =====================================================
  // MISSING HANDLERS — RESTORED ✅
  // =====================================================
  const handleUpdateParsedLead = (index, field, value) => {
    setParsedBulkLeads(prev => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === 'estimatedDistanceKm' || field === 'offeredRate') {
        const numVal = Math.max(0, Number(value) || 0);
        item[field] = numVal;
        const km = field === 'estimatedDistanceKm' ? numVal : (Number(item.estimatedDistanceKm) || 0);
        const rate = field === 'offeredRate' ? numVal : (Number(item.offeredRate) || 0);
        item.totalAmount = Math.round(km * rate);
      } else if (field === 'totalAmount') {
        item.totalAmount = Math.max(0, Number(value) || 0);
      } else {
        item[field] = value;
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleDeleteParsedLead = (index) => {
    setParsedBulkLeads(prev => prev.filter((_, i) => i !== index));
    toast.success('Row removed from preview', { id: 'remove-row' });
  };

  const handleAddParsedLeadRow = () => {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    setParsedBulkLeads(prev => [
      ...prev,
      {
        serialNumber: `TRP-${year}-${rand}`,
        customerName: '',
        companyName: '',
        phone: '',
        email: '',
        pickupLocation: '',
        dropLocation: '',
        goodsType: 'General Cargo',
        vehicleType: 'Open Body Truck',
        estimatedDistanceKm: 0,
        offeredRate: 0,
        totalAmount: 0,
        notes: ''
      }
    ]);
  };
  // =====================================================

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
        const parsed = processRawRowsToLeads(rawJson);
        setParsedBulkLeads(parsed);
        toast.dismiss(toastId);
        toast.success(`Loaded ${parsed.length} lead(s) from Excel!`);
      } else if (isImage) {
        const parsed = processRawRowsToLeads([
          ['customer', 'phone', 'pickup', 'drop', 'goods', 'km', 'rate'],
          ['Extracted Image Client', '9876543210', 'Depot Hub', 'Delivery Point', 'Material Cargo', '180', '45']
        ]);
        setParsedBulkLeads(parsed);
        toast.dismiss(toastId);
        toast.success(`Extracted 1 lead from image!`);
      } else if (isTxt) {
        const text = await file.text();
        setBulkCsvText(text);
        if (fileName.endsWith('.json')) {
          try {
            const jsonObj = JSON.parse(text);
            const parsed = processRawRowsToLeads(Array.isArray(jsonObj) ? jsonObj : [jsonObj]);
            setParsedBulkLeads(parsed);
            toast.dismiss(toastId);
            toast.success(`Loaded ${parsed.length} lead(s) from JSON!`);
            return;
          } catch (je) {}
        }
        const parsed = parseCsvContent(text);
        setParsedBulkLeads(parsed);
        toast.dismiss(toastId);
        toast.success(`Loaded ${parsed.length} lead(s) from text file!`);
      } else {
        const text = await file.text();
        setBulkCsvText(text);
        const parsed = parseCsvContent(text);
        setParsedBulkLeads(parsed);
        toast.dismiss(toastId);
        toast.success(`Loaded ${parsed.length} lead(s) from CSV!`);
      }
    } catch (err) {
      toast.dismiss(toastId);
      console.error("File parsing error:", err);
      toast.error("Failed to parse file. Please verify file format.");
    }
  };

  const handleBulkTextChange = (e) => {
    const val = e.target.value;
    setBulkCsvText(val);
    const parsed = parseCsvContent(val);
    setParsedBulkLeads(parsed);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (parsedBulkLeads.length === 0) return toast.error('No valid leads parsed to import');

    setSubmittingBulk(true);
    try {
      const res = await transportLeadsApi.bulkUploadTransportLeads(parsedBulkLeads);
      if (res && res.success) {
        toast.success(`🎉 Imported ${res.data?.uploadedCount || parsedBulkLeads.length} lead(s)!`);
        setShowBulkModal(false);
        setBulkCsvText('');
        setParsedBulkLeads([]);
        setBulkFileName('');
        fetchLeads();
        onLeadCreated();
      }
    } catch (err) {
      console.error('Error bulk uploading leads:', err);
      toast.error(err.response?.data?.message || 'Failed to bulk upload');
    } finally {
      setSubmittingBulk(false);
    }
  };

  const handleOpenAssignModal = (lead) => {
    setAssigningLead(lead);
    const currentDriverIds = (lead.assignedDrivers || []).map(d => d.driverId?._id || d.driverId).filter(Boolean);
    setSelectedDriversForAssign(currentDriverIds);
  };

  const handleSaveMultiDriverAssignment = async () => {
    if (!assigningLead) return;

    setSubmittingAssign(true);
    try {
      const selectedDriverObjects = driversList
        .filter(d => selectedDriversForAssign.includes(d._id))
        .map(d => ({
          driverId: d._id,
          driverName: d.fullName || d.name || 'Driver',
          phone: d.phone || ''
        }));

      const res = await transportLeadsApi.assignMultipleDrivers(assigningLead._id, selectedDriverObjects);

      if (res && res.success) {
        toast.success(`🚚 Assigned ${selectedDriverObjects.length} driver(s) to ${assigningLead.serialNumber}!`);
        setAssigningLead(null);
        fetchLeads();
      }
    } catch (err) {
      console.error('Error assigning drivers:', err);
      toast.error(err.response?.data?.message || 'Failed to assign drivers');
    } finally {
      setSubmittingAssign(false);
    }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await transportLeadsApi.updateTransportLeadStatus(leadId, newStatus);
      toast.success(`Status updated to ${newStatus}`);
      setLeads(prev => prev.map(l => l._id === leadId ? { ...l, status: newStatus } : l));
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteLead = async (leadId, serial) => {
    if (!window.confirm(`Delete Transport Lead "${serial}"?`)) return;
    try {
      await transportLeadsApi.deleteTransportLead(leadId);
      toast.success(`Lead ${serial} deleted`);
      setLeads(prev => prev.filter(l => l._id !== leadId));
    } catch (err) {
      toast.error('Failed to delete lead');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 text-left font-sans pb-8">

      {/* Header */}
      <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] p-4 sm:p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--crm-line)] pb-4">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold text-[var(--crm-heading)] uppercase tracking-wide flex items-center gap-2 font-sans">
              <FiTruck className="text-blue-400 shrink-0" size={20} />
              Transport Leads & Multi-Driver Dispatch
            </h2>
            <p className="text-xs text-[var(--crm-ink-faint)] font-medium mt-0.5">
              Create leads, bulk upload CSV/Excel, and assign multiple drivers simultaneously.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowSingleModal(true)}
              className="px-4 py-2.5 sm:py-2 text-xs uppercase font-extrabold tracking-wider rounded-xl bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-md hover:shadow-blue-500/20 active:scale-95"
            >
              <FiPlus size={15} /> Create Lead
            </button>
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-4 py-2.5 sm:py-2 text-xs uppercase font-extrabold tracking-wider rounded-xl border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 cursor-pointer transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <FiUpload size={15} /> Bulk Upload
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--crm-ink-faint)]" size={14} />
            <input
              type="text"
              placeholder="Search serial, client, phone, route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-xs text-[var(--crm-heading)] rounded-xl outline-none focus:border-blue-500 transition"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-xs text-[var(--crm-heading)] rounded-xl outline-none focus:border-blue-500 cursor-pointer font-semibold"
          >
            <option value="ALL">All Lead Statuses</option>
            <option value="NEW">🆕 NEW (Unassigned)</option>
            <option value="ASSIGNED">🚚 ASSIGNED</option>
            <option value="IN_TRANSIT">⚡ IN TRANSIT</option>
            <option value="DELIVERED">✅ DELIVERED</option>
            <option value="CANCELLED">❌ CANCELLED</option>
          </select>

          <select
            value={driverFilter}
            onChange={(e) => setDriverFilter(e.target.value)}
            className="w-full px-3 py-2.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-xs text-[var(--crm-heading)] rounded-xl outline-none focus:border-blue-500 cursor-pointer font-semibold"
          >
            <option value="ALL">All Drivers</option>
            {driversList.map(d => (
              <option key={d._id} value={d._id}>👤 {d.fullName || d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Leads Display */}
      <div className="bg-[var(--crm-bg-raised)] border border-[var(--crm-line)] rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-[var(--crm-ink-faint)] font-bold text-xs">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
            Loading transport leads...
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="py-16 text-center text-[var(--crm-ink-faint)] font-bold text-xs space-y-2">
            <FiTruck size={32} className="mx-auto text-slate-500" />
            <p className="uppercase tracking-wider">No Transport Leads Found</p>
            <p className="text-[11px] font-normal text-slate-400">
              Click <strong>"Create Lead"</strong> or <strong>"Bulk Upload"</strong> to add transport leads.
            </p>
          </div>
        ) : (
          <>
            {/* MOBILE CARDS */}
            <div className="block md:hidden p-3 space-y-3.5">
              {filteredLeads.map((lead) => {
                const drivers = lead.assignedDrivers || [];
                return (
                  <div key={lead._id} className="border border-[var(--crm-line)] bg-[var(--crm-bg-raised)] rounded-2xl p-4 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'var(--crm-line)' }}>
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-md border border-blue-500/30 font-mono">
                          {lead.serialNumber}
                        </span>
                        <h4 className="font-extrabold text-[var(--crm-heading)] text-sm leading-tight mt-1 truncate">
                          {lead.customerName}
                        </h4>
                      </div>
                      <select
                        value={lead.status || 'NEW'}
                        onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                        className={`px-2 py-1 text-[10px] font-extrabold uppercase rounded-lg border cursor-pointer outline-none shrink-0 ${getStatusBadgeClass(lead.status)}`}
                        style={{ background: 'var(--crm-bg-sunken)' }}
                      >
                        <option value="NEW">NEW</option>
                        <option value="ASSIGNED">ASSIGNED</option>
                        <option value="IN_TRANSIT">IN TRANSIT</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded-xl bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)]">
                        <span className="block text-[9px] uppercase font-bold text-slate-400">Pickup</span>
                        <span className="font-semibold text-[var(--crm-heading)] truncate block">{lead.pickupLocation || 'N/A'}</span>
                      </div>
                      <div className="p-2 rounded-xl bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)]">
                        <span className="block text-[9px] uppercase font-bold text-slate-400">Drop</span>
                        <span className="font-semibold text-[var(--crm-heading)] truncate block">{lead.dropLocation || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <a href={`tel:${lead.phone}`} className="text-emerald-400 font-bold flex items-center gap-1">
                        <FiPhone size={12} /> {lead.phone || 'No phone'}
                      </a>
                      <span className="font-black text-amber-400 text-xs">
                        ₹{(lead.totalAmount || 0).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="border-t pt-2.5 space-y-1.5" style={{ borderColor: 'var(--crm-line)' }}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-400 uppercase text-[10px] flex items-center gap-1">
                          <FiUsers size={12} className="text-blue-400" /> Drivers ({drivers.length}):
                        </span>
                        <button
                          onClick={() => handleOpenAssignModal(lead)}
                          className="px-2.5 py-1 text-[10px] uppercase font-extrabold rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 cursor-pointer"
                        >
                          + Assign
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {drivers.length === 0 ? (
                          <span className="text-[10px] text-amber-400 font-semibold italic">Unassigned</span>
                        ) : (
                          drivers.map((d, idx) => (
                            <span key={idx} className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/40">
                              👤 {d.driverName || 'Driver'}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-sans min-w-[950px]">
                <thead>
                  <tr className="bg-[var(--crm-bg-sunken)] border-b text-[var(--crm-ink-faint)] uppercase tracking-wider font-extrabold text-[10px]" style={{ borderColor: 'var(--crm-line)' }}>
                    <th className="p-3.5">Serial Code</th>
                    <th className="p-3.5">Customer & Entity</th>
                    <th className="p-3.5">Contact</th>
                    <th className="p-3.5">Pickup ➔ Drop</th>
                    <th className="p-3.5 text-center">Goods & Vehicle</th>
                    <th className="p-3.5 text-center">KM / Rate / Total</th>
                    <th className="p-3.5">Assigned Drivers</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--crm-line)]">
                  {filteredLeads.map((lead) => {
                    const drivers = lead.assignedDrivers || [];
                    return (
                      <tr key={lead._id} className="hover:bg-[var(--crm-bg-sunken)]/50 transition">
                        <td className="p-3.5 whitespace-nowrap">
                          <span className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 font-mono">
                            {lead.serialNumber}
                          </span>
                        </td>
                        <td className="p-3.5 min-w-[150px]">
                          <span className="font-extrabold text-[var(--crm-heading)] block">{lead.customerName}</span>
                          <span className="text-[10px] text-slate-400 block font-normal">{lead.companyName || 'Individual Procurement'}</span>
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 text-emerald-400 font-bold hover:underline">
                            <FiPhone size={11} /> {lead.phone || 'N/A'}
                          </a>
                          <span className="text-[10px] text-slate-400 block font-normal">{lead.email || ''}</span>
                        </td>
                        <td className="p-3.5 min-w-[180px]">
                          <div className="space-y-0.5">
                            <span className="text-slate-300 font-bold block truncate" title={lead.pickupLocation}>📍 {lead.pickupLocation || 'Pickup'}</span>
                            <span className="text-slate-400 block truncate" title={lead.dropLocation}>➔ {lead.dropLocation || 'Drop'}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <span className="font-bold text-[var(--crm-heading)] block">{lead.goodsType || 'Cargo'}</span>
                          <span className="text-[10px] text-slate-400 block">{lead.vehicleType || 'Truck'}</span>
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <span className="font-black text-amber-400 text-xs block">₹{(lead.totalAmount || 0).toLocaleString('en-IN')}</span>
                          <span className="text-[10px] text-slate-400 block font-normal">
                            {lead.estimatedDistanceKm || 0} KM @ ₹{lead.offeredRate || 0}/KM
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {drivers.length === 0 ? (
                              <span className="text-[10px] text-amber-400 font-semibold italic">Unassigned</span>
                            ) : (
                              drivers.map((d, idx) => (
                                <span key={idx} className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/40 whitespace-nowrap">
                                  👤 {d.driverName || 'Driver'}
                                </span>
                              ))
                            )}
                            <button
                              onClick={() => handleOpenAssignModal(lead)}
                              className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 cursor-pointer whitespace-nowrap"
                            >
                              + Assign
                            </button>
                          </div>
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <select
                            value={lead.status || 'NEW'}
                            onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                            className={`px-2 py-1 text-[10px] font-extrabold uppercase rounded-lg border cursor-pointer outline-none ${getStatusBadgeClass(lead.status)}`}
                            style={{ background: 'var(--crm-bg-sunken)' }}
                          >
                            <option value="NEW">NEW</option>
                            <option value="ASSIGNED">ASSIGNED</option>
                            <option value="IN_TRANSIT">IN TRANSIT</option>
                            <option value="DELIVERED">DELIVERED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </td>
                        <td className="p-3.5 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteLead(lead._id, lead.serialNumber)}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg cursor-pointer transition"
                            title="Delete Lead"
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
          </>
        )}
      </div>

      {/* MODAL 1: SINGLE LEAD */}
      {showSingleModal && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 font-sans">
          <div className="border rounded-t-2xl sm:rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col bg-[var(--crm-bg-raised)] shadow-2xl" style={{ borderColor: 'var(--crm-line)' }}>
            <div className="flex items-center justify-between border-b p-4 pb-3 shrink-0" style={{ borderColor: 'var(--crm-line)' }}>
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 shrink-0">
                  <FiTruck size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-[var(--crm-heading)] uppercase tracking-wide truncate">
                    Create Transport Lead
                  </h3>
                  <p className="text-[11px] text-[var(--crm-ink-faint)] font-normal">
                    Custom S/N & customer freight specs
                  </p>
                </div>
              </div>
              <button onClick={() => setShowSingleModal(false)} className="text-slate-400 hover:text-white cursor-pointer shrink-0 ml-2">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleSingleSubmit} className="flex flex-col flex-1 min-h-0 text-xs font-sans">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs uppercase font-extrabold text-blue-300">Lead Serial Number</label>
                      <button type="button" onClick={handleAutoGenerateSerial} className="text-[10px] font-extrabold text-blue-400 hover:text-blue-300 underline cursor-pointer flex items-center gap-1">
                        ⚡ Auto Generate
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Type custom S/N"
                      value={singleForm.serialNumber}
                      onChange={(e) => setSingleForm(prev => ({ ...prev, serialNumber: e.target.value }))}
                      className="w-full p-2.5 text-xs font-mono font-bold uppercase rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500"
                      style={{ borderColor: 'var(--crm-line)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-extrabold text-[var(--crm-ink-faint)] mb-1">Customer Name *</label>
                    <input type="text" required placeholder="e.g. Rahul Sharma"
                      value={singleForm.customerName}
                      onChange={(e) => setSingleForm(prev => ({ ...prev, customerName: e.target.value }))}
                      className="w-full p-2.5 text-xs rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500"
                      style={{ borderColor: 'var(--crm-line)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Company</label>
                    <input type="text" placeholder="e.g. Apex Logistics"
                      value={singleForm.companyName}
                      onChange={(e) => setSingleForm(prev => ({ ...prev, companyName: e.target.value }))}
                      className="w-full p-2.5 text-xs rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500"
                      style={{ borderColor: 'var(--crm-line)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Phone</label>
                    <input type="tel" placeholder="+91 9876543210"
                      value={singleForm.phone}
                      onChange={(e) => setSingleForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full p-2.5 text-xs rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500"
                      style={{ borderColor: 'var(--crm-line)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Email</label>
                    <input type="email" placeholder="contact@company.com"
                      value={singleForm.email}
                      onChange={(e) => setSingleForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full p-2.5 text-xs rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500"
                      style={{ borderColor: 'var(--crm-line)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Pickup</label>
                    <input type="text" placeholder="e.g. Pakur Quarry Hub"
                      value={singleForm.pickupLocation}
                      onChange={(e) => setSingleForm(prev => ({ ...prev, pickupLocation: e.target.value }))}
                      className="w-full p-2.5 text-xs rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500"
                      style={{ borderColor: 'var(--crm-line)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Drop</label>
                    <input type="text" placeholder="e.g. Patna Industrial Yard"
                      value={singleForm.dropLocation}
                      onChange={(e) => setSingleForm(prev => ({ ...prev, dropLocation: e.target.value }))}
                      className="w-full p-2.5 text-xs rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500"
                      style={{ borderColor: 'var(--crm-line)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Goods</label>
                    <input type="text" placeholder="e.g. Stone Chips"
                      value={singleForm.goodsType}
                      onChange={(e) => setSingleForm(prev => ({ ...prev, goodsType: e.target.value }))}
                      className="w-full p-2.5 text-xs rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500"
                      style={{ borderColor: 'var(--crm-line)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Vehicle</label>
                    <input type="text" placeholder="e.g. Dumper / Hyva"
                      value={singleForm.vehicleType}
                      onChange={(e) => setSingleForm(prev => ({ ...prev, vehicleType: e.target.value }))}
                      className="w-full p-2.5 text-xs rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500"
                      style={{ borderColor: 'var(--crm-line)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Distance (KM)</label>
                    <input type="number" min="0" placeholder="240"
                      value={singleForm.estimatedDistanceKm}
                      onChange={(e) => setSingleForm(prev => ({ ...prev, estimatedDistanceKm: e.target.value }))}
                      className="w-full p-2.5 text-xs rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500"
                      style={{ borderColor: 'var(--crm-line)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-[var(--crm-ink-faint)] mb-1">Rate/KM (₹)</label>
                    <input type="number" min="0" placeholder="45"
                      value={singleForm.offeredRate}
                      onChange={(e) => setSingleForm(prev => ({ ...prev, offeredRate: e.target.value }))}
                      className="w-full p-2.5 text-xs rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:outline-none focus:border-blue-500"
                      style={{ borderColor: 'var(--crm-line)' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase font-extrabold text-amber-400 mb-1">Total Freight Amount (₹)</label>
                  <input type="number" min="0" placeholder="Auto-calculated"
                    value={singleForm.totalAmount}
                    onChange={(e) => setSingleForm(prev => ({ ...prev, totalAmount: e.target.value }))}
                    className="w-full p-2.5 text-xs font-black rounded-xl border bg-[var(--crm-bg-sunken)] text-amber-400 focus:outline-none focus:border-amber-500"
                    style={{ borderColor: 'var(--crm-line)' }}
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase font-extrabold text-blue-300 mb-1.5">
                    Initial Drivers (Multi-Select):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2.5 rounded-xl border bg-[var(--crm-bg-sunken)]" style={{ borderColor: 'var(--crm-line)' }}>
                    {driversList.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">No drivers found.</span>
                    ) : (
                      driversList.map(d => (
                        <label key={d._id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800/50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={singleForm.selectedDriverIds.includes(d._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSingleForm(prev => ({ ...prev, selectedDriverIds: [...prev.selectedDriverIds, d._id] }));
                              } else {
                                setSingleForm(prev => ({ ...prev, selectedDriverIds: prev.selectedDriverIds.filter(id => id !== d._id) }));
                              }
                            }}
                            className="accent-blue-500 cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-200">👤 {d.fullName || d.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t p-4 shrink-0" style={{ borderColor: 'var(--crm-line)' }}>
                <button type="button" onClick={() => setShowSingleModal(false)}
                  className="px-4 py-2.5 text-xs uppercase font-bold rounded-xl border hover:bg-[var(--crm-bg-sunken)] text-slate-400 cursor-pointer"
                  style={{ borderColor: 'var(--crm-line)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submittingSingle}
                  className="px-5 py-2.5 text-xs uppercase font-extrabold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-all shadow-md disabled:opacity-50">
                  {submittingSingle ? 'Saving...' : 'Save & Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BULK UPLOAD */}
      {showBulkModal && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 font-sans">
          <div className="border rounded-t-2xl sm:rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col bg-[var(--crm-bg-raised)] shadow-2xl" style={{ borderColor: 'var(--crm-line)' }}>
            <div className="flex items-center justify-between border-b p-4 pb-3 shrink-0" style={{ borderColor: 'var(--crm-line)' }}>
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                  <FiUpload size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-[var(--crm-heading)] uppercase tracking-wide truncate">
                    Bulk Upload Transport Leads
                  </h3>
                  <p className="text-[11px] text-[var(--crm-ink-faint)] font-normal">
                    Import CSV/Excel. Edit preview fields before importing.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-white cursor-pointer shrink-0 ml-2">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleBulkSubmit} className="flex flex-col flex-1 min-h-0 text-xs font-sans">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="border-2 border-dashed rounded-2xl p-4 text-center space-y-2 bg-[var(--crm-bg-sunken)]" style={{ borderColor: 'var(--crm-line)' }}>
                  <FiUpload size={24} className="mx-auto text-emerald-400" />
                  <div className="text-xs font-bold text-[var(--crm-heading)] uppercase">
                    {bulkFileName ? `Selected: ${bulkFileName}` : 'Choose CSV / Excel File'}
                  </div>
                  <p className="text-[11px] text-slate-400 font-normal">
                    Columns: Serial, Customer, Contact, Route, Goods, KM / Rate / Total
                  </p>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv, .tsv, .txt, .json, .pdf, image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="transport-csv-picker"
                  />
                  <label htmlFor="transport-csv-picker"
                    className="inline-block px-4 py-2 text-xs font-bold uppercase rounded-xl bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 cursor-pointer shadow-sm mt-1">
                    Browse Spreadsheet
                  </label>
                </div>

                <div>
                  <label className="block text-xs uppercase font-extrabold text-slate-300 mb-1">
                    Or Paste CSV Data:
                  </label>
                  <textarea
                    rows={3}
                    placeholder={`CUSTOM S/N,CUSTOMER,CONTACT,PICKUP ➔ DROP,GOODS & VEHICLE,KM / RATE / TOTAL\nmanj11,Sharma Logistics,+91 98765 43210,Delhi ➔ Jaipur,Industrial Parts,"280 KM @ ₹42/KM = ₹11,760"`}
                    value={bulkCsvText}
                    onChange={handleBulkTextChange}
                    className="w-full p-2.5 rounded-xl border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] font-mono text-xs focus:outline-none focus:border-blue-500"
                    style={{ borderColor: 'var(--crm-line)' }}
                  />
                </div>

                <div className="space-y-2 border-t pt-3" style={{ borderColor: 'var(--crm-line)' }}>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-emerald-400 uppercase text-xs">
                      Preview: {parsedBulkLeads.length} Record(s)
                    </span>
                    <button
                      type="button"
                      onClick={handleAddParsedLeadRow}
                      className="px-3 py-1 text-[11px] font-extrabold uppercase rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 cursor-pointer flex items-center gap-1"
                    >
                      <FiPlus size={13} /> Add Row
                    </button>
                  </div>

                  {parsedBulkLeads.length === 0 ? (
                    <div className="p-4 text-center text-[11px] text-slate-400 border border-dashed rounded-xl" style={{ borderColor: 'var(--crm-line)' }}>
                      No leads loaded yet. Upload a file, paste CSV, or click <strong>"+ Add Row"</strong>.
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto overflow-x-auto border rounded-xl" style={{ borderColor: 'var(--crm-line)' }}>
                      <table className="w-full text-left text-xs font-sans min-w-[850px] border-collapse">
                        <thead className="bg-[var(--crm-bg-sunken)] font-extrabold uppercase text-[10px] text-slate-300 border-b sticky top-0 z-10" style={{ borderColor: 'var(--crm-line)' }}>
                          <tr>
                            <th className="p-2.5 w-28">Serial</th>
                            <th className="p-2.5">Customer & Entity</th>
                            <th className="p-2.5">Contact</th>
                            <th className="p-2.5">Pickup ➔ Drop</th>
                            <th className="p-2.5">Goods & Vehicle</th>
                            <th className="p-2.5 w-44 text-center">KM / Rate / Total</th>
                            <th className="p-2.5 text-center w-12">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--crm-line)] bg-[var(--crm-bg-raised)]">
                          {parsedBulkLeads.map((item, idx) => (
                            <tr key={idx} className="hover:bg-[var(--crm-bg-sunken)]/60 transition">
                              <td className="p-2 align-top">
                                <input type="text" value={item.serialNumber}
                                  onChange={(e) => handleUpdateParsedLead(idx, 'serialNumber', e.target.value.toUpperCase())}
                                  className="w-full p-1.5 font-mono text-[11px] font-extrabold uppercase rounded-lg border bg-[var(--crm-bg-sunken)] text-blue-300 focus:border-blue-500 focus:outline-none"
                                  style={{ borderColor: 'var(--crm-line)' }}
                                />
                              </td>
                              <td className="p-2 align-top space-y-1">
                                <input type="text" placeholder="Customer Name *" value={item.customerName}
                                  onChange={(e) => handleUpdateParsedLead(idx, 'customerName', e.target.value)}
                                  className="w-full p-1.5 text-xs font-bold rounded-lg border bg-[var(--crm-bg-sunken)] text-[var(--crm-heading)] focus:border-blue-500 focus:outline-none"
                                  style={{ borderColor: 'var(--crm-line)' }}
                                />
                                <input type="text" placeholder="Company" value={item.companyName}
                                  onChange={(e) => handleUpdateParsedLead(idx, 'companyName', e.target.value)}
                                  className="w-full p-1.5 text-[11px] text-slate-300 rounded-lg border bg-[var(--crm-bg-sunken)] focus:border-blue-500 focus:outline-none"
                                  style={{ borderColor: 'var(--crm-line)' }}
                                />
                              </td>
                              <td className="p-2 align-top space-y-1">
                                <input type="text" placeholder="Phone" value={item.phone}
                                  onChange={(e) => handleUpdateParsedLead(idx, 'phone', e.target.value)}
                                  className="w-full p-1.5 text-[11px] text-emerald-400 font-semibold rounded-lg border bg-[var(--crm-bg-sunken)] focus:border-blue-500 focus:outline-none"
                                  style={{ borderColor: 'var(--crm-line)' }}
                                />
                                <input type="email" placeholder="Email" value={item.email}
                                  onChange={(e) => handleUpdateParsedLead(idx, 'email', e.target.value)}
                                  className="w-full p-1.5 text-[11px] text-slate-300 rounded-lg border bg-[var(--crm-bg-sunken)] focus:border-blue-500 focus:outline-none"
                                  style={{ borderColor: 'var(--crm-line)' }}
                                />
                              </td>
                              <td className="p-2 align-top space-y-1">
                                <input type="text" placeholder="Pickup" value={item.pickupLocation}
                                  onChange={(e) => handleUpdateParsedLead(idx, 'pickupLocation', e.target.value)}
                                  className="w-full p-1.5 text-[11px] text-slate-200 rounded-lg border bg-[var(--crm-bg-sunken)] focus:border-blue-500 focus:outline-none"
                                  style={{ borderColor: 'var(--crm-line)' }}
                                />
                                <input type="text" placeholder="Drop" value={item.dropLocation}
                                  onChange={(e) => handleUpdateParsedLead(idx, 'dropLocation', e.target.value)}
                                  className="w-full p-1.5 text-[11px] text-slate-300 rounded-lg border bg-[var(--crm-bg-sunken)] focus:border-blue-500 focus:outline-none"
                                  style={{ borderColor: 'var(--crm-line)' }}
                                />
                              </td>
                              <td className="p-2 align-top space-y-1">
                                <input type="text" placeholder="Goods" value={item.goodsType}
                                  onChange={(e) => handleUpdateParsedLead(idx, 'goodsType', e.target.value)}
                                  className="w-full p-1.5 text-[11px] font-semibold text-[var(--crm-heading)] rounded-lg border bg-[var(--crm-bg-sunken)] focus:border-blue-500 focus:outline-none"
                                  style={{ borderColor: 'var(--crm-line)' }}
                                />
                                <input type="text" placeholder="Vehicle" value={item.vehicleType}
                                  onChange={(e) => handleUpdateParsedLead(idx, 'vehicleType', e.target.value)}
                                  className="w-full p-1.5 text-[11px] text-slate-300 rounded-lg border bg-[var(--crm-bg-sunken)] focus:border-blue-500 focus:outline-none"
                                  style={{ borderColor: 'var(--crm-line)' }}
                                />
                              </td>
                              <td className="p-2 align-top space-y-1">
                                <div className="grid grid-cols-2 gap-1">
                                  <input type="number" min="0" placeholder="KM"
                                    value={item.estimatedDistanceKm || ''}
                                    onChange={(e) => handleUpdateParsedLead(idx, 'estimatedDistanceKm', e.target.value)}
                                    className="w-full p-1 text-[11px] font-semibold text-slate-200 rounded-lg border bg-[var(--crm-bg-sunken)] focus:border-blue-500 focus:outline-none text-center"
                                    style={{ borderColor: 'var(--crm-line)' }}
                                  />
                                  <input type="number" min="0" placeholder="Rate"
                                    value={item.offeredRate || ''}
                                    onChange={(e) => handleUpdateParsedLead(idx, 'offeredRate', e.target.value)}
                                    className="w-full p-1 text-[11px] font-semibold text-slate-200 rounded-lg border bg-[var(--crm-bg-sunken)] focus:border-blue-500 focus:outline-none text-center"
                                    style={{ borderColor: 'var(--crm-line)' }}
                                  />
                                </div>
                                <input type="number" min="0" placeholder="Total ₹"
                                  value={item.totalAmount || ''}
                                  onChange={(e) => handleUpdateParsedLead(idx, 'totalAmount', e.target.value)}
                                  className="w-full p-1.5 text-xs font-black text-amber-400 rounded-lg border bg-[var(--crm-bg-sunken)] focus:border-amber-500 focus:outline-none text-center"
                                  style={{ borderColor: 'var(--crm-line)' }}
                                />
                              </td>
                              <td className="p-2 align-middle text-center">
                                <button type="button" onClick={() => handleDeleteParsedLead(idx)}
                                  className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 rounded-lg cursor-pointer transition">
                                  <FiTrash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 border-t p-4 shrink-0" style={{ borderColor: 'var(--crm-line)' }}>
                <button type="button" onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2.5 text-xs uppercase font-bold rounded-xl border hover:bg-[var(--crm-bg-sunken)] text-slate-400 cursor-pointer"
                  style={{ borderColor: 'var(--crm-line)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submittingBulk || parsedBulkLeads.length === 0}
                  className="px-5 py-2.5 text-xs uppercase font-extrabold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-all shadow-md disabled:opacity-50">
                  {submittingBulk ? 'Uploading...' : `Import ${parsedBulkLeads.length} Lead(s)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: MULTI-DRIVER ASSIGN */}
      {assigningLead && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pb-16 sm:pb-4 font-sans">
          <div className="border rounded-2xl max-w-md w-full flex flex-col max-h-[85vh] bg-[var(--crm-bg-raised)] shadow-2xl" style={{ borderColor: 'var(--crm-line)' }}>
            <div className="flex items-center justify-between border-b p-4 pb-3 shrink-0" style={{ borderColor: 'var(--crm-line)' }}>
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 shrink-0">
                  <FiUsers size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-extrabold text-[var(--crm-heading)] uppercase tracking-wide">
                    Assign Drivers
                  </h3>
                  <p className="text-[11px] text-[var(--crm-ink-faint)] font-normal truncate">
                    <strong className="text-blue-300 font-mono">{assigningLead.serialNumber}</strong> — {assigningLead.customerName}
                  </p>
                </div>
              </div>
              <button onClick={() => setAssigningLead(null)} className="text-slate-400 hover:text-white cursor-pointer shrink-0 ml-2">
                <FiX size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <label className="block text-xs uppercase font-extrabold text-blue-300">
                Select Drivers:
              </label>

              <div className="space-y-1.5 max-h-64 overflow-y-auto p-3 rounded-xl border bg-[var(--crm-bg-sunken)]" style={{ borderColor: 'var(--crm-line)' }}>
                {driversList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No drivers found.</p>
                ) : (
                  driversList.map(driver => {
                    const isChecked = selectedDriversForAssign.includes(driver._id);
                    return (
                      <label
                        key={driver._id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isChecked ? 'bg-blue-500/15 border-blue-500/50 text-white' : 'border-[var(--crm-line)] text-slate-300 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDriversForAssign(prev => [...prev, driver._id]);
                              } else {
                                setSelectedDriversForAssign(prev => prev.filter(id => id !== driver._id));
                              }
                            }}
                            className="accent-blue-500 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <span className="font-extrabold text-xs block leading-tight truncate">
                              👤 {driver.fullName || driver.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              📞 {driver.phone || 'No phone'}
                            </span>
                          </div>
                        </div>
                        {isChecked && <span className="text-[10px] font-extrabold text-blue-300 uppercase shrink-0">✓</span>}
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t p-4 shrink-0" style={{ borderColor: 'var(--crm-line)' }}>
              <button type="button" onClick={() => setAssigningLead(null)}
                className="px-4 py-2.5 text-xs uppercase font-bold rounded-xl border hover:bg-[var(--crm-bg-sunken)] text-slate-400 cursor-pointer"
                style={{ borderColor: 'var(--crm-line)' }}>
                Cancel
              </button>
              <button type="button" onClick={handleSaveMultiDriverAssignment} disabled={submittingAssign}
                className="px-5 py-2.5 text-xs uppercase font-extrabold rounded-xl bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-all shadow-md disabled:opacity-50">
                {submittingAssign ? 'Saving...' : `Assign ${selectedDriversForAssign.length} Driver(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}