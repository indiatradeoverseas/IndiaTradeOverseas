import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { leadsApi } from '../../api/leads';
import { adminApi } from '../../api/admin';
import { FiPlus, FiSearch, FiEye, FiFilter, FiTrash2, FiDownload } from 'react-icons/fi';
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
          background: "#b91c1c",
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
      QUOTATION_APPROVED: 'bg-emerald-50 text-emerald-800 border border-emerald-200/60 font-medium',
      NEGOTIATION: 'bg-orange-50 text-orange-700 border border-orange-200/60',
      LOI_PO_PENDING: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
      ORDER_CONFIRMED: 'bg-teal-50 text-teal-700 border border-teal-200/60 font-medium',
      DISPATCH_PENDING: 'bg-cyan-50 text-cyan-700 border border-cyan-200/60',
      PAYMENT_PENDING: 'bg-rose-50 text-rose-700 border border-rose-200/60',
      CLOSED_WON: 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold',
      CLOSED_LOST: 'bg-gray-50 text-gray-400 border border-gray-200 line-through'
    };
    return colors[stage] || 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[#FBF7EF]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C99B38]"></div>
          <p className="text-xs tracking-widest uppercase font-serif text-[#0B2D5B] opacity-70">Querying Global Pipeline Ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF7EF] text-[#0B2D5B] px-4 sm:px-8 py-8 space-y-8 font-sans antialiased">
      
      {/* Upper Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#C99B38]/10 pb-6 gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#C99B38] font-bold">Trade Pipeline Registry</span>
          <h1 className="text-3xl font-serif text-[#0B2D5B] tracking-wide mt-1">Leads & Global Inquiries</h1>
          <p className="text-sm text-gray-500 font-light mt-0.5">Track, partition, and modify bulk international trade inquiry workflows.</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <button
            onClick={handleExportLeads}
            className="bg-white hover:bg-[#FBF7EF] text-[#0B2D5B] border border-[#C99B38]/20 text-xs uppercase tracking-wider font-semibold px-4 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300 shadow-sm active:scale-98"
          >
            <FiDownload size={14} className="text-[#C99B38]" />
            <span>Export Registry</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#0B2D5B] hover:bg-[#C99B38] text-white text-xs uppercase tracking-wider font-semibold px-5 py-3 rounded-lg flex items-center space-x-2 transition-all duration-300 shadow-md active:scale-98"
          >
            <FiPlus size={14} />
            <span>New Charter Lead</span>
          </button>
        </div>
      </div>

      {/* Control Console Filtering */}
      <div className="bg-white p-4 rounded-xl border border-[#C99B38]/10 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search active manifests by company full name, or localized charter code tokens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] focus:ring-1 focus:ring-[#C99B38] rounded-lg outline-none text-sm transition text-[#0B2D5B]"
          />
        </div>
        <div className="w-full md:w-64 flex items-center gap-2">
          <FiFilter className="text-gray-400 shrink-0" size={16} />
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="w-full px-3 py-2.5 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] rounded-lg outline-none text-sm cursor-pointer text-[#0B2D5B]"
          >
            <option value="">All Pipeline Stages</option>
            {stages.map(stage => (
              <option key={stage} value={stage}>{stage.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Core Ledger Table */}
      <div className="bg-white rounded-xl border border-[#C99B38]/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0B2D5B] text-white text-[11px] uppercase tracking-wider">
                <th className="py-4 px-5 font-medium">Lead Identifier</th>
                <th className="py-4 px-5 font-medium">Consignee Profile</th>
                <th className="py-4 px-5 font-medium">Protected Telephony</th>
                <th className="py-4 px-5 font-medium">Sector Category</th>
                <th className="py-4 px-5 text-center font-medium">Pipeline Stage Axis</th>
                <th className="py-4 px-5 font-medium">Timestamp</th>
                <th className="py-4 px-5 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-16 text-xs uppercase tracking-widest text-gray-400 bg-[#FBF7EF]/10">
                    No active inquiry manifests mapped to the chosen matrix parameters.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-[#FBF7EF]/40 transition duration-150">
                    <td className="py-4 px-5 font-mono text-xs font-bold tracking-wider text-gray-700">{lead.leadCode}</td>
                    <td className="py-4 px-5 font-serif font-medium text-base text-[#0B2D5B]">{lead.customerName}</td>
                    <td className="py-4 px-5 font-mono text-xs text-gray-400">{lead.phoneMasked}</td>
                    <td className="py-4 px-5">
                      <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded bg-[#0B2D5B]/5 text-[#0B2D5B]">
                        {lead.productCategory}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 border text-[10px] font-bold tracking-wider uppercase rounded ${getStageColor(lead.stage)}`}>
                        {lead.stage.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-gray-500 text-xs font-medium">{new Date(lead.createdAt).toLocaleDateString()}</td>
                    <td className="py-4 px-5 text-center">
                      <div className="flex items-center justify-center space-x-3">
                        <Link
                          to={`/crm/leads/${lead._id}`}
                          className="text-[#0B2D5B] hover:text-[#C99B38] p-1 transition"
                          title="Review Comprehensive History Vault"
                        >
                          <FiEye size={16} />
                        </Link>
                        {user?.role === 'ADMIN' && (
                          <button
                            onClick={() => handleDeleteLead(lead._id)}
                            className="text-gray-400 hover:text-rose-600 p-1 transition"
                            title="Purge Lead Permanently"
                          >
                            <FiTrash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation Sheet Canvas Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-[#0B2D5B]/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-xl border border-[#C99B38]/20 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-3">
                <h2 className="text-base font-serif text-[#0B2D5B] tracking-wide uppercase">Provision New Global Inquiry Node</h2>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 font-light text-xl"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateLead} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-1.5">
                      Consignee Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newLead.customerName}
                      onChange={(e) => setNewLead({ ...newLead, customerName: e.target.value })}
                      placeholder="e.g. Al-Mansoor Logistics"
                      className="w-full px-3 py-2 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none text-[#0B2D5B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-1.5">
                      Telephony Target *
                    </label>
                    <input
                      type="tel"
                      required
                      value={newLead.phone}
                      onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                      placeholder="e.g. +91 99999 88888"
                      className="w-full px-3 py-2 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none text-[#0B2D5B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-1.5">
                      Corporate Email Coordinates
                    </label>
                    <input
                      type="email"
                      value={newLead.email}
                      onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                      placeholder="e.g. desk@almansoor.ae"
                      className="w-full px-3 py-2 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none text-[#0B2D5B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-1.5">
                      Commodity Sector Category *
                    </label>
                    <select
                      required
                      value={newLead.productCategory}
                      onChange={(e) => setNewLead({ ...newLead, productCategory: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none cursor-pointer text-[#0B2D5B]"
                    >
                      <option value="">Select Category Matrix...</option>
                      <option value="STONE">Stone</option>
                      <option value="COAL">Coal</option>
                      <option value="TEA">Tea</option>
                      <option value="RICE">Rice</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-1.5">
                      Volume / Mass Estimate
                    </label>
                    <input
                      type="text"
                      value={newLead.quantity}
                      onChange={(e) => setNewLead({ ...newLead, quantity: e.target.value })}
                      placeholder="e.g. 12500 Metric Tons"
                      className="w-full px-3 py-2 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none text-[#0B2D5B]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-[#0B2D5B] uppercase tracking-widest mb-1.5">
                      Port of Discharge / Final Destination
                    </label>
                    <input
                      type="text"
                      value={newLead.destination}
                      onChange={(e) => setNewLead({ ...newLead, destination: e.target.value })}
                      placeholder="e.g. Jebel Ali Port, Dubai"
                      className="w-full px-3 py-2 bg-[#FBF7EF] border border-gray-200 focus:border-[#C99B38] text-sm rounded-lg outline-none text-[#0B2D5B]"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-4 border-t border-gray-100 mt-6">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#0B2D5B] hover:bg-[#C99B38] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition duration-300 shadow-md"
                  >
                    Commit Node Record
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-gray-200 transition duration-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}