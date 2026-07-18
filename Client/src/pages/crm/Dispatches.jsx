import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus,
  FiTruck,
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiUpload,
  FiDownload,
  FiFileText,
  FiShield,
  FiCalendar,
  FiAlertTriangle,
  FiX
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { dispatchesApi } from '../../api/dispatches';
import { useAuth } from '../../hooks/useAuth';
import axiosInstance from '../../api/axiosInstance';

// Cinematic staggered entrance transitions
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.02, delayChildren: 0.1 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 120, damping: 20 } }
};

export default function Dispatches() {
  const { user } = useAuth();
  const [dispatches, setLeads] = useState([]); // Kept variable mapping matching project scope array
  const [dispatchesList, setDispatches] = useState([]); // Internal alias state mapping
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [selectedDispatchId, setSelectedDispatchId] = useState(null);
  const [revealedPhones, setRevealedPhones] = useState({});
  const [revealReason, setRevealReason] = useState('');

  const [proofFile, setProofFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    leadId: '',
    loadingPoint: '',
    destination: '',
    truckNo: '',
    driverName: '',
    driverPhone: '',
    material: '',
    quantity: '',
    loadingDate: ''
  });

  const statusOptions = ['Pending', 'Truck Assigned', 'Loading', 'In Transit', 'Delivered', 'Issue Raised', 'Closed'];

  const isProcurementAuthorized =
    user?.role === 'ADMIN' ||
    user?.role === 'MANAGER' ||
    user?.role === 'PROCUREMENT' ||
    user?.dispatchPermission === true;

  useEffect(() => {
    fetchDispatches();
  }, []);

  const fetchDispatches = async () => {
    try {
      setLoading(true);
      const response = await dispatchesApi.getDispatches();
      if (response.success) {
        setDispatches(response.data.dispatches || []);
      }
    } catch (error) {
      console.error('Error fetching dispatches:', error);
      toast.error('Failed to fetch dispatches');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDispatch = async (e) => {
    e.preventDefault();
    try {
      const response = await dispatchesApi.createDispatch(formData);
      if (response.success) {
        toast.success('Dispatch order created successfully 🎉');
        setShowCreateModal(false);
        setFormData({
          leadId: '',
          loadingPoint: '',
          destination: '',
          truckNo: '',
          driverName: '',
          driverPhone: '',
          material: '',
          quantity: '',
          loadingDate: ''
        });
        fetchDispatches();
      }
    } catch (error) {
      console.error('Error creating dispatch:', error);
      toast.error(error.response?.data?.message || 'Failed to create dispatch');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const response = await dispatchesApi.updateDispatchStatus(id, status);
      if (response.success) {
        toast.success(`Dispatch status updated to: ${status}`);
        fetchDispatches();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update dispatch status');
    }
  };

  const handleRevealClick = (id) => {
    setSelectedDispatchId(id);
    setRevealReason('');
    setShowRevealModal(true);
  };

  const handleRevealSubmit = async (e) => {
    e.preventDefault();
    if (!revealReason.trim()) return;

    try {
      const deviceHash = localStorage.getItem('deviceHash');
      const response = await axiosInstance.post('/security/reveal', {
        entityType: 'DISPATCH',
        entityId: selectedDispatchId,
        fieldName: 'phone',
        reason: revealReason,
        deviceHash
      });

      if (response.data.success) {
        setRevealedPhones(prev => ({
          ...prev,
          [selectedDispatchId]: response.data.data.value
        }));
        toast.success('Driver phone number revealed successfully');
        setShowRevealModal(false);
      }
    } catch (error) {
      console.error('Error revealing driver phone:', error);
      toast.error(error.response?.data?.message || 'Reveal attempt rejected.');
    }
  };

  const handleOpenUploadModal = (id) => {
    setSelectedDispatchId(id);
    setProofFile(null);
    setShowUploadModal(true);
  };

  const handleUploadProof = async (e) => {
    e.preventDefault();
    if (!proofFile) return;
    setIsUploading(true);

    try {
      const fd = new FormData();
      fd.append('file', proofFile);
      fd.append('ownerType', 'DISPATCH');
      fd.append('ownerId', selectedDispatchId);
      fd.append('accessLevel', 'RESTRICTED');

      const uploadResponse = await axiosInstance.post('/documents/upload', fd);

      if (!uploadResponse.data.success) {
        throw new Error(uploadResponse.data.message || 'Document upload failed');
      }

      const documentId = uploadResponse.data.data?.document?._id || uploadResponse.data?.data?.documentId;
      if (!documentId) {
        throw new Error('Uploaded document ID missing');
      }

      const response = await axiosInstance.post(`/dispatch/${selectedDispatchId}/proof`, {
        proofDocumentId: documentId
      });

      if (response.data.success) {
        toast.success('Dispatch proof document uploaded successfully!');
        setShowUploadModal(false);
        fetchDispatches();
      }
    } catch (error) {
      console.error('Error uploading proof:', error);
      toast.error(error.response?.data?.message || error.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadProof = (docId, truckNo) => {
    if (!docId) return;
    toast.loading('Downloading dispatch proof...', { id: 'download' });
    axiosInstance.get(`/documents/${docId}/download`, { responseType: 'blob' })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Proof_Truck_${truckNo}.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Document downloaded successfully!', { id: 'download' });
      })
      .catch((err) => {
        console.error('Download error:', err);
        toast.error('Failed to download document. Unauthorized access.', { id: 'download' });
      });
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'bg-gray-950/40 text-gray-400 border border-gray-500/20',
      'Truck Assigned': 'bg-indigo-950/20 text-indigo-400 border border-indigo-500/20',
      'Loading': 'bg-purple-950/20 text-purple-400 border border-purple-500/20',
      'In Transit': 'bg-amber-950/20 text-amber-400 border border-amber-500/20',
      'Delivered': 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/20 font-bold',
      'Issue Raised': 'bg-rose-950/20 text-rose-400 border border-rose-500/20 font-semibold flex items-center gap-1 justify-center',
      'Closed': 'bg-gray-950/20 text-gray-500 border border-gray-500/20 opacity-40 line-through'
    };
    return colors[status] || 'bg-gray-950/20 text-gray-400 border border-gray-500/20';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0E1116]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-[1px] bg-[#C5CBD3]/40 animate-pulse" />
          <p className="text-[10px] tracking-widest uppercase font-mono text-[#6D7886]">Synchronizing Logistics Telemetry...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden" 
      animate="visible" 
      variants={containerVariants} 
      className="min-h-screen bg-[#0E1116] text-[#C5CBD3] block pb-12"
    >
      
      {/* Top Deck Banner */}
      <motion.div variants={blockVariants} className="w-full border-b border-[#C5CBD3]/10 py-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 bg-[#040A12]/40 backdrop-blur-sm">
        <div className="space-y-1 text-left">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[#6D7886] font-bold block font-mono">Fleet Telemetry Console</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[#F2F4F7] uppercase tracking-tight">Dispatch & Transport</h1>
          <p className="text-xs text-[#6D7886] font-light max-w-2xl mt-1">Track vehicle load distributions, secure driver parameters, and manage electronic bills of lading.</p>
        </div>

        {isProcurementAuthorized && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto bg-[#F2F4F7] text-[#040A12] text-[11px] uppercase tracking-widest font-bold h-[42px] px-5 rounded-sm flex items-center justify-center space-x-1.5 transition-all shadow-md cursor-pointer hover:bg-[#C5CBD3]"
          >
            <FiPlus size={14} />
            <span>Schedule New Dispatch</span>
          </button>
        )}
      </motion.div>

      {/* Main Ledger Core */}
      <div className="w-full py-8 bg-[#0E1116]">
        <motion.div variants={blockVariants} className="border border-[#C5CBD3]/15 overflow-hidden w-full bg-[#121D29]/10 rounded-sm shadow-2xl">
          <div className="overflow-x-auto w-full block custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="bg-[#040A12] text-[#6D7886] text-[9px] uppercase tracking-widest font-mono font-bold border-b border-[#C5CBD3]/15">
                  <th className="py-4 px-6">Manifest & Transporter</th>
                  <th className="py-4 px-6">Commodity Profile</th>
                  <th className="py-4 px-6">Global Routing Matrix</th>
                  <th className="py-4 px-6 text-center">Tracking Status</th>
                  <th className="py-4 px-6">Delivery Verification</th>
                  <th className="py-4 px-6 text-center">Authorize Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C5CBD3]/10 text-xs">
                {dispatchesList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-20 font-mono uppercase tracking-widest text-[10px] opacity-40">
                      No ongoing transit manifests recorded inside the ledger network.
                    </td>
                  </tr>
                ) : (
                  dispatchesList.map((dispatch) => (
                    <tr key={dispatch._id} className="hover:bg-[#121D29]/40 transition-colors">
                      
                      {/* Truck & Secure Driver Metadata */}
                      <td className="py-4 px-6 text-left">
                        <div className="space-y-1">
                          <div className="font-mono text-xs font-bold uppercase text-[#F2F4F7] tracking-wider">{dispatch.truckNo}</div>
                          <div className="text-[11px] text-[#C5CBD3]/80 font-light">Operator: {dispatch.driverName || 'N/A'}</div>

                          {dispatch.driverPhoneMasked ? (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="font-mono text-[#6D7886] font-medium">{revealedPhones[dispatch._id] || dispatch.driverPhoneMasked}</span>
                              {!revealedPhones[dispatch._id] && (
                                <button
                                  onClick={() => handleRevealClick(dispatch._id)}
                                  className="text-amber-400 hover:text-white transition p-0.5 cursor-pointer"
                                  title="Unmask Protected Communications (Audit Logged)"
                                >
                                  <FiEye size={12} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="text-[10px] text-[#6D7886] italic font-light">No encrypted phone data</div>
                          )}
                        </div>
                      </td>

                      {/* Commodity Details */}
                      <td className="py-4 px-6 text-left">
                        <div className="space-y-1">
                          <div className="font-serif font-normal text-sm text-[#F2F4F7]">{dispatch.material}</div>
                          <div className="text-[11px] font-mono text-[#6D7886]">Net Vol: <strong className="text-[#C5CBD3] font-medium">{dispatch.quantity}</strong></div>
                        </div>
                      </td>

                      {/* Geographical Routes */}
                      <td className="py-4 px-6 text-left">
                        <div className="space-y-1 text-[11px] text-[#C5CBD3]/90">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 block"></span>
                            <span>Origin: <span className="text-[#F2F4F7] font-medium">{dispatch.loadingPoint || 'N/A'}</span></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block"></span>
                            <span>Discharge Point: <span className="text-[#F2F4F7] font-medium">{dispatch.destination || 'N/A'}</span></span>
                          </div>
                        </div>
                      </td>

                      {/* Tracking Status Pill */}
                      <td className="py-4 px-6 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-sm text-[9px] font-mono font-bold tracking-wider uppercase border ${getStatusColor(dispatch.dispatchStatus)}`}>
                          {dispatch.dispatchStatus === 'Issue Raised' && <FiAlertTriangle className="mr-1 text-rose-400 animate-bounce" size={10} />}
                          {dispatch.dispatchStatus}
                        </span>
                      </td>

                      {/* Document Verification Proof */}
                      <td className="py-4 px-6 text-left">
                        {dispatch.proofDocumentId ? (
                          <div className="flex flex-col gap-1 items-start">
                            <button
                              onClick={() => handleDownloadProof(dispatch.proofDocumentId, dispatch.truckNo)}
                              className="inline-flex items-center gap-1.5 text-xs text-[#F2F4F7] font-semibold hover:text-[#C5CBD3] transition cursor-pointer"
                            >
                              <FiFileText className="text-[#6D7886]" size={13} /> Verified Slip
                            </button>
                            <button
                              onClick={() => handleOpenUploadModal(dispatch._id)}
                              className="text-[9px] font-mono font-bold text-[#6D7886] hover:text-[#F2F4F7] bg-[#0E1116] border border-[#C5CBD3]/10 px-2 py-0.5 rounded-sm transition uppercase tracking-wider cursor-pointer mt-1"
                            >
                              Replace
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <span className="text-[11px] text-[#6D7886] italic block font-light">Awaiting validation receipt</span>
                            <button
                              onClick={() => handleOpenUploadModal(dispatch._id)}
                              className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold text-[#C5CBD3] border border-[#C5CBD3]/15 px-2.5 py-1 rounded-sm bg-[#0E1116] hover:bg-[#121D29] transition uppercase tracking-wider cursor-pointer shadow-md"
                            >
                              <FiUpload size={10} /> Upload Proof
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Actions dropdown selector */}
                      <td className="py-4 px-6 text-center">
                        <div className="relative inline-block w-36">
                          <select
                            value={dispatch.dispatchStatus}
                            onChange={(e) => updateStatus(dispatch._id, e.target.value)}
                            className="w-full text-xs bg-[#0E1116] border border-[#C5CBD3]/15 focus:border-[#F2F4F7]/40 text-[#F2F4F7] rounded-sm px-2.5 py-1.5 cursor-pointer outline-none appearance-none"
                          >
                            {statusOptions.map(opt => (
                              <option key={opt} value={opt} className="bg-[#0E1116] text-[#C5CBD3]">{opt}</option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[#6D7886]">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
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

      {/* Creation Modal Matrix */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-[#040A12]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="bg-[#121D29] rounded-sm p-6 w-full max-w-md border border-[#C5CBD3]/15 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center mb-6 border-b border-[#C5CBD3]/10 pb-3 text-left">
                <div>
                  <h2 className="text-base font-serif font-normal text-[#F2F4F7] tracking-wide uppercase">Initialize Transport Manifest</h2>
                  <p className="text-[9px] text-[#6D7886] tracking-widest uppercase font-mono font-bold mt-1">Automated Fleet Node Setup</p>
                </div>
                <button 
                  onClick={() => setShowCreateModal(false)} 
                  className="text-[#6D7886] hover:text-[#F2F4F7] p-1.5 rounded-sm hover:bg-[#0E1116] transition-all cursor-pointer"
                >
                  <FiX size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateDispatch} className="space-y-4 text-left font-sans text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5 font-mono">Lead Node Linkage *</label>
                  <input
                    type="text"
                    required
                    value={formData.leadId}
                    onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 text-xs rounded-sm outline-none text-[#F2F4F7] focus:border-[#F2F4F7]/40 placeholder-[#6D7886]"
                    placeholder="e.g. ITO-LD-101"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5 font-mono">Loading Origin *</label>
                    <input
                      type="text"
                      required
                      value={formData.loadingPoint}
                      onChange={(e) => setFormData({ ...formData, loadingPoint: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 text-xs rounded-sm outline-none text-[#F2F4F7] focus:border-[#F2F4F7]/40 placeholder-[#6D7886]"
                      placeholder="e.g. Haldia Terminal"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5 font-mono">Discharge Destination *</label>
                    <input
                      type="text"
                      required
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 text-xs rounded-sm outline-none text-[#F2F4F7] focus:border-[#F2F4F7]/40 placeholder-[#6D7886]"
                      placeholder="City / Port Location"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5 font-mono">Vehicle License Registration *</label>
                  <input
                    type="text"
                    required
                    value={formData.truckNo}
                    onChange={(e) => setFormData({ ...formData, truckNo: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 text-xs rounded-sm outline-none text-[#F2F4F7] focus:border-[#F2F4F7]/40 font-mono uppercase placeholder-[#6D7886]"
                    placeholder="e.g. WB-14-AX-5520"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5 font-mono">Operator Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.driverName}
                      onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 text-xs rounded-sm outline-none text-[#F2F4F7] focus:border-[#F2F4F7]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5 font-mono">Operator Contact</label>
                    <input
                      type="tel"
                      value={formData.driverPhone}
                      onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 text-xs rounded-sm outline-none text-[#F2F4F7] focus:border-[#F2F4F7]/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5 font-mono">Material Specification *</label>
                    <input
                      type="text"
                      required
                      value={formData.material}
                      onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 text-xs rounded-sm outline-none text-[#F2F4F7] focus:border-[#F2F4F7]/40 placeholder-[#6D7886]"
                      placeholder="e.g. Basalt Chips"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5 font-mono">Net Mass Vol *</label>
                    <input
                      type="text"
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 text-xs rounded-sm outline-none text-[#F2F4F7] focus:border-[#F2F4F7]/40 placeholder-[#6D7886]"
                      placeholder="e.g. 4800 MT"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5 font-mono">Loading Date Signature</label>
                  <input
                    type="date"
                    value={formData.loadingDate}
                    onChange={(e) => setFormData({ ...formData, loadingDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 text-xs rounded-sm outline-none text-[#F2F4F7] focus:border-[#F2F4F7]/40 cursor-pointer text-left"
                  />
                </div>

                <div className="flex space-x-3 pt-4 border-t border-[#C5CBD3]/10">
                  <button type="submit" className="flex-1 py-3 bg-[#F2F4F7] hover:bg-[#C5CBD3] text-[#040A12] rounded-sm text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-md">Commit Manifest</button>
                  <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 bg-[#0E1116] hover:bg-[#121D29] border border-[#C5CBD3]/20 text-[#C5CBD3] rounded-sm text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Audit Form Justification layer */}
      <AnimatePresence>
        {showRevealModal && (
          <div className="fixed inset-0 bg-[#040A12]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="bg-[#121D29] rounded-sm p-6 w-full max-w-md border border-[#C5CBD3]/15 shadow-2xl"
            >
              <div className="flex items-center space-x-3 mb-4 text-[#6D7886] text-left">
                <FiShield size={22} />
                <h3 className="text-base font-serif font-normal uppercase tracking-wide text-[#F2F4F7]">Protected Telemetry Decryption</h3>
              </div>
              <p className="text-xs text-[#6D7886] mb-5 leading-relaxed font-light text-left">
                CRITICAL WARNING: Access to raw telephony coordinates is fully tracked inside the global security ledger node. Provide a formal operational clearance reason to initiate unmasking.
              </p>

              <form onSubmit={handleRevealSubmit} className="space-y-4 text-left font-sans text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-2 font-mono">Audit Registry Justification</label>
                  <textarea
                    required
                    rows="3"
                    value={revealReason}
                    onChange={(e) => setRevealReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 focus:border-[#F2F4F7]/40 text-xs rounded-sm outline-none text-[#F2F4F7] font-light resize-none custom-scrollbar"
                    placeholder="Provide exact commercial urgency requirement parameters..."
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button type="submit" className="flex-1 py-3 bg-[#F2F4F7] hover:bg-[#C5CBD3] text-[#040A12] text-xs font-bold uppercase tracking-wider rounded-sm transition duration-300 shadow-md cursor-pointer">Authorize Unmasking</button>
                  <button type="button" onClick={() => setShowRevealModal(false)} className="flex-1 py-3 bg-[#0E1116] hover:bg-[#121D29] border border-[#C5CBD3]/20 text-[#C5CBD3] text-xs font-bold uppercase tracking-wider rounded-sm transition duration-300 cursor-pointer">Abort</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Proof Submission Overlay */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 bg-[#040A12]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.97, opacity: 0 }}
              className="bg-[#121D29] rounded-sm p-6 w-full max-w-md border border-[#C5CBD3]/15 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6 border-b border-[#C5CBD3]/10 pb-3 text-left">
                <h2 className="text-base font-serif font-normal text-[#F2F4F7] tracking-wide uppercase">Transmit Waybill Proof Node</h2>
                <button 
                  onClick={() => setShowUploadModal(false)} 
                  className="text-[#6D7886] hover:text-[#F2F4F7] p-1.5 rounded-sm hover:bg-[#0E1116] transition-all cursor-pointer"
                >
                  <FiX size={16} />
                </button>
              </div>

              <form onSubmit={handleUploadProof} className="space-y-5 text-left font-sans text-xs">
                <div className="p-5 bg-[#0E1116] rounded-sm border border-dashed border-[#C5CBD3]/20 text-center shadow-inner">
                  <label className="block text-[11px] font-bold text-[#C5CBD3] mb-3 uppercase tracking-wider font-mono">
                    Select Digital Clearance Asset (Receipt/Slip PDF)
                  </label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setProofFile(e.target.files[0])}
                    className="w-full text-xs text-[#6D7886] file:mr-3 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-[10px] file:font-mono file:font-bold file:bg-[#121D29] file:border file:border-[#C5CBD3]/20 file:text-[#C5CBD3] hover:file:bg-[#0E1116] hover:file:text-[#F2F4F7] cursor-pointer file:transition shadow-md"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button 
                    type="submit" 
                    disabled={isUploading || !proofFile} 
                    className="flex-1 py-3 bg-[#F2F4F7] hover:bg-[#C5CBD3] text-[#040A12] text-xs font-bold uppercase tracking-wider rounded-sm transition duration-300 disabled:opacity-40 shadow-md cursor-pointer"
                  >
                    {isUploading ? 'Transmitting Node...' : 'Commit Upload'}
                  </button>
                  <button type="button" onClick={() => setShowUploadModal(false)} className="flex-1 py-3 bg-[#0E1116] hover:bg-[#121D29] border border-[#C5CBD3]/20 text-[#C5CBD3] text-xs font-bold uppercase tracking-wider rounded-sm transition duration-300 cursor-pointer">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}