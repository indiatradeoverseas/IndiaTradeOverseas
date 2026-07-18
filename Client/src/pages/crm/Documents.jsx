import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUpload, FiDownload, FiTrash2, FiLock, FiUnlock, FiFileText, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { documentsApi } from '../../api/documents';

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
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    ownerType: 'LEAD',
    ownerId: '',
    accessLevel: 'RESTRICTED'
  });

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

    try {
      const response = await documentsApi.uploadDocument(data);
      if (response.success) {
        toast.success('Document uploaded successfully');
        setShowModal(false);
        setSelectedFile(null);
        setFormData({ ownerType: 'LEAD', ownerId: '', accessLevel: 'RESTRICTED' });
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
      PUBLIC: 'bg-emerald-950/20 text-emerald-400 border-emerald-500/20',
      INTERNAL: 'bg-indigo-950/20 text-indigo-400 border-indigo-500/20',
      RESTRICTED: 'bg-amber-950/20 text-amber-400 border-amber-500/20',
      ADMIN: 'bg-rose-950/20 text-rose-400 border-rose-500/20',
      MANAGER: 'bg-sky-950/20 text-sky-400 border-sky-500/20',
      HR: 'bg-purple-950/20 text-purple-400 border-purple-500/20',
      SALES: 'bg-cyan-950/20 text-cyan-400 border-cyan-500/20',
      ACCOUNTS: 'bg-teal-950/20 text-teal-400 border-teal-500/20',
      FINANCE: 'bg-teal-950/20 text-teal-400 border-teal-500/20',
      PROCUREMENT: 'bg-cyan-950/20 text-cyan-400 border-cyan-500/20',
      IT: 'bg-slate-950/20 text-slate-400 border-slate-500/20',
      SOFTWARE_ENGINEER: 'bg-zinc-950/20 text-zinc-400 border-zinc-500/20',
      STONE: 'bg-amber-950/10 text-amber-400 border-amber-500/10',
      COAL: 'bg-stone-950/20 text-stone-400 border-stone-500/20',
      TEA: 'bg-lime-950/20 text-lime-400 border-lime-500/20',
      RICE: 'bg-yellow-950/10 text-yellow-400 border-yellow-500/10',
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1116] flex items-center justify-center">
        <div className="w-12 h-[1px] bg-[#C5CBD3]/40 animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants} 
      className="min-h-screen w-full bg-[#0E1116] text-[#C5CBD3] block pb-12"
    >
      {/* Upper Context Header Panel */}
      <motion.div variants={blockVariants} className="w-full border-b border-[#C5CBD3]/10 py-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-[#040A12]/40 backdrop-blur-sm">
        <div className="space-y-1 text-left">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[#6D7886] font-bold block font-mono">DOCUMENTATION CONTROL CENTER</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[#F2F4F7] uppercase tracking-tight">Security & File Vault</h1>
          <p className="text-xs text-[#6D7886] font-light max-w-xl mt-1">
            Manage encrypted transaction documents, bills of lading, corporate clearance sheets, and department privileges.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto bg-[#F2F4F7] text-[#040A12] text-[11px] uppercase tracking-widest font-bold h-[42px] px-5 rounded-sm flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer hover:bg-[#C5CBD3]"
        >
          <FiUpload size={14} />
          <span>Upload Document</span>
        </button>
      </motion.div>

      {/* Main Table Container Workspace */}
      <div className="w-full py-8 bg-[#0E1116]">
        <motion.div variants={blockVariants} className="border border-[#C5CBD3]/15 overflow-hidden w-full bg-[#121D29]/10 rounded-sm shadow-2xl">
          <div className="overflow-x-auto w-full block custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-[#040A12] text-[#6D7886] text-[9px] uppercase tracking-widest font-mono font-bold border-b border-[#C5CBD3]/15">
                  <th className="py-4 px-5">File Designation</th>
                  <th className="py-4 px-5">Owner Type</th>
                  <th className="py-4 px-5">Owner Node ID</th>
                  <th className="py-4 px-5">Access Level Authorization</th>
                  <th className="py-4 px-5 text-center">Uploaded On</th>
                  <th className="py-4 px-5 text-center">Execution Desk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C5CBD3]/10 text-xs">
                {documents.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-20 bg-[#121D29]/5">
                      <div className="flex flex-col items-center justify-center opacity-40">
                        <FiFileText size={32} className="text-[#6D7886] mb-3" />
                        <p className="font-mono uppercase tracking-widest text-[10px]">No encrypted document entries mapped.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc._id} className="hover:bg-[#121D29]/40 transition-colors">
                      <td className="py-4 px-5 font-medium text-[#F2F4F7] break-all max-w-xs text-left">{doc.fileName}</td>
                      <td className="py-4 px-5 text-left">
                        <span className="bg-[#040A12]/60 text-[#C5CBD3] border border-[#C5CBD3]/10 px-2 py-0.5 rounded-sm font-mono text-[9px] uppercase tracking-wider">
                          {doc.ownerType}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-mono text-xs text-[#6D7886] text-left">{doc.ownerId || 'System Universal'}</td>
                      <td className="py-4 px-5 text-left">
                        <div className="flex items-center space-x-3">
                          {getAccessLevelBadge(doc.accessLevel)}
                          <div className="relative">
                            <select
                              value={doc.accessLevel}
                              onChange={(e) => updateAccessLevel(doc._id, e.target.value)}
                              className="text-[10px] font-mono uppercase bg-[#0E1116] border border-[#C5CBD3]/15 focus:border-[#F2F4F7]/40 text-[#F2F4F7] rounded-sm pl-2 pr-6 py-1 cursor-pointer outline-none appearance-none shadow-sm"
                            >
                              <option value="PUBLIC" className="bg-[#0E1116]">Public</option>
                              <option value="INTERNAL" className="bg-[#0E1116]">Internal</option>
                              <option value="RESTRICTED" className="bg-[#0E1116]">Restricted</option>
                              <option value="ADMIN" className="bg-[#0E1116]">Admin Only</option>
                              <option value="MANAGER" className="bg-[#0E1116]">Manager Only</option>
                              <option value="HR" className="bg-[#0E1116]">HR Only</option>
                              <option value="SALES" className="bg-[#0E1116]">Sales Only</option>
                              <option value="ACCOUNTS" className="bg-[#0E1116]">Accounts Only</option>
                              <option value="FINANCE" className="bg-[#0E1116]">Finance Only</option>
                              <option value="PROCUREMENT" className="bg-[#0E1116]">Procurement Only</option>
                              <option value="IT" className="bg-[#0E1116]">IT Only</option>
                              <option value="SOFTWARE_ENGINEER" className="bg-[#0E1116]">Software Engineer Only</option>
                              <option value="STONE" className="bg-[#0E1116]">Stone Dept Only</option>
                              <option value="COAL" className="bg-[#0E1116]">Coal Dept Only</option>
                              <option value="TEA" className="bg-[#0E1116]">Tea Dept Only</option>
                              <option value="RICE" className="bg-[#0E1116]">Rice Dept Only</option>
                              <option value="TRANSPORT" className="bg-[#0E1116]">Transport Dept Only</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-[#6D7886]">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-center font-mono text-[#6D7886]">
                        {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center space-x-2.5">
                          <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            onClick={() => downloadDocument(doc._id, doc.fileName)}
                            className="w-8 h-8 rounded-sm bg-indigo-950/20 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-[#0E1116] flex items-center justify-center transition-colors cursor-pointer shadow-md"
                            title="Download Asset"
                          >
                            <FiDownload size={14} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            onClick={() => deleteDocument(doc._id)}
                            className="w-8 h-8 rounded-sm bg-rose-950/20 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-[#0E1116] flex items-center justify-center transition-colors cursor-pointer shadow-md"
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
          <div className="fixed inset-0 bg-[#040A12]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-[#121D29] rounded-sm p-6 w-full max-w-md border border-[#C5CBD3]/15 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar relative"
            >
              <div className="flex justify-between items-center mb-5 border-b border-[#C5CBD3]/10 pb-3 text-left">
                <div>
                  <h2 className="text-base font-serif font-normal uppercase text-[#F2F4F7] flex items-center gap-2">
                    <FiUpload className="text-[#6D7886]" size={16} /> Transmit File Payload
                  </h2>
                  <p className="text-[9px] text-[#6D7886] tracking-widest uppercase font-mono font-bold mt-1">Secure Clearance Database</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => { setShowModal(false); setSelectedFile(null); }} 
                  className="text-[#6D7886] hover:text-[#F2F4F7] p-1.5 rounded-sm hover:bg-[#0E1116] transition-all cursor-pointer"
                >
                  <FiX size={16} />
                </button>
              </div>

              <form onSubmit={handleUpload} className="space-y-4 text-left font-sans text-xs">
                <div className="p-4 bg-[#0E1116] rounded-sm border border-dashed border-[#C5CBD3]/20 text-center shadow-inner mb-4">
                  <label className="block text-[11px] font-bold text-[#C5CBD3] mb-3 uppercase tracking-wider font-mono">Select Clearance Document *</label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    required
                    className="w-full text-xs text-[#6D7886] file:mr-3 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-[10px] file:font-mono file:font-bold file:bg-[#121D29] file:border file:border-[#C5CBD3]/20 file:text-[#C5CBD3] hover:file:bg-[#0E1116] hover:file:text-[#F2F4F7] cursor-pointer file:transition shadow-md"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5 font-mono">Owner Category Mapping *</label>
                  <div className="relative">
                    <select
                      value={formData.ownerType}
                      onChange={(e) => setFormData({ ...formData, ownerType: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 text-xs rounded-sm outline-none appearance-none cursor-pointer text-[#F2F4F7] focus:border-[#F2F4F7]/40"
                    >
                      <option value="LEAD" className="bg-[#0E1116]">Lead Node</option>
                      <option value="USER" className="bg-[#0E1116]">User Account</option>
                      <option value="QUOTATION" className="bg-[#0E1116]">Quotation Matrix</option>
                      <option value="DISPATCH" className="bg-[#0E1116]">Dispatch Manifest</option>
                      <option value="PAYMENT" className="bg-[#0E1116]">Payment Ledger</option>
                      <option value="PUBLIC" className="bg-[#0E1116]">Public / Universal Corporate</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#6D7886]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {formData.ownerType !== 'PUBLIC' && (
                  <div>
                    <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5 font-mono">Owner Target Coordinates *</label>
                    <input
                      type="text"
                      required
                      value={formData.ownerId}
                      onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 text-xs rounded-sm outline-none text-[#F2F4F7] focus:border-[#F2F4F7]/40 placeholder-[#6D7886]"
                      placeholder="Enter specific Gmail address or exact node ID mapping"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5 font-mono">Baseline Vault Access Level</label>
                  <div className="relative">
                    <select
                      value={formData.accessLevel}
                      onChange={(e) => setFormData({ ...formData, accessLevel: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 text-xs rounded-sm outline-none appearance-none cursor-pointer text-[#F2F4F7] focus:border-[#F2F4F7]/40"
                    >
                      <option value="PUBLIC" className="bg-[#0E1116]">Public</option>
                      <option value="INTERNAL" className="bg-[#0E1116]">Internal Operations</option>
                      <option value="RESTRICTED" className="bg-[#0E1116]">Restricted</option>
                      <option value="ADMIN" className="bg-[#0E1116]">Admin Only</option>
                      <option value="MANAGER" className="bg-[#0E1116]">Manager Only</option>
                      <option value="HR" className="bg-[#0E1116]">HR Only</option>
                      <option value="SALES" className="bg-[#0E1116]">Sales Only</option>
                      <option value="ACCOUNTS" className="bg-[#0E1116]">Accounts Only</option>
                      <option value="FINANCE" className="bg-[#0E1116]">Finance Only</option>
                      <option value="PROCUREMENT" className="bg-[#0E1116]">Procurement Only</option>
                      <option value="IT" className="bg-[#0E1116]">IT Only</option>
                      <option value="SOFTWARE_ENGINEER" className="bg-[#0E1116]">Software Engineer Only</option>
                      <option value="STONE" className="bg-[#0E1116]">Stone Department Only</option>
                      <option value="COAL" className="bg-[#0E1116]">Coal Department Only</option>
                      <option value="TEA" className="bg-[#0E1116]">Tea Department Only</option>
                      <option value="RICE" className="bg-[#0E1116]">Rice Department Only</option>
                      <option value="TRANSPORT" className="bg-[#0E1116]">Transport Department Only</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#6D7886]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-[#C5CBD3]/10 mt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-[#F2F4F7] hover:bg-[#C5CBD3] text-[#040A12] text-xs font-bold py-3 uppercase rounded-sm cursor-pointer shadow-md transition-colors disabled:opacity-40"
                  >
                    {isSubmitting ? 'Transmitting...' : 'Commit Upload'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setSelectedFile(null); }}
                    className="flex-1 bg-[#0E1116] hover:bg-[#121D29] border border-[#C5CBD3]/20 text-[#C5CBD3] text-xs font-bold py-3 rounded-sm cursor-pointer transition-colors"
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