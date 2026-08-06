import React, { useState, useEffect } from 'react';
import { distributorApi } from '../../api/distributor';
import { adminApi } from '../../api/admin';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion'; 
import { 
    FiShield, FiUser, FiMail, FiPhone, FiMapPin, FiBriefcase, 
    FiLayers, FiCalendar, FiCheckCircle, FiXCircle, FiClock, 
    FiTrash2, FiFileText, FiDownload, FiSearch, FiFilter 
} from 'react-icons/fi';

export default function Distributor() {
    const [distributors, setDistributors] = useState([]);
    // State management array to hold database proposals
    const [proposals, setProposals] = useState([]);
    // Local tracking map state key for opened ribbon panels
    const [expandedProposalId, setExpandedProposalRow] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [divisionFilter, setDivisionFilter] = useState('ALL');
    const [selectedDistributor, setSelectedDistributor] = useState(null);

    // Consolidated execution hook loader
    const fetchCoreSystemData = async () => {
        setIsLoading(true);
        try {
            // Concurrent execution call matching both schemas
            const [distRes, propRes] = await Promise.all([
                distributorApi.getDistributors(),
                distributorApi.getActiveProposalsAdmin()
            ]);

            if (distRes && distRes.success) {
                setDistributors(distRes.data?.distributors || distRes.distributors || []);
            }
            if (propRes && propRes.success) {
                setProposals(propRes.data || []);
            }
        } catch (err) {
            console.error("System synchronization engine error:", err);
            toast.error("Failed to fetch matching relational data tables.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCoreSystemData();
    }, []);

    // Proposal Status Controller Integration
    const handleUpdateProposal = async (proposalId, statusUpdate) => {
        try {
            const res = await distributorApi.updateProposalStatus(proposalId, statusUpdate);
            if (res.success) {
                toast.success(res.message || "Proposal state synchronized.");
                setExpandedProposalRow(null); // Collapses row after action
                fetchCoreSystemData(); // Refresh values
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update target proposal parameters.");
        }
    };

    const handleToggleVerification = async (id, currentStatus) => {
        const targetAction = currentStatus === 'approved' ? 'Revoke Approval' : 'Grant Verified Access';
        if (!window.confirm(`Are you sure you want to run compliance change: "${targetAction}" on this distributor?`)) return;

        try {
            const resData = await distributorApi.toggleVerify(id);
            if (resData && resData.success) {
                toast.success(resData.message || "Statutory access token status changed successfully.");
                
                if (selectedDistributor && selectedDistributor._id === id) {
                    setSelectedDistributor(prev => ({
                        ...prev,
                        approvalStatus: prev.approvalStatus === 'approved' ? 'pending' : 'approved'
                    }));
                }
                fetchCoreSystemData();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Verification adjustment failure.");
        }
    };

    const handleDeleteDistributor = async (id) => {
        if (!window.confirm("CRITICAL COMPLIANCE REMOVAL: This completely wipes out the entry and unlinks uploaded files. Proceed?")) return;

        try {
            const resData = await distributorApi.deleteDistributor(id);
            if (resData && resData.success) {
                toast.success("Distributor file records completely pruned.");
                if (selectedDistributor && selectedDistributor._id === id) {
                    setSelectedDistributor(null);
                }
                fetchCoreSystemData();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Pruning processing error encountered.");
        }
    };

    const handleDownloadDoc = async (e, type, id, companyName) => {
        e.preventDefault();
        try {
            const formattedName = `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_compliance.pdf`;
            if (type === 'GST') {
                await distributorApi.downloadGstCertificate(id, formattedName);
            } else {
                await distributorApi.downloadUdyamCertificate(id, formattedName);
            }
            toast.success("Document downloaded successfully.");
        } catch (err) {
            console.error(err);
            toast.error("Failed to extract statutory file from server volume.");
        }
    };

    const handleExportDistributors = async () => {
        try {
            const deviceHash = localStorage.getItem('deviceHash') || 'dev-device-hash';

            try {
                await adminApi.logExportAttempt({
                    deviceHash,
                    metadata: { userAgent: navigator.userAgent, distributorsCount: filteredRecords.length }
                });
            } catch (auditErr) {
                console.warn("Export audit log endpoint unattached. Proceeding with CSV download fallback.");
            }

            const csvContent = "data:text/csv;charset=utf-8,Company,Operator,Email,Mobile,Division,GSTIN,Status\n"
                + filteredRecords.map(d => `"${d.company || ''}","${d.name || ''}","${d.email || ''}","${d.mobile || ''}","${d.division || ''}","${d.gstNumber || ''}","${d.approvalStatus || ''}"`).join("\n");

            const link = document.createElement("a");
            link.setAttribute("href", encodeURI(csvContent));
            link.setAttribute("download", `ITO_Distributors_Registry_${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("Distributor registry exported safely!");
        } catch (error) {
            toast.error("Export execution failed.");
        }
    };

    const getBusinessClassification = (type) => {
        const mappings = {
            '1': 'Domestic Tea Trader', '2': 'Tea Wholesaler', '3': 'Tea Distributor',
            '4': 'Hotel / Café / Restaurant Buyer', '5': 'Export Buyer',
            '6': 'Private Label Buyer', '7': 'Retail Brand Buyer'
        };
        return mappings[type] || 'General Merchant Block';
    };

    const filteredRecords = distributors.filter(dist => {
        const matchesSearch = 
            dist.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            dist.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            dist.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            dist.gstNumber?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' ? true : dist.approvalStatus === statusFilter.toLowerCase();
        const matchesDivision = divisionFilter === 'ALL' ? true : dist.division === divisionFilter;
        return matchesSearch && matchesStatus && matchesDivision;
    });

    return (
        <div className="min-h-screen bg-[var(--crm-bg-sunken)] font-sans antialiased text-[var(--crm-ink-soft)] p-4 sm:p-8 pt-24">
            <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Header Block matching CRM Layout */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--crm-ink-soft)]/10 pb-5">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[var(--crm-ink-faint)] font-mono text-[9px] uppercase font-bold tracking-[0.2em]">
                            FLEET TELEMETRY CONSOLE
                        </div>
                        <h1 className="text-3xl font-serif text-[var(--crm-heading)] uppercase tracking-wide font-normal">
                            B2B Distributor Directory
                        </h1>
                        <p className="text-xs text-[var(--crm-ink-faint)] font-light mt-1">
                            Track vehicle load distributions, secure driver parameters, and manage electronic bills of lading.
                        </p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 font-mono text-xs">
                        <button
                            onClick={handleExportDistributors}
                            className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-soft)] border border-[var(--crm-ink-soft)]/20 text-[11px] uppercase tracking-widest font-semibold px-4 py-2.5 rounded-sm flex items-center space-x-2 transition-all hover:bg-[var(--crm-bg-raised)] cursor-pointer"
                        >
                            <FiDownload size={13} className="text-[var(--crm-ink-faint)]" />
                            <span>Export</span>
                        </button>
                        <div className="bg-[var(--crm-bg)]/40 px-4 py-2.5 rounded-sm border border-[var(--crm-ink-soft)]/10 text-center">
                            <span className="block text-[var(--crm-ink-faint)] font-bold uppercase tracking-wider text-[9px]">Pipeline Volume</span>
                            <span className="text-lg font-bold text-[var(--crm-heading)]">{distributors.length} Partners</span>
                        </div>
                        <div className="bg-[var(--crm-bg)]/40 px-4 py-2.5 rounded-sm border border-[var(--crm-ink-soft)]/10 text-center">
                            <span className="block text-[var(--crm-ink-faint)] font-bold uppercase tracking-wider text-[9px]">Awaiting Audit</span>
                            <span className="text-lg font-bold text-[var(--crm-warning)]">{distributors.filter(d => d.approvalStatus === 'pending').length} Files</span>
                        </div>
                    </div>
                </div>

                {/* Filter Control Array */}
                <div className="bg-[var(--crm-bg)]/20 border border-[var(--crm-ink-soft)]/10 rounded-sm p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--crm-ink-faint)] text-sm" />
                        <input 
                            type="text"
                            placeholder="Search by name, company, email, or GSTIN..."
                            className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/10 pl-10 pr-4 py-2 rounded-sm text-xs text-[var(--crm-heading)] placeholder-[var(--crm-ink-faint)] focus:outline-none focus:border-[var(--crm-ink-soft)]/30 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-wrap w-full md:w-auto items-center gap-2 justify-end text-xs font-mono">
                        <div className="flex items-center gap-1.5 bg-[var(--crm-bg-sunken)] px-3 py-1.5 rounded-sm border border-[var(--crm-ink-soft)]/10">
                            <FiFilter className="text-[var(--crm-ink-faint)]" />
                            <span className="text-[10px] text-[var(--crm-ink-faint)] uppercase font-bold">Status:</span>
                            <select 
                                value={statusFilter} 
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-transparent font-bold text-[var(--crm-ink-soft)] focus:outline-none cursor-pointer"
                            >
                                <option value="ALL" className="bg-[var(--crm-bg-sunken)]">All States</option>
                                <option value="PENDING" className="bg-[var(--crm-bg-sunken)]">Pending Review</option>
                                <option value="APPROVED" className="bg-[var(--crm-bg-sunken)]">Approved Active</option>
                                <option value="REJECTED" className="bg-[var(--crm-bg-sunken)]">Rejected Registry</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-1.5 bg-[var(--crm-bg-sunken)] px-3 py-1.5 rounded-sm border border-[var(--crm-ink-soft)]/10">
                            <FiLayers className="text-[var(--crm-ink-faint)]" />
                            <span className="text-[10px] text-[var(--crm-ink-faint)] uppercase font-bold">Division:</span>
                            <select 
                                value={divisionFilter} 
                                onChange={(e) => setDivisionFilter(e.target.value)}
                                className="bg-transparent font-bold text-[var(--crm-ink-soft)] focus:outline-none cursor-pointer"
                            >
                                <option value="ALL" className="bg-[var(--crm-bg-sunken)]">All Sectors</option>
                                <option value="TEA" className="bg-[var(--crm-bg-sunken)]">Tea Sourcing</option>
                                <option value="RICE" className="bg-[var(--crm-bg-sunken)]">Rice Millings</option>
                                <option value="COAL" className="bg-[var(--crm-bg-sunken)]">Coal Aggregates</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Grid layout panel splits */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className={`${selectedDistributor ? 'lg:col-span-7' : 'lg:col-span-12'} bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/10 rounded-sm overflow-hidden shadow-inner overflow-x-auto transition-all duration-300`}>
                        {isLoading ? (
                            <div className="p-12 text-center font-mono text-xs text-[var(--crm-ink-faint)] animate-pulse">
                                Auditing database connections...
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-[var(--crm-bg)]/60 text-[var(--crm-ink-faint)] border-b border-[var(--crm-ink-soft)]/10 font-mono uppercase tracking-wider text-[10px]">
                                        <th className="p-4 font-normal">Manifest & Transporter</th>
                                        <th className="p-4 font-normal">Commodity Profile</th>
                                        <th className="p-4 font-normal">Global Routing Matrix</th>
                                        <th className="p-4 font-normal text-center">Tracking Status</th>
                                        <th className="p-4 font-normal text-right">Authorize Change</th>
                                    </tr>
                                  
                                </thead>
                                <tbody className="divide-y divide-[var(--crm-ink-soft)]/10 text-[var(--crm-ink-soft)]">
                                    {filteredRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="p-8 text-center text-[var(--crm-ink-faint)] font-light italic">
                                                No tracking pipelines matched the designated search metrics.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRecords.map((dist) => {
                                            // Strictly filter ONLY 'pending' proposals for this distributor
                                            const pendingProposals = proposals.filter(p => {
                                                const distIdMatches = p.distributorId?._id === dist._id || p.distributorId === dist._id;
                                                const isPendingState = String(p.status).toLowerCase() === 'pending';
                                                return distIdMatches && isPendingState;
                                            });
                                        
                                            return (
                                                <React.Fragment key={dist._id}>
                                                    <tr 
                                                        className={`hover:bg-[var(--crm-bg-raised)]/25 transition-colors cursor-pointer border-b border-[var(--crm-ink-soft)]/10 ${
                                                            selectedDistributor?._id === dist._id ? 'bg-[var(--crm-bg-raised)]/40' : ''
                                                        }`}
                                                        onClick={() => setSelectedDistributor(dist)}
                                                    >
                                                        {/* 1. MANIFEST & TRANSPORTER */}
                                                        <td className="p-4 space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <div className="font-bold text-[var(--crm-heading)] tracking-wide uppercase">{dist.company}</div>
                                                                {pendingProposals.length > 0 && (
                                                                    <span className="bg-[var(--crm-warning)]/10 text-[var(--crm-warning)] border border-[var(--crm-warning)]/30 text-[9px] font-mono px-1.5 py-0.5 rounded-sm animate-pulse uppercase font-bold tracking-tight">
                                                                        {pendingProposals.length} Pending
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-[11px] text-[var(--crm-ink-faint)] font-light flex items-center gap-1">
                                                                <FiUser size={11} /> Operator: {dist.name}
                                                            </div>
                                                        </td>

                                                        {/* 2. COMMODITY PROFILE */}
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="px-2 py-0.5 font-mono text-[9px] font-bold rounded-sm uppercase bg-[var(--crm-bg-raised)] text-[var(--crm-heading)] border border-[var(--crm-ink-soft)]/10">
                                                                    {dist.division}
                                                                </span>
                                                                {pendingProposals.length > 0 && (
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setExpandedProposalRow(expandedProposalId === dist._id ? null : dist._id);
                                                                        }}
                                                                        className="text-[var(--crm-positive)] hover:text-[var(--crm-positive)] font-mono text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 bg-[var(--crm-bg)] px-1.5 py-0.5 border border-[var(--crm-positive-bg)] rounded-sm cursor-pointer"
                                                                    >
                                                                        {expandedProposalId === dist._id ? 'Hide Open Deals ↑' : `Proposals (${pendingProposals.length}) →`}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>

                                                        {/* 3. GLOBAL ROUTING MATRIX */}
                                                        <td className="p-4 font-mono tracking-wider text-[var(--crm-ink-faint)]">
                                                            {dist.gstNumber || 'N/A Verification'}
                                                        </td>

                                                        {/* 4. TRACKING STATUS */}
                                                        <td className="p-4 text-center">
                                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-sm text-[10px] font-mono uppercase font-bold tracking-tight bg-[var(--crm-bg)] border ${
                                                                dist.approvalStatus === 'approved' ? 'text-[var(--crm-positive)] border-[var(--crm-positive-bg)]' : 'text-[var(--crm-warning)] border-[var(--crm-warning-bg)]'
                                                            }`}>
                                                                {dist.approvalStatus}
                                                            </span>
                                                        </td>

                                                        {/* 5. AUTHORIZE CHANGE CONTROL DECK */}
                                                        <td className="p-4 text-right space-x-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                            <button 
                                                                onClick={() => handleToggleVerification(dist._id, dist.approvalStatus)}
                                                                className={`px-3 py-1 rounded-sm font-mono font-bold uppercase tracking-wider text-[10px] border transition-colors cursor-pointer ${
                                                                    dist.approvalStatus === 'approved' 
                                                                    ? 'border-[var(--crm-warning-bg)] text-[var(--crm-warning)] hover:bg-[var(--crm-warning-bg)]'
                                                                    : 'bg-[var(--crm-bg-raised)] border-[var(--crm-ink-soft)]/10 text-[var(--crm-heading)] hover:bg-[var(--crm-bg-raised)]/80'
                                                                }`}
                                                            >
                                                                {dist.approvalStatus === 'approved' ? 'Revoke' : 'Approve'}
                                                            </button>
                                                            <button onClick={() => handleDeleteDistributor(dist._id)} className="p-1 text-[var(--crm-ink-faint)] hover:text-[var(--crm-danger)] rounded-sm transition-all cursor-pointer">
                                                                <FiTrash2 size={13} />
                                                            </button>
                                                        </td>
                                                    </tr>

                                                    {/* MULTI-PROPOSAL STACK AUDIT CONTAINER ELEMENT */}
                                                    {expandedProposalId === dist._id && pendingProposals.length > 0 && (
                                                        <tr className="bg-[var(--crm-bg)]/30">
                                                            <td colSpan="5" className="p-4 pl-8 border-b border-[var(--crm-ink-soft)]/10 space-y-3">
                                                                <div className="text-[var(--crm-ink-faint)] font-mono font-bold text-[9px] uppercase tracking-wider">
                                                                    ACTIVE QUANTUM LEDGER RECORD MATRIX FOR: {dist.company}
                                                                </div>
                                                                {pendingProposals.map((activeProposal) => (
                                                                    <div 
                                                                        key={activeProposal._id}
                                                                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--crm-bg-sunken)]/80 p-4 border border-[var(--crm-warning)]/20 rounded-sm font-mono text-[11px]"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <div className="space-y-1 text-left">
                                                                            <div className="text-[var(--crm-ink-soft)]">
                                                                                Lot Target: <span className="text-white font-bold">{activeProposal.lotId} ({activeProposal.grade})</span>
                                                                                {" | "} Volume: <span className="text-[var(--crm-positive)] font-bold">{activeProposal.quantity?.toLocaleString()} {activeProposal.division === 'STONE' ? 'MT' : 'Kg'}</span>
                                                                                {" | "} Base: <span className="text-[var(--crm-ink-soft)]">INR {activeProposal.basePrice}/{activeProposal.division === 'STONE' ? 'MT' : 'Kg'}</span>
                                                                                {activeProposal.paymentTerm && <>{" | "} Terms: <span className="text-[var(--crm-ink-soft)]">{activeProposal.paymentTerm.replace('_', ' ')}</span></>}
                                                                                {" | "} Gross Value: <span className="text-[var(--crm-positive)] font-bold">INR {activeProposal.estimatedValue?.toLocaleString()}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex gap-2 shrink-0">
                                                                            <button 
                                                                                onClick={() => handleUpdateProposal(activeProposal._id, 'disapproved')}
                                                                                className="bg-[var(--crm-danger-bg)] border border-[var(--crm-danger-bg)] text-[var(--crm-danger)] px-3 py-1.5 rounded-sm font-bold uppercase tracking-wide hover:bg-[var(--crm-danger-bg)] transition-all cursor-pointer text-[10px]"
                                                                            >
                                                                                Disapprove
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => handleUpdateProposal(activeProposal._id, 'approved')}
                                                                                className="bg-[var(--crm-positive-bg)] border border-[var(--crm-positive-bg)] text-[var(--crm-positive)] px-3 py-1.5 rounded-sm font-bold uppercase tracking-wide hover:bg-[var(--crm-positive-bg)] transition-all cursor-pointer text-[10px]"
                                                                            >
                                                                                Approve & Issue Invoice
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Right Detailed Dossier Panel */}
                    <AnimatePresence>
                        {selectedDistributor && (
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="col-span-1 lg:col-span-5 bg-[var(--crm-bg)]/40 border border-[var(--crm-ink-soft)]/10 rounded-sm shadow-2xl overflow-hidden flex flex-col justify-between"
                            >
                                {/* Header */}
                                <div className="bg-[var(--crm-bg)]/80 p-4 text-[var(--crm-heading)] flex justify-between items-start border-b border-[var(--crm-ink-soft)]/10">
                                    <div className="space-y-1">
                                        <div className="text-[9px] font-mono text-[var(--crm-ink-faint)] uppercase font-bold tracking-widest">Partner File Audit Layout</div>
                                        <h3 className="font-serif text-base uppercase font-normal truncate max-w-[280px]">{selectedDistributor.company}</h3>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedDistributor(null)}
                                        className="p-1 text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] rounded-sm transition-colors cursor-pointer"
                                    >
                                        <FiXCircle size={16} />
                                    </button>
                                </div>

                                {/* Content Fields Space */}
                                <div className="p-5 space-y-5 max-h-[65vh] overflow-y-auto text-xs text-left custom-scrollbar">
                                    <div className="space-y-2.5 bg-[var(--crm-bg-sunken)]/60 p-3 rounded-sm border border-[var(--crm-ink-soft)]/5">
                                        <h4 className="font-mono text-[9px] text-[var(--crm-ink-faint)] uppercase font-bold tracking-wider border-b border-[var(--crm-ink-soft)]/10 pb-1">Operational Details</h4>
                                        <div className="grid grid-cols-1 gap-2 text-[var(--crm-ink-soft)]">
                                            <div className="flex items-center gap-2"><FiUser className="text-[var(--crm-ink-faint)] shrink-0" /> <span>Applicant:</span> <span className="font-semibold text-[var(--crm-heading)]">{selectedDistributor.name}</span></div>
                                            <div className="flex items-center gap-2"><FiMail className="text-[var(--crm-ink-faint)] shrink-0" /> <span>Corporate:</span> <a href={`mailto:${selectedDistributor.email}`} className="font-mono text-[var(--crm-positive)] underline">{selectedDistributor.email}</a></div>
                                            <div className="flex items-center gap-2"><FiPhone className="text-[var(--crm-ink-faint)] shrink-0" /> <span>Mobile Terminal:</span> <span className="font-mono text-[var(--crm-heading)]">{selectedDistributor.mobile}</span></div>
                                            <div className="flex items-center gap-2"><FiBriefcase className="text-[var(--crm-ink-faint)] shrink-0" /> <span>Classification:</span> <span className="font-semibold text-[var(--crm-heading)]">{getBusinessClassification(selectedDistributor.businessType)}</span></div>
                                        </div>
                                    </div>

                                    <div className="space-y-2.5 bg-[var(--crm-bg-sunken)]/60 p-3 rounded-sm border border-[var(--crm-ink-soft)]/5">
                                        <h4 className="font-mono text-[9px] text-[var(--crm-ink-faint)] uppercase font-bold tracking-wider border-b border-[var(--crm-ink-soft)]/10 pb-1">Sourcing Profile Metrics</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans">
                                            <div>
                                                <span className="block text-[var(--crm-ink-faint)] text-[10px]">Target Commodity Type</span>
                                                <span className="font-bold text-[var(--crm-heading)]">{selectedDistributor.teaType || 'Standard Bulk Inventory'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-[var(--crm-ink-faint)] text-[10px]">Projected Monthly Demand</span>
                                                <span className="font-mono font-bold text-[var(--crm-positive)]">{selectedDistributor.monthlyReq?.toLocaleString() || 0} Kg</span>
                                            </div>
                                            <div className="sm:col-span-2">
                                                <span className="block text-[var(--crm-ink-faint)] text-[10px]">Purchase Intent Manifest</span>
                                                <p className="text-[var(--crm-ink-faint)] font-light mt-1 bg-[var(--crm-bg-sunken)] p-2 rounded-sm border border-[var(--crm-ink-soft)]/10 italic">"{selectedDistributor.purpose || 'Wholesale redistribution channel coordination'}"</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2.5 bg-[var(--crm-bg-sunken)]/60 p-3 rounded-sm border border-[var(--crm-ink-soft)]/5">
                                        <h4 className="font-mono text-[9px] text-[var(--crm-ink-faint)] uppercase font-bold tracking-wider border-b border-[var(--crm-ink-soft)]/10 pb-1">Geographic Infrastructure</h4>
                                        <div className="space-y-1.5">
                                            <div className="flex items-start gap-1.5">
                                                <FiMapPin className="text-[var(--crm-ink-faint)] mt-0.5 shrink-0" />
                                                <span className="text-[var(--crm-ink-soft)] leading-relaxed">
                                                    {selectedDistributor.address ? `${selectedDistributor.address}, ` : ''} 
                                                    {selectedDistributor.city}, {selectedDistributor.state}, {selectedDistributor.country}
                                                </span>
                                            </div>
                                            <div className="text-[10px] font-mono text-[var(--crm-ink-faint)] pt-1 flex justify-between border-t border-[var(--crm-ink-soft)]/5 mt-2">
                                                <span>Pipeline: {selectedDistributor.division} Sector</span>
                                                <span className="flex items-center gap-1"><FiCalendar /> Joined: {new Date(selectedDistributor.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 bg-[var(--crm-bg-sunken)]/60 p-3 rounded-sm border border-[var(--crm-ink-soft)]/5">
                                        <h4 className="font-mono text-[9px] text-[var(--crm-ink-faint)] uppercase font-bold tracking-wider border-b border-[var(--crm-ink-soft)]/10 pb-1">Statutory Documents Ledger</h4>
                                        <div className="space-y-2 pt-1 font-mono text-[11px]">
                                            {selectedDistributor.doc1Path ? (
                                                <div className="flex items-center justify-between p-2 rounded-sm bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/10">
                                                    <div className="flex items-center gap-2 text-[var(--crm-ink-soft)] truncate max-w-[220px]">
                                                        <FiFileText className="text-[var(--crm-positive)] shrink-0" />
                                                        <span className="truncate">Primary Certificate (GST/FSSAI)</span>
                                                    </div>
                                                    <button 
                                                        onClick={(e) => handleDownloadDoc(e, 'GST', selectedDistributor._id, selectedDistributor.company)}
                                                        className="text-[var(--crm-positive)] hover:text-[var(--crm-positive)] flex items-center gap-1 font-bold text-[10px] uppercase cursor-pointer"
                                                    >
                                                        <FiDownload /> Extract
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="p-2 text-[var(--crm-ink-faint)] bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/10 rounded-sm text-center italic text-[10px]">
                                                    No Primary Registration Document uploaded.
                                                </div>
                                            )}

                                            {selectedDistributor.doc2Path ? (
                                                <div className="flex items-center justify-between p-2 rounded-sm bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/10">
                                                    <div className="flex items-center gap-2 text-[var(--crm-ink-soft)] truncate max-w-[220px]">
                                                        <FiFileText className="text-[var(--crm-warning)] shrink-0" />
                                                        <span className="truncate">Secondary Document (Udyam Registry)</span>
                                                    </div>
                                                    <button 
                                                        onClick={(e) => handleDownloadDoc(e, 'UDYAM', selectedDistributor._id, selectedDistributor.company)}
                                                        className="text-[var(--crm-warning)] hover:text-[var(--crm-warning)] flex items-center gap-1 font-bold text-[10px] uppercase cursor-pointer"
                                                    >
                                                        <FiDownload /> Extract
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="p-2 text-[var(--crm-ink-faint)] bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/10 rounded-sm text-center italic text-[10px]">
                                                    No Udyam/Secondary documentation attached.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Decision Quick Panel Container */}
                                <div className="p-4 bg-[var(--crm-bg)]/80 border-t border-[var(--crm-ink-soft)]/10 flex gap-2">
                                    <button 
                                        onClick={() => handleToggleVerification(selectedDistributor._id, selectedDistributor.approvalStatus)}
                                        className={`w-full font-mono text-xs font-bold uppercase tracking-wider py-3 rounded-sm text-center flex items-center justify-center gap-2 transition-colors cursor-pointer text-white ${
                                            selectedDistributor.approvalStatus === 'approved'
                                            ? 'bg-[var(--crm-warning)] hover:bg-[var(--crm-warning)]'
                                            : 'bg-[var(--crm-bg-raised)] hover:bg-[var(--crm-bg-raised)]/80 border border-[var(--crm-ink-soft)]/10'
                                        }`}
                                    >
                                        <FiCheckCircle /> {selectedDistributor.approvalStatus === 'approved' ? 'Revoke Active Sourcing Access' : 'Verify Credentials & Authenticate'}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}