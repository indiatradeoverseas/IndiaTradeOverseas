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
  FiAlertTriangle
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { dispatchesApi } from '../../api/dispatches';
import { useAuth } from '../../hooks/useAuth';
import axiosInstance from '../../api/axiosInstance';

export default function Dispatches() {
  const { user } = useAuth();
  const [dispatches, setDispatches] = useState([]);
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
      'Pending': 'bg-gray-100 text-gray-700 border border-gray-200/80',
      'Truck Assigned': 'bg-[#0B2D5B]/5 text-[#0B2D5B] border border-[#0B2D5B]/10',
      'Loading': 'bg-purple-50 text-purple-700 border border-purple-100',
      'In Transit': 'bg-amber-50 text-amber-700 border border-amber-200/60',
      'Delivered': 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold',
      'Issue Raised': 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold flex items-center gap-1 justify-center',
      'Closed': 'bg-gray-50 text-gray-400 border border-gray-200 line-through'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[#FBF7EF]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C99B38]"></div>
          <p className="text-xs tracking-widest uppercase font-serif text-[#0B2D5B] opacity-70">Synchronizing Logistics Telemetry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#0B2D5B] px-4 sm:px-8 py-8 space-y-8 font-sans antialiased">
      
      {/* Top Deck Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#C99B38]/10 pb-6 gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#C99B38] font-bold">Fleet Telemetry Console</span>
          <h1 className="text-3xl font-serif text-[#0B2D5B] tracking-wide mt-1">Dispatch & Transport</h1>
          <p className="text-sm text-gray-500 font-light mt-0.5">Track vehicle load distributions, secure driver parameters, and manage electronic bills of lading.</p>
        </div>

        {isProcurementAuthorized && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#0B2D5B] hover:bg-[#C99B38] text-white text-xs uppercase tracking-wider font-semibold px-5 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300 shadow-md active:scale-98"
          >
            <FiPlus size={14} />
            <span>Schedule New Dispatch</span>
          </button>
        )}
      </div>

      {/* Main Ledger Core */}
      <div className="bg-white rounded-xl border border-[#C99B38]/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0B2D5B] text-white text-[11px] uppercase tracking-wider">
                <th className="py-4 px-6 font-medium">Manifest & Transporter</th>
                <th className="py-4 px-6 font-medium">Commodity Profile</th>
                <th className="py-4 px-6 font-medium">Global Routing Matrix</th>
                <th className="py-4 px-6 text-center font-medium">Tracking Status</th>
                <th className="py-4 px-6 font-medium">Delivery Verification</th>
                <th className="py-4 px-6 text-center font-medium">Authorize Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {dispatches.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-16 text-xs uppercase tracking-widest text-gray-400 bg-[#FBF7EF]/10">No ongoing transit manifests recorded inside the ledger network.</td>
                </tr>
              ) : (
                dispatches.map((dispatch) => (
                  <tr key={dispatch._id} className="hover:bg-[#FBF7EF]/40 transition duration-150">
                    
                    {/* Truck & Secure Driver Metadata */}
                    <td className="py-4 px-6">
                      <div className="space-y-0.5">
                        <div className="font-mono text-sm font-bold uppercase text-[#0B2D5B] tracking-wider">{dispatch.truckNo}</div>
                        <div className="text-xs text-gray-600 font-medium">Operator: {dispatch.driverName || 'N/A'}</div>

                        {dispatch.driverPhoneMasked ? (
                          <div className="flex items-center gap-1.5 mt-1 text-xs">
                            <span className="font-mono text-gray-400 font-medium">{revealedPhones[dispatch._id] || dispatch.driverPhoneMasked}</span>
                            {!revealedPhones[dispatch._id] && (
                              <button
                                onClick={() => handleRevealClick(dispatch._id)}
                                className="text-[#C99B38] hover:text-[#0B2D5B] transition p-0.5"
                                title="Unmask Protected Communications (Audit Logged)"
                              >
                                <FiEye size={12} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic font-light">No encrypted phone data</div>
                        )}
                      </div>
                    </td>

                    {/* Commodity Details */}
                    <td className="py-4 px-6">
                      <div className="space-y-0.5">
                        <div className="font-serif font-medium text-[#0B2D5B]">{dispatch.material}</div>
                        <div className="text-xs text-gray-400">Net Quantity: <strong className="text-[#0B2D5B]">{dispatch.quantity}</strong></div>
                      </div>
                    </td>

                    {/* Geographical Routes */}
                    <td className="py-4 px-6 text-xs text-gray-600">
                      <div className="space-y-1 font-medium">
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 block"></span>
                          <span>Origin: <span className="text-[#0B2D5B]">{dispatch.loadingPoint || 'N/A'}</span></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block"></span>
                          <span>Port of Discharge: <span className="text-[#0B2D5B]">{dispatch.destination || 'N/A'}</span></span>
                        </div>
                      </div>
                    </td>

                    {/* Tracking Status Pill */}
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${getStatusColor(dispatch.dispatchStatus)}`}>
                        {dispatch.dispatchStatus === 'Issue Raised' && <FiAlertTriangle className="mr-1 text-rose-700 animate-bounce" size={10} />}
                        {dispatch.dispatchStatus}
                      </span>
                    </td>

                    {/* Document Verification Proof */}
                    <td className="py-4 px-6">
                      {dispatch.proofDocumentId ? (
                        <div className="flex flex-col gap-1 items-start">
                          <button
                            onClick={() => handleDownloadProof(dispatch.proofDocumentId, dispatch.truckNo)}
                            className="inline-flex items-center gap-1 text-xs text-[#0B2D5B] font-bold hover:text-[#C99B38] transition"
                          >
                            <FiFileText className="text-[#C99B38]" /> Verified Slip
                          </button>
                          <button
                            onClick={() => handleOpenUploadModal(dispatch._id)}
                            className="text-[10px] font-bold text-gray-400 hover:text-[#0B2D5B] border border-gray-100 px-1.5 py-0.5 rounded hover:bg-[#FBF7EF] transition uppercase tracking-wider"
                          >
                            Replace
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <span className="text-xs text-gray-400 italic block font-light">Awaiting validation receipt</span>
                          <button
                            onClick={() => handleOpenUploadModal(dispatch._id)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-[#0B2D5B] border border-gray-200/80 px-2 py-0.5 rounded bg-[#FBF7EF]/50 hover:bg-[#FBF7EF] transition uppercase tracking-wider"
                          >
                            <FiUpload size={10} /> Upload Proof
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Actions dropdown selector */}
                    <td className="py-4 px-6 text-center">
                      <select
                        value={dispatch.dispatchStatus}
                        onChange={(e) => updateStatus(dispatch._id, e.target.value)}
                        className="text-xs bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-[#0B2D5B] rounded-md px-2 py-1 cursor-pointer outline-none"
                      >
                        {statusOptions.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation Modal Matrix */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-[#0B2D5B]/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md border border-[#C99B38]/20 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-3">
                <h2 className="text-base font-serif text-[#0B2D5B] tracking-wide uppercase">Initialize Transport Manifest</h2>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-light">&times;</button>
              </div>

              <form onSubmit={handleCreateDispatch} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-1.5">Lead Node Linkage *</label>
                  <input
                    type="text"
                    required
                    value={formData.leadId}
                    onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none text-[#0B2D5B]"
                    placeholder="e.g. ITO-LD-101"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-1.5">Loading Origin *</label>
                    <input
                      type="text"
                      required
                      value={formData.loadingPoint}
                      onChange={(e) => setFormData({ ...formData, loadingPoint: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none text-[#0B2D5B]"
                      placeholder="e.g. Haldia Terminal"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-1.5">Discharge Destination *</label>
                    <input
                      type="text"
                      required
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none text-[#0B2D5B]"
                      placeholder="City / Port Location"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-1.5">Vehicle License Registration *</label>
                  <input
                    type="text"
                    required
                    value={formData.truckNo}
                    onChange={(e) => setFormData({ ...formData, truckNo: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none text-[#0B2D5B] font-mono uppercase"
                    placeholder="e.g. WB-14-AX-5520"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-1.5">Operator Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.driverName}
                      onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none text-[#0B2D5B]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-1.5">Operator Contact</label>
                    <input
                      type="tel"
                      value={formData.driverPhone}
                      onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none text-[#0B2D5B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-1.5">Material Specification *</label>
                    <input
                      type="text"
                      required
                      value={formData.material}
                      onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none text-[#0B2D5B]"
                      placeholder="e.g. Basalt Chips"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-1.5">Net Mass Vol *</label>
                    <input
                      type="text"
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none text-[#0B2D5B]"
                      placeholder="e.g. 4800 MT"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-1.5">Loading Date Signature</label>
                  <input
                    type="date"
                    value={formData.loadingDate}
                    onChange={(e) => setFormData({ ...formData, loadingDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none text-[#0B2D5B]"
                  />
                </div>

                <div className="flex space-x-3 pt-4 border-t border-gray-100">
                  <button type="submit" className="flex-1 py-3 bg-[#0B2D5B] hover:bg-[#C99B38] text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300">Commit Manifest</button>
                  <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Audit Form Justification layer */}
      <AnimatePresence>
        {showRevealModal && (
          <div className="fixed inset-0 bg-[#0B2D5B]/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md border border-[#C99B38]/20 shadow-2xl"
            >
              <div className="flex items-center space-x-3 mb-4 text-[#C99B38]">
                <FiShield size={24} />
                <h3 className="text-base font-serif uppercase tracking-wide text-[#0B2D5B]">Protected Telemetry Decryption</h3>
              </div>
              <p className="text-xs text-gray-500 mb-5 leading-relaxed font-light">
                CRITICAL WARNING: Access to raw telephony coordinates is fully tracked inside the global security ledger node. Provide a formal operational clearance reason to initiate unmasking.
              </p>

              <form onSubmit={handleRevealSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-2">Audit Registry Justification</label>
                  <textarea
                    required
                    rows="3"
                    value={revealReason}
                    onChange={(e) => setRevealReason(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none text-[#0B2D5B] font-light resize-none"
                    placeholder="Provide exact commercial urgency requirement parameters..."
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button type="submit" className="flex-1 py-2.5 bg-[#0B2D5B] hover:bg-[#C99B38] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition duration-300">Authorize Unmasking</button>
                  <button type="button" onClick={() => setShowRevealModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-gray-200 transition duration-300">Abort</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Proof Submission Overlay */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 bg-[#0B2D5B]/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md border border-[#C99B38]/20 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-3">
                <h2 className="text-base font-serif text-[#0B2D5B] tracking-wide uppercase">Transmit Waybill Proof Node</h2>
                <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-light">&times;</button>
              </div>

              <form onSubmit={handleUploadProof} className="space-y-5">
                <div className="p-5 bg-[#FBF7EF] rounded-xl border border-dashed border-gray-200 text-center">
                  <label className="block text-xs font-bold text-[#0B2D5B] mb-3 uppercase tracking-wider">
                    Select Digital Clearance Asset (Receipt/Slip PDF)
                  </label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setProofFile(e.target.files[0])}
                    className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-[#0B2D5B] file:text-white hover:file:bg-[#C99B38] cursor-pointer file:transition"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button type="submit" disabled={isUploading || !proofFile} className="flex-1 py-3 bg-[#0B2D5B] hover:bg-[#C99B38] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition duration-300 disabled:opacity-40">
                    {isUploading ? 'Transmitting Node...' : 'Commit Upload'}
                  </button>
                  <button type="button" onClick={() => setShowUploadModal(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-gray-200 transition duration-300">Cancel</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}