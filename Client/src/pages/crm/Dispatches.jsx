import React, { useState, useEffect } from 'react';
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
      'Pending': 'bg-slate-100 text-slate-700 border border-slate-200',
      'Truck Assigned': 'bg-indigo-50 text-indigo-700 border border-indigo-100',
      'Loading': 'bg-purple-50 text-purple-700 border border-purple-100',
      'In Transit': 'bg-amber-50 text-amber-700 border border-amber-100',
      'Delivered': 'bg-green-100 text-green-800 border border-green-200 font-bold',
      'Issue Raised': 'bg-rose-50 text-rose-700 border border-rose-100 font-semibold flex items-center gap-1 justify-center',
      'Closed': 'bg-slate-100 text-slate-500 border border-slate-200 line-through'
    };

    if (status === 'Issue Raised') {
      return colors[status];
    }
    return colors[status] || 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispatch & Transport</h1>
          <p className="text-gray-600 mt-1">Track vehicle scheduling, driver details, and loading/delivery documentation.</p>
        </div>

        {isProcurementAuthorized && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2.5 rounded-xl flex items-center space-x-2 shadow-lg transition-transform active:scale-95"
          >
            <FiPlus size={18} />
            <span>New Dispatch</span>
          </button>
        )}
      </div>

      {/* Dispatches Table */}
      <div className="card shadow-sm border border-slate-100 rounded-2xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Truck No & Driver</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Material & Quantity</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Routes (Load & Destination)</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Delivery Proof</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dispatches.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-500">No dispatches found.</td>
                </tr>
              ) : (
                dispatches.map((dispatch) => (
                  <tr key={dispatch._id} className="hover:bg-slate-50/40 transition">
                    {/* Truck & Driver details with decryption */}
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-semibold text-slate-900 text-sm uppercase">{dispatch.truckNo}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Driver: {dispatch.driverName || 'N/A'}</div>

                        {/* Driver phone decryption block */}
                        {dispatch.driverPhoneMasked ? (
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400">
                            <span className="font-mono">{revealedPhones[dispatch._id] || dispatch.driverPhoneMasked}</span>
                            {!revealedPhones[dispatch._id] && (
                              <button
                                onClick={() => handleRevealClick(dispatch._id)}
                                className="text-slate-400 hover:text-indigo-600 transition"
                                title="Reveal Driver Phone (Security Audit Logged)"
                              >
                                <FiEye size={13} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 italic">No phone details</div>
                        )}
                      </div>
                    </td>

                    {/* Material & Quantity */}
                    <td className="py-4 px-6 text-sm text-slate-700">
                      <div>
                        <div className="font-medium">{dispatch.material}</div>
                        <div className="text-xs text-slate-400 mt-0.5">Qty: <strong>{dispatch.quantity}</strong></div>
                      </div>
                    </td>

                    {/* Loading & Destination points */}
                    <td className="py-4 px-6 text-xs text-slate-600">
                      <div className="space-y-0.5">
                        <div>Load: <span className="font-semibold text-slate-700">{dispatch.loadingPoint || 'N/A'}</span></div>
                        <div>Deliver: <span className="font-semibold text-slate-700">{dispatch.destination || 'N/A'}</span></div>
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase rounded-full ${getStatusColor(dispatch.dispatchStatus)}`}>
                        {dispatch.dispatchStatus === 'Issue Raised' && <FiAlertTriangle className="inline-block mr-0.5" />}
                        {dispatch.dispatchStatus}
                      </span>
                    </td>

                    {/* Delivery Proof doc link */}
                    <td className="py-4 px-6">
                      {dispatch.proofDocumentId ? (
                        <div className="flex flex-col space-y-1 items-start">
                          <button
                            onClick={() => handleDownloadProof(dispatch.proofDocumentId, dispatch.truckNo)}
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                          >
                            <FiFileText /> View Proof.pdf
                          </button>
                          <button
                            onClick={() => handleOpenUploadModal(dispatch._id)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-indigo-600 border border-slate-200 px-1.5 py-0.5 rounded bg-slate-50 hover:bg-slate-100 transition"
                            title="Re-upload or replace proof document"
                          >
                            <FiUpload /> Re-upload
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-xs text-slate-400 italic block">No proof uploaded</span>
                          <button
                            onClick={() => handleOpenUploadModal(dispatch._id)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-indigo-600 border border-slate-200 px-2 py-0.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition"
                          >
                            <FiUpload /> Upload Proof
                          </button>
                        </div>
                      )}
                    </td>


                    {/* Actions dropdown status */}
                    <td className="py-4 px-6 text-center">
                      <select
                        value={dispatch.dispatchStatus}
                        onChange={(e) => updateStatus(dispatch._id, e.target.value)}
                        className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

      {/* Create Dispatch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-100 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800">New Dispatch Delivery</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleCreateDispatch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Lead Code or ID *</label>
                <input
                  type="text"
                  required
                  value={formData.leadId}
                  onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. ITO-LD-101 or 60af7b..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Loading Point *</label>
                  <input
                    type="text"
                    required
                    value={formData.loadingPoint}
                    onChange={(e) => setFormData({ ...formData, loadingPoint: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Haldia Port"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Destination *</label>
                  <input
                    type="text"
                    required
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="City / Site Location"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Truck Reg Number *</label>
                <input
                  type="text"
                  required
                  value={formData.truckNo}
                  onChange={(e) => setFormData({ ...formData, truckNo: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. MH-12-PQ-9999"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Driver Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.driverName}
                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Driver Phone</label>
                  <input
                    type="tel"
                    value={formData.driverPhone}
                    onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Material Description *</label>
                  <input
                    type="text"
                    required
                    value={formData.material}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. 20mm Aggregates"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Quantity *</label>
                  <input
                    type="text"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. 5000 MT"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Loading Date</label>
                <input
                  type="date"
                  value={formData.loadingDate}
                  onChange={(e) => setFormData({ ...formData, loadingDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex space-x-3 pt-4 border-t">
                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition">Create Dispatch</button>
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Warning Justification Modal for driver phone unmasking */}
      {showRevealModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4 text-orange-600">
                <FiShield size={24} />
                <h3 className="text-lg font-bold text-slate-800">Driver Phone Reveal Audit</h3>
              </div>
              <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                WARNING: Accessing the unmasked driver contact details is monitored. Please enter a business justification to reveal this number.
              </p>

              <form onSubmit={handleRevealSubmit}>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Justification Reason</label>
                  <textarea
                    required
                    rows="3"
                    value={revealReason}
                    onChange={(e) => setRevealReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm placeholder:text-slate-400"
                    placeholder="e.g. Need to contact transporter/driver about loading point delay..."
                  />
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition"
                  >
                    Confirm & Reveal
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRevealModal(false)}
                    className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch Proof Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-100 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800">Upload Dispatch Delivery Proof</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleUploadProof} className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-600 flex items-center gap-1 mb-2">
                  <FiUpload /> Choose proof document (Weighment slip, Delivery Receipt, PDF or Image)
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => setProofFile(e.target.files[0])}
                  className="w-full text-xs cursor-pointer file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div className="flex space-x-3 pt-4 border-t">
                <button type="submit" disabled={isUploading || !proofFile} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition">
                  {isUploading ? 'Uploading...' : 'Confirm Upload'}
                </button>
                <button type="button" onClick={() => setShowUploadModal(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}