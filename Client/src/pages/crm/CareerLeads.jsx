import React, { useState, useEffect } from 'react';
import {
    FiUser, FiMail, FiPhone, FiCalendar, FiSearch, FiCheckCircle, FiUserPlus
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { careersApi } from '../../api/careers';

export default function CareerLeads() {
    const [leads, setLeads] = useState([]);
    const [applications, setApplications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [leadsRes, appsRes] = await Promise.all([
                    careersApi.getGateLeads(),
                    careersApi.getApplications()
                ]);

                if (leadsRes && leadsRes.success) {
                    setLeads(leadsRes.data?.leads || []);
                }
                if (appsRes && appsRes.success) {
                    setApplications(appsRes.data?.applications || []);
                }
            } catch (err) {
                console.error('Failed to fetch career gate leads:', err);
                toast.error('Failed to load career gate leads.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredLeads = leads
        .filter(lead =>
            lead.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            lead.phone?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const applicationsByEmail = applications.reduce((acc, app) => {
        const key = app.email?.toLowerCase();
        if (!key) return acc;
        if (!acc[key]) acc[key] = [];
        acc[key].push(app);
        return acc;
    }, {});

    const appliedCount = leads.filter(lead => applicationsByEmail[lead.email?.toLowerCase()]?.length).length;

    return (
        <div className="min-h-screen bg-[var(--crm-bg-sunken)] font-sans antialiased text-[var(--crm-ink-soft)] p-4 sm:p-8 pt-24">
            <div className="max-w-7xl mx-auto space-y-6">

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--crm-ink-soft)]/10 pb-5">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[var(--crm-ink-faint)] font-mono text-[9px] uppercase font-bold tracking-[0.2em]">
                            CAREERS GATE TELEMETRY
                        </div>
                        <h1 className="text-3xl font-serif text-[var(--crm-heading)] uppercase tracking-wide font-normal">
                            Career Leads
                        </h1>
                        <p className="text-xs text-[var(--crm-ink-faint)] font-light mt-1">
                            Everyone who filled the entry form on the Careers page — whether or not they went on to submit a job application.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 font-mono text-xs">
                        <div className="bg-[var(--crm-bg)]/40 px-4 py-2.5 rounded-sm border border-[var(--crm-ink-soft)]/10 text-center">
                            <span className="block text-[var(--crm-ink-faint)] font-bold uppercase tracking-wider text-[9px]">Total Leads</span>
                            <span className="text-lg font-bold text-[var(--crm-heading)]">{leads.length}</span>
                        </div>
                        <div className="bg-[var(--crm-bg)]/40 px-4 py-2.5 rounded-sm border border-[var(--crm-ink-soft)]/10 text-center">
                            <span className="block text-[var(--crm-ink-faint)] font-bold uppercase tracking-wider text-[9px]">Went On To Apply</span>
                            <span className="text-lg font-bold text-[var(--crm-positive)]">{appliedCount}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-[var(--crm-bg)]/20 border border-[var(--crm-ink-soft)]/10 rounded-sm p-4">
                    <div className="relative w-full md:w-96">
                        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--crm-ink-faint)] text-sm" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or phone..."
                            className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/10 pl-10 pr-4 py-2 rounded-sm text-xs text-[var(--crm-heading)] placeholder-[var(--crm-ink-faint)] focus:outline-none focus:border-[var(--crm-ink-soft)]/30 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/10 rounded-sm overflow-hidden shadow-inner overflow-x-auto">
                    {isLoading ? (
                        <div className="p-12 text-center font-mono text-xs text-[var(--crm-ink-faint)] animate-pulse">
                            Auditing gate submissions...
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-[var(--crm-bg)]/60 text-[var(--crm-ink-faint)] border-b border-[var(--crm-ink-soft)]/10 font-mono uppercase tracking-wider text-[10px]">
                                    <th className="p-4 font-normal">Candidate</th>
                                    <th className="p-4 font-normal">Contact</th>
                                    <th className="p-4 font-normal">Gate Submitted</th>
                                    <th className="p-4 font-normal text-center">Application Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--crm-ink-soft)]/10 text-[var(--crm-ink-soft)]">
                                {filteredLeads.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="p-8 text-center text-[var(--crm-ink-faint)] font-light italic">
                                            No career gate submissions matched the search criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLeads.map((lead) => {
                                        const leadApplications = applicationsByEmail[lead.email?.toLowerCase()] || [];
                                        const hasApplied = leadApplications.length > 0;

                                        return (
                                            <tr key={lead._id} className="hover:bg-[var(--crm-bg-raised)]/25 transition-colors border-b border-[var(--crm-ink-soft)]/10">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2 font-bold text-[var(--crm-heading)] uppercase tracking-wide">
                                                        <FiUser size={12} /> {lead.fullName}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[var(--crm-ink-faint)] font-mono text-[11px]">
                                                        <span className="flex items-center gap-1"><FiMail size={11} /> {lead.email}</span>
                                                        <span className="flex items-center gap-1"><FiPhone size={11} /> {lead.phone}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 font-mono text-[var(--crm-ink-faint)]">
                                                    <span className="flex items-center gap-1"><FiCalendar size={11} /> {new Date(lead.createdAt).toLocaleDateString()}</span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    {hasApplied ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-sm text-[10px] font-mono uppercase font-bold tracking-tight bg-[var(--crm-bg)] border text-[var(--crm-positive)] border-[var(--crm-positive-bg)]">
                                                            <FiCheckCircle size={11} /> Applied ({leadApplications.map(a => a.position).join(', ')})
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-sm text-[10px] font-mono uppercase font-bold tracking-tight bg-[var(--crm-bg)] border text-[var(--crm-ink-faint)] border-[var(--crm-ink-soft)]/20">
                                                            <FiUserPlus size={11} /> Not Applied Yet
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
