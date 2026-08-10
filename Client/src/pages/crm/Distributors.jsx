import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { distributorApi } from '../../api/distributor';
import { adminApi } from '../../api/admin';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiSearch, FiFilter, FiLayers, FiDownload, FiXCircle,
    FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiShield
} from 'react-icons/fi';
import { DownloadButton } from '../../components/ui/AnimatedActionButton';
import ProposalCard from '../../components/crm/ProposalCard';

// Each division renders its own dedicated Orders page (/crm/distributors/tea|rice|stone),
// scoped strictly to its own sourcing requests - the route param decides which one,
// defaulting to TEA for an unrecognized/missing param so this never silently mixes divisions.
// This page shows only sourcing requests (proposals); the registered-buyer directory lives
// on the separate Visitors pages.
const DIVISION_META = {
    TEA: { title: 'Tea Orders', badge: 'Tea Sourcing', eyebrow: 'PRAKRITI TEA FLEET TELEMETRY' },
    RICE: { title: 'Rice Orders', badge: 'Rice Millings', eyebrow: 'RICE FLEET TELEMETRY' },
    STONE: { title: 'Stone Orders', badge: 'Stone Aggregates', eyebrow: 'STONE FLEET TELEMETRY' }
};
const VALID_DIVISIONS = Object.keys(DIVISION_META);

export default function Distributor() {
    const { division: divisionParam } = useParams();
    const division = VALID_DIVISIONS.includes(divisionParam?.toUpperCase()) ? divisionParam.toUpperCase() : 'TEA';
    const meta = DIVISION_META[division];

    const [proposals, setProposals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedProposal, setSelectedProposal] = useState(null);

    const fetchProposals = async () => {
        setIsLoading(true);
        try {
            const propRes = await distributorApi.getActiveProposalsAdmin();
            if (propRes && propRes.success) {
                setProposals(propRes.data || []);
            }
        } catch (err) {
            console.error("Failed to fetch sourcing requests:", err);
            toast.error("Failed to fetch sourcing requests.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProposals();
    }, []);

    const handleUpdateProposal = async (proposalId, statusUpdate) => {
        try {
            const res = await distributorApi.updateProposalStatus(proposalId, statusUpdate);
            if (res.success) {
                toast.success(res.message || "Proposal state synchronized.");
                fetchProposals(); // Refresh values
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update target proposal parameters.");
        }
    };

    const handleDeleteProposal = async (proposalId) => {
        if (!window.confirm("Permanently delete this sourcing request? This cannot be undone.")) return;

        try {
            const res = await distributorApi.deleteProposal(proposalId);
            if (res.success) {
                toast.success(res.message || "Sourcing request deleted.");
                if (selectedProposal?._id === proposalId) setSelectedProposal(null);
                fetchProposals();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete sourcing request.");
        }
    };

    // Excludes orphaned proposals whose distributor record was deleted from
    // the CRM (populate() comes back empty for distributorId) - these used
    // to render as "Unknown Distributor". Hidden here rather than deleted
    // outright; run Server/scripts/removeOrphanedProposals.js to purge them
    // from the database entirely.
    const divisionProposals = proposals.filter(p => p.division === division && p.distributorId);

    const filteredProposals = divisionProposals.filter(p => {
        const distributorLabel = `${p.distributorId?.company || ''} ${p.distributorId?.name || ''}`.toLowerCase();
        const matchesSearch =
            distributorLabel.includes(searchQuery.toLowerCase()) ||
            p.lotId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.region?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.grade?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' ? true : String(p.status).toLowerCase() === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const handleExportOrders = async () => {
        try {
            const deviceHash = localStorage.getItem('deviceHash') || 'dev-device-hash';

            try {
                await adminApi.logExportAttempt({
                    deviceHash,
                    metadata: { userAgent: navigator.userAgent, proposalsCount: filteredProposals.length }
                });
            } catch (auditErr) {
                console.warn("Export audit log endpoint unattached. Proceeding with CSV download fallback.");
            }

            const csvContent = "data:text/csv;charset=utf-8,Distributor,Lot ID,Region,Grade,Quantity,Base Price,Payment Term,Estimated Value,Status,Date\n"
                + filteredProposals.map(p => {
                    const distributorLabel = p.distributorId?.company || p.distributorId?.name || 'Unknown Distributor';
                    return `"${distributorLabel}","${p.lotId || ''}","${p.region || ''}","${p.grade || ''}","${p.quantity || ''}","${p.basePrice || ''}","${p.paymentTerm || ''}","${p.estimatedValue || ''}","${p.status || ''}","${p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}"`;
                }).join("\n");

            const link = document.createElement("a");
            link.setAttribute("href", encodeURI(csvContent));
            link.setAttribute("download", `ITO_${division}_Orders_${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("Sourcing requests exported safely!");
        } catch (error) {
            toast.error("Export execution failed.");
            throw error;
        }
    };

    return (
        <div className="min-h-screen bg-[var(--crm-bg-sunken)] font-sans antialiased text-[var(--crm-ink-soft)] p-4 sm:p-8 pt-24">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header Block matching CRM Layout */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--crm-ink-soft)]/10 pb-5">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[var(--crm-ink-faint)] font-mono text-[9px] uppercase font-bold tracking-[0.2em]">
                            {meta.eyebrow}
                        </div>
                        <h1 className="text-3xl font-serif text-[var(--crm-heading)] uppercase tracking-wide font-normal">
                            {meta.title}
                        </h1>
                        <p className="text-xs text-[var(--crm-ink-faint)] font-light mt-1">
                            {meta.badge} sourcing requests only - registered buyers live on the Visitors page.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 font-mono text-xs">
                        <DownloadButton
                            action={handleExportOrders}
                            className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-soft)] border border-[var(--crm-ink-soft)]/20 text-[11px] uppercase tracking-widest font-semibold px-4 py-2.5 rounded-sm transition-all hover:bg-[var(--crm-bg-raised)] cursor-pointer disabled:cursor-default"
                            icon={FiDownload}
                            iconSize={13}
                            idleLabel="Export"
                            busyLabel="Exporting..."
                            doneLabel="Exported"
                        />
                        <div className="bg-[var(--crm-bg)]/40 px-4 py-2.5 rounded-sm border border-[var(--crm-ink-soft)]/10 text-center">
                            <span className="block text-[var(--crm-ink-faint)] font-bold uppercase tracking-wider text-[9px]">Total Requests</span>
                            <span className="text-lg font-bold text-[var(--crm-heading)]">{divisionProposals.length}</span>
                        </div>
                        <div className="bg-[var(--crm-bg)]/40 px-4 py-2.5 rounded-sm border border-[var(--crm-ink-soft)]/10 text-center">
                            <span className="block text-[var(--crm-ink-faint)] font-bold uppercase tracking-wider text-[9px]">Awaiting Review</span>
                            <span className="text-lg font-bold text-[var(--crm-warning)]">{divisionProposals.filter(p => String(p.status).toLowerCase() === 'pending').length}</span>
                        </div>
                    </div>
                </div>

                {/* Filter Control Array */}
                <div className="bg-[var(--crm-bg)]/20 border border-[var(--crm-ink-soft)]/10 rounded-sm p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--crm-ink-faint)] text-sm" />
                        <input
                            type="text"
                            placeholder="Search by distributor, lot ID, region, or grade..."
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
                                <option value="APPROVED" className="bg-[var(--crm-bg-sunken)]">Approved</option>
                                <option value="DISAPPROVED" className="bg-[var(--crm-bg-sunken)]">Disapproved</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-1.5 bg-[var(--crm-bg-sunken)] px-3 py-1.5 rounded-sm border border-[var(--crm-ink-soft)]/10">
                            <FiLayers className="text-[var(--crm-ink-faint)]" />
                            <span className="text-[10px] text-[var(--crm-ink-faint)] uppercase font-bold">Sector:</span>
                            <span className="font-bold text-[var(--crm-heading)]">{meta.badge}</span>
                        </div>
                    </div>
                </div>

                {/* Sourcing Requests */}
                <div className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/10 rounded-sm overflow-hidden">
                    {isLoading ? (
                        <div className="p-12 text-center font-mono text-xs text-[var(--crm-ink-faint)] animate-pulse">
                            Auditing sourcing pipeline...
                        </div>
                    ) : filteredProposals.length === 0 ? (
                        <div className="p-8 text-center text-[var(--crm-ink-faint)] font-light italic text-xs">
                            No sourcing requests matched the designated search metrics.
                        </div>
                    ) : (
                        <div className="p-4 space-y-3">
                            {filteredProposals.map((proposal) => (
                                <ProposalCard
                                    key={proposal._id}
                                    proposal={proposal}
                                    showActions
                                    onApprove={(id) => handleUpdateProposal(id, 'approved')}
                                    onDisapprove={(id) => handleUpdateProposal(id, 'disapproved')}
                                    onDelete={handleDeleteProposal}
                                    onClick={() => setSelectedProposal(proposal)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Order Detail Modal - order info plus the buyer's original entry-gate submission */}
            <AnimatePresence>
                {selectedProposal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
                        onClick={() => setSelectedProposal(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.98 }}
                            className="w-full max-w-lg bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/10 rounded-sm shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="bg-[var(--crm-bg)]/80 p-4 text-[var(--crm-heading)] flex justify-between items-start border-b border-[var(--crm-ink-soft)]/10">
                                <div className="space-y-1">
                                    <div className="text-[9px] font-mono text-[var(--crm-ink-faint)] uppercase font-bold tracking-widest">Sourcing Request Detail</div>
                                    <h3 className="font-serif text-base uppercase font-normal">
                                        {selectedProposal.lotId} · {selectedProposal.grade}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setSelectedProposal(null)}
                                    className="p-1 text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] rounded-sm transition-colors cursor-pointer"
                                >
                                    <FiXCircle size={16} />
                                </button>
                            </div>

                            <div className="p-5 space-y-5 overflow-y-auto text-xs text-left custom-scrollbar">
                                <div className="space-y-2.5 bg-[var(--crm-bg-sunken)]/60 p-3 rounded-sm border border-[var(--crm-ink-soft)]/5">
                                    <h4 className="font-mono text-[9px] text-[var(--crm-ink-faint)] uppercase font-bold tracking-wider border-b border-[var(--crm-ink-soft)]/10 pb-1">Order Details</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[var(--crm-ink-soft)] font-mono">
                                        <div>Region: <span className="text-[var(--crm-heading)] font-bold">{selectedProposal.region}</span></div>
                                        <div>Quantity: <span className="text-[var(--crm-positive)] font-bold">{selectedProposal.quantity?.toLocaleString()} {selectedProposal.division === 'STONE' ? 'MT' : 'Kg'}</span></div>
                                        <div>Base Price: <span className="text-[var(--crm-heading)] font-bold">INR {selectedProposal.basePrice}</span></div>
                                        <div>Estimated Value: <span className="text-[var(--crm-positive)] font-bold">INR {selectedProposal.estimatedValue?.toLocaleString()}</span></div>
                                        {selectedProposal.paymentTerm && <div>Payment Term: <span className="text-[var(--crm-heading)] font-bold">{selectedProposal.paymentTerm.replace('_', ' ')}</span></div>}
                                        <div>Status: <span className="text-[var(--crm-heading)] font-bold uppercase">{selectedProposal.status}</span></div>
                                        <div className="sm:col-span-2">Requested On: <span className="text-[var(--crm-heading)] font-bold">{selectedProposal.createdAt ? new Date(selectedProposal.createdAt).toLocaleString() : 'N/A'}</span></div>
                                    </div>
                                </div>

                                <div className="space-y-2.5 bg-[var(--crm-bg-sunken)]/60 p-3 rounded-sm border border-[var(--crm-ink-soft)]/5">
                                    <h4 className="font-mono text-[9px] text-[var(--crm-ink-faint)] uppercase font-bold tracking-wider border-b border-[var(--crm-ink-soft)]/10 pb-1">Buyer (Entry Form Submission)</h4>
                                    {selectedProposal.distributorId ? (
                                        <div className="space-y-2 text-[var(--crm-ink-soft)]">
                                            <div className="flex items-center gap-2"><FiUser className="text-[var(--crm-ink-faint)] shrink-0" /> <span>Name:</span> <span className="font-semibold text-[var(--crm-heading)]">{selectedProposal.distributorId.name}</span></div>
                                            {selectedProposal.distributorId.company && (
                                                <div className="flex items-center gap-2"><FiShield className="text-[var(--crm-ink-faint)] shrink-0" /> <span>Company:</span> <span className="font-semibold text-[var(--crm-heading)]">{selectedProposal.distributorId.company}</span></div>
                                            )}
                                            <div className="flex items-center gap-2"><FiMail className="text-[var(--crm-ink-faint)] shrink-0" /> <span>Email:</span> <a href={`mailto:${selectedProposal.distributorId.email}`} className="font-mono text-[var(--crm-positive)] underline">{selectedProposal.distributorId.email}</a></div>
                                            <div className="flex items-center gap-2"><FiPhone className="text-[var(--crm-ink-faint)] shrink-0" /> <span>Mobile:</span> <span className="font-mono text-[var(--crm-heading)]">{selectedProposal.distributorId.mobile}</span></div>
                                            <div className="flex items-center gap-2"><FiMapPin className="text-[var(--crm-ink-faint)] shrink-0" /> <span>Location:</span> <span className="text-[var(--crm-heading)]">{[selectedProposal.distributorId.city, selectedProposal.distributorId.state, selectedProposal.distributorId.country].filter(Boolean).join(', ')}</span></div>
                                            <div className="flex items-center gap-2"><FiCalendar className="text-[var(--crm-ink-faint)] shrink-0" /> <span>Registered On:</span> <span className="text-[var(--crm-heading)]">{selectedProposal.distributorId.createdAt ? new Date(selectedProposal.distributorId.createdAt).toLocaleDateString() : 'N/A'}</span></div>
                                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-sm text-[10px] font-mono uppercase font-bold tracking-tight bg-[var(--crm-bg)] border ${selectedProposal.distributorId.isOtpVerified ? 'text-[var(--crm-positive)] border-[var(--crm-positive-bg)]' : 'text-[var(--crm-ink-faint)] border-[var(--crm-ink-soft)]/20'}`}>
                                                    {selectedProposal.distributorId.isOtpVerified ? 'OTP Verified' : 'OTP Pending'}
                                                </span>
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-sm text-[10px] font-mono uppercase font-bold tracking-tight bg-[var(--crm-bg)] border ${selectedProposal.distributorId.approvalStatus === 'approved' ? 'text-[var(--crm-positive)] border-[var(--crm-positive-bg)]' : 'text-[var(--crm-warning)] border-[var(--crm-warning-bg)]'}`}>
                                                    {selectedProposal.distributorId.approvalStatus}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-3 text-[var(--crm-ink-faint)] bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/10 rounded-sm text-center italic text-[10px]">
                                            This buyer's record has been deleted from the CRM - their entry-form details are no longer available.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
