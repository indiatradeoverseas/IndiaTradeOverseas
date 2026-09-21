import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiShoppingCart, FiPlus, FiTrash2 } from 'react-icons/fi';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import { RICE_RATES } from '../../components/requirements/RiceRequirementBuilder';
import { useNavigate } from 'react-router-dom';
import { pushDataLayerEvent } from '../../utils/analytics';
import { distributorApi } from '../../api/distributor';
import { toast } from 'react-hot-toast';
import { loadRazorpayScript } from '../../utils/razorpay';

export default function RicePricing() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL params
  const variety = searchParams.get('variety') || '';
  const location = searchParams.get('location') || '';
  const quantity = searchParams.get('quantity') || '';
  const timeline = searchParams.get('timeline') || '';

  // Local state for UI
  const [selectedVariety, setSelectedVariety] = useState(variety || '');
  const [selectedLocation, setSelectedLocation] = useState(location || '');
  const [selectedQuantity, setSelectedQuantity] = useState(quantity || '1_TRUCK');
  const [selectedTimeline, setSelectedTimeline] = useState(timeline || 'WITHIN_7_DAYS');
  const [cart, setCart] = useState([]);

  useDocumentMeta({
    title: 'Rice Pricing | India Trade Overseas',
    description: 'Live rice pricing and ordering',
    canonicalPath: '/rice/pricing'
  });

  const rates = RICE_RATES;
  const locations = Object.keys(rates);
  const varieties = Object.keys(rates[locations[0]] || {});

  const price = rates[selectedLocation]?.[selectedVariety];

  const distributorId = localStorage.getItem('rice_distributor_id');
  const token = localStorage.getItem('distributor_token');

  const addToCart = () => {
    if (!selectedVariety || !selectedLocation || !price) {
      toast.error('Please select variety, location and ensure price is available');
      return;
    }
    const qtyNum = parseInt(selectedQuantity.replace(/\D/g, '')) || 1;
    const lineTotal = price * qtyNum;
    const newItem = {
      id: Date.now(),
      variety: selectedVariety,
      location: selectedLocation,
      quantity: selectedQuantity,
      timeline: selectedTimeline,
      unitPrice: price,
      lineTotal,
    };
    setCart(prev => [...prev, newItem]);
    toast.success('Added to cart');
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);

  const handlePlaceOrder = async () => {
    if (!distributorId || !token) {
      toast.error('Session expired. Please re‑enter the terminal.');
      navigate('/prakriti/rice');
      return;
    }
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    // Create proposals for each cart item
    const proposalPayloads = cart.map(item => ({
      distributorId,
      division: 'RICE',
      lotId: `${item.variety}-${item.location}`,
      region: item.location,
      grade: item.variety,
      quantity: parseInt(item.quantity.replace(/\D/g, '')) || 1,
      basePrice: item.unitPrice,
      paymentTerm: 'ADVANCE_100',
      estimatedValue: item.lineTotal,
      status: 'approved',
    }));

    try {
      const proposals = await Promise.all(
        proposalPayloads.map(p => distributorApi.createProposal(p))
      );
      const proposalIds = proposals.map(r => r.data._id);
      const total = cartTotal;

      // Razorpay order
      const orderResult = await distributorApi.createRazorpayOrder({
        amount: total,
        lotId: proposalIds.join(','),
        quantity: cart.reduce((s, p) => s + (parseInt(p.quantity.replace(/\D/g, '')) || 0), 0),
      });
      if (!orderResult.success) throw new Error(orderResult.message || 'Failed to create Razorpay order');

      const { orderId, keyId } = orderResult.data;
      await loadRazorpayScript();

      const options = {
        key: keyId,
        amount: total * 100,
        currency: 'INR',
        name: 'Prakriti Rice Division',
        description: `Order ${proposalIds.join(',')}`,
        order_id: orderId,
        handler: async (response) => {
          try {
            const verifyResult = await distributorApi.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              lotId: proposalIds.join(','),
              quantity: cart.reduce((s, p) => s + (parseInt(p.quantity.replace(/\D/g, '')) || 0), 0),
              amount: total,
            });
            if (verifyResult.success) {
              await Promise.all(proposalIds.map(id => distributorApi.updateProposalStatus(id, 'paid')));
              toast.success('Payment successful!');
              pushDataLayerEvent('rice_payment_success', { transaction_id: response.razorpay_payment_id, value: total, currency: 'INR' });
            } else {
              toast.error(verifyResult.message || 'Payment verification failed');
            }
          } catch (err) {
            console.error(err);
            toast.error('Payment verification failed');
          }
        },
        theme: { color: '#5A4422' },
      };

      new window.Razorpay(options).open();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to place order');
    }
  };

  // Options
  const quantityOptions = [
    { value: '1_TRUCK', label: '1 Truck (20 MT)' },
    { value: '2_5_TRUCKS', label: '2–5 Trucks (40-100 MT)' },
    { value: '6_10_TRUCKS', label: '6–10 Trucks (120-200 MT)' },
    { value: '10_PLUS_TRUCKS', label: '10+ Trucks (200+ MT)' },
    { value: 'CUSTOM', label: 'Custom Quantity' },
  ];
  const timelineOptions = [
    { value: 'IMMEDIATE', label: 'Immediate' },
    { value: 'WITHIN_3_DAYS', label: 'Within 3 Days' },
    { value: 'WITHIN_7_DAYS', label: 'Within 7 Days' },
    { value: 'WITHIN_15_DAYS', label: 'Within 15 Days' },
    { value: 'FUTURE', label: 'Future / Planning' },
  ];

  return (
    <div className="min-h-screen bg-[#FFF9EC] py-12 px-4" style={{ color: '#5A4422' }}>
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-8">
        <Link to="/prakriti/rice" className="inline-flex items-center text-[#5A4422] hover:underline mb-6">
          <FiArrowLeft className="mr-1" /> Back to Rice
        </Link>

        <h1 className="text-3xl font-bold text-[#5A4422] mb-6">Rice Pricing & Order</h1>

        {/* Selection Form */}
        <div className="mb-8 p-6 bg-[#FFF9EC] rounded-xl border border-[#D9B85C]">
          <h2 className="text-xl font-semibold mb-4">Select Your Requirements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-[#5A4422] mb-1">Variety</label>
              <select
                value={selectedVariety}
                onChange={e => setSelectedVariety(e.target.value)}
                className="w-full px-4 py-2 border border-[#D9B85C] bg-white rounded-lg focus:ring-2 focus:ring-[#D9B85C] focus:border-[#D9B85C]"
              >
                <option value="">Select variety</option>
                {varieties.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5A4422] mb-1">Location</label>
              <select
                value={selectedLocation}
                onChange={e => setSelectedLocation(e.target.value)}
                className="w-full px-4 py-2 border border-[#D9B85C] bg-white rounded-lg focus:ring-2 focus:ring-[#D9B85C] focus:border-[#D9B85C]"
              >
                <option value="">Select location</option>
                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5A4422] mb-1">Quantity</label>
              <select
                value={selectedQuantity}
                onChange={e => setSelectedQuantity(e.target.value)}
                className="w-full px-4 py-2 border border-[#D9B85C] bg-white rounded-lg focus:ring-2 focus:ring-[#D9B85C] focus:border-[#D9B85C]"
              >
                {quantityOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#5A4422] mb-1">Timeline</label>
              <select
                value={selectedTimeline}
                onChange={e => setSelectedTimeline(e.target.value)}
                className="w-full px-4 py-2 border border-[#D9B85C] bg-white rounded-lg focus:ring-2 focus:ring-[#D9B85C] focus:border-[#D9B85C]"
              >
                {timelineOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Price Preview */}
          {selectedVariety && selectedLocation && (
            <div className="p-4 rounded-lg bg-[#D9B85C]/10 border border-[#D9B85C]/30 text-[#5A4422] text-sm">
              <strong>Estimated Rate (INR/MT):</strong> {price != null ? `₹ ${price.toLocaleString()}` : 'N/A'}
            </div>
          )}

          <button
            onClick={addToCart}
            disabled={!selectedVariety || !selectedLocation || !price}
            className="px-6 py-2 bg-[#D9B85C] text-[#2E2000] rounded-lg hover:bg-[#D9B85C]/90 flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" /> Add to Order
          </button>
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Your Order ({cart.length} items)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-[#FFF9EC] text-[#5A4422]">
                    <th className="p-3 border-b">Variety</th>
                    <th className="p-3 border-b">Location</th>
                    <th className="p-3 border-b">Qty</th>
                    <th className="p-3 border-b">Timeline</th>
                    <th className="p-3 border-b">Unit Price (INR/MT)</th>
                    <th className="p-3 border-b">Line Total</th>
                    <th className="p-3 border-b">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map(item => (
                    <tr key={item.id} className="border-b border-[#D9B85C] hover:bg-[#FFF9EC]">
                      <td className="p-3">{item.variety.replace(/_/g, ' ')}</td>
                      <td className="p-3">{item.location}</td>
                      <td className="p-3">{item.quantity}</td>
                      <td className="p-3">{item.timeline.replace(/_/g, ' ')}</td>
                      <td className="p-3 font-mono">₹ {item.unitPrice.toLocaleString()}</td>
                      <td className="p-3 font-semibold">₹ {item.lineTotal.toLocaleString()}</td>
                      <td className="p-3">
                        <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700">
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#FFF9EC] font-bold">
                    <td colSpan="4" className="p-3 text-right">Grand Total</td>
                    <td className="p-3 font-mono">₹ {cartTotal.toLocaleString()}</td>
                    <td className="p-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <button
              onClick={handlePlaceOrder}
              className="mt-4 px-8 py-3 bg-[#5A4422] text-white rounded-lg hover:bg-[#4a3819] flex items-center justify-center gap-2"
            >
              <FiShoppingCart size={16} /> Place Order & Pay
            </button>
          </div>
        )}

        {/* Rate Table */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">Full Rate Table (INR/MT)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-[#FFF9EC] text-[#5A4422]">
                  <th className="p-3 border-b">Location</th>
                  {varieties.map(v => (
                    <th key={v} className="p-3 border-b">{v.replace(/_/g, ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(RICE_RATES).map(([loc, rates]) => (
                  <tr key={loc} className="border-b border-[#D9B85C] hover:bg-[#FFF9EC]">
                    <td className="p-3 font-medium">{loc}</td>
                    {varieties.map(v => (
                      <td key={v} className="p-3 font-mono">
                        {rates[v] != null ? `₹ ${rates[v].toLocaleString()}` : 'N/A'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const quantityOptions = [
  { value: '1_TRUCK', label: '1 Truck (20 MT)' },
  { value: '2_5_TRUCKS', label: '2–5 Trucks (40-100 MT)' },
  { value: '6_10_TRUCKS', label: '6–10 Trucks (120-200 MT)' },
  { value: '10_PLUS_TRUCKS', label: '10+ Trucks (200+ MT)' },
  { value: 'CUSTOM', label: 'Custom Quantity' },
];
const timelineOptions = [
  { value: 'IMMEDIATE', label: 'Immediate' },
  { value: 'WITHIN_3_DAYS', label: 'Within 3 Days' },
  { value: 'WITHIN_7_DAYS', label: 'Within 7 Days' },
  { value: 'WITHIN_15_DAYS', label: 'Within 15 Days' },
  { value: 'FUTURE', label: 'Future / Planning' },
];