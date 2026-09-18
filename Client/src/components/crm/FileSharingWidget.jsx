import React, { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { sharedFilesApi } from '../../api/sharedFiles';
import {
  FiFolder, FiUpload, FiDownload, FiTrash2, FiSearch, FiFileText,
  FiFile, FiImage, FiGrid, FiUsers, FiUser, FiCheck, FiX, FiRefreshCw,
  FiSend, FiPaperclip, FiInfo, FiCheckSquare, FiAlertCircle, FiClock
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const getFileIcon = (mimeType = '', fileName = '') => {
  const ext = fileName.split('.').pop().toLowerCase();
  if (mimeType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return { icon: FiImage, color: 'text-cyan-400 bg-cyan-950/60 border-cyan-800', label: 'IMAGE' };
  }
  if (mimeType.includes('pdf') || ext === 'pdf') {
    return { icon: FiFileText, color: 'text-rose-400 bg-rose-950/60 border-rose-800', label: 'PDF' };
  }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || ['xlsx', 'xls', 'csv'].includes(ext)) {
    return { icon: FiGrid, color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800', label: 'EXCEL' };
  }
  if (mimeType.includes('word') || ['doc', 'docx', 'txt', 'rtf'].includes(ext)) {
    return { icon: FiFileText, color: 'text-blue-400 bg-blue-950/60 border-blue-800', label: 'DOC' };
  }
  return { icon: FiFile, color: 'text-purple-400 bg-purple-950/60 border-purple-800', label: 'FILE' };
};

export default function FileSharingWidget({ compact = false, initialTab = 'SHARE' }) {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  // Tabs: 'SHARE' | 'RECEIVED' | 'SENT' (defaulting to SHARE for direct file sharing window)
  const [activeTab, setActiveTab] = useState(initialTab);

  // State
  const [recipients, setRecipients] = useState([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [presetTarget, setPresetTarget] = useState(''); // 'ALL' | 'MANAGERS' | 'EMPLOYEES' | ''

  const [selectedFile, setSelectedFile] = useState(null);
  const [note, setNote] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [files, setFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const userRole = (user?.role || '').toUpperCase();
  const userPos = (user?.position || '').toLowerCase();
  const canShare = ['ADMIN', 'FOUNDER', 'CEO', 'CO_FOUNDER', 'SUPER_ADMIN', 'MANAGER', 'HR_MANAGER', 'SALES_MANAGER', 'SALES_EXECUTIVE', 'HR_EXECUTIVE', 'HR', 'EMPLOYEE', 'SALES_TRIAL'].includes(userRole) ||
    userPos.includes('ceo') || userPos.includes('founder') || userPos.includes('manager');

  useEffect(() => {
    fetchSharedFiles();
    fetchRecipients();
  }, [activeTab]);

  const fetchRecipients = async () => {
    setLoadingRecipients(true);
    try {
      const res = await sharedFilesApi.getRecipients();
      const list = res?.data?.recipients || res?.recipients || (Array.isArray(res?.data) ? res.data : []);
      setRecipients(list);
    } catch (err) {
      console.warn('Failed to load recipients list:', err);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const fetchSharedFiles = async () => {
    setLoadingFiles(true);
    try {
      const direction = activeTab === 'SENT' ? 'sent' : activeTab === 'RECEIVED' ? 'received' : undefined;
      const res = await sharedFilesApi.getSharedFiles({ direction });
      const fileList = res?.data?.files || res?.files || (Array.isArray(res?.data) ? res.data : []);
      setFiles(fileList);
    } catch (err) {
      console.error('Failed to load shared files:', err);
    } finally {
      setLoadingFiles(false);
    }
  };

  // Real-time socket event refresh listener
  useEffect(() => {
    const handleSocketFileShared = () => {
      fetchSharedFiles();
    };
    window.addEventListener('file_shared_event', handleSocketFileShared);
    return () => window.removeEventListener('file_shared_event', handleSocketFileShared);
  }, [activeTab]);

  // Download Handler
  const handleDownload = async (fileObj) => {
    try {
      toast.loading(`Downloading "${fileObj.originalName}"...`, { id: 'download-toast' });
      const res = await sharedFilesApi.downloadFile(fileObj._id);
      
      const blob = new Blob([res.data || res], { type: fileObj.mimeType || 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileObj.originalName || 'downloaded-file');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Downloaded "${fileObj.originalName}"`, { id: 'download-toast' });
    } catch (err) {
      console.error('Download error:', err);
      if (fileObj._id) {
        const directUrl = `${import.meta.env.VITE_BACKEND_URL || ''}/api/shared-files/download/${fileObj._id}`;
        window.open(directUrl, '_blank');
        toast.success(`Downloading via direct stream...`, { id: 'download-toast' });
      } else {
        toast.error('Failed to download file', { id: 'download-toast' });
      }
    }
  };

  // Delete Handler
  const handleDelete = async (fileId, fileName) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) return;
    try {
      const res = await sharedFilesApi.deleteFile(fileId);
      if (res?.success) {
        toast.success(`Deleted "${fileName}"`);
        setFiles(prev => prev.filter(f => f._id !== fileId));
      } else {
        toast.error(res?.message || 'Failed to delete file');
      }
    } catch (err) {
      toast.error('Error deleting file');
    }
  };

  // Handle File Selection with 25MB Strict Check
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`🚨 File size (${formatBytes(file.size)}) exceeds the maximum allowed limit of 25MB!`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    toast.success(`📎 File selected: ${file.name} (${formatBytes(file.size)})`);
  };

  // Recipient Toggle
  const toggleRecipient = (id) => {
    setPresetTarget('');
    if (selectedRecipients.includes(id)) {
      setSelectedRecipients(selectedRecipients.filter((r) => String(r) !== String(id)));
    } else {
      setSelectedRecipients([...selectedRecipients, id]);
    }
  };

  // Target Preset Handler
  const handleSelectPreset = (preset) => {
    setPresetTarget(preset);
    if (preset === 'ALL') {
      setSelectedRecipients(recipients.map((r) => r._id));
      toast.success(`Selected All ${recipients.length} Active Staff Members`);
    } else if (preset === 'MANAGERS') {
      const mgrs = recipients.filter((r) => r.category === 'MANAGER' || r.category === 'MANAGEMENT').map((r) => r._id);
      setSelectedRecipients(mgrs);
      toast.success(`Selected All ${mgrs.length} Managers`);
    } else if (preset === 'EMPLOYEES') {
      const emps = recipients.filter((r) => r.category === 'EMPLOYEE' || r.category !== 'MANAGER').map((r) => r._id);
      setSelectedRecipients(emps);
      toast.success(`Selected All ${emps.length} Executives/Employees`);
    } else {
      setSelectedRecipients([]);
    }
  };

  // Submit Share File
  const handleUploadAndShare = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error('Please select a file to share.');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      toast.error('File size exceeds the 25MB limit.');
      return;
    }

    let targetSentTo = '';
    if (presetTarget) {
      targetSentTo = presetTarget;
    } else if (selectedRecipients.length > 0) {
      targetSentTo = selectedRecipients.join(',');
    } else {
      toast.error('Please select at least one recipient (Employee or Manager).');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('sentTo', targetSentTo);
    if (note) formData.append('note', note);

    try {
      const res = await sharedFilesApi.shareFile(formData);
      if (res?.success) {
        toast.success(`✅ File "${selectedFile.name}" shared successfully with ${res.count || 1} recipient(s)!`);
        setSelectedFile(null);
        setNote('');
        setSelectedRecipients([]);
        setPresetTarget('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setActiveTab('SENT');
        fetchSharedFiles();
      } else {
        toast.error(res?.message || 'Failed to share file.');
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || err.message || 'Error uploading file.';
      toast.error(`Share Failed: ${errMsg}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Counts
  const managersCount = useMemo(() => recipients.filter((r) => r.category === 'MANAGER' || r.category === 'MANAGEMENT').length, [recipients]);
  const executivesCount = useMemo(() => recipients.filter((r) => r.category === 'EMPLOYEE' || r.category !== 'MANAGER').length, [recipients]);

  // Filtered Recipients
  const filteredRecipients = useMemo(() => {
    return recipients.filter((r) => {
      const search = recipientSearch.trim().toLowerCase();
      const matchesSearch = !search ||
        (r.name || '').toLowerCase().includes(search) ||
        (r.email || '').toLowerCase().includes(search) ||
        (r.department || '').toLowerCase().includes(search) ||
        (r.position || '').toLowerCase().includes(search) ||
        (r.role || '').toLowerCase().includes(search) ||
        (r.employeeId || '').toLowerCase().includes(search);

      if (categoryFilter === 'ALL') return matchesSearch;
      if (categoryFilter === 'MANAGER') return matchesSearch && (r.category === 'MANAGER' || r.category === 'MANAGEMENT');
      if (categoryFilter === 'EMPLOYEE') return matchesSearch && (r.category === 'EMPLOYEE' || r.category !== 'MANAGER');
      return matchesSearch;
    });
  }, [recipients, recipientSearch, categoryFilter]);

  // Filtered Files List
  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      const search = searchQuery.toLowerCase();
      const origName = (f.originalName || '').toLowerCase();
      const noteText = (f.note || '').toLowerCase();
      const senderName = (f.sentBy?.fullName || f.sentBy?.name || '').toLowerCase();
      const recipientName = (f.sentTo?.fullName || f.sentTo?.name || '').toLowerCase();

      return origName.includes(search) || noteText.includes(search) || senderName.includes(search) || recipientName.includes(search);
    });
  }, [files, searchQuery]);

  return (
    <div className="w-full border rounded-sm overflow-hidden font-sans" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg-raised)' }}>
      {/* Header Bar */}
      <div className="px-4 sm:px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: 'var(--crm-line)', background: 'var(--crm-bg)' }}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded bg-cyan-500/10 text-cyan-500 border border-cyan-400/30">
            <FiFolder size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--crm-heading)] flex items-center gap-2 font-sans">
              Enterprise File Sharing Center <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">Max 25MB</span>
            </h2>
            <p className="text-[10px] text-[var(--crm-ink-faint)] font-sans">
              Share PDFs, Excel, Images & Documents securely across Founder, CEO, Admin, Managers & Staff
            </p>
          </div>
        </div>

        {/* Action Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('RECEIVED')}
            className={`px-3 py-1.5 text-[10px] font-sans uppercase font-semibold rounded transition-all ${
              activeTab === 'RECEIVED'
                ? 'bg-cyan-600 text-white border border-cyan-400'
                : 'bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 font-bold'
            }`}
          >
            Received Files
          </button>
          <button
            onClick={() => setActiveTab('SENT')}
            className={`px-3 py-1.5 text-[10px] font-sans uppercase font-semibold rounded transition-all ${
              activeTab === 'SENT'
                ? 'bg-cyan-600 text-white border border-cyan-400'
                : 'bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 font-bold'
            }`}
          >
            Sent Files
          </button>
          {canShare && (
            <button
              onClick={() => setActiveTab('SHARE')}
              className={`px-3.5 py-1.5 text-[10px] font-sans uppercase font-semibold rounded flex items-center gap-1.5 transition-all ${
                activeTab === 'SHARE'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md border border-cyan-400'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400'
              }`}
            >
              <FiUpload size={12} /> <span>Share File</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="p-4 sm:p-6">
        {/* SHARE NEW FILE FORM TAB */}
        {activeTab === 'SHARE' && canShare && (
          <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleUploadAndShare} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: File Dropzone & Details */}
              <div className="lg:col-span-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] uppercase tracking-wider font-sans font-bold text-[var(--crm-heading)] flex items-center gap-1.5">
                    <FiPaperclip className="text-cyan-500" /> Select Document / File (Max 25MB)
                  </label>
                  <p className="text-[10px] text-[var(--crm-ink-faint)] font-sans">
                    Supported: PDF, Excel (.xlsx, .csv), Images (.png, .jpg), Word (.docx), ZIP, etc.
                  </p>
                </div>

                {/* Dropzone Box */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    selectedFile
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'bg-[var(--crm-bg-sunken)] hover:border-cyan-500'
                  }`}
                  style={{ borderColor: selectedFile ? undefined : 'var(--crm-line)' }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt,.zip"
                  />

                  {selectedFile ? (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                        <FiCheck size={24} />
                      </div>
                      <div className="text-xs font-sans font-bold text-[var(--crm-heading)] truncate max-w-xs">{selectedFile.name}</div>
                      <div className="text-[10px] font-sans text-emerald-600 dark:text-emerald-400 font-bold">{formatBytes(selectedFile.size)} / 25MB Limit</div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-[10px] text-rose-500 hover:underline font-sans font-bold"
                      >
                        Change File
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-500">
                        <FiUpload size={20} />
                      </div>
                      <div className="text-xs font-sans text-cyan-600 dark:text-cyan-400 font-bold">Click to select file or drag & drop</div>
                      <div className="text-[10px] font-sans text-[var(--crm-ink-faint)]">Maximum file size allowed: <strong className="text-emerald-600 dark:text-emerald-400">25MB</strong></div>
                    </div>
                  )}
                </div>

                {/* Note Input */}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-sans font-bold text-[var(--crm-ink-faint)]">
                    Note / Description for Recipients (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add instructions, context, or summary of this file..."
                    className="w-full px-3 py-2 text-xs font-sans bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] rounded focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Right Column: Select Recipient Employees / Managers */}
              <div className="lg:col-span-6 space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] uppercase tracking-wider font-sans font-bold text-[var(--crm-heading)] flex items-center gap-1.5">
                      <FiUsers className="text-cyan-500" /> Select Recipient(s) ({selectedRecipients.length} selected)
                    </label>
                    <span className="text-[9px] font-sans text-cyan-500 uppercase font-bold">Target Audience</span>
                  </div>
                  <p className="text-[10px] text-[var(--crm-ink-faint)] font-sans">
                    Select specific Employee(s)/Manager(s) or use quick preset buttons
                  </p>
                </div>

                {/* Quick Target Preset Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('ALL')}
                    className={`px-2.5 py-1 text-[10px] font-sans uppercase rounded border transition-all ${
                      presetTarget === 'ALL'
                        ? 'bg-cyan-600 text-white border-cyan-400 font-bold'
                        : 'bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 font-bold'
                    }`}
                  >
                    All Staff ({recipients.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('MANAGERS')}
                    className={`px-2.5 py-1 text-[10px] font-sans uppercase rounded border transition-all ${
                      presetTarget === 'MANAGERS'
                        ? 'bg-cyan-600 text-white border-cyan-400 font-bold'
                        : 'bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 font-bold'
                    }`}
                  >
                    All Managers ({managersCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('EMPLOYEES')}
                    className={`px-2.5 py-1 text-[10px] font-sans uppercase rounded border transition-all ${
                      presetTarget === 'EMPLOYEES'
                        ? 'bg-cyan-600 text-white border-cyan-400 font-bold'
                        : 'bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 font-bold'
                    }`}
                  >
                    All Executives ({executivesCount})
                  </button>
                  {selectedRecipients.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('')}
                      className="px-2.5 py-1 text-[10px] font-sans uppercase rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-400 hover:bg-rose-500/30 font-bold"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                {/* Filter & Search Recipient Bar */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <FiSearch className="absolute left-2.5 top-2.5 text-[var(--crm-ink-faint)]" size={13} />
                    <input
                      type="text"
                      value={recipientSearch}
                      onChange={(e) => setRecipientSearch(e.target.value)}
                      placeholder="Search employee by name, role, dept..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs font-sans bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] rounded"
                    />
                  </div>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-[10px] font-sans uppercase bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] rounded"
                  >
                    <option value="ALL">All Roles ({recipients.length})</option>
                    <option value="MANAGER">Managers ({managersCount})</option>
                    <option value="EMPLOYEE">Executives ({executivesCount})</option>
                  </select>
                </div>

                {/* Recipient Selection Scroll List */}
                <div className="h-56 overflow-y-auto border rounded p-2 space-y-1.5 bg-[var(--crm-bg-sunken)]" style={{ borderColor: 'var(--crm-line)' }}>
                  {loadingRecipients ? (
                    <div className="text-center py-8 text-xs font-sans text-[var(--crm-ink-faint)] flex items-center justify-center gap-2">
                      <FiRefreshCw className="animate-spin" /> Loading employee directory...
                    </div>
                  ) : filteredRecipients.length === 0 ? (
                    <div className="text-center py-8 text-xs font-sans text-[var(--crm-ink-faint)]">No matching employees found</div>
                  ) : (
                    filteredRecipients.map((emp) => {
                      const isSelected = selectedRecipients.includes(emp._id);
                      return (
                        <div
                          key={emp._id}
                          onClick={() => toggleRecipient(emp._id)}
                          className={`flex items-center justify-between p-2 rounded cursor-pointer transition-all border ${
                            isSelected
                              ? 'bg-cyan-600 text-white border-cyan-400 font-bold shadow-sm'
                              : 'bg-[var(--crm-bg-raised)] border-[var(--crm-line)] text-[var(--crm-heading)] hover:border-cyan-400'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-white border-white text-cyan-700 font-bold' : 'border-[var(--crm-line)]'}`}>
                              {isSelected && <FiCheck size={12} />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold font-sans truncate">{emp.name}</div>
                              <div className="text-[9px] font-sans text-[var(--crm-ink-faint)] truncate">{emp.department} · {emp.position || emp.role}</div>
                            </div>
                          </div>

                          <span className={`text-[9px] font-sans px-2 py-0.5 rounded uppercase flex-shrink-0 border ${
                            isSelected 
                              ? 'bg-cyan-700 text-white border-cyan-300 font-bold' 
                              : 'bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] border-[var(--crm-line)]'
                          }`}>
                            {emp.category}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Submit Share Button */}
            <div className="border-t pt-4 flex justify-end" style={{ borderColor: 'var(--crm-line)' }}>
              <button
                type="submit"
                disabled={isUploading || !selectedFile}
                className={`px-6 py-2.5 text-xs font-sans uppercase font-bold rounded flex items-center gap-2 transition-all shadow-lg ${
                  isUploading || !selectedFile
                    ? 'bg-slate-300 text-slate-500 border border-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white border border-emerald-400/40 cursor-pointer'
                }`}
              >
                {isUploading ? (
                  <>
                    <FiRefreshCw className="animate-spin" size={14} /> <span>Uploading & Sharing...</span>
                  </>
                ) : (
                  <>
                    <FiSend size={14} /> <span>Share File Now</span>
                  </>
                )}
              </button>
            </div>
          </motion.form>
        )}

        {/* LIST RECEIVED OR SENT FILES TAB */}
        {(activeTab === 'RECEIVED' || activeTab === 'SENT') && (
          <div className="space-y-4 font-sans">
            {/* Search & Filter Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <FiSearch className="absolute left-3 top-2.5 text-[var(--crm-ink-faint)]" size={14} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeTab.toLowerCase()} files by name, sender, note...`}
                  className="w-full pl-9 pr-3 py-1.5 text-xs font-sans bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] rounded"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-sans text-[var(--crm-ink-faint)]">
                  Total {filteredFiles.length} file(s)
                </span>
                <button
                  onClick={fetchSharedFiles}
                  className="px-2.5 py-1.5 text-[10px] font-sans uppercase bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 font-bold rounded flex items-center gap-1"
                >
                  <FiRefreshCw size={11} /> Refresh
                </button>
              </div>
            </div>

            {/* Files Grid / Table List */}
            {loadingFiles ? (
              <div className="text-center py-12 text-xs font-sans text-[var(--crm-ink-faint)] flex items-center justify-center gap-2">
                <FiRefreshCw className="animate-spin" /> Fetching shared files from database...
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-10 sm:py-12 border border-dashed rounded-lg p-4 sm:p-6 bg-[var(--crm-bg-sunken)] space-y-2 w-full max-w-full overflow-hidden" style={{ borderColor: 'var(--crm-line)' }}>
                <FiFolder className="mx-auto text-[var(--crm-ink-faint)] shrink-0" size={32} />
                <div className="text-xs sm:text-sm font-sans text-[var(--crm-heading)] uppercase font-bold tracking-wider leading-snug">
                  No Shared Files Found
                </div>
                <div className="text-[10px] sm:text-xs font-sans text-[var(--crm-ink-faint)] leading-relaxed max-w-md mx-auto">
                  {activeTab === 'RECEIVED' ? 'No files have been shared with you yet.' : 'You have not shared any files yet.'}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFiles.map((fileObj) => {
                  const typeMeta = getFileIcon(fileObj.mimeType, fileObj.originalName);
                  const IconComp = typeMeta.icon;
                  const senderName = fileObj.sentBy?.fullName || fileObj.sentBy?.name || fileObj.sentBy?.email || 'Executive';
                  const senderRole = fileObj.sentBy?.role || fileObj.sentBy?.position || '';
                  const recipientName = fileObj.sentTo?.fullName || fileObj.sentTo?.name || fileObj.sentTo?.email || 'Staff';
                  const recipientRole = fileObj.sentTo?.role || fileObj.sentTo?.position || '';

                  return (
                    <motion.div
                      key={fileObj._id}
                      whileHover={{ y: -2 }}
                      className="border rounded p-4 space-y-3 flex flex-col justify-between bg-[var(--crm-bg-raised)] hover:border-cyan-400 transition-all font-sans"
                      style={{ borderColor: 'var(--crm-line)' }}
                    >
                      {/* Top Info */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`p-2 rounded border flex-shrink-0 ${typeMeta.color}`}>
                            <IconComp size={18} />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold font-sans text-[var(--crm-heading)] truncate" title={fileObj.originalName}>
                              {fileObj.originalName}
                            </h4>
                            <div className="text-[9px] font-sans text-[var(--crm-ink-faint)] flex items-center gap-2 mt-0.5">
                              <span>{formatBytes(fileObj.fileSize)}</span>
                              <span>·</span>
                              <span className="uppercase">{typeMeta.label}</span>
                            </div>
                          </div>
                        </div>

                        {activeTab === 'SENT' && (
                          <button
                            onClick={() => handleDelete(fileObj._id, fileObj.originalName)}
                            className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                            title="Delete file"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        )}
                      </div>

                      {/* Note snippet */}
                      {fileObj.note && (
                        <div className="text-[10px] font-sans p-2 rounded bg-[var(--crm-bg-sunken)] border border-[var(--crm-line)] text-[var(--crm-heading)] italic">
                          "{fileObj.note}"
                        </div>
                      )}

                      {/* Metadata Details & Download Action */}
                      <div className="pt-2 border-t flex items-center justify-between text-[9.5px] font-sans text-[var(--crm-ink-faint)]" style={{ borderColor: 'var(--crm-line)' }}>
                        <div>
                          {activeTab === 'RECEIVED' ? (
                            <div>From: <strong className="text-cyan-600 dark:text-cyan-300 font-semibold">{senderName} {senderRole ? `(${senderRole})` : ''}</strong></div>
                          ) : (
                            <div>To: <strong className="text-emerald-600 dark:text-emerald-300 font-semibold">{recipientName} {recipientRole ? `(${recipientRole})` : ''}</strong></div>
                          )}
                          <div className="text-[8.5px] text-[var(--crm-ink-faint)] flex items-center gap-1 mt-0.5 font-sans">
                            <FiClock size={9} /> {new Date(fileObj.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDownload(fileObj)}
                          className="px-3 py-1 text-[10px] font-sans uppercase font-bold bg-blue-200 text-blue-950 border border-blue-300 hover:bg-blue-300 rounded flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <FiDownload size={12} /> Download
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
