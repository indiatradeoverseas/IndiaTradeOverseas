import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion , AnimatePresence} from 'framer-motion';
import { leadsApi } from '../../api/leads';
import { adminApi } from '../../api/admin';
import { FiPlus, FiSearch, FiEye, FiFilter, FiTrash2, FiDownload, FiClock } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.02 } }
};

const blockVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 150, damping: 22 } }
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
      if (response.success) setLeads(response.data.leads);
    } catch (error) {
      console.error(error);
    } finally { setLoading(false); }
  };

  const fetchReminders = async () => {
    try {
      const response = await leadsApi.getDueReminders();
      if (response?.success) setReminders(response.data.reminders || []);
    } catch (e) { console.error(e); }
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
          destination: '', leadValue: '', assignedTo: ''
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
          + leads.map(l => `"${l.leadCode}","${l.customerName}","${l.phoneMasked}","${l.productCategory}","${l.stage}"`).join("\n");
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
    lead.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.leadCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="min-h-screen w-full bg-[#FBF7EF] text-[#0B2D5B] font-sans antialiased m-0 p-0 box-border block">
      
      {/* Upper Context Header Panel - Flush Edges */}
      <motion.div variants={blockVariants} className="w-full border-b border-[#C99B38]/20 px-4 sm:px-8 py-6 flex flex-col md:flex-row md:items-end justify-between gap-4 bg-[#FBF7EF]">
        <div className="space-y-1">
          <span className="text-[9px] uppercase tracking-[0.25em] text-[#C99B38] font-bold block">TRADE PIPELINE REGISTRY // MODULE 03</span>
          <h1 className="text-2xl sm:text-3xl font-serif tracking-tight">Leads & Global Inquiries</h1>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button onClick={handleExportLeads} className="flex-1 md:flex-none justify-center bg-white text-[#0B2D5B] border border-[#C99B38]/30 text-[10px] uppercase tracking-wider font-bold px-4 py-3 rounded-none flex items-center space-x-2 transition-all shadow-xs cursor-pointer hover:bg-white/80">
            <span>Export Ledger</span>
          </button>
          <button onClick={() => setShowCreateModal(true)} className="flex-1 md:flex-none justify-center bg-[#0B2D5B] text-white border border-transparent text-[10px] uppercase tracking-wider font-bold px-5 py-3 rounded-none flex items-center space-x-2 transition-all shadow-xs cursor-pointer hover:opacity-95">
            <FiPlus size={12} className="text-[#C99B38]" /> <span>New Charter Lead</span>
          </button>
        </div>
      </motion.div>

      {/* Main Container Content */}
      <div className="w-full px-4 sm:px-8 py-6 space-y-4">
        
        {/* Dynamic Follow-Up Reminders Stream */}
        {reminders.length > 0 && (
          <motion.div variants={blockVariants} className="p-3.5 bg-amber-600/5 border border-[#C99B38]/30 flex justify-between items-center rounded-none text-xs">
            <div className="flex items-center space-x-2">
              <FiClock className="text-[#C99B38] animate-pulse" size={14} />
              <span>System logs track <strong>{reminders.length} follow-up records</strong> targeting workflow adjustments execution today.</span>
            </div>
          </motion.div>
        )}

        {/* Filter Desk Panel */}
        <motion.div variants={blockVariants} className="p-3 bg-[#0B2D5B]/5 border border-[#C99B38]/15 rounded-none flex flex-col md:flex-row gap-3 items-center">
          <div className="flex-1 w-full relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#0B2D5B]/40" size={13} />
            <input type="text" placeholder="Search active manifests by customer name or structural tracking hashes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-white border border-[#C99B38]/20 text-xs outline-none focus:border-[#C99B38]" />
          </div>
          <select value={filterStage} onChange={(e) => setFilterStage(e.target.value)} className="w-full md:w-56 px-3 py-2 bg-white border border-[#C99B38]/20 text-xs outline-none cursor-pointer appearance-none text-[#0B2D5B]">
            <option value="">All Pipeline Stages</option>
            {stages.map(st => <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>)}
          </select>
        </motion.div>

        {/* Responsive Edge-to-Edge Data Table */}
        <motion.div variants={blockVariants} className="border border-[#C99B38]/15 overflow-hidden w-full bg-white/40 rounded-none">
          <div className="overflow-x-auto w-full block scrollbar-none">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-[#0B2D5B] text-white text-[9px] uppercase tracking-widest border-b border-[#C99B38]/30">
                  <th className="py-3 px-4 font-bold">Identifier</th>
                  <th className="py-3 px-4 font-bold">Consignee Profile Name</th>
                  <th className="py-3 px-4 font-bold">Protected Telephony</th>
                  <th className="py-3 px-4 font-bold">Category</th>
                  <th className="py-3 px-4 text-center">Pipeline Axis</th>
                  <th className="py-3 px-4 text-center">Score Index</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C99B38]/10 text-xs">
                {filteredLeads.length === 0 ? (
                  <tr><td colSpan="7" className="text-center py-12 opacity-40 uppercase tracking-widest text-[10px]">No active inquiry manifests mapped.</td></tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead._id} className="hover:bg-[#0B2D5B]/5 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{lead.leadCode}</td>
                      <td className="py-3 px-4 font-serif text-sm">{lead.customerName}</td>
                      {/* Enforces Secure Initial Masked Rendering */}
                      <td className="py-3 px-4 font-mono text-[#0B2D5B]/60">{lead.phoneMasked || '••••• •••••'}</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 text-[8px] font-bold bg-[#0B2D5B]/5 border border-[#0B2D5B]/10 text-[#0B2D5B]">{lead.productCategory}</span></td>
                      <td className="py-3 px-4 text-center"><span className="px-2 py-0.5 border text-[8px] font-bold uppercase bg-white border-[#C99B38]/20">{lead.stage?.replace(/_/g, ' ')}</span></td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-amber-800">{lead.leadScore ?? '—'}</td>
                      <td className="py-3 px-4 text-center">
                        <Link to={`/crm/leads/${lead._id}`} className="inline-block p-1.5 border border-[#C99B38]/20 bg-[#FBF7EF] hover:bg-white text-[#0B2D5B] transition-all"><FiEye size={12} /></Link>
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
          <div className="fixed inset-0 bg-[#0B2D5B]/30 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }} className="bg-[#FBF7EF] border border-[#C99B38] rounded-none p-6 w-full max-w-xl shadow-2xl relative text-[#0B2D5B]">
              <div className="flex justify-between items-center mb-5 border-b border-[#C99B38]/20 pb-4">
                <div>
                  <h2 className="text-base font-serif font-normal uppercase">Provision New Global Inquiry Node</h2>
                  <p className="text-[9px] text-[#C99B38] tracking-widest uppercase font-bold mt-0.5">Automated Trade Route Sequence</p>
                </div>
                <button type="button" onClick={() => setShowCreateModal(false)} className="text-[#0B2D5B]/50 hover:text-[#0B2D5B] text-xs">✕</button>
              </div>
              <form onSubmit={handleCreateLead} className="space-y-4 font-sans text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[9px] font-bold text-[#0B2D5B]/60 uppercase tracking-widest mb-1.5">Consignee Legal Name *</label>
                    <input type="text" required value={newLead.customerName} onChange={(e) => setNewLead({ ...newLead, customerName: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-[#C99B38]/20 text-xs rounded-none outline-none focus:border-[#C99B38]" placeholder="Corporate buyer identity"/>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-[#0B2D5B]/60 uppercase tracking-widest mb-1.5">Telephony Target *</label>
                    <input type="tel" required value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-[#C99B38]/20 text-xs rounded-none outline-none focus:border-[#C99B38]" placeholder="Protected telecom line"/>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-[#0B2D5B]/60 uppercase tracking-widest mb-1.5">Corporate Email Coordinates</label>
                    <input type="email" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-[#C99B38]/20 text-xs rounded-none outline-none focus:border-[#C99B38]" placeholder="e.g., procurement@node.com"/>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-[#0B2D5B]/60 uppercase tracking-widest mb-1.5">Commodity Sector *</label>
                    <select required value={newLead.productCategory} onChange={(e) => setNewLead({ ...newLead, productCategory: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-[#C99B38]/20 text-xs rounded-none outline-none appearance-none cursor-pointer">
                      <option value="STONE">STONE</option><option value="COAL">COAL</option><option value="TEA">TEA</option><option value="RICE">RICE</option><option value="TRANSPORT">TRANSPORT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-[#0B2D5B]/60 uppercase tracking-widest mb-1.5">Deal Valuation (INR)</label>
                    <input type="number" value={newLead.leadValue} onChange={(e) => setNewLead({ ...newLead, leadValue: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-[#C99B38]/20 text-xs rounded-none outline-none text-[#0B2D5B]" placeholder="Deal Value in INR"/>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-[#0B2D5B]/60 uppercase tracking-widest mb-1.5">Volume Requirement</label>
                    <input type="text" value={newLead.quantity} onChange={(e) => setNewLead({ ...newLead, quantity: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-[#C99B38]/20 text-xs rounded-none outline-none text-[#0B2D5B]" placeholder="e.g. 500 MT"/>
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-[#C99B38]/20 mt-4"><button type="submit" className="flex-1 bg-[#0B2D5B] text-white text-xs font-medium py-3 uppercase rounded-none cursor-pointer hover:opacity-95">Commit Node Record</button><button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 bg-white border border-[#C99B38]/20 text-[#0B2D5B] text-xs font-medium py-3 rounded-none cursor-pointer">Cancel</button></div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}