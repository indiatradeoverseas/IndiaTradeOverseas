import React, { useState, useEffect } from 'react';
import { FiUpload, FiDownload, FiTrash2, FiLock, FiUnlock, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { documentsApi } from '../../api/documents';

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    ownerType: 'LEAD',
    ownerId: '',
    accessLevel: ''
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await documentsApi.getDocuments();
      if (response.success) {
        setDocuments(response.data.documents || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
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
      toast.error('Please select a file');
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
      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Could not download file');
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
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        const response = await documentsApi.deleteDocument(id);
        if (response.success) {
          toast.success('Document deleted successfully');
          fetchDocuments();
        }
      } catch (error) {
        console.error('Error deleting document:', error);
        toast.error('Failed to delete document');
      }
    }
  };


  const getAccessLevelBadge = (level) => {
    const badgeStyles = {
      PUBLIC: 'bg-green-100 text-green-800 border-green-200',
      INTERNAL: 'bg-blue-100 text-blue-800 border-blue-200',
      RESTRICTED: 'bg-amber-100 text-amber-800 border-amber-200',
      ADMIN: 'bg-red-100 text-red-800 border-red-200',
    };

    const isLocked = level === 'RESTRICTED' || level === 'ADMIN';

    return (
      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeStyles[level] || 'bg-gray-100 text-gray-800'}`}>
        {isLocked ? <FiLock size={12} className="mr-1" /> : <FiUnlock size={12} className="mr-1" />}
        {level}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-gray-500 text-sm">Loading documents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Documents</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage and update access levels for all organization files</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center space-x-2 bg-[#0f4c75] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#0b365e] transition-colors shadow-sm"
        >
          <FiUpload size={18} />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <th className="py-3.5 px-5">File Name</th>
                <th className="py-3.5 px-5">Owner Type</th>
                <th className="py-3.5 px-5">Owner ID</th>
                <th className="py-3.5 px-5">Access Level (Define)</th>
                <th className="py-3.5 px-5">Uploaded On</th>
                <th className="py-3.5 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-400">
                    <FiFileText size={36} className="mx-auto mb-2 text-gray-300" />
                    No documents found in database.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc._id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-4 px-5 font-medium text-gray-900 break-all max-w-xs">{doc.fileName}</td>
                    <td className="py-4 px-5"><span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">{doc.ownerType}</span></td>
                    <td className="py-4 px-5 font-mono text-xs text-gray-500">{doc.ownerId}</td>


                    <td className="py-4 px-5">
                      <div className="flex flex-col space-y-1.5 items-start">
                        {getAccessLevelBadge(doc.accessLevel)}
                        <select
                          value={doc.accessLevel}
                          onChange={(e) => updateAccessLevel(doc._id, e.target.value)}
                          className="text-xs border border-gray-300 rounded px-2 py-1 bg-white hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-gray-700 shadow-sm"
                        >
                          <option value="PUBLIC">Public</option>
                          <option value="INTERNAL">Internal</option>
                          <option value="RESTRICTED">Restricted</option>
                          <option value="ADMIN">Admin Only</option>
                        </select>
                      </div>
                    </td>

                    <td className="py-4 px-5 text-gray-500 text-xs">
                      {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                    </td>

                    <td className="py-4 px-5 text-center">
                      <div className="flex items-center justify-center space-x-3">
                        <button
                          onClick={() => downloadDocument(doc._id, doc.fileName)}
                          className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors"
                          title="Download"
                        >
                          <FiDownload size={18} />
                        </button>
                        <button
                          onClick={() => deleteDocument(doc._id)}
                          className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FiUpload className="text-[#0f4c75]" /> Upload Document
            </h2>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Select File *</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  required
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-[#0f4c75] hover:file:bg-blue-100 border rounded-lg p-1.5 bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Owner Type *</label>
                <select
                  value={formData.ownerType}
                  onChange={(e) => setFormData({ ...formData, ownerType: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="LEAD">Lead</option>
                  <option value="USER">User</option>
                  <option value="QUOTATION">Quotation</option>
                  <option value="DISPATCH">Dispatch</option>
                  <option value="PAYMENT">Payment</option>
                  <option value="PUBLIC">Public / Company-wide</option>
                </select>
              </div>

              {formData.ownerType !== 'PUBLIC' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Owner Email / Gmail *</label>
                  <input
                    type="text"
                    required
                    value={formData.ownerId}
                    onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                    className="w-full text-sm border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Enter Gmail / email address (or exact ID)"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Initial Access Level</label>
                <select
                  value={formData.accessLevel}
                  onChange={(e) => setFormData({ ...formData, accessLevel: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="PUBLIC">Public</option>
                  <option value="INTERNAL">Internal</option>
                  <option value="RESTRICTED">Restricted</option>
                  <option value="ADMIN">Admin Only</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-[#0f4c75] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#0b365e] transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedFile(null);
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}