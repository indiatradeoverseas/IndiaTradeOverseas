import React, { useState, useEffect } from 'react';
import { distributorApi } from '../../api/distributor';
import { adminApi } from '../../api/admin';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiSearch, FiFilter, FiLayers, FiDownload, FiXCircle,
    FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiShield, FiCreditCard
} from 'react-icons/fi';
import { DownloadButton } from '../../components/ui/AnimatedActionButton';

export default function ITOAdsOrders() {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedOrder, setSelectedOrder] = useState(null);

    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const res = await distributorApi.getAllItoAdsOrders?.() || { success: false };
            // If API not exposed via distributorApi, fallback to adminApi
            if (!res.success) {
                const adminRes = await adminApi.getItoAdsOrders?.();
                if (adminRes?.success) setOrders(adminRes.data || []);
            } else {
                setOrders(res.data || []);
            }
        } catch (err) {
            console.error("Failed to fetch ITO Ads orders:", err);
            toast.error("Failed to fetch ITO Ads orders.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleUpdateStatus = async (orderId, status) => {
        try {
            const res = await adminApi.updateItoAdsOrderStatus?.(orderId, status);
            if (res?.success) {
                toast.success('Status updated.');
                fetchOrders();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update status.');
        }
    };

    const handleDeleteOrder = async (orderId) => {
        if (!window.confirm('Permanently delete this order?')) return;
        try {
            const res = await adminApi.deleteItoAdsOrder?.(orderId);
            if (res?.success) {
                toast.success('Order deleted.');
                if (selectedOrder?._id === orderId) setSelectedOrder(null);
                fetchOrders();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete order.');
        }
    };

    const filteredOrders = orders.filter(o => {
        const label = `${o.name || ''} ${o.company || ''} ${o.plan || ''}`.toLowerCase();
        const matchesSearch = label.includes(searchQuery.toLowerCase()) ||
            o.razorpayOrderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            o.razorpayPaymentId?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' ? true : o.status === statusFilter.toLowerCase();
        return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const handleExport = async () => {
        try {
            const csv = "data:text/csv;charset=utf-8," +
                ["Name,Email,Phone,Company,Plan,Amount,Status,Razorpay Order ID,Razorpay Payment ID,Date"]
                .concat(filteredOrders.map(o =>
                    `"${o.name}","${o.email}","${o.phone}","${o.company||''}","${o.plan}","${o.amount}","${o.status}","${o.razorpayOrderId||''}","${o.razorpayPaymentId||''}","${o.createdAt ? new Date(o.createdAt).toLocaleString() : ''}"`
                )).join("\n");
            const link = document.createElement('a');
            link.href = encodeURI(csv);
            link.download = `ITOAds_Orders_${Date.now()}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Exported successfully!');
        } catch (e) {
            toast.error('Export failed.');
        }
    };

    return (
        <div className="min-h-screen bg-[var(--crm-bg-sunken)] font-sans antialiased text-[var(--crm-ink-soft)] p-4 sm:p-8 pt-24">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--crm-ink-soft)]/10 pb-5">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[var(--crm-ink-faint)] font-mono text-[9px] uppercase font-bold tracking-[0.2em]">
                            ITO ADS FLEET TELEMETRY
                        </div>
                        <h1 className="text-3xl font-serif text-[var(--crm-heading)] uppercase tracking-wide font-normal">
                            ITO Ads Orders
                        </h1>
                        <p className="text-xs text-[var(--crm-ink-faint)] font-light mt-1">
                            Service-fee orders from ITO Ads checkout.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2 font-mono text-xs">
                        <DownloadButton
                            action={handleExport}
                            className="bg-[var(--crm-bg-sunken)] text-[var(--crm-ink-soft)] border border-[var(--crm-ink-soft)]/20 text-[11px] uppercase tracking-widest font-semibold px-4 py-2.5 rounded-sm transition-all hover:bg-[var(--crm-bg-raised)] cursor-pointer disabled:cursor-default"
                            icon={FiDownload}
                            iconSize={13}
                            idleLabel="Export"
                            busyLabel="Exporting..."
                            doneLabel="Exported"
                        />
                        <div className="bg-[var(--crm-bg)]/40 px-4 py-2.5 rounded-sm border border-[var(--crm-ink-soft)]/10 text-center">
                            <span className="block text-[var(--crm-ink-faint)] font-bold uppercase tracking-wider text-[9px]">Total Orders</span>
                            <span className="text-lg font-bold text-[var(--crm-heading)]">{orders.length}</span>
                        </div>
                        <div className="bg-[var(--crm-bg)]/40 px-4 py-2.5 rounded-sm border border-[var(--crm-ink-soft)]/10 text-center">
                            <span className="block text-[var(--crm-ink-faint)] font-bold uppercase tracking-wider text-[9px]">Paid</span>
                            <span className="text-lg font-bold text-[var(--crm-positive)]">{orders.filter(o=>o.status==='paid').length}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-[var(--crm-bg)]/20 border border-[var(--crm-ink-soft)]/10 rounded-sm p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--crm-ink-faint)] text-sm" />
                        <input
                            type="text"
                            placeholder="Search by name, company, plan, order ID..."
                            className="w-full bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/10 pl-10 pr-4 py-2 rounded-sm text-xs text-[var(--crm-heading)] placeholder-[var(--crm-ink-faint)] focus:outline-none focus:border-[var(--crm-ink-soft)]/30 transition-all"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap w-full md:w-auto items-center gap-2 justify-end text-xs font-mono">
                        <div className="flex items-center gap-1.5 bg-[var(--crm-bg-sunken)] px-3 py-1.5 rounded-sm border border-[var(--crm-ink-soft)]/10">
                            <FiFilter className="text-[var(--crm-ink-faint)]" />
                            <span className="text-[10px] text-[var(--crm-ink-faint)] uppercase font-bold">Status:</span>
                            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="bg-transparent font-bold text-[var(--crm-ink-soft)] focus:outline-none cursor-pointer">
                                <option value="ALL" className="bg-[var(--crm-bg-sunken)]">All</option>
                                <option value="PAID" className="bg-[var(--crm-bg-sunken)]">Paid</option>
                                <option value="PENDING" className="bg-[var(--crm-bg-sunken)]">Pending</option>
                                <option value="FAILED" className="bg-[var(--crm-bg-sunken)]">Failed</option>
                                <option value="REFUNDED" className="bg-[var(--crm-bg-sunken)]">Refunded</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/10 rounded-sm overflow-hidden">
                    {isLoading ? (
                        <div className="p-12 text-center font-mono text-xs text-[var(--crm-ink-faint)] animate-pulse">Loading orders…</div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="p-8 text-center text-[var(--crm-ink-faint)] font-light italic text-xs">No orders match the current filters.</div>
                    ) : (
                        <div className="p-4 space-y-3">
                            {filteredOrders.map(order => (
                                <motion.div
                                    key={order._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/10 rounded-sm p-4 hover:border-[#F2580E]/40 transition-colors cursor-pointer"
                                    onClick={() => setSelectedOrder(order)}
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-[#F2580E]/15 flex items-center justify-center">
                                                <FiCreditCard className="text-[#F2580E]" size={18} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-[var(--crm-heading)]">{order.name}</p>
                                                <p className="text-[var(--crm-ink-faint)]">{order.company || '—'} • {order.plan}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-right md:text-left">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-[var(--crm-ink-faint)]">Amount</p>
                                                <p className="font-bold text-[var(--crm-positive)]">₹{order.amount?.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-[var(--crm-ink-faint)]">Status</p>
                                                <span className={`inline-flex px-2 py-0.5 rounded-sm text-[10px] font-mono uppercase font-bold ${order.status==='paid'?'text-[var(--crm-positive)] bg-[var(--crm-positive-bg)]':'text-[var(--crm-warning)] bg-[var(--crm-warning-bg)]'}`}>
                                                    {order.status}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-[var(--crm-ink-faint)]">Date</p>
                                                <p className="font-mono text-[var(--crm-heading)]">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {selectedOrder && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
                        onClick={() => setSelectedOrder(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.98 }}
                            className="w-full max-w-lg bg-[var(--crm-bg)] border border-[var(--crm-ink-soft)]/10 rounded-sm shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="bg-[var(--crm-bg)]/80 p-4 text-[var(--crm-heading)] flex justify-between items-start border-b border-[var(--crm-ink-soft)]/10">
                                <div>
                                    <div className="text-[9px] font-mono text-[var(--crm-ink-faint)] uppercase font-bold tracking-widest">Order Detail</div>
                                    <h3 className="font-serif text-base uppercase font-normal">{selectedOrder.plan} • ₹{selectedOrder.amount?.toLocaleString()}</h3>
                                </div>
                                <button onClick={() => setSelectedOrder(null)} className="p-1 text-[var(--crm-ink-faint)] hover:text-[var(--crm-heading)] rounded-sm transition-colors cursor-pointer"><FiXCircle size={16} /></button>
                            </div>

                            <div className="p-5 space-y-5 overflow-y-auto text-xs text-left custom-scrollbar">
                                <div className="space-y-2.5 bg-[var(--crm-bg-sunken)]/60 p-3 rounded-sm border border-[var(--crm-ink-soft)]/5">
                                    <h4 className="font-mono text-[9px] text-[var(--crm-ink-faint)] uppercase font-bold tracking-wider border-b border-[var(--crm-ink-soft)]/10 pb-1">Customer</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[var(--crm-ink-soft)] font-mono">
                                        <div><span>Name:</span> <span className="text-[var(--crm-heading)] font-bold">{selectedOrder.name}</span></div>
                                        <div><span>Email:</span> <a href={`mailto:${selectedOrder.email}`} className="text-[var(--crm-positive)] underline">{selectedOrder.email}</a></div>
                                        <div><span>Phone:</span> <span className="text-[var(--crm-heading)]">{selectedOrder.phone}</span></div>
                                        <div><span>Company:</span> <span className="text-[var(--crm-heading)]">{selectedOrder.company || '—'}</span></div>
                                        <div className="sm:col-span-2"><span>Billing Address:</span> <span className="text-[var(--crm-heading)]">{selectedOrder.billingAddress || '—'}</span></div>
                                        <div className="sm:col-span-2"><span>State:</span> <span className="text-[var(--crm-heading)]">{selectedOrder.billingState || '—'}</span></div>
                                        <div className="sm:col-span-2"><span>GSTIN:</span> <span className="text-[var(--crm-heading)]">{selectedOrder.gstin || '—'}</span></div>
                                    </div>
                                </div>

                                <div className="space-y-2.5 bg-[var(--crm-bg-sunken)]/60 p-3 rounded-sm border border-[var(--crm-ink-soft)]/5">
                                    <h4 className="font-mono text-[9px] text-[var(--crm-ink-faint)] uppercase font-bold tracking-wider border-b border-[var(--crm-ink-soft)]/10 pb-1">Order</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[var(--crm-ink-soft)] font-mono">
                                        <div><span>Plan:</span> <span className="text-[var(--crm-heading)] font-bold">{selectedOrder.plan}</span></div>
                                        <div><span>Amount:</span> <span className="text-[var(--crm-positive)] font-bold">₹{selectedOrder.amount?.toLocaleString()}</span></div>
                                        <div><span>Currency:</span> <span className="text-[var(--crm-heading)]">{selectedOrder.currency}</span></div>
                                        <div><span>Status:</span> <span className={`text-[var(--crm-heading)] font-bold uppercase ${selectedOrder.status==='paid'?'text-[var(--crm-positive)]':''}`}>{selectedOrder.status}</span></div>
                                        <div><span>Razorpay Order ID:</span> <span className="font-mono text-[var(--crm-heading)]">{selectedOrder.razorpayOrderId || '—'}</span></div>
                                        <div><span>Razorpay Payment ID:</span> <span className="font-mono text-[var(--crm-heading)]">{selectedOrder.razorpayPaymentId || '—'}</span></div>
                                        <div className="sm:col-span-2"><span>Created:</span> <span className="text-[var(--crm-heading)]">{selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : '—'}</span></div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={()=>handleUpdateStatus(selectedOrder._id,'paid')} className="flex-1 py-2 rounded-sm bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/10 text-xs font-mono uppercase tracking-wider text-[var(--crm-ink-soft)] hover:bg-[var(--crm-bg-raised)]">Mark Paid</button>
                                    <button onClick={()=>handleDeleteOrder(selectedOrder._id)} className="flex-1 py-2 rounded-sm bg-[var(--crm-bg-sunken)] border border-[var(--crm-ink-soft)]/10 text-xs font-mono uppercase tracking-wider text-[var(--crm-warning)] hover:bg-[var(--crm-warning-bg)]">Delete</button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}