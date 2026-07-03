import React, { useState, useEffect } from 'react';
import {
  FiPlus,
  FiDollarSign,
  FiCheckCircle,
  FiAlertCircle,
  FiSend,
  FiUpload,
  FiLock,
  FiCalendar,
  FiRefreshCw,
  FiFileText
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { paymentsApi } from '../../api/payments';
import { leadsApi } from '../../api/leads';
import { useAuth } from '../../hooks/useAuth';
import axiosInstance from '../../api/axiosInstance';

export default function Payments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showOutstandingOnly, setShowOutstandingOnly] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const [formData, setFormData] = useState({
    leadId: '',
    totalAmount: '',
    advanceAmount: '0',
    dueDate: '',
    paymentStatus: 'Not Started'
  });

  const [updateData, setUpdateData] = useState({
    totalAmount: '',
    advanceAmount: '',
    dueDate: '',
    paymentStatus: '',
    invoiceFile: null,
    proofFile: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const statusOptions = ['Not Started', 'Advance Received', 'Partial', 'Due', 'Overdue', 'Paid', 'Disputed'];

  const isFinanceAuthorized =
    user?.role === 'ADMIN' ||
    user?.role === 'MANAGER' ||
    user?.role === 'ACCOUNTS' ||
    user?.paymentPermission === true;

  useEffect(() => {
    fetchPayments();
    fetchLeads();
  }, [showOutstandingOnly]);

  const fetchLeads = async () => {
    try {
      const response = await leadsApi.getLeads();
      if (response.success) {
        setLeads(response.data.leads || []);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = showOutstandingOnly
        ? await paymentsApi.getOutstandingPayments()
        : await paymentsApi.getPayments();
      if (response.success) {
        setPayments(response.data.payments || []);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayment = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        leadId: formData.leadId?.trim(),
        totalAmount: Number(formData.totalAmount),
        advanceAmount: Number(formData.advanceAmount || 0)
      };

      const response = await paymentsApi.createPayment(payload);
      if (response.success) {
        toast.success('Payment record created successfully 🎉');
        setShowCreateModal(false);
        setFormData({ leadId: '', totalAmount: '', advanceAmount: '0', dueDate: '', paymentStatus: 'Not Started' });
        fetchPayments();
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error(error.response?.data?.message || 'Failed to create payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenUpdateModal = (payment) => {
    setSelectedPayment(payment);
    setUpdateData({
      totalAmount: payment.totalAmount || '',
      advanceAmount: payment.advanceAmount || '',
      dueDate: payment.dueDate ? payment.dueDate.split('T')[0] : '',
      paymentStatus: payment.paymentStatus || '',
      invoiceFile: null,
      proofFile: null
    });
    setShowUpdateModal(true);
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('paymentStatus', updateData.paymentStatus);
      if (updateData.dueDate) fd.append('dueDate', updateData.dueDate);
      if (updateData.totalAmount !== '') fd.append('totalAmount', updateData.totalAmount);
      if (updateData.advanceAmount !== '') fd.append('advanceAmount', updateData.advanceAmount);

      if (updateData.invoiceFile) {
        fd.append('invoice', updateData.invoiceFile);
      }
      if (updateData.proofFile) {
        fd.append('paymentProof', updateData.proofFile);
      }

      
      const response = await axiosInstance.patch(`/payments/${selectedPayment._id}`, fd, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        toast.success('Payment record updated successfully!');
        setShowUpdateModal(false);
        fetchPayments();
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error(error.response?.data?.message || 'Failed to update payment record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReminder = async (id) => {
    try {
      
      const response = await axiosInstance.post(`/payments/${id}/reminder`);
      if (response.data.success) {
        toast.success(`Payment reminder triggered successfully! Total sent: ${response.data.data.payment.reminderCount} ✉️`);
        fetchPayments();
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Failed to trigger reminder.');
    }
  };

  const handleDownloadDoc = (docId, fileName) => {
    if (!docId) return;
    toast.loading('Downloading document...', { id: 'download' });
    axiosInstance.get(`/documents/${docId}/download`, { responseType: 'blob' })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName || 'document');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Document downloaded!', { id: 'download' });
      })
      .catch((err) => {
        console.error('Download error:', err);
        toast.error('Failed to download document. Permissions restricted.', { id: 'download' });
      });
  };

  const getStatusColor = (status) => {
    const colors = {
      'Not Started': 'bg-slate-100 text-slate-700 border border-slate-200',
      'Advance Received': 'bg-emerald-50 text-emerald-700 border border-emerald-100',
      'Partial': 'bg-blue-50 text-blue-700 border border-blue-100',
      'Due': 'bg-amber-50 text-amber-700 border border-amber-100',
      'Overdue': 'bg-rose-50 text-rose-700 border border-rose-100 font-semibold',
      'Paid': 'bg-green-100 text-green-800 border border-green-200 font-bold',
      'Disputed': 'bg-purple-50 text-purple-700 border border-purple-100'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-sans">Payment Ledger</h1>
          <p className="text-gray-600 mt-1">Track advance deposits, pending invoices, outstanding balances, and reminder metrics.</p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 bg-white px-4 py-2.5 rounded-xl border border-slate-200 cursor-pointer shadow-sm select-none hover:bg-slate-50 transition">
            <input
              type="checkbox"
              checked={showOutstandingOnly}
              onChange={(e) => setShowOutstandingOnly(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 w-4 h-4 cursor-pointer"
            />
            <span className="text-sm font-semibold text-slate-700">Outstanding Only</span>
          </label>

          {isFinanceAuthorized && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2.5 rounded-xl flex items-center space-x-2 shadow-lg transition-transform active:scale-95"
            >
              <FiPlus size={18} />
              <span>Create Schedule</span>
            </button>
          )}
        </div>
      </div>

      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-white shadow-sm border border-slate-100 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Received (Advance)</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">
              {isFinanceAuthorized
                ? `₹${payments.reduce((sum, p) => sum + (p.advanceAmount || 0), 0).toLocaleString()}`
                : '₹ - - - -'}
            </p>
            {!isFinanceAuthorized && <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1 mt-1"><FiLock /> Accounts Access Only</span>}
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <FiDollarSign size={24} />
          </div>
        </div>

        <div className="card bg-white shadow-sm border border-slate-100 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Balance</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">
              {isFinanceAuthorized
                ? `₹${payments.reduce((sum, p) => sum + (p.balanceAmount || 0), 0).toLocaleString()}`
                : '₹ - - - -'}
            </p>
            {!isFinanceAuthorized && <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1 mt-1"><FiLock /> Accounts Access Only</span>}
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <FiAlertCircle size={24} />
          </div>
        </div>

        <div className="card bg-white shadow-sm border border-slate-100 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fully Paid Orders</p>
            <p className="text-2xl font-extrabold text-green-700 mt-1">
              {payments.filter(p => p.paymentStatus === 'Paid').length}
            </p>
            <span className="text-[10px] text-slate-400 mt-1 block">Out of {payments.length} transactions</span>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <FiCheckCircle size={24} />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="card shadow-sm border border-slate-100 rounded-2xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Lead Order</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Financial Overview</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Due Date</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Documents</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Reminders</th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-500">No payment schedules found.</td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-slate-50/40 transition">
                    {/* Lead Order */}
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">
                          {payment.leadId?.customerName || 'N/A'}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">Code: {payment.leadId?.leadCode || 'N/A'}</div>
                      </div>
                    </td>

                    {/* Financial Overview */}
                    <td className="py-4 px-6">
                      {isFinanceAuthorized ? (
                        <div className="space-y-1 text-xs">
                          <div>Total: <span className="font-bold text-slate-800">₹{payment.totalAmount?.toLocaleString()}</span></div>
                          <div className="text-emerald-600">Advance: <span>₹{payment.advanceAmount?.toLocaleString()}</span></div>
                          <div className="text-indigo-600 font-semibold border-t border-slate-100 pt-0.5">
                            Balance: <span>₹{payment.balanceAmount?.toLocaleString()}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                          <FiLock size={12} />
                          <span>Omitted for Sales</span>
                        </div>
                      )}
                    </td>

                    {/* Due Date */}
                    <td className="py-4 px-6 text-sm text-slate-600 font-medium">
                      <div className="flex items-center gap-1.5">
                        <FiCalendar className="text-slate-400" />
                        <span>{payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase rounded-full ${getStatusColor(payment.paymentStatus)}`}>
                        {payment.paymentStatus}
                      </span>
                    </td>

                    {/* Documents */}
                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1.5 text-xs">
                        {payment.invoiceDocumentId ? (
                          <button
                            onClick={() => handleDownloadDoc(payment.invoiceDocumentId, `Invoice_${payment.leadId?.leadCode || 'payment'}.pdf`)}
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:underline font-semibold"
                          >
                            <FiFileText /> Invoice.pdf
                          </button>
                        ) : (
                          <span className="text-slate-400 italic">No invoice</span>
                        )}
                        {payment.paymentProofDocumentId ? (
                          <button
                            onClick={() => handleDownloadDoc(payment.paymentProofDocumentId, `Receipt_${payment.leadId?.leadCode || 'payment'}.pdf`)}
                            className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 hover:underline font-semibold"
                          >
                            <FiFileText /> Receipt.pdf
                          </button>
                        ) : (
                          <span className="text-slate-400 italic">No receipt</span>
                        )}
                      </div>
                    </td>

                    {/* Reminders */}
                    <td className="py-4 px-6">
                      <div className="space-y-1">
                        <div className="text-xs text-slate-500">Sent: <strong>{payment.reminderCount || 0} times</strong></div>
                        {payment.lastReminderAt && (
                          <div className="text-[10px] text-slate-400">
                            Last: {new Date(payment.lastReminderAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenUpdateModal(payment)}
                          className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 p-2 rounded-xl transition text-xs font-semibold"
                          title="Update ledger data or upload invoices"
                        >
                          Update
                        </button>

                        <button
                          onClick={() => handleSendReminder(payment._id)}
                          className="bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 p-2 rounded-xl transition"
                          title="Trigger Payment Reminder"
                        >
                          <FiSend size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Payment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-100 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800">New Payment Schedule</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreatePayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Select Lead / Customer *</label>
                <select
                  required
                  value={formData.leadId}
                  onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">-- Select Lead --</option>
                  {leads.map(lead => (
                    <option key={lead._id} value={lead._id}>
                      {lead.customerName} ({lead.leadCode})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Amount (₹) *</label>
                <input
                  type="number"
                  required
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. 150000"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Advance Deposited (₹)</label>
                <input
                  type="number"
                  value={formData.advanceAmount}
                  onChange={(e) => setFormData({ ...formData, advanceAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. 50000"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Initial Status</label>
                <select
                  value={formData.paymentStatus}
                  onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {statusOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex space-x-3 pt-4 border-t">
                <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition">
                  {isSubmitting ? 'Saving...' : 'Create Schedule'}
                </button>
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Payment / Document Upload Modal */}
      {showUpdateModal && selectedPayment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-100 shadow-xl max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800">Update Ledger & Vault Docs</h2>
              <button onClick={() => setShowUpdateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleUpdatePayment} className="space-y-4">
              <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border">
                Lead: <strong>{selectedPayment.leadId?.customerName || 'N/A'}</strong><br />
                Code: <strong>{selectedPayment.leadId?.leadCode || 'N/A'}</strong>
              </p>

              {isFinanceAuthorized && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Amount (₹)</label>
                    <input
                      type="number"
                      value={updateData.totalAmount}
                      onChange={(e) => setUpdateData({ ...updateData, totalAmount: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Advance Paid (₹)</label>
                    <input
                      type="number"
                      value={updateData.advanceAmount}
                      onChange={(e) => setUpdateData({ ...updateData, advanceAmount: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                <select
                  value={updateData.paymentStatus}
                  onChange={(e) => setUpdateData({ ...updateData, paymentStatus: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-sm cursor-pointer"
                >
                  {statusOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Due Date</label>
                <input
                  type="date"
                  value={updateData.dueDate}
                  onChange={(e) => setUpdateData({ ...updateData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              {/* Upload Invoice File */}
              <div className="p-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 flex items-center gap-1">
                  <FiUpload /> Upload Invoice (PDF)
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setUpdateData({ ...updateData, invoiceFile: e.target.files[0] })}
                  className="w-full text-xs cursor-pointer file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {updateData.invoiceFile && <div className="text-[10px] text-green-600 font-semibold">Ready: {updateData.invoiceFile.name}</div>}
              </div>

              {/* Upload Payment Proof File */}
              <div className="p-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-1.5">
                <label className="block text-xs font-bold text-slate-600 flex items-center gap-1">
                  <FiUpload /> Upload Payment Receipt
                </label>
                <input 
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setUpdateData({ ...updateData, proofFile: e.target.files[0] })}
                  className="w-full text-xs cursor-pointer file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
                {updateData.proofFile && <div className="text-[10px] text-green-600 font-semibold">Ready: {updateData.proofFile.name}</div>}
              </div>

              <div className="flex space-x-3 pt-4 border-t">
                <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition">
                  {isSubmitting ? 'Saving...' : 'Apply Changes'}
                </button>
                <button type="button" onClick={() => setShowUpdateModal(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}