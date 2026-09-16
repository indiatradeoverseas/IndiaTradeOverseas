import { FiShoppingCart } from 'react-icons/fi';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { distributorApi } from '../../api/distributor';
import { pushDataLayerEvent } from '../../utils/analytics';

export function PlaceOrderButton({ payloadBuilder }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const onClick = async () => {
    if (!user) {
      toast.error('Please log in to place an order');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const payload = payloadBuilder(); // array of proposal objects
      if (!Array.isArray(payload) || payload.length === 0) {
        toast.error('Your cart is empty');
        return;
      }

      // Create approved proposals for each line item
      const proposals = await Promise.all(
        payload.map(item => distributorApi.createProposal({ ...item, status: 'approved' }))
      );
      const proposalIds = proposals.map(r => r.data._id);
      const proposalIdsStr = proposalIds.join(',');

      // Compute total amount
      const total = payload.reduce((sum, item) => sum + (item.estimatedValue || 0), 0);

      // Create Razorpay order
      const orderResult = await distributorApi.createRazorpayOrder({
        amount: total,
        lotId: proposalIdsStr,
        quantity: payload.reduce((s, p) => s + (p.quantity || 0), 0),
      });
      if (!orderResult.success) throw new Error(orderResult.message || 'Failed to create Razorpay order');

      const { orderId, keyId } = orderResult.data;

      // Load Razorpay script
      await import('../../utils/razorpay').then(m => m.loadRazorpayScript());

      const options = {
        key: keyId,
        amount: total * 100, // paise
        currency: 'INR',
        name: 'India Trade Overseas',
        description: `Order ${proposalIdsStr}`,
        order_id: orderId,
        handler: async (response) => {
          try {
            const verifyResult = await distributorApi.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              lotId: proposalIdsStr,
              quantity: payload.reduce((s, p) => s + (p.quantity || 0), 0),
              amount: total,
            });
            if (verifyResult.success) {
              // Mark proposals as paid
              await Promise.all(proposalIds.map(id => distributorApi.updateProposalStatus(id, 'paid')));
              toast.success('Payment successful – downloading invoice…');
              // Download combined invoice
              const res = await fetch(`/api/proposals/invoices/combined?ids=${proposalIdsStr}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('distributor_token') || localStorage.getItem('token')}` }
              });
              if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `INV-${proposalIds[0]}.pdf`;
                a.click();
                window.URL.revokeObjectURL(url);
              } else {
                toast.error('Failed to download invoice');
              }
              pushDataLayerEvent('stone_payment_success', { transaction_id: response.razorpay_payment_id, value: total, currency: 'INR' });
            } else {
              toast.error(verifyResult.message || 'Payment verification failed');
            }
          } catch (err) {
            console.error(err);
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: user.fullName || '',
          email: user.email || '',
          contact: user.mobile || '',
        },
        theme: { color: '#37424B' },
        modal: { ondismiss: () => { toast.dismiss(); } }
      };

      const Razorpay = window.Razorpay;
      if (!Razorpay) {
        throw new Error('Razorpay SDK not loaded');
      }
      new Razorpay(options).open();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <FiShoppingCart size={16} />
      {loading ? 'Processing…' : 'Place Order'}
    </button>
  );
}