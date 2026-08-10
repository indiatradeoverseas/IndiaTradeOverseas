import React from 'react';
import { FiTrash2 } from 'react-icons/fi';

const STATUS_STYLES = {
    pending: 'text-[var(--crm-warning)] border-[var(--crm-warning-bg)]',
    approved: 'text-[var(--crm-positive)] border-[var(--crm-positive-bg)]',
    disapproved: 'text-[var(--crm-danger)] border-[var(--crm-danger-bg)]'
};

export default function ProposalCard({ proposal, onApprove, onDisapprove, onDelete, onClick, showActions = false }) {
    const unit = proposal.division === 'STONE' ? 'MT' : 'Kg';
    const distributorLabel = proposal.distributorId?.company || proposal.distributorId?.name || 'Unknown Distributor';
    const statusKey = String(proposal.status).toLowerCase();

    return (
        <div
            className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[var(--crm-bg-sunken)]/80 p-4 border border-[var(--crm-ink-soft)]/10 rounded-sm font-mono text-[11px] ${onClick ? 'cursor-pointer hover:bg-[var(--crm-bg-raised)]/25 transition-colors' : ''}`}
            onClick={onClick}
        >
            <div className="space-y-1 text-left">
                <div className="text-[var(--crm-ink-soft)]">
                    <span className="text-[var(--crm-heading)] font-bold">{distributorLabel}</span>
                    {" | "} Lot Target: <span className="text-white font-bold">{proposal.lotId} ({proposal.grade})</span>
                    {" | "} Volume: <span className="text-[var(--crm-positive)] font-bold">{proposal.quantity?.toLocaleString()} {unit}</span>
                    {" | "} Base: <span className="text-[var(--crm-ink-soft)]">INR {proposal.basePrice}/{unit}</span>
                    {proposal.paymentTerm && <>{" | "} Terms: <span className="text-[var(--crm-ink-soft)]">{proposal.paymentTerm.replace('_', ' ')}</span></>}
                    {" | "} Gross Value: <span className="text-[var(--crm-positive)] font-bold">INR {proposal.estimatedValue?.toLocaleString()}</span>
                </div>
                <div className="text-[var(--crm-ink-faint)] text-[10px]">
                    {proposal.region} {proposal.createdAt ? `· ${new Date(proposal.createdAt).toLocaleDateString()}` : ''}
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-sm text-[10px] font-mono uppercase font-bold tracking-tight bg-[var(--crm-bg)] border ${STATUS_STYLES[statusKey] || 'text-[var(--crm-ink-faint)] border-[var(--crm-ink-soft)]/20'}`}>
                    {proposal.status}
                </span>
                {showActions && statusKey === 'pending' && (
                    <>
                        <button
                            onClick={() => onDisapprove?.(proposal._id)}
                            className="bg-[var(--crm-danger-bg)] border border-[var(--crm-danger-bg)] text-[var(--crm-danger)] px-3 py-1.5 rounded-sm font-bold uppercase tracking-wide hover:bg-[var(--crm-danger-bg)] transition-all cursor-pointer text-[10px]"
                        >
                            Disapprove
                        </button>
                        <button
                            onClick={() => onApprove?.(proposal._id)}
                            className="bg-[var(--crm-positive-bg)] border border-[var(--crm-positive-bg)] text-[var(--crm-positive)] px-3 py-1.5 rounded-sm font-bold uppercase tracking-wide hover:bg-[var(--crm-positive-bg)] transition-all cursor-pointer text-[10px]"
                        >
                            Approve & Issue Invoice
                        </button>
                    </>
                )}
                {onDelete && (
                    <button
                        onClick={() => onDelete(proposal._id)}
                        title="Delete Sourcing Request"
                        className="p-1.5 text-[var(--crm-ink-faint)] hover:text-[var(--crm-danger)] rounded-sm transition-all cursor-pointer"
                    >
                        <FiTrash2 size={13} />
                    </button>
                )}
            </div>
        </div>
    );
}
