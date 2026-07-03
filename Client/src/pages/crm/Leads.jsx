import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { leadsApi } from '../../api/leads';
import { adminApi } from '../../api/admin';
import { FiPlus, FiSearch, FiEye, FiEdit2, FiFilter, FiTrash2, FiDownload, FiShield } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export default function Leads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLead, setNewLead] = useState({
    customerName: '',
    phone: '',
    email: '',
    productCategory: '',
    quantity: '',
    destination: ''
  });

  const stages = [
    'NEW_LEAD',
    'LEAD_QUALIFICATION',
    'FOLLOW_UP',
    'REQUIREMENT_CAPTURED',
    'QUOTATION_REQUIRED',
    'QUOTATION_PENDING_APPROVAL',
    'QUOTATION_APPROVED',
    'NEGOTIATION',
    'LOI_PO_PENDING',
    'ORDER_CONFIRMED',
    'DISPATCH_PENDING',
    'PAYMENT_PENDING',
    'CLOSED_WON',
    'CLOSED_LOST'
  ];

  useEffect(() => {
    fetchLeads();
  }, [filterStage]);

  const fetchLeads = async () => {
    try {
      const params = filterStage ? { stage: filterStage } : {};
      const response = await leadsApi.getLeads(params);
      if (response.success) {
        setLeads(response.data.leads);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLead = async (leadId) => {
    if (window.confirm('Are you sure you want to permanently delete this task/lead? This will delete all activity logs for it.')) {
      try {
        const response = await leadsApi.deleteLead(leadId);
        if (response.success) {
          toast.success('Lead deleted successfully');
          fetchLeads();
        }
      } catch (error) {
        console.error('Error deleting lead:', error);
        toast.error('Failed to delete lead');
      }
    }
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    try {
      const response = await leadsApi.createLead(newLead);
      if (response.success) {
        toast.success('Lead created successfully');
        setShowCreateModal(false);
        setNewLead({ customerName: '', phone: '', email: '', productCategory: '', quantity: '', destination: '' });
        fetchLeads();
      }
    } catch (error) {
      console.error('Error creating lead:', error);
      const errorMsg = error.response?.data?.message || 'Failed to create lead.';
      toast.error(errorMsg);
    }
  };

  const handleExportLeads = async () => {
    try {
      const deviceHash = localStorage.getItem('deviceHash');
      const response = await adminApi.logExportAttempt({
        deviceHash,
        metadata: {
          userAgent: navigator.userAgent,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          leadsCount: leads.length
        }
      });
      if (response.success) {
        const csvContent = "data:text/csv;charset=utf-8," 
          + "Lead Code,Customer Name,Phone,Email,Product,Stage,Created At\n"
          + leads.map(l => `"${l.leadCode}","${l.customerName}","${l.phoneMasked}","${l.emailMasked}","${l.productCategory}","${l.stage}","${l.createdAt}"`).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `ITO_Leads_Export_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Database exported successfully!");
      }
    } catch (error) {
      console.error("Export error:", error);
      const errorMsg = error.response?.data?.message || "Export blocked due to security restrictions.";
      toast.error(errorMsg, {
        duration: 5000,
        style: {
          borderRadius: "10px",
          background: "#ef4444",
          color: "#fff"
        }
      });
    }
  };

  const filteredLeads = leads.filter(lead =>
    lead.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.leadCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStageColor = (stage) => {
    const colors = {
      NEW_LEAD: 'bg-sky-50 text-sky-700 border border-sky-200/60',
      LEAD_QUALIFICATION: 'bg-violet-50 text-violet-700 border border-violet-200/60',
      FOLLOW_UP: 'bg-purple-50 text-purple-700 border border-purple-200/60',
      REQUIREMENT_CAPTURED: 'bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200/60',
      QUOTATION_REQUIRED: 'bg-amber-50 text-amber-700 border border-amber-200/60',
      QUOTATION_PENDING_APPROVAL: 'bg-yellow-50 text-yellow-700 border border-yellow-200/60',
      QUOTATION_APPROVED: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
      NEGOTIATION: 'bg-orange-50 text-orange-700 border border-orange-200/60',
      LOI_PO_PENDING: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
      ORDER_CONFIRMED: 'bg-teal-50 text-teal-700 border border-teal-200/60',
      DISPATCH_PENDING: 'bg-cyan-50 text-cyan-700 border border-cyan-200/60',
      PAYMENT_PENDING: 'bg-rose-50 text-rose-700 border border-rose-200/60',
      CLOSED_WON: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
      CLOSED_LOST: 'bg-slate-100 text-slate-700 border border-slate-200'
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-600 mt-1">Manage and track all your leads</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleExportLeads}
            className="btn-secondary flex items-center space-x-2 border border-slate-200"
          >
            <FiDownload size={18} />
            <span>Export Database</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <FiPlus size={18} />
            <span>New Lead</span>
          </button>
        </div>
      </div>

      
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="w-64">
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="input"
            >
              <option value="">All Stages</option>
              {stages.map(stage => (
                <option key={stage} value={stage}>{stage.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Lead Code</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Customer</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Phone</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Product</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Stage</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Created</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-8">Loading...</td>
              </tr>
            ) : filteredLeads.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-8 text-gray-500">No leads found</td>
              </tr>
            ) : (
              filteredLeads.map((lead) => (
                <tr key={lead._id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{lead.leadCode}</td>
                  <td className="py-3 px-4 text-sm text-gray-700">{lead.customerName}</td>
                  <td className="py-3 px-4 text-sm text-gray-700">{lead.phoneMasked}</td>
                  <td className="py-3 px-4 text-sm text-gray-700">{lead.productCategory}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStageColor(lead.stage)}`}>
                      {lead.stage.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-700">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 flex items-center space-x-3">
                    <Link
                      to={`/crm/leads/${lead._id}`}
                      className="text-indigo-600 hover:text-indigo-700"
                      title="View Details"
                    >
                      <FiEye size={18} />
                    </Link>
                    {user?.role === 'ADMIN' && (
                      <button
                        onClick={() => handleDeleteLead(lead._id)}
                        className="text-red-600 hover:text-red-700"
                        title="Delete Task"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Lead Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden transform transition-all">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-semibold text-slate-800">Create New Lead</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateLead} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Customer Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Customer Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newLead.customerName}
                    onChange={(e) => setNewLead({ ...newLead, customerName: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-colors placeholder:text-slate-400"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Phone <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-colors placeholder:text-slate-400"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    placeholder="john@example.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-colors placeholder:text-slate-400"
                  />
                </div>

                {/* Product Category */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Product Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={newLead.productCategory}
                    onChange={(e) => setNewLead({ ...newLead, productCategory: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white transition-colors"
                  >
                    <option value="" className="text-slate-400">Select Category</option>
                    <option value="STONE">Stone</option>
                    <option value="COAL">Coal</option>
                    <option value="TEA">Tea</option>
                    <option value="RICE">Rice</option>
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Quantity
                  </label>
                  <input
                    type="text"
                    value={newLead.quantity}
                    onChange={(e) => setNewLead({ ...newLead, quantity: e.target.value })}
                    placeholder="e.g. 500 tons"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-colors placeholder:text-slate-400"
                  />
                </div>

                {/* Destination */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Destination
                  </label>
                  <input
                    type="text"
                    value={newLead.destination}
                    onChange={(e) => setNewLead({ ...newLead, destination: e.target.value })}
                    placeholder="City, Country or Port Name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-colors placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 mt-8 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-colors"
                >
                  Create Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

}
