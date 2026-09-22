import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { distributorApi } from '../../api/distributor';
import { softLeadsApi } from '../../api/leads';
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
    const [softLeads, setSoftLeads] = useState([]);
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
            const [distRes, propRes, softRes] = await Promise.all([
                distributorApi.getDistributors(),
                distributorApi.getActiveProposalsAdmin(),
                softLeadsApi.listSoftLeads({ division, limit: 500 })
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
            if (softRes && softRes.success) {
                setSoftLeads(softRes.data?.leads || softRes.leads || []);
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

    // Merge soft lead data (phone, requirement) into visitors by distributorId
    const mergedVisitors = filteredVisitors.map(visitor => {
        const soft = softLeads.find(sl => sl.distributorId && sl.distributorId === visitor._id);
        if (!soft) return visitor;
        return {
            ...visitor,
            // Prefer soft lead phone if visitor mobile is placeholder
            mobile: (visitor.mobile === '0000000000' || !visitor.mobile) && soft.phone ? soft.phone : visitor.mobile,
            // Attach soft lead requirement summary without duplicating existing fields
            softLead: {
                product: soft.product,
                quantity: soft.quantity,
                quantityUnit: soft.quantityUnit,
                destination: soft.destination,
                timeline: soft.timeline,
                leadId: soft.leadId,
                createdAt: soft.createdAt,
            }
        };
    });

    return (
        <div className="min-h-screen font-sans antialiased p-4 sm:p-6 lg:p-8" style={{ background: 'var(--crm-bg)', color: 'var(--crm-ink-soft)' }}>
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header Title Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--crm-line)' }}>
                    <div className="space-y-1 text-left">
                        <div className="flex items-center gap-2 font-mono text-xs uppercase font-extrabold tracking-widest" style={{ color: 'var(--crm-accent)' }}>
                            <FiLayers size={14} /> BUYER GATE TELEMETRY & REPEAT VISIT LOGS
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold font-sans uppercase tracking-tight flex items-center gap-3" style={{ color: 'var(--crm-heading)' }}>
                            {meta.title}
                            <span className="text-xs font-sans font-bold normal-case px-3 py-1 rounded-full border" style={{ background: 'var(--crm-accent-bg)', color: 'var(--crm-accent)', borderColor: 'var(--crm-accent)' }}>
                                {meta.badge}
                            </span>
                        </h1>
                        <p className="text-xs mt-1 font-medium" style={{ color: 'var(--crm-ink-faint)' }}>
                            Tracks everyone who submitted or re-submitted the entry gate form on <span className="font-bold" style={{ color: 'var(--crm-heading)' }}>{meta.badge}</span> with date & time timestamps.
                        </p>
                    </div>

                    {/* Quick Stat Pill Cards */}
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2.5 rounded-xl border text-center shadow-xs min-w-[105px]" style={{ background: 'var(--crm-bg-raised)', borderColor: 'var(--crm-line)' }}>
                            <span className="block font-bold uppercase tracking-wider text-[10px] mb-0.5" style={{ color: 'var(--crm-ink-faint)' }}>Total Visitors</span>
                            <span className="text-2xl font-extrabold" style={{ color: 'var(--crm-heading)' }}>{divisionVisitors.length}</span>
                        </div>
                        <div className="px-4 py-2.5 rounded-xl border text-center shadow-xs min-w-[105px]" style={{ background: 'var(--crm-positive-bg)', borderColor: 'var(--crm-positive)' }}>
                            <span className="block font-bold uppercase tracking-wider text-[10px] mb-0.5" style={{ color: 'var(--crm-positive)' }}>Visited Today</span>
                            <span className="text-2xl font-extrabold" style={{ color: 'var(--crm-positive)' }}>{todayCount}</span>
                        </div>
                        <div className="px-4 py-2.5 rounded-xl border text-center shadow-xs min-w-[105px]" style={{ background: 'var(--crm-info-bg)', borderColor: 'var(--crm-info)' }}>
                            <span className="block font-bold uppercase tracking-wider text-[10px] mb-0.5" style={{ color: 'var(--crm-info)' }}>Repeat Buyers</span>
                            <span className="text-2xl font-extrabold" style={{ color: 'var(--crm-info)' }}>{repeatVisitorsCount}</span>
                        </div>
                    </div>
                </div>

                {/* Calendar Date Filter Bar */}
                <div className="p-4 rounded-xl border shadow-xs text-xs flex flex-wrap justify-between items-center gap-3" style={{ background: 'var(--crm-bg-raised)', borderColor: 'var(--crm-line)' }}>
                    <div className="flex items-center gap-2 font-extrabold" style={{ color: 'var(--crm-heading)' }}>
                        <FiCalendar size={16} style={{ color: 'var(--crm-accent)' }} />
                        <span className="text-xs uppercase tracking-wider font-sans">Date & Calendar Filter:</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 font-sans">
                        <button
                            onClick={() => { setDateFilterMode('ALL'); setSelectedDate(''); }}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all cursor-pointer border"
                            style={dateFilterMode === 'ALL'
                                ? { background: 'var(--crm-accent)', color: 'var(--crm-bg)', borderColor: 'var(--crm-accent)' }
                                : { background: 'var(--crm-bg-sunken)', color: 'var(--crm-ink-soft)', borderColor: 'var(--crm-line)' }}
                        >
                            All Dates
                        </button>
                        <button
                            onClick={() => { setDateFilterMode('TODAY'); setSelectedDate(''); }}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all cursor-pointer border"
                            style={dateFilterMode === 'TODAY'
                                ? { background: 'var(--crm-accent)', color: 'var(--crm-bg)', borderColor: 'var(--crm-accent)' }
                                : { background: 'var(--crm-bg-sunken)', color: 'var(--crm-ink-soft)', borderColor: 'var(--crm-line)' }}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => { setDateFilterMode('YESTERDAY'); setSelectedDate(''); }}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all cursor-pointer border"
                            style={dateFilterMode === 'YESTERDAY'
                                ? { background: 'var(--crm-accent)', color: 'var(--crm-bg)', borderColor: 'var(--crm-accent)' }
                                : { background: 'var(--crm-bg-sunken)', color: 'var(--crm-ink-soft)', borderColor: 'var(--crm-line)' }}
                        >
                            Yesterday
                        </button>

                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border" style={{ background: 'var(--crm-bg-sunken)', borderColor: 'var(--crm-line)' }}>
                            <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--crm-ink-faint)' }}>Pick Date:</span>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => {
                                    setSelectedDate(e.target.value);
                                    setDateFilterMode(e.target.value ? 'PICK_DATE' : 'ALL');
                                }}
                                className="bg-transparent font-bold text-xs outline-none cursor-pointer font-sans"
                                style={{ color: 'var(--crm-heading)' }}
                            />
                        </div>

                        {dateFilterMode !== 'ALL' && (
                            <button
                                onClick={() => { setDateFilterMode('ALL'); setSelectedDate(''); }}
                                className="text-xs uppercase font-extrabold underline ml-1 cursor-pointer transition-colors"
                                style={{ color: 'var(--crm-danger)' }}
                            >
                                Clear Filter
                            </button>
                        )}
                    </div>

                    <div className="text-xs font-bold font-sans" style={{ color: 'var(--crm-ink-faint)' }}>
                        Showing: <strong className="font-extrabold" style={{ color: 'var(--crm-accent)' }}>{dateFilterMode === 'ALL' ? 'All Time' : dateFilterMode === 'TODAY' ? 'Today' : dateFilterMode === 'YESTERDAY' ? 'Yesterday' : selectedDate}</strong> 
                        &nbsp;&bull;&nbsp; (<span className="font-extrabold" style={{ color: 'var(--crm-heading)' }}>{filteredVisitors.length}</span> Visitors Matched)
                    </div>
                </div>

                {/* Search Bar & Division Controls */}
                <div className="rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between border shadow-xs" style={{ background: 'var(--crm-bg-raised)', borderColor: 'var(--crm-line)' }}>
                    <div className="relative w-full md:w-96">
                        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--crm-ink-faint)' }} />
                        <input
                            type="text"
                            placeholder="Search by name, email, mobile, city, or state..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-semibold outline-none transition-all border"
                            style={{ background: 'var(--crm-bg-sunken)', borderColor: 'var(--crm-line)', color: 'var(--crm-heading)' }}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                        <button 
                            onClick={fetchData}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-bold transition cursor-pointer shadow-xs"
                            style={{ background: 'var(--crm-bg-sunken)', borderColor: 'var(--crm-line)', color: 'var(--crm-heading)' }}
                        >
                            <FiRefreshCw size={12} className={`${isLoading ? 'animate-spin' : ''}`} style={{ color: 'var(--crm-accent)' }} /> Refresh
                        </button>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border text-xs shrink-0" style={{ background: 'var(--crm-bg-sunken)', borderColor: 'var(--crm-line)' }}>
                            <FiLayers size={14} style={{ color: 'var(--crm-accent)' }} />
                            <span className="text-[10px] uppercase font-bold" style={{ color: 'var(--crm-ink-faint)' }}>Sector:</span>
                            <span className="font-extrabold uppercase" style={{ color: 'var(--crm-heading)' }}>{meta.badge}</span>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="p-12 text-center font-sans text-xs font-bold text-slate-600 dark:text-slate-400 animate-pulse">
                        Auditing gate submissions and visit telemetry logs...
                    </div>
                ) : (
                    <div className="space-y-4">
                        <DivisionSection
                            title={meta.title}
                            count={mergedVisitors.length}
                            emptyLabel="No visitor gate submissions found for this filter criteria."
                        >
                            {mergedVisitors.map((visitor) => {
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
                                        className="rounded-xl p-4 sm:p-5 space-y-3.5 transition-all shadow-xs border"
                                        style={{ background: 'var(--crm-bg-raised)', borderColor: 'var(--crm-line)' }}
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="space-y-2 text-left flex-1 min-w-0">
                                                {/* Top row with name and status badges */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className="p-2 rounded-lg border flex-shrink-0" style={{ background: 'var(--crm-accent-bg)', borderColor: 'var(--crm-line)', color: 'var(--crm-accent)' }}>
                                                        <FiUser size={16} />
                                                    </div>
                                                    <h4 className="text-base font-extrabold uppercase tracking-wide truncate" style={{ color: 'var(--crm-heading)' }}>
                                                        {visitor.name}
                                                    </h4>

                                                    {/* Repeat Visitor / First Visit Badge */}
                                                    {visitCount > 1 ? (
                                                        <span className="text-xs font-sans font-extrabold px-3 py-1 rounded-full flex items-center gap-1 border" style={{ background: 'var(--crm-accent-bg)', borderColor: 'var(--crm-line)', color: 'var(--crm-heading)' }}>
                                                            <FiRepeat size={12} style={{ color: 'var(--crm-accent)' }} /> Repeat Visitor ({visitCount} Visits)
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs font-sans font-extrabold px-3 py-1 rounded-full border" style={{ background: 'var(--crm-bg-sunken)', borderColor: 'var(--crm-line)', color: 'var(--crm-heading)' }}>
                                                            1st Visit
                                                        </span>
                                                    )}

                                                    {/* Today / Yesterday Badge */}
                                                    {isToday && (
                                                        <span className="text-xs font-sans font-extrabold px-3 py-1 rounded-full flex items-center gap-1 border animate-pulse" style={{ background: 'var(--crm-positive-bg)', borderColor: 'var(--crm-line)', color: 'var(--crm-heading)' }}>
                                                            <FiCheckCircle size={12} style={{ color: 'var(--crm-positive)' }} /> Visited Today
                                                        </span>
                                                    )}
                                                    {isYesterday && (
                                                        <span className="text-xs font-sans font-extrabold px-3 py-1 rounded-full border" style={{ background: 'var(--crm-info-bg)', borderColor: 'var(--crm-line)', color: 'var(--crm-heading)' }}>
                                                            Visited Yesterday
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Details row: Email, Mobile, Location, Last Visit */}
                                                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-sans pt-1">
                                                    <span className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--crm-heading)' }}>
                                                        <FiMail size={13} className="shrink-0" style={{ color: 'var(--crm-accent)' }} />
                                                        <span className="truncate">{visitor.email || 'No email provided'}</span>
                                                    </span>
                                                    <span className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--crm-heading)' }}>
                                                        <FiPhone size={13} className="shrink-0" style={{ color: 'var(--crm-ink-faint)' }} />
                                                        <span>{visitor.mobile || 'N/A'}</span>
                                                    </span>
                                                    <span className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--crm-heading)' }}>
                                                        <FiMapPin size={13} className="shrink-0" style={{ color: 'var(--crm-ink-faint)' }} />
                                                        <span>{visitor.city || 'N/A'}{visitor.state ? `, ${visitor.state}` : ''}</span>
                                                    </span>
                                                    <span className="flex items-center gap-1.5 font-extrabold px-2.5 py-1 rounded border" style={{ background: 'var(--crm-bg-sunken)', borderColor: 'var(--crm-line)', color: 'var(--crm-heading)' }}>
                                                        <FiCalendar size={13} className="shrink-0" style={{ color: 'var(--crm-accent)' }} />
                                                        <span>Last Visit: {new Date(latestVisitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Action buttons on the right */}
                                            <div className="flex items-center gap-2 flex-wrap shrink-0">
                                                {/* History Toggle Button */}
                                                {(Array.isArray(visitor.visitHistory) && visitor.visitHistory.length > 0) && (
                                                    <button
                                                        onClick={() => setExpandedHistoryId(isHistoryExpanded ? null : visitor._id)}
                                                        className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 border transition cursor-pointer shadow-xs"
                                                        style={{ background: 'var(--crm-info-bg)', borderColor: 'var(--crm-line)', color: 'var(--crm-heading)' }}
                                                    >
                                                        <FiClock size={13} style={{ color: 'var(--crm-info)' }} />
                                                        History ({visitor.visitHistory.length})
                                                        <FiChevronDown className={`transition-transform duration-200 ${isHistoryExpanded ? 'rotate-180' : ''}`} size={13} />
                                                    </button>
                                                )}

                                                {/* Orders Toggle Button */}
                                                {visitorProposals.length > 0 && (
                                                    <button
                                                        onClick={() => setExpandedVisitorId(isExpanded ? null : visitor._id)}
                                                        className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5 border transition cursor-pointer shadow-xs"
                                                        style={{ background: 'var(--crm-positive-bg)', borderColor: 'var(--crm-line)', color: 'var(--crm-heading)' }}
                                                    >
                                                        Orders ({visitorProposals.length})
                                                        <FiChevronDown className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} size={13} />
                                                    </button>
                                                )}

                                                {/* Delete button */}
                                                <button
                                                    onClick={() => handleDeleteVisitor(visitor._id)}
                                                    title="Delete Visitor Record"
                                                    className="p-2 border rounded-lg transition-all cursor-pointer"
                                                    style={{ color: 'var(--crm-danger)', borderColor: 'var(--crm-line)', background: 'var(--crm-bg-sunken)' }}
                                                >
                                                    <FiTrash2 size={15} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Expanded History Timeline Panel */}
                                        {isHistoryExpanded && Array.isArray(visitor.visitHistory) && visitor.visitHistory.length > 0 && (
                                            <div className="pt-3 border-t mt-3 space-y-2.5 text-left p-4 rounded-xl" style={{ background: 'var(--crm-bg-sunken)', borderColor: 'var(--crm-line)' }}>
                                                <div className="text-xs font-sans font-extrabold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--crm-heading)' }}>
                                                    <FiClock size={14} style={{ color: 'var(--crm-accent)' }} /> Detailed Visit Telemetry Logs ({visitor.visitHistory.length} Total Visits):
                                                </div>
                                                <div className="space-y-2 font-sans text-xs">
                                                    {visitor.visitHistory.slice().reverse().map((vh, idx) => (
                                                        <div key={idx} className="flex flex-wrap items-center justify-between p-3 rounded-lg border gap-2" style={{ background: 'var(--crm-bg-raised)', borderColor: 'var(--crm-line)' }}>
                                                            <div className="flex items-center gap-2.5">
                                                                <span className="text-xs font-extrabold px-2.5 py-1 rounded-md border" style={{ background: 'var(--crm-accent-bg)', borderColor: 'var(--crm-line)', color: 'var(--crm-heading)' }}>
                                                                    Visit #{visitor.visitHistory.length - idx}
                                                                </span>
                                                                <span className="font-extrabold" style={{ color: 'var(--crm-heading)' }}>
                                                                    {new Date(vh.visitedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs font-bold flex flex-wrap items-center gap-4" style={{ color: 'var(--crm-heading)' }}>
                                                                <span>Mobile: <strong style={{ color: 'var(--crm-heading)' }}>{vh.mobile || visitor.mobile}</strong></span>
                                                                <span>Location: <strong style={{ color: 'var(--crm-heading)' }}>{vh.city || 'N/A'}, {vh.state || 'N/A'}</strong></span>
                                                                <span className="font-extrabold px-2 py-0.5 rounded border text-[10px]" style={{ background: 'var(--crm-bg-sunken)', borderColor: 'var(--crm-line)', color: 'var(--crm-heading)' }}>
                                                                    {vh.registrationSource || 'QUICK_GATE'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Expanded Orders Panel */}
                                        {isExpanded && visitorProposals.length > 0 && (
                                            <div className="pt-3 space-y-2.5 border-t mt-3" style={{ borderColor: 'var(--crm-line)' }}>
                                                {visitorProposals.map((proposal) => (
                                                    <ProposalCard key={proposal._id} proposal={proposal} showActions={false} />
                                                ))}
                                            </div>
                                        )}

                                        {/* Soft Lead Details Dropdown */}
                                        {isExpanded && visitor.softLead && (
                                            <div className="pt-2 space-y-2 border-t border-[var(--crm-ink-soft)]/10 mt-2 bg-[var(--crm-bg)]/40 p-3 rounded">
                                                <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                                                    <FiCheckCircle size={12} /> Soft Lead Enquiry Details:
                                                </div>
                                                <div className="space-y-1 font-mono text-[11px] text-[var(--crm-ink-soft)]">
                                                    <div><strong>Product:</strong> {visitor.softLead.product}</div>
                                                    <div><strong>Quantity:</strong> {visitor.softLead.quantity} {visitor.softLead.quantityUnit || ''}</div>
                                                    <div><strong>Destination:</strong> {visitor.softLead.destination}</div>
                                                    <div><strong>Timeline:</strong> {visitor.softLead.timeline}</div>
                                                    <div><strong>Lead ID:</strong> {visitor.softLead.leadId}</div>
                                                    <div><strong>Created:</strong> {new Date(visitor.softLead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                                </div>
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

