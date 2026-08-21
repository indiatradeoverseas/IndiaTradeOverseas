import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { distributorApi } from '../../api/distributor';
import { toast } from 'react-hot-toast';
import {
    FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiSearch, FiChevronDown, FiLayers, FiTrash2
} from 'react-icons/fi';
import ProposalCard from '../../components/crm/ProposalCard';
import DivisionSection from '../../components/crm/DivisionSection';

// Each division renders its own dedicated Visitors page (/crm/visitors/tea|rice|stone),
// scoped strictly to its own data - the route param decides which one, defaulting to
// TEA for an unrecognized/missing param so this never silently mixes divisions.
const DIVISION_META = {
    TEA: { title: 'Tea Visitors', badge: 'Tea Sourcing' },
    RICE: { title: 'Rice Visitors', badge: 'Rice Millings' },
    STONE: { title: 'Stone Visitors', badge: 'Stone Aggregates' }
};
const VALID_DIVISIONS = Object.keys(DIVISION_META);

export default function Visitors() {
    const { division: divisionParam } = useParams();
    const division = VALID_DIVISIONS.includes(divisionParam?.toUpperCase()) ? divisionParam.toUpperCase() : 'TEA';
    const meta = DIVISION_META[division];

    const [visitors, setVisitors] = useState([]);
    const [proposals, setProposals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedVisitorId, setExpandedVisitorId] = useState(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [distRes, propRes] = await Promise.all([
                distributorApi.getDistributors(),
                distributorApi.getActiveProposalsAdmin()
            ]);

            if (distRes && distRes.success) {
                const all = distRes.data?.distributors || distRes.distributors || [];
                setVisitors(all.filter(d => d.registrationSource === 'QUICK_GATE'));
            }
            if (propRes && propRes.success) {
                setProposals(propRes.data || []);
            }
        } catch (err) {
            console.error("Failed to fetch buyer visitor data:", err);
            toast.error("Failed to fetch buyer visitor records.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDeleteVisitor = async (visitorId) => {
        if (!window.confirm("Permanently delete this visitor record? This cannot be undone.")) return;

        try {
            const res = await distributorApi.deleteDistributor(visitorId);
            if (res && res.success) {
                setVisitors(prev => prev.filter(v => v._id !== visitorId));
                toast.success("Visitor record deleted.");
            } else {
                toast.error(res?.message || "Failed to delete visitor record.");
            }
        } catch (err) {
            console.error("Failed to delete visitor record:", err);
            toast.error("Failed to delete visitor record.");
        }
    };

    const divisionVisitors = visitors.filter(v => v.division === division);

    const filteredVisitors = divisionVisitors.filter(v =>
        v.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.mobile?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return (
        <div className="min-h-screen bg-[var(--crm-bg-sunken)] font-sans antialiased text-[var(--crm-ink-soft)] p-4 sm:p-8 pt-24">
            <div className="max-w-7xl mx-auto space-y-6">

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--crm-ink-soft)]/10 pb-5">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[var(--crm-ink-faint)] font-mono text-[9px] uppercase font-bold tracking-[0.2em]">
                            BUYER GATE TELEMETRY
                        </div>
                        <h1 className="text-3xl font-serif text-[var(--crm-heading)] uppercase tracking-wide font-normal">
                            {meta.title}
                        </h1>
                        <p className="text-xs text-[var(--crm-ink-faint)] font-light mt-1">
                            Everyone who submitted the entry gate form on {meta.badge} — whether or not they went on to place a sourcing request.
                        </p>
                    </div>

                    <div className="bg-[var(--crm-bg)]/40 px-4 py-2.5 rounded-sm border border-[var(--crm-ink-soft)]/10 text-center">
                        <span className="block text-[var(--crm-ink-faint)] font-bold uppercase tracking-wider text-[9px]">Total Visitors</span>
                        <span className="text-lg font-bold text-[var(--crm-heading)]">{divisionVisitors.length}</span>
                    </div>
                </div>

                <div className="bg-[var(--crm-bg)]/20 border border-[var(--crm-ink-soft)]/10 rounded-sm p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--crm-ink-faint)] text-sm" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or mobile..."
                            className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/10 pl-10 pr-4 py-2 rounded-sm text-xs text-[var(--crm-heading)] placeholder-[var(--crm-ink-faint)] focus:outline-none focus:border-[var(--crm-ink-soft)]/30 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-1.5 bg-[var(--crm-bg-sunken)] px-3 py-1.5 rounded-sm border border-[var(--crm-ink-soft)]/10 text-xs font-mono shrink-0">
                        <FiLayers className="text-[var(--crm-ink-faint)]" />
                        <span className="text-[10px] text-[var(--crm-ink-faint)] uppercase font-bold">Sector:</span>
                        <span className="font-bold text-[var(--crm-heading)]">{meta.badge}</span>
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-12 text-center font-mono text-xs text-[var(--crm-ink-faint)] animate-pulse">
                        Auditing gate submissions...
                    </div>
                ) : (
                    <div className="space-y-4">
                        <DivisionSection
                            title={meta.title}
                            count={filteredVisitors.length}
                            emptyLabel="No gate submissions for this division yet."
                        >
                            {filteredVisitors.map((visitor) => {
                                        const visitorProposals = proposals.filter(p =>
                                            (p.distributorId?._id || p.distributorId) === visitor._id
                                        );
                                        const isExpanded = expandedVisitorId === visitor._id;

                                        return (
                                            <div
                                                key={visitor._id}
                                                className="bg-[var(--crm-bg-sunken)]/80 border border-[var(--crm-ink-soft)]/10 rounded-sm p-4 space-y-2"
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div className="space-y-1 text-xs">
                                                        <div className="flex items-center gap-2 font-bold text-[var(--crm-heading)] uppercase tracking-wide">
                                                            <FiUser size={12} /> {visitor.name}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[var(--crm-ink-faint)] font-mono text-[11px]">
                                                            <span className="flex items-center gap-1"><FiMail size={11} /> {visitor.email}</span>
                                                            <span className="flex items-center gap-1"><FiPhone size={11} /> {visitor.mobile}</span>
                                                            <span className="flex items-center gap-1"><FiMapPin size={11} /> {visitor.city}, {visitor.state}</span>
                                                            <span className="flex items-center gap-1"><FiCalendar size={11} /> {new Date(visitor.createdAt).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {visitorProposals.length > 0 && (
                                                            <button
                                                                onClick={() => setExpandedVisitorId(isExpanded ? null : visitor._id)}
                                                                className="text-[var(--crm-positive)] font-mono text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 bg-[var(--crm-bg)] px-1.5 py-0.5 border border-[var(--crm-positive-bg)] rounded-sm cursor-pointer"
                                                            >
                                                                Orders ({visitorProposals.length}) <FiChevronDown className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} size={11} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteVisitor(visitor._id)}
                                                            title="Delete Visitor Record"
                                                            className="p-1.5 text-[var(--crm-ink-faint)] hover:text-[var(--crm-danger)] rounded-sm transition-all cursor-pointer"
                                                        >
                                                            <FiTrash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {isExpanded && visitorProposals.length > 0 && (
                                                    <div className="pt-2 space-y-2 border-t border-[var(--crm-ink-soft)]/10 mt-2">
                                                        {visitorProposals.map((proposal) => (
                                                            <ProposalCard key={proposal._id} proposal={proposal} showActions={false} />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                        </DivisionSection>
                    </div>
                )}
            </div>
        </div>
    );
}
