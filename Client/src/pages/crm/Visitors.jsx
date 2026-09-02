import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { distributorApi } from '../../api/distributor';
import { toast } from 'react-hot-toast';
import {
    FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiSearch, FiChevronDown, 
    FiLayers, FiTrash2, FiClock, FiRefreshCw, FiRepeat, FiCheckCircle
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
    const [expandedHistoryId, setExpandedHistoryId] = useState(null);

    // Date & Calendar Filter States
    const [dateFilterMode, setDateFilterMode] = useState('ALL'); // 'ALL' | 'TODAY' | 'YESTERDAY' | 'PICK_DATE'
    const [selectedDate, setSelectedDate] = useState('');

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [distRes, propRes] = await Promise.all([
                distributorApi.getDistributors(),
                distributorApi.getActiveProposalsAdmin()
            ]);

            if (distRes && distRes.success) {
                const all = distRes.data?.distributors || distRes.distributors || [];
                // Include all visitors who registered via QUICK_GATE or have visit history or are visitors
                setVisitors(all.filter(d => 
                    d.registrationSource === 'QUICK_GATE' || 
                    (Array.isArray(d.visitHistory) && d.visitHistory.length > 0) ||
                    d.visitCount > 0
                ));
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

    const getLocalDateStr = (dateObjOrStr) => {
        if (!dateObjOrStr) return '';
        try {
            const d = new Date(dateObjOrStr);
            if (isNaN(d.getTime())) return '';
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            return '';
        }
    };

    const getVisitorLatestDate = (v) => {
        if (!v) return null;
        if (Array.isArray(v.visitHistory) && v.visitHistory.length > 0) {
            const lastEntry = v.visitHistory[v.visitHistory.length - 1];
            if (lastEntry && lastEntry.visitedAt) return lastEntry.visitedAt;
        }
        if (v.createdAt) return v.createdAt;
        return v.lastVisitedAt || v.updatedAt || null;
    };

    const isSameDay = (date1Str, date2Str) => {
        const d1 = getLocalDateStr(date1Str);
        const d2 = getLocalDateStr(date2Str);
        if (!d1 || !d2) return false;
        return d1 === d2;
    };

    const matchesDateFilter = (v) => {
        if (dateFilterMode === 'ALL') return true;

        const todayStr = getLocalDateStr(new Date());
        const yest = new Date();
        yest.setDate(yest.getDate() - 1);
        const yestStr = getLocalDateStr(yest);

        const targetDateStr = dateFilterMode === 'TODAY' ? todayStr
            : dateFilterMode === 'YESTERDAY' ? yestStr
            : (dateFilterMode === 'PICK_DATE' ? selectedDate : '');

        if (!targetDateStr) return true;

        const latestDate = getVisitorLatestDate(v);
        if (isSameDay(latestDate, targetDateStr)) return true;

        if (Array.isArray(v.visitHistory) && v.visitHistory.length > 0) {
            return v.visitHistory.some(vh => isSameDay(vh.visitedAt, targetDateStr));
        }

        return false;
    };

    const divisionVisitors = visitors.filter(v => v.division === division);

    const filteredVisitors = divisionVisitors
        .filter(matchesDateFilter)
        .filter(v =>
            v.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.mobile?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.state?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => new Date(getVisitorLatestDate(b) || 0) - new Date(getVisitorLatestDate(a) || 0));

    const todayCount = divisionVisitors.filter(v => isSameDay(getVisitorLatestDate(v), getLocalDateStr(new Date()))).length;
    const repeatVisitorsCount = divisionVisitors.filter(v => (v.visitCount || 1) > 1).length;

    return (
        <div className="min-h-screen bg-[var(--crm-bg-sunken)] font-sans antialiased text-[var(--crm-ink-soft)] p-4 sm:p-8 pt-24">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header Title Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--crm-ink-soft)]/10 pb-5">
                    <div className="space-y-1 text-left">
                        <div className="flex items-center gap-2 text-[var(--crm-ink-faint)] font-mono text-[9px] uppercase font-bold tracking-[0.2em]">
                            BUYER GATE TELEMETRY & REPEAT VISIT LOGS
                        </div>
                        <h1 className="text-3xl font-serif text-[var(--crm-heading)] uppercase tracking-wide font-normal">
                            {meta.title}
                        </h1>
                        <p className="text-xs text-[var(--crm-ink-faint)] font-light mt-1">
                            Tracks everyone who submitted or re-submitted the entry gate form on {meta.badge} with date & time timestamps.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="bg-[var(--crm-bg)]/40 px-4 py-2 rounded-sm border border-[var(--crm-ink-soft)]/10 text-center">
                            <span className="block text-[var(--crm-ink-faint)] font-bold uppercase tracking-wider text-[9px]">Total Visitors</span>
                            <span className="text-lg font-bold text-[var(--crm-heading)]">{divisionVisitors.length}</span>
                        </div>
                        <div className="bg-[var(--crm-bg)]/40 px-4 py-2 rounded-sm border border-[var(--crm-ink-soft)]/10 text-center">
                            <span className="block text-teal-400 font-bold uppercase tracking-wider text-[9px]">Visited Today</span>
                            <span className="text-lg font-bold text-teal-400">{todayCount}</span>
                        </div>
                        <div className="bg-[var(--crm-bg)]/40 px-4 py-2 rounded-sm border border-[var(--crm-ink-soft)]/10 text-center">
                            <span className="block text-amber-400 font-bold uppercase tracking-wider text-[9px]">Repeat Buyers</span>
                            <span className="text-lg font-bold text-amber-400">{repeatVisitorsCount}</span>
                        </div>
                    </div>
                </div>

                {/* Calendar Date Filter Bar */}
                <div className="bg-[var(--crm-bg)]/40 border border-[var(--crm-ink-soft)]/10 p-3 sm:p-4 rounded-sm shadow-sm font-mono text-xs flex flex-wrap justify-between items-center gap-3 text-left">
                    <div className="flex items-center gap-2 text-[var(--crm-heading)] font-bold">
                        <FiCalendar className="text-teal-400 animate-pulse" size={16} />
                        <span className="text-[11px] uppercase tracking-wider">Date & Calendar Filter:</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => { setDateFilterMode('ALL'); setSelectedDate(''); }}
                            className={`px-3 py-1.5 rounded-sm text-[10px] uppercase font-bold tracking-wider transition cursor-pointer ${
                                dateFilterMode === 'ALL'
                                    ? 'bg-teal-600 text-white font-black shadow'
                                    : 'bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'
                            }`}
                        >
                            All Dates
                        </button>
                        <button
                            onClick={() => { setDateFilterMode('TODAY'); setSelectedDate(''); }}
                            className={`px-3 py-1.5 rounded-sm text-[10px] uppercase font-bold tracking-wider transition cursor-pointer ${
                                dateFilterMode === 'TODAY'
                                    ? 'bg-teal-600 text-white font-black shadow'
                                    : 'bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'
                            }`}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => { setDateFilterMode('YESTERDAY'); setSelectedDate(''); }}
                            className={`px-3 py-1.5 rounded-sm text-[10px] uppercase font-bold tracking-wider transition cursor-pointer ${
                                dateFilterMode === 'YESTERDAY'
                                    ? 'bg-teal-600 text-white font-black shadow'
                                    : 'bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/20 text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)]'
                            }`}
                        >
                            Yesterday
                        </button>

                        <div className="flex items-center gap-1.5 bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/20 px-2.5 py-1 rounded-sm">
                            <span className="text-[9px] uppercase text-[var(--crm-ink-faint)] font-bold">Pick Date:</span>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => {
                                    setSelectedDate(e.target.value);
                                    setDateFilterMode(e.target.value ? 'PICK_DATE' : 'ALL');
                                }}
                                className="bg-transparent text-[var(--crm-heading)] text-[10px] outline-none font-mono cursor-pointer"
                            />
                        </div>

                        {dateFilterMode !== 'ALL' && (
                            <button
                                onClick={() => { setDateFilterMode('ALL'); setSelectedDate(''); }}
                                className="text-[9px] uppercase font-bold text-rose-400 hover:text-rose-300 underline ml-1 cursor-pointer"
                            >
                                Clear Filter
                            </button>
                        )}
                    </div>

                    <div className="text-[10px] text-[var(--crm-ink-faint)] font-mono">
                        Showing: <strong className="text-teal-400 font-bold">{dateFilterMode === 'ALL' ? 'All Time' : dateFilterMode === 'TODAY' ? 'Today' : dateFilterMode === 'YESTERDAY' ? 'Yesterday' : selectedDate}</strong> 
                        &bull; ({filteredVisitors.length} Visitors Matched)
                    </div>
                </div>

                {/* Search Bar & Division info */}
                <div className="bg-[var(--crm-bg)]/20 border border-[var(--crm-ink-soft)]/10 rounded-sm p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--crm-ink-faint)] text-sm" />
                        <input
                            type="text"
                            placeholder="Search by name, email, mobile, city, or state..."
                            className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/10 pl-10 pr-4 py-2 rounded-sm text-xs text-[var(--crm-heading)] placeholder-[var(--crm-ink-faint)] focus:outline-none focus:border-[var(--crm-ink-soft)]/30 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={fetchData}
                            className="flex items-center gap-1.5 bg-[var(--crm-bg-sunken)] px-3 py-1.5 rounded-sm border border-[var(--crm-ink-soft)]/10 text-xs font-mono text-[var(--crm-heading)] hover:bg-[var(--crm-bg)] transition cursor-pointer"
                        >
                            <FiRefreshCw size={11} className={`${isLoading ? 'animate-spin' : ''}`} /> Refresh
                        </button>
                        <div className="flex items-center gap-1.5 bg-[var(--crm-bg-sunken)] px-3 py-1.5 rounded-sm border border-[var(--crm-ink-soft)]/10 text-xs font-mono shrink-0">
                            <FiLayers className="text-[var(--crm-ink-faint)]" />
                            <span className="text-[10px] text-[var(--crm-ink-faint)] uppercase font-bold">Sector:</span>
                            <span className="font-bold text-[var(--crm-heading)]">{meta.badge}</span>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-12 text-center font-mono text-xs text-[var(--crm-ink-faint)] animate-pulse">
                        Auditing gate submissions and visit telemetry logs...
                    </div>
                ) : (
                    <div className="space-y-4">
                        <DivisionSection
                            title={meta.title}
                            count={filteredVisitors.length}
                            emptyLabel="No visitor gate submissions found for this filter criteria."
                        >
                            {filteredVisitors.map((visitor) => {
                                const visitorProposals = proposals.filter(p =>
                                    (p.distributorId?._id || p.distributorId) === visitor._id
                                );
                                const isExpanded = expandedVisitorId === visitor._id;
                                const isHistoryExpanded = expandedHistoryId === visitor._id;

                                const latestVisitDate = getVisitorLatestDate(visitor);
                                const todayStr = new Date().toISOString().split('T')[0];
                                const yest = new Date();
                                yest.setDate(yest.getDate() - 1);
                                const yestStr = yest.toISOString().split('T')[0];

                                const isToday = isSameDay(latestVisitDate, todayStr);
                                const isYesterday = isSameDay(latestVisitDate, yestStr);

                                const visitCount = visitor.visitCount || (Array.isArray(visitor.visitHistory) && visitor.visitHistory.length > 0 ? visitor.visitHistory.length : 1);

                                return (
                                    <div
                                        key={visitor._id}
                                        className="bg-[var(--crm-bg-sunken)]/80 border border-[var(--crm-ink-soft)]/10 hover:border-[var(--crm-ink-soft)]/20 rounded-sm p-4 space-y-3 transition-all"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="space-y-1.5 text-xs text-left">
                                                <div className="flex flex-wrap items-center gap-2 font-bold text-[var(--crm-heading)] uppercase tracking-wide">
                                                    <FiUser size={13} className="text-teal-400" />
                                                    <span className="text-sm font-semibold">{visitor.name}</span>

                                                    {/* Repeat Visitor Badge */}
                                                    {visitCount > 1 ? (
                                                        <span className="bg-amber-950/60 text-amber-300 border border-amber-800/40 text-[9px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1">
                                                            <FiRepeat size={10} /> Repeat Visitor ({visitCount} Visits)
                                                        </span>
                                                    ) : (
                                                        <span className="bg-teal-950/40 text-teal-300 border border-teal-800/30 text-[9px] font-mono font-bold px-2 py-0.5 rounded">
                                                            1st Visit
                                                        </span>
                                                    )}

                                                    {/* Today / Yesterday Pill Badge */}
                                                    {isToday && (
                                                        <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 text-[9px] font-mono font-bold px-2 py-0.5 rounded animate-pulse">
                                                            Visited Today
                                                        </span>
                                                    )}
                                                    {isYesterday && (
                                                        <span className="bg-blue-950/80 text-blue-300 border border-blue-800/50 text-[9px] font-mono font-bold px-2 py-0.5 rounded">
                                                            Visited Yesterday
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[var(--crm-ink-faint)] font-mono text-[11px]">
                                                    <span className="flex items-center gap-1 text-[var(--crm-heading)]"><FiMail size={11} className="text-teal-400" /> {visitor.email}</span>
                                                    <span className="flex items-center gap-1"><FiPhone size={11} /> {visitor.mobile}</span>
                                                    <span className="flex items-center gap-1"><FiMapPin size={11} /> {visitor.city || 'N/A'}, {visitor.state || 'N/A'}</span>
                                                    <span className="flex items-center gap-1 font-bold text-teal-400">
                                                        <FiCalendar size={11} /> 
                                                        Last Visit: {new Date(latestVisitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                                                {/* Visit History Toggle Button */}
                                                {(Array.isArray(visitor.visitHistory) && visitor.visitHistory.length > 0) && (
                                                    <button
                                                        onClick={() => setExpandedHistoryId(isHistoryExpanded ? null : visitor._id)}
                                                        className="text-amber-400 font-mono text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 bg-amber-950/30 px-2 py-1 border border-amber-800/40 rounded-sm cursor-pointer hover:bg-amber-900/40 transition"
                                                    >
                                                        <FiClock size={11} />
                                                        History ({visitor.visitHistory.length}) 
                                                        <FiChevronDown className={`transition-transform ${isHistoryExpanded ? 'rotate-180' : ''}`} size={11} />
                                                    </button>
                                                )}

                                                {/* Proposals / Orders Toggle Button */}
                                                {visitorProposals.length > 0 && (
                                                    <button
                                                        onClick={() => setExpandedVisitorId(isExpanded ? null : visitor._id)}
                                                        className="text-[var(--crm-positive)] font-mono text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 bg-[var(--crm-bg)] px-2 py-1 border border-[var(--crm-positive-bg)] rounded-sm cursor-pointer"
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

                                        {/* Visit History Timeline Dropdown */}
                                        {isHistoryExpanded && Array.isArray(visitor.visitHistory) && visitor.visitHistory.length > 0 && (
                                            <div className="pt-3 pb-1 border-t border-[var(--crm-ink-soft)]/10 mt-2 space-y-2 text-left bg-[var(--crm-bg)]/40 p-3 rounded">
                                                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                                    <FiClock size={12} /> Detailed Visit Telemetry Logs ({visitor.visitHistory.length} Total Visits):
                                                </div>
                                                <div className="space-y-1.5 font-mono text-[11px]">
                                                    {visitor.visitHistory.slice().reverse().map((vh, idx) => (
                                                        <div key={idx} className="flex flex-wrap items-center justify-between bg-[var(--crm-bg-sunken)] p-2 rounded border border-[var(--crm-ink-soft)]/10 gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[9px] font-bold bg-amber-950 text-amber-300 px-1.5 py-0.5 rounded">
                                                                    Visit #{visitor.visitHistory.length - idx}
                                                                </span>
                                                                <span className="text-[var(--crm-heading)] font-semibold">
                                                                    {new Date(vh.visitedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            <div className="text-[var(--crm-ink-faint)] text-[10px] flex items-center gap-3">
                                                                <span>Mobile: {vh.mobile || visitor.mobile}</span>
                                                                <span>Location: {vh.city || 'N/A'}, {vh.state || 'N/A'}</span>
                                                                <span className="text-teal-400 font-bold">{vh.registrationSource || 'QUICK_GATE'}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Orders / Proposals Dropdown */}
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
