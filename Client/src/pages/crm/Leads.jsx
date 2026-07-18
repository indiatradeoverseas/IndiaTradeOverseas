import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { leadsApi } from '../../api/leads';
import { adminApi } from '../../api/admin';
import { FiPlus, FiSearch, FiEye, FiFilter, FiTrash2, FiDownload, FiClock, FiX } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

// Staggered cinematic entry configurations
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.02, delayChildren: 0.1 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.99 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 120, damping: 20 } }
};

export default function Leads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [newLead, setNewLead] = useState({
    customerName: '',
    phone: '',
    productCategory: 'STONE',
    companyName: '',
    country: '',
    whatsAppNumber: '',
    email: '',
    quantity: '',
    destination: '',
    leadValue: '',
    assignedTo: '',
    source: 'MANUAL'
  });

  const stages = [
    'NEW_LEAD', 'LEAD_QUALIFICATION', 'FOLLOW_UP', 'REQUIREMENT_CAPTURED', 
    'QUOTATION_REQUIRED', 'QUOTATION_PENDING_APPROVAL', 'QUOTATION_APPROVED', 
    'NEGOTIATION', 'LOI_PO_PENDING', 'ORDER_CONFIRMED', 'DISPATCH_PENDING', 
    'PAYMENT_PENDING', 'CLOSED_WON', 'CLOSED_LOST'
  ];

  useEffect(() => {
    fetchLeads();
    fetchReminders();
  }, [filterStage]);

  const fetchLeads = async () => {
    try {
      const params = filterStage ? { stage: filterStage } : {};
      const response = await leadsApi.getLeads(params);
      if (response.success) setLeads(response.data.leads || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReminders = async () => {
    try {
      const response = await leadsApi.getDueReminders();
      if (response?.success) setReminders(response.data.reminders || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateLead = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newLead,
        leadValue: newLead.leadValue ? Number(newLead.leadValue) : undefined,
        whatsAppNumber: newLead.whatsAppNumber || newLead.phone
      };
      const response = await leadsApi.createLead(payload);
      if (response.success) {
        toast.success(`Node Inserted. Priority Score: ${response.data?.leadScore || 'Calculated'}`);
        setShowCreateModal(false);
        setNewLead({
          customerName: '', phone: '', productCategory: 'STONE', companyName: '',
          country: '', whatsAppNumber: '', email: '', quantity: '',
          destination: '', leadValue: '', assignedTo: '', source: 'MANUAL'
        });
        fetchLeads();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to populate lead node.');
    }
  };

  const handleExportLeads = async () => {
    try {
      const deviceHash = localStorage.getItem('deviceHash');
      const response = await adminApi.logExportAttempt({
        deviceHash,
        metadata: { userAgent: navigator.userAgent, leadsCount: leads.length }
      });
      if (response.success) {
        const csvContent = "data:text/csv;charset=utf-8,Code,Customer,Phone,Category,Stage\n"
          + leads.map(l => `"${l.leadCode}","${l.customerName}","${l.phoneMasked || ''}","${l.productCategory}","${l.stage}"`).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `ITO_Registry_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Database exported safely!");
      }
    } catch (error) {
      toast.error("Export blocked due to security protocols.");
    }
  };

  const filteredLeads = leads.filter(lead =>
    (lead.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lead.leadCode || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1116] flex items-center justify-center">
        <div className="w-12 h-[1px] bg-[#C5CBD3]/40 animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-screen w-full bg-[#0E1116] text-[#C5CBD3] block pb-12">
      
      {/* Upper Context Header Panel */}
      <motion.div variants={blockVariants} className="w-full border-b border-[#C5CBD3]/10 py-6 flex flex-col md:flex-row md:items-end justify-between gap-4 bg-[#040A12]/40 backdrop-blur-sm">
        <div className="space-y-1 text-left">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[#6D7886] font-bold block font-mono">TRADE PIPELINE REGISTRY // MODULE 03</span>
          <h1 className="text-2xl sm:text-3xl font-serif font-normal text-[#F2F4F7] uppercase tracking-tight">Leads & Global Inquiries</h1>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={handleExportLeads} 
            className="flex-1 md:flex-none justify-center bg-[#0E1116] text-[#C5CBD3] border border-[#C5CBD3]/20 text-[11px] uppercase tracking-widest font-semibold h-[42px] px-5 rounded-sm flex items-center space-x-2 transition-all shadow-md cursor-pointer hover:border-[#F2F4F7]/40 hover:bg-[#121D29]"
          >
            <FiDownload size={13} className="text-[#6D7886]" />
            <span>Export Ledger</span>
          </button>
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="flex-1 md:flex-none justify-center bg-[#F2F4F7] text-[#040A12] text-[11px] uppercase tracking-widest font-bold h-[42px] px-5 rounded-sm flex items-center space-x-1.5 transition-all shadow-md cursor-pointer hover:bg-[#C5CBD3]"
          >
            <FiPlus size={14} /> <span>New Charter Lead</span>
          </button>
        </div>
      </motion.div>

      {/* Main Container Content */}
      <div className="w-full py-8 space-y-5 bg-[#0E1116]">
        
        {/* Dynamic Follow-Up Reminders Stream */}
        {reminders.length > 0 && (
          <motion.div variants={blockVariants} className="p-4 bg-amber-950/20 border border-amber-500/20 flex justify-between items-center rounded-sm text-xs font-mono text-amber-400">
            <div className="flex items-center space-x-2.5">
              <FiClock className="text-amber-400 animate-pulse" size={14} />
              <span>System logs track <strong>{reminders.length} follow-up records</strong> targeting workflow adjustments execution today.</span>
            </div>
          </motion.div>
        )}

        {/* Filter Desk Panel */}
        <motion.div variants={blockVariants} className="p-4 bg-[#121D29]/20 border border-[#C5CBD3]/15 rounded-sm flex flex-col md:flex-row gap-4 items-center shadow-lg">
          <div className="flex-1 w-full relative">
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#6D7886]" size={14} />
            <input 
              type="text" 
              placeholder="Search active manifests by customer name or structural tracking hashes..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full pl-11 pr-4 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/15 text-xs rounded-sm outline-none text-[#F2F4F7] focus:border-[#F2F4F7]/40 placeholder-[#6D7886]" 
            />
          </div>
          <div className="relative w-full md:w-56">
            <select 
              value={filterStage} 
              onChange={(e) => setFilterStage(e.target.value)} 
              className="w-full px-4 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/15 text-xs rounded-sm outline-none cursor-pointer appearance-none text-[#F2F4F7] focus:border-[#F2F4F7]/40"
            >
              <option value="" className="bg-[#0E1116]">All Pipeline Stages</option>
              {stages.map(st => <option key={st} value={st} className="bg-[#0E1116] text-[#C5CBD3]">{st.replace(/_/g, ' ')}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#6D7886]">
              <FiFilter size={12} />
            </div>
          </div>
        </motion.div>

        {/* Responsive Edge-to-Edge Data Table */}
        <motion.div variants={blockVariants} className="border border-[#C5CBD3]/15 overflow-hidden w-full bg-[#121D29]/10 rounded-sm shadow-2xl">
          <div className="overflow-x-auto w-full block custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-[#040A12] text-[#6D7886] text-[9px] uppercase tracking-widest font-mono font-bold border-b border-[#C5CBD3]/15">
                  <th className="py-3.5 px-5">Identifier</th>
                  <th className="py-3.5 px-5">Consignee Profile Name</th>
                  <th className="py-3.5 px-5">Protected Telephony</th>
                  <th className="py-3.5 px-5">Category</th>
                  <th className="py-3.5 px-5 text-center">Pipeline Axis</th>
                  <th className="py-3.5 px-5 text-center">Score Index</th>
                  <th className="py-3.5 px-5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C5CBD3]/10 text-xs">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-16 opacity-40 font-mono uppercase tracking-widest text-[10px]">
                      No active inquiry manifests mapped.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead._id} className="hover:bg-[#121D29]/40 transition-colors">
                      <td className="py-3.5 px-5 font-mono font-bold text-[#F2F4F7]">{lead.leadCode}</td>
                      <td className="py-3.5 px-5 font-serif text-sm text-[#F2F4F7]">{lead.customerName}</td>
                      <td className="py-3.5 px-5 font-mono text-[#6D7886]">{lead.phoneMasked || '••••• •••••'}</td>
                      <td className="py-3.5 px-5">
                        <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[#121D29] border border-[#C5CBD3]/10 text-[#C5CBD3] rounded-sm">
                          {lead.productCategory}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className="px-2 py-0.5 border text-[9px] font-mono font-bold uppercase bg-[#040A12]/60 border-[#C5CBD3]/10 text-[#C5CBD3]">
                          {lead.stage?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center font-mono font-bold text-amber-400">{lead.leadScore ?? '—'}</td>
                      <td className="py-3.5 px-5 text-center">
                        <Link 
                          to={`/crm/leads/${lead._id}`} 
                          className="inline-flex p-2 border border-[#C5CBD3]/20 bg-[#0E1116] hover:bg-[#121D29] text-[#C5CBD3] hover:text-[#F2F4F7] transition-all rounded-sm shadow-md"
                        >
                          <FiEye size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* Creation Canvas Overlay Sheet Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-[#040A12]/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.97, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.97, opacity: 0 }} 
              transition={{ duration: 0.2 }}
              className="bg-[#121D29] border border-[#C5CBD3]/15 rounded-sm p-6 w-full max-w-xl shadow-2xl relative text-[#C5CBD3]"
            >
              <div className="flex justify-between items-center mb-5 border-b border-[#C5CBD3]/10 pb-4 text-left">
                <div>
                  <h2 className="text-base font-serif font-normal uppercase text-[#F2F4F7]">Provision New Global Inquiry Node</h2>
                  <p className="text-[9px] text-[#6D7886] tracking-widest uppercase font-mono font-bold mt-1">Automated Trade Route Sequence</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)} 
                  className="text-[#6D7886] hover:text-[#F2F4F7] p-1 rounded-sm hover:bg-[#0E1116] transition-all cursor-pointer"
                >
                  <FiX size={16} />
                </button>
              </div>
              
              <form onSubmit={handleCreateLead} className="space-y-4 font-sans text-xs text-left max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5 font-mono">Consignee Legal Name *</label>
                    <input 
                      type="text" 
                      required 
                      value={newLead.customerName} 
                      onChange={(e) => setNewLead({ ...newLead, customerName: e.target.value })} 
                      className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 text-xs rounded-sm outline-none text-[#F2F4F7] focus:border-[#F2F4F7]/40 placeholder-[#6D7886]" 
                      placeholder="Corporate buyer identity"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5 font-mono">Company Name</label>
                    <input 
                      type="text" 
                      value={newLead.companyName} 
                      onChange={(e) => setNewLead({ ...newLead, companyName: e.target.value })} 
                      className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 text-xs rounded-sm outline-none text-[#F2F4F7] focus:border-[#F2F4F7]/40 placeholder-[#6D7886]" 
                      placeholder="Legal Enterprise Designation"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5 font-mono">Country</label>
                    <input 
                      type="text" 
                      value={newLead.country} 
                      onChange={(e) => setNewLead({ ...newLead, country: e.target.value })} 
                      className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 text-xs rounded-sm outline-none text-[#F2F4F7] focus:border-[#F2F4F7]/40 placeholder-[#6D7886]" 
                      placeholder="Target Region Hub"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5 font-mono">Telephony Target *</label>
                    <input 
                      type="tel" 
                      required 
                      value={newLead.phone} 
                      onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} 
                      className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 text-xs rounded-sm outline-none text-[#F2F4F7] focus:border-[#F2F4F7]/40 placeholder-[#6D7886]" 
                      placeholder="Protected telecom line"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5 font-mono">WhatsApp Communications Vector</label>
                    <input 
                      type="tel" 
                      value={newLead.whatsAppNumber} 
                      onChange={(e) => setNewLead({ ...newLead, whatsAppNumber: e.target.value })} 
                      className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 text-xs rounded-sm outline-none text-[#F2F4F7] focus:border-[#F2F4F7]/40 placeholder-[#6D7886]" 
                      placeholder="WhatsApp Business Line"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5 font-mono">Corporate Email Coordinates</label>
                    <input 
                      type="email" 
                      value={newLead.email} 
                      onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} 
                      className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 text-xs rounded-sm outline-none text-[#F2F4F7] focus:border-[#F2F4F7]/40 placeholder-[#6D7886]" 
                      placeholder="e.g., procurement@node.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5 font-mono">Commodity Sector *</label>
                    <div className="relative">
                      <select 
                        required 
                        value={newLead.productCategory} 
                        onChange={(e) => setNewLead({ ...newLead, productCategory: e.target.value })} 
                        className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 text-xs rounded-sm outline-none appearance-none cursor-pointer text-[#F2F4F7]"
                      >
                        <option value="STONE" className="bg-[#0E1116]">STONE</option>
                        <option value="COAL" className="bg-[#0E1116]">COAL</option>
                        <option value="TEA" className="bg-[#0E1116]">TEA</option>
                        <option value="RICE" className="bg-[#0E1116]">RICE</option>
                        <option value="TRANSPORT" className="bg-[#0E1116]">TRANSPORT</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#6D7886]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5 font-mono">Deal Valuation (INR)</label>
                    <input 
                      type="number" 
                      value={newLead.leadValue} 
                      onChange={(e) => setNewLead({ ...newLead, leadValue: e.target.value })} 
                      className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 text-xs rounded-sm outline-none text-[#F2F4F7] focus:border-[#F2F4F7]/40"
                      placeholder="Deal Value in INR"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5 font-mono">Volume Requirement</label>
                    <input 
                      type="text" 
                      value={newLead.quantity} 
                      onChange={(e) => setNewLead({ ...newLead, quantity: e.target.value })} 
                      className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 text-xs rounded-sm outline-none text-[#F2F4F7] focus:border-[#F2F4F7]/40"
                      placeholder="e.g. 500 MT"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#6D7886] uppercase tracking-widest mb-1.5 font-mono">Destination / Port of Discharge</label>
                    <input 
                      type="text" 
                      value={newLead.destination} 
                      onChange={(e) => setNewLead({ ...newLead, destination: e.target.value })} 
                      className="w-full px-3.5 py-2.5 bg-[#0E1116] border border-[#C5CBD3]/20 text-xs rounded-sm outline-none text-[#F2F4F7] focus:border-[#F2F4F7]/40"
                      placeholder="Final Logistics Terminal"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4 border-t border-[#C5CBD3]/10 mt-4">
                  <button 
                    type="submit" 
                    className="flex-1 bg-[#F2F4F7] hover:bg-[#C5CBD3] text-[#040A12] text-xs font-bold py-3 uppercase rounded-sm cursor-pointer shadow-md transition-colors"
                  >
                    Commit Node Record
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowCreateModal(false)} 
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