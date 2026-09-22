import React from 'react';
import { FiTrash2 } from 'react-icons/fi';

const STATUS_STYLES = {
    pending: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800',
    approved: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800',
    disapproved: 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
};

export default function ProposalCard({ proposal, onApprove, onDisapprove, onDelete, onClick, showActions = false }) {
    const unit = proposal.division === 'STONE' ? 'MT' : 'Kg';
    const distributorLabel = proposal.distributorId?.company || proposal.distributorId?.name || 'Unknown Distributor';
    const statusKey = String(proposal.status).toLowerCase();

    return (
        <div
            className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--crm-bg-raised)] p-4 border border-[var(--crm-line)] rounded-xl font-sans text-xs ${onClick ? 'cursor-pointer hover:border-cyan-500/40 transition-colors' : ''}`}
            onClick={onClick}
        >
            <div className="space-y-1 text-left">
                <div className="text-[var(--crm-heading)] leading-relaxed">
                    <span className="text-[var(--crm-heading)] font-bold text-sm">{distributorLabel}</span>
                    <span className="text-slate-400 px-1">|</span> Lot Target: <span className="text-[var(--crm-heading)] font-bold">{proposal.lotId} ({proposal.grade})</span>
                    <span className="text-slate-400 px-1">|</span> Volume: <span className="text-emerald-700 dark:text-emerald-400 font-bold">{proposal.quantity?.toLocaleString()} {unit}</span>
                    <span className="text-slate-400 px-1">|</span> Base: <span className="text-[var(--crm-heading)] font-semibold">INR {proposal.basePrice}/{unit}</span>
                    {proposal.paymentTerm && <><span className="text-slate-400 px-1">|</span> Terms: <span className="text-[var(--crm-heading)] font-semibold">{proposal.paymentTerm.replace('_', ' ')}</span></>}
                    <span className="text-slate-400 px-1">|</span> Gross Value: <span className="text-emerald-700 dark:text-emerald-400 font-bold">INR {proposal.estimatedValue?.toLocaleString()}</span>
                </div>
                <div className="text-[var(--crm-ink-faint)] text-[11px] font-medium">
                    {proposal.region} {proposal.createdAt ? `· ${new Date(proposal.createdAt).toLocaleDateString()}` : ''}
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-sans uppercase font-bold tracking-wider border ${STATUS_STYLES[statusKey] || 'text-[var(--crm-heading)] border-[var(--crm-line)]'}`}>
                    {proposal.status}
                </span>
                {showActions && statusKey === 'pending' && (
                    <>
                        <button
                            onClick={() => onDisapprove?.(proposal._id)}
                            className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-400 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wide hover:bg-rose-100 transition-all cursor-pointer text-[10px]"
                        >
                            Disapprove
                        </button>
                        <button
                            onClick={() => onApprove?.(proposal._id)}
                            className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wide hover:bg-emerald-100 transition-all cursor-pointer text-[10px]"
                        >
                            Approve & Issue Invoice
                        </button>
                    </>
                )}
                {onDelete && (
                    <button
                        onClick={() => onDelete(proposal._id)}
                        title="Delete Sourcing Request"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                    >
                        <FiTrash2 size={14} />
                    </button>
                )}
            </div>
        </div>
    );
}

