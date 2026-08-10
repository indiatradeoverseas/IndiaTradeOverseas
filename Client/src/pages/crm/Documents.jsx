import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUpload, FiDownload, FiTrash2, FiLock, FiUnlock, FiFileText, FiX, FiCheckCircle, FiXCircle, FiRefreshCw, FiFilter } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { documentsApi } from '../../api/documents';
import { useAuth } from '../../hooks/useAuth';
import { DownloadButton } from '../../components/ui/AnimatedActionButton';

const EXPORT_DOC_TYPES = [
  'SCO', 'FCO', 'ICPO', 'LOI', 'NCNDA', 'IMFPA',
  'PURCHASE_ORDER', 'PROFORMA_INVOICE', 'COMMERCIAL_INVOICE', 'PACKING_LIST',
  'COO', 'PHYTOSANITARY_CERTIFICATE', 'TEST_REPORT', 'BL', 'AWB', 'INSURANCE', 'OTHER'
];

// Cinematic staggered entrance layouts
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.02, delayChildren: 0.1 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 120, damping: 20 } }
};

export default function Documents() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    ownerType: 'LEAD',
    ownerId: '',
    accessLevel: 'RESTRICTED',
    exportDocType: 'OTHER'
  });
  const [filterExportDocType, setFilterExportDocType] = useState('');
  const [filterApprovalStatus, setFilterApprovalStatus] = useState('');
  const [versioningId, setVersioningId] = useState(null);

  const isApprover = ['ADMIN', 'MANAGER'].includes(user?.role);
  const canUploadNewVersion = (doc) =>
    user?.role === 'ADMIN' || user?.role === 'MANAGER' || doc.uploadedBy === user?._id || doc.uploadedBy?._id === user?._id;

  const filteredDocuments = documents.filter((d) =>
    (!filterExportDocType || (d.exportDocType || 'OTHER') === filterExportDocType) &&
    (!filterApprovalStatus || (d.approvalStatus || 'PENDING') === filterApprovalStatus)
  );

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await documentsApi.getDocuments();
      if (response.success) {
        setDocuments(response.data.documents || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents registry');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a valid document format');
      return;
    }

    setIsSubmitting(true);
    const data = new FormData();
    data.append('file', selectedFile);
    data.append('ownerType', formData.ownerType);
    data.append('ownerId', formData.ownerId);
    data.append('accessLevel', formData.accessLevel);
    data.append('exportDocType', formData.exportDocType);

    try {
      const response = await documentsApi.uploadDocument(data);
      if (response.success) {
        toast.success('Document uploaded successfully');
        setShowModal(false);
        setSelectedFile(null);
        setFormData({ ownerType: 'LEAD', ownerId: '', accessLevel: 'RESTRICTED', exportDocType: 'OTHER' });
        fetchDocuments();
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error(error.response?.data?.message || 'Server Error (500): Check backend terminal logs');
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadDocument = async (id, fileName) => {
    try {
      const blob = await documentsApi.downloadDocument(id);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Download initialized safely');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Could not download file. Security protocol check required.');
      throw error;
    }
  };

  const updateAccessLevel = async (id, accessLevel) => {
    try {
      const response = await documentsApi.updateAccessLevel(id, accessLevel);
      if (response.success) {
        toast.success(`Access level updated to ${accessLevel}`);
        fetchDocuments();
      }
    } catch (error) {
      console.error('Error updating access level:', error);
      toast.error('Failed to update access level');
    }
  };

  const approveDocument = async (id) => {
    try {
      const response = await documentsApi.approveDocument(id, '');
      if (response.success) {
        toast.success('Document approved');
        fetchDocuments();
      }
    } catch (error) {
      console.error('Error approving document:', error);
      toast.error(error.response?.data?.message || 'Failed to approve document');
    }
  };

  const rejectDocument = async (id) => {
    const note = window.prompt('Reason for rejecting this document:');
    if (!note) return;
    try {
      const response = await documentsApi.rejectDocument(id, note);
      if (response.success) {
        toast.success('Document rejected');
        fetchDocuments();
      }
    } catch (error) {
      console.error('Error rejecting document:', error);
      toast.error(error.response?.data?.message || 'Failed to reject document');
    }
  };

  const handleNewVersionFile = async (docId, file) => {
    if (!file) return;
    setVersioningId(docId);
    const data = new FormData();
    data.append('file', file);
    try {
      const response = await documentsApi.uploadNewVersion(docId, data);
      if (response.success) {
        toast.success('New document version uploaded');
        fetchDocuments();
      }
    } catch (error) {
      console.error('Error uploading new version:', error);
      toast.error(error.response?.data?.message || 'Failed to upload new version');
    } finally {
      setVersioningId(null);
    }
  };

  const deleteDocument = async (id) => {
    if (window.confirm('Are you sure you want to permanently delete this clear document node from database?')) {
      try {
        const response = await documentsApi.deleteDocument(id);
        if (response.success) {
          toast.success('Document purged safely');
          fetchDocuments();
        }
      } catch (error) {
        console.error('Error deleting document:', error);
        toast.error('Failed to execute terminal delete operation');
      }
    }
  };

  const getAccessLevelBadge = (level) => {
    const badgeStyles = {
      PUBLIC: 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20',
      INTERNAL: 'bg-[var(--crm-accent-bg)] text-[var(--crm-accent)] border-[var(--crm-accent)]/20',
      RESTRICTED: 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/20',
      ADMIN: 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border-[var(--crm-danger)]/20',
      MANAGER: 'bg-[var(--crm-info-bg)] text-[var(--crm-info)] border-[var(--crm-info)]/20',
      HR: 'bg-[var(--crm-accent-bg)] text-[var(--crm-accent-soft)] border-[var(--crm-accent-soft)]/20',
      SALES: 'bg-cyan-950/20 text-cyan-400 border-cyan-500/20',
      ACCOUNTS: 'bg-teal-950/20 text-teal-400 border-teal-500/20',
      FINANCE: 'bg-teal-950/20 text-teal-400 border-teal-500/20',
      PROCUREMENT: 'bg-cyan-950/20 text-cyan-400 border-cyan-500/20',
      IT: 'bg-slate-950/20 text-slate-400 border-slate-500/20',
      SOFTWARE_ENGINEER: 'bg-zinc-950/20 text-zinc-400 border-zinc-500/20',
      STONE: 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/10',
      COAL: 'bg-stone-950/20 text-stone-400 border-stone-500/20',
      TEA: 'bg-lime-950/20 text-lime-400 border-lime-500/20',
      RICE: 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/10',
      TRANSPORT: 'bg-orange-950/20 text-orange-400 border-orange-500/20'
    };

    const isLocked = level !== 'PUBLIC' && level !== 'INTERNAL';

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-mono font-bold uppercase border tracking-wider shadow-sm ${badgeStyles[level] || 'bg-gray-950/40 text-gray-400 border-gray-500/20'}`}>
        {isLocked ? <FiLock size={10} className="mr-1" /> : <FiUnlock size={10} className="mr-1" />}
        {level?.replace(/_/g, ' ')}
      </span>
    );
  };

  const getApprovalStatusBadge = (status) => {
    const resolved = status || 'PENDING';
    const badgeStyles = {
      PENDING: 'bg-[var(--crm-warning-bg)] text-[var(--crm-warning)] border-[var(--crm-warning)]/20',
      APPROVED: 'bg-[var(--crm-positive-bg)] text-[var(--crm-positive)] border-[var(--crm-positive)]/20',
      REJECTED: 'bg-[var(--crm-danger-bg)] text-[var(--crm-danger)] border-[var(--crm-danger)]/20'
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[9px] font-mono font-bold uppercase border tracking-wider shadow-sm ${badgeStyles[resolved]}`}>
        {resolved}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--crm-bg)] flex items-center justify-center">
        <div className="w-12 h-[1px] bg-[var(--crm-ink-soft)]/40 animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants} 
      className="min-h-screen w-full bg-[var(--crm-bg)] text-[var(--crm-ink-soft)] block pb-12"
    >
      {/* Upper Context Header Panel */}
      <motion.div variants={blockVariants} className="w-full border-b border-[var(--crm-ink-soft)]/10 py-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-[var(--crm-bg-sunken)]/40 backdrop-blur-sm">
        <div className="space-y-1 text-left">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--crm-ink-faint)] font-bold block font-mono">DOCUMENTATION CONTROL CENTER</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[var(--crm-heading)] uppercase tracking-tight">Security & File Vault</h1>
          <p className="text-xs text-[var(--crm-ink-faint)] font-light max-w-xl mt-1">
            Manage encrypted transaction documents, bills of lading, corporate clearance sheets, and department privileges.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto bg-[var(--crm-heading)] text-[var(--crm-bg-sunken)] text-[11px] uppercase tracking-widest font-bold h-[42px] px-5 rounded-sm flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer hover:bg-[var(--crm-ink-soft)]"
        >
          <FiUpload size={14} />
          <span>Upload Document</span>
        </button>
      </motion.div>

      {/* Filter Row */}
      <motion.div variants={blockVariants} className="w-full pt-6 flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-56 flex items-center gap-2">
          <FiFilter className="text-[var(--crm-ink-faint)] shrink-0" size={14} />
          <select
            value={filterExportDocType}
            onChange={(e) => setFilterExportDocType(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 rounded-sm outline-none text-xs cursor-pointer text-[var(--crm-heading)]"
          >
            <option value="">All Export Doc Types</option>
            {EXPORT_DOC_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div className="w-full sm:w-56">
          <select
            value={filterApprovalStatus}
            onChange={(e) => setFilterApprovalStatus(e.target.value)}
            className="w-full px-3 py-2 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 rounded-sm outline-none text-xs cursor-pointer text-[var(--crm-heading)]"
          >
            <option value="">All Approval Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </motion.div>

      {/* Main Table Container Workspace */}
      <div className="w-full py-8 bg-[var(--crm-bg)]">
        <motion.div variants={blockVariants} className="border border-[var(--crm-ink-soft)]/15 overflow-hidden w-full bg-[var(--crm-bg-raised)]/10 rounded-sm shadow-2xl">
          <div className="overflow-x-auto w-full block custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1150px]">
              <thead>
                <tr className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-faint)] text-[9px] uppercase tracking-widest font-mono font-bold border-b border-[var(--crm-ink-soft)]/15">
                  <th className="py-4 px-5">File Designation</th>
                  <th className="py-4 px-5">Owner Type</th>
                  <th className="py-4 px-5">Owner Node ID</th>
                  <th className="py-4 px-5">Export Doc Type</th>
                  <th className="py-4 px-5">Access Level Authorization</th>
                  <th className="py-4 px-5 text-center">Approval</th>
                  <th className="py-4 px-5 text-center">Uploaded On</th>
                  <th className="py-4 px-5 text-center">Execution Desk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--crm-ink-soft)]/10 text-xs">
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-20 bg-[var(--crm-bg-raised)]/5">
                      <div className="flex flex-col items-center justify-center opacity-40">
                        <FiFileText size={32} className="text-[var(--crm-ink-faint)] mb-3" />
                        <p className="font-mono uppercase tracking-widest text-[10px]">No encrypted document entries mapped.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc) => (
                    <tr key={doc._id} className="hover:bg-[var(--crm-bg-raised)]/40 transition-colors">
                      <td className="py-4 px-5 font-medium text-[var(--crm-heading)] break-all max-w-xs text-left">
                        {doc.fileName}
                        {doc.version > 1 && (
                          <span className="ml-2 inline-block px-1.5 py-0.5 text-[8px] font-mono font-bold bg-[var(--crm-info-bg)] text-[var(--crm-info)] border border-[var(--crm-info)]/20 rounded-sm align-middle" title={`Replaces v${doc.version - 1}`}>
                            v{doc.version}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-left">
                        <span className="bg-[var(--crm-bg-sunken)]/60 text-[var(--crm-ink-soft)] border border-[var(--crm-ink-soft)]/10 px-2 py-0.5 rounded-sm font-mono text-[9px] uppercase tracking-wider">
                          {doc.ownerType}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-mono text-xs text-[var(--crm-ink-faint)] text-left">{doc.ownerId || 'System Universal'}</td>
                      <td className="py-4 px-5 text-left">
                        <span className="bg-[var(--crm-bg-sunken)]/60 text-[var(--crm-ink-soft)] border border-[var(--crm-ink-soft)]/10 px-2 py-0.5 rounded-sm font-mono text-[9px] uppercase tracking-wider">
                          {(doc.exportDocType || 'OTHER').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-left">
                        <div className="flex items-center space-x-3">
                          {getAccessLevelBadge(doc.accessLevel)}
                          <div className="relative">
                            <select
                              value={doc.accessLevel}
                              onChange={(e) => updateAccessLevel(doc._id, e.target.value)}
                              className="text-[10px] font-mono uppercase bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/15 focus:border-[var(--crm-heading)]/40 text-[var(--crm-heading)] rounded-sm pl-2 pr-6 py-1 cursor-pointer outline-none appearance-none shadow-sm"
                            >
                              <option value="PUBLIC" className="bg-[var(--crm-bg)]">Public</option>
                              <option value="INTERNAL" className="bg-[var(--crm-bg)]">Internal</option>
                              <option value="RESTRICTED" className="bg-[var(--crm-bg)]">Restricted</option>
                              <option value="ADMIN" className="bg-[var(--crm-bg)]">Admin Only</option>
                              <option value="MANAGER" className="bg-[var(--crm-bg)]">Manager Only</option>
                              <option value="HR" className="bg-[var(--crm-bg)]">HR Only</option>
                              <option value="SALES" className="bg-[var(--crm-bg)]">Sales Only</option>
                              <option value="ACCOUNTS" className="bg-[var(--crm-bg)]">Accounts Only</option>
                              <option value="FINANCE" className="bg-[var(--crm-bg)]">Finance Only</option>
                              <option value="PROCUREMENT" className="bg-[var(--crm-bg)]">Procurement Only</option>
                              <option value="IT" className="bg-[var(--crm-bg)]">IT Only</option>
                              <option value="SOFTWARE_ENGINEER" className="bg-[var(--crm-bg)]">Software Engineer Only</option>
                              <option value="STONE" className="bg-[var(--crm-bg)]">Stone Dept Only</option>
                              <option value="COAL" className="bg-[var(--crm-bg)]">Coal Dept Only</option>
                              <option value="TEA" className="bg-[var(--crm-bg)]">Tea Dept Only</option>
                              <option value="RICE" className="bg-[var(--crm-bg)]">Rice Dept Only</option>
                              <option value="TRANSPORT" className="bg-[var(--crm-bg)]">Transport Dept Only</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-[var(--crm-ink-faint)]">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-center">
                        {getApprovalStatusBadge(doc.approvalStatus)}
                      </td>
                      <td className="py-4 px-5 text-center font-mono text-[var(--crm-ink-faint)]">
                        {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center space-x-2.5">
                          <DownloadButton
                            iconOnly
                            whileHover={{ scale: 1.08 }}
                            action={() => downloadDocument(doc._id, doc.fileName)}
                            className="w-8 h-8 rounded-sm bg-[var(--crm-accent-bg)] border border-[var(--crm-accent)]/20 text-[var(--crm-accent)] hover:bg-[var(--crm-accent)] hover:text-[var(--crm-bg)] flex items-center justify-center transition-colors cursor-pointer shadow-md disabled:cursor-default"
                            title="Download Asset"
                            icon={FiDownload}
                            iconSize={14}
                          />
                          {isApprover && (
                            <>
                              <motion.button
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.92 }}
                                onClick={() => approveDocument(doc._id)}
                                className="w-8 h-8 rounded-sm bg-[var(--crm-positive-bg)] border border-[var(--crm-positive)]/20 text-[var(--crm-positive)] hover:bg-[var(--crm-positive)] hover:text-[var(--crm-bg)] flex items-center justify-center transition-colors cursor-pointer shadow-md"
                                title="Approve Document"
                              >
                                <FiCheckCircle size={14} />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.92 }}
                                onClick={() => rejectDocument(doc._id)}
                                className="w-8 h-8 rounded-sm bg-[var(--crm-warning-bg)] border border-[var(--crm-warning)]/20 text-[var(--crm-warning)] hover:bg-[var(--crm-warning)] hover:text-[var(--crm-bg)] flex items-center justify-center transition-colors cursor-pointer shadow-md"
                                title="Reject Document"
                              >
                                <FiXCircle size={14} />
                              </motion.button>
                            </>
                          )}
                          {canUploadNewVersion(doc) && (
                            <label className="w-8 h-8 rounded-sm bg-[var(--crm-info-bg)] border border-[var(--crm-info)]/20 text-[var(--crm-info)] hover:bg-[var(--crm-info)] hover:text-[var(--crm-bg)] flex items-center justify-center transition-colors cursor-pointer shadow-md" title="Upload New Version">
                              <FiRefreshCw size={14} className={versioningId === doc._id ? 'animate-spin' : ''} />
                              <input
                                type="file"
                                className="hidden"
                                disabled={versioningId === doc._id}
                                onChange={(e) => { handleNewVersionFile(doc._id, e.target.files[0]); e.target.value = ''; }}
                              />
                            </label>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            onClick={() => deleteDocument(doc._id)}
                            className="w-8 h-8 rounded-sm bg-[var(--crm-danger-bg)] border border-[var(--crm-danger)]/20 text-[var(--crm-danger)] hover:bg-[var(--crm-danger)] hover:text-[var(--crm-bg)] flex items-center justify-center transition-colors cursor-pointer shadow-md"
                            title="Purge Node"
                          >
                            <FiTrash2 size={14} />
                          </motion.button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* Upload Modal Overlay Structure */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-[var(--crm-bg-sunken)]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-[var(--crm-bg-raised)] rounded-sm p-6 w-full max-w-md border border-[var(--crm-ink-soft)]/15 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar relative"
            >
              <div className="flex justify-between items-center mb-5 border-b border-[var(--crm-ink-soft)]/10 pb-3 text-left">
                <div>
                  <h2 className="text-base font-serif font-normal uppercase text-[var(--crm-heading)] flex items-center gap-2">
                    <FiUpload className="text-[var(--crm-ink-faint)]" size={16} /> Transmit File Payload
                  </h2>
                  <p className="text-[9px] text-[var(--crm-ink-faint)] tracking-widest uppercase font-mono font-bold mt-1">Secure Clearance Database</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => { setShowModal(false); setSelectedFile(null); }} 
                  className="text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] p-1.5 rounded-sm hover:bg-[var(--crm-bg)] transition-all cursor-pointer"
                >
                  <FiX size={16} />
                </button>
              </div>

              <form onSubmit={handleUpload} className="space-y-4 text-left font-sans text-xs">
                <div className="p-4 bg-[var(--crm-bg)] rounded-sm border border-dashed border-[var(--crm-ink-soft)]/20 text-center shadow-inner mb-4">
                  <label className="block text-[11px] font-bold text-[var(--crm-ink-soft)] mb-3 uppercase tracking-wider font-mono">Select Clearance Document *</label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    required
                    className="w-full text-xs text-[var(--crm-ink-faint)] file:mr-3 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-[10px] file:font-mono file:font-bold file:bg-[var(--crm-bg-raised)] file:border file:border-[var(--crm-ink-soft)]/20 file:text-[var(--crm-ink-soft)] hover:file:bg-[var(--crm-bg)] hover:file:text-[var(--crm-heading)] cursor-pointer file:transition shadow-md"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Owner Category Mapping *</label>
                  <div className="relative">
                    <select
                      value={formData.ownerType}
                      onChange={(e) => setFormData({ ...formData, ownerType: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-xs rounded-sm outline-none appearance-none cursor-pointer text-[var(--crm-heading)] focus:border-[var(--crm-heading)]/40"
                    >
                      <option value="LEAD" className="bg-[var(--crm-bg)]">Lead Node</option>
                      <option value="USER" className="bg-[var(--crm-bg)]">User Account</option>
                      <option value="QUOTATION" className="bg-[var(--crm-bg)]">Quotation Matrix</option>
                      <option value="DISPATCH" className="bg-[var(--crm-bg)]">Dispatch Manifest</option>
                      <option value="PAYMENT" className="bg-[var(--crm-bg)]">Payment Ledger</option>
                      <option value="PUBLIC" className="bg-[var(--crm-bg)]">Public / Universal Corporate</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--crm-ink-faint)]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {formData.ownerType !== 'PUBLIC' && (
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Owner Target Coordinates *</label>
                    <input
                      type="text"
                      required
                      value={formData.ownerId}
                      onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-xs rounded-sm outline-none text-[var(--crm-heading)] focus:border-[var(--crm-heading)]/40 placeholder-[var(--crm-ink-faint)]"
                      placeholder="Enter specific Gmail address or exact node ID mapping"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Export Document Type</label>
                  <div className="relative">
                    <select
                      value={formData.exportDocType}
                      onChange={(e) => setFormData({ ...formData, exportDocType: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-xs rounded-sm outline-none appearance-none cursor-pointer text-[var(--crm-heading)] focus:border-[var(--crm-heading)]/40"
                    >
                      {EXPORT_DOC_TYPES.map((t) => <option key={t} value={t} className="bg-[var(--crm-bg)]">{t.replace(/_/g, ' ')}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--crm-ink-faint)]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[var(--crm-ink-faint)] uppercase tracking-widest mb-1.5 font-mono">Baseline Vault Access Level</label>
                  <div className="relative">
                    <select
                      value={formData.accessLevel}
                      onChange={(e) => setFormData({ ...formData, accessLevel: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/20 text-xs rounded-sm outline-none appearance-none cursor-pointer text-[var(--crm-heading)] focus:border-[var(--crm-heading)]/40"
                    >
                      <option value="PUBLIC" className="bg-[var(--crm-bg)]">Public</option>
                      <option value="INTERNAL" className="bg-[var(--crm-bg)]">Internal Operations</option>
                      <option value="RESTRICTED" className="bg-[var(--crm-bg)]">Restricted</option>
                      <option value="ADMIN" className="bg-[var(--crm-bg)]">Admin Only</option>
                      <option value="MANAGER" className="bg-[var(--crm-bg)]">Manager Only</option>
                      <option value="HR" className="bg-[var(--crm-bg)]">HR Only</option>
                      <option value="SALES" className="bg-[var(--crm-bg)]">Sales Only</option>
                      <option value="ACCOUNTS" className="bg-[var(--crm-bg)]">Accounts Only</option>
                      <option value="FINANCE" className="bg-[var(--crm-bg)]">Finance Only</option>
                      <option value="PROCUREMENT" className="bg-[var(--crm-bg)]">Procurement Only</option>
                      <option value="IT" className="bg-[var(--crm-bg)]">IT Only</option>
                      <option value="SOFTWARE_ENGINEER" className="bg-[var(--crm-bg)]">Software Engineer Only</option>
                      <option value="STONE" className="bg-[var(--crm-bg)]">Stone Department Only</option>
                      <option value="COAL" className="bg-[var(--crm-bg)]">Coal Department Only</option>
                      <option value="TEA" className="bg-[var(--crm-bg)]">Tea Department Only</option>
                      <option value="RICE" className="bg-[var(--crm-bg)]">Rice Department Only</option>
                      <option value="TRANSPORT" className="bg-[var(--crm-bg)]">Transport Department Only</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--crm-ink-faint)]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-[var(--crm-ink-soft)]/10 mt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-[var(--crm-heading)] hover:bg-[var(--crm-ink-soft)] text-[var(--crm-bg-sunken)] text-xs font-bold py-3 uppercase rounded-sm cursor-pointer shadow-md transition-colors disabled:opacity-40"
                  >
                    {isSubmitting ? 'Transmitting...' : 'Commit Upload'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setSelectedFile(null); }}
                    className="flex-1 bg-[var(--crm-bg)] hover:bg-[var(--crm-bg-raised)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-soft)] text-xs font-bold py-3 rounded-sm cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}