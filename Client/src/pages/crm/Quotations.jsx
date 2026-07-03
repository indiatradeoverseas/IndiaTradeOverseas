import React, { useState, useEffect } from 'react';
import { quotationsApi } from '../../api/quotations';
import { FiCheck, FiX, FiEye } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

export default function Quotations() {
  const { user } = useAuth();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    try {
      const response = await quotationsApi.getPendingQuotations();
      if (response.success) {
        setQuotations(response.data.quotations);
      }
    } catch (error) {
      console.error('Error fetching quotations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id, approvedPrice) => {
    const price = prompt('Enter approved price:', approvedPrice);
    if (price) {
      try {
        const response = await quotationsApi.approveQuotation(id, { approvedPrice: parseFloat(price) });
        if (response.success) {
          toast.success('Quotation approved successfully');
          fetchQuotations();
        }
      } catch (error) {
        console.error('Error approving quotation:', error);
      }
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('Enter rejection reason:');
    if (reason) {
      try {
        const response = await quotationsApi.rejectQuotation(id, { marginNote: reason });
        if (response.success) {
          toast.success('Quotation rejected');
          fetchQuotations();
        }
      } catch (error) {
        console.error('Error rejecting quotation:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
        <p className="text-gray-600 mt-1">Manage and approve quotation requests</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4">Lead</th>
              <th className="text-left py-3 px-4">Requested By</th>
              <th className="text-left py-3 px-4">Requested Price</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Date</th>
              <th className="text-left py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="text-center py-8">Loading...</td></tr>
            ) : quotations.length === 0 ? (
              <tr><td colSpan="6" className="text-center py-8 text-gray-500">No pending quotations</td></tr>
            ) : (
              quotations.map((quotation) => (
                <tr key={quotation._id} className="border-b border-gray-100">
                  <td className="py-3 px-4">{quotation.leadId?.customerName || 'N/A'}</td>
                  <td className="py-3 px-4">{quotation.requestedBy?.fullName || 'System'}</td>
                  <td className="py-3 px-4">₹{quotation.employeeRequestedPrice?.toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                      {quotation.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">{new Date(quotation.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    {user?.role === 'ADMIN' || user?.quotationPermission === true ? (
                      <div className="flex space-x-2">
                        <button onClick={() => handleApprove(quotation._id, quotation.employeeRequestedPrice)} className="text-green-600 hover:text-green-700" title="Approve">
                          <FiCheck size={18} />
                        </button>
                        <button onClick={() => handleReject(quotation._id)} className="text-red-600 hover:text-red-700" title="Reject">
                          <FiX size={18} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Restricted</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}