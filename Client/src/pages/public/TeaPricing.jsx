import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiShoppingCart, FiPlus, FiTrash2 } from 'react-icons/fi';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import { TEA_RATES } from '../../components/requirements/TeaRequirementBuilder';
import { useNavigate } from 'react-router-dom';
import { pushDataLayerEvent } from '../../utils/analytics';
import { distributorApi } from '../../api/distributor';
import { toast } from 'react-hot-toast';
import { loadRazorpayScript } from '../../utils/razorpay';

// placeholder tea rates until real data is provided
const DEFAULT_TEA_RATES = {
  Assam: { CTC_BP: 210, CTC_BOP: 220, CTC_DUST: 190 },
  Darjeeling: { ORTHODOX_P: 420, ORTHODOX_FTGFOP1: 650 },
  Dooars: { CTC_BOP: 200, CTC_DUST: 180 },
};

const ratesData = Object.keys(TEA_RATES).length ? TEA_RATES : DEFAULT_TEA_RATES;
const locations = Object.keys(ratesData);
const varieties = Array.from(new Set(locations.flatMap(l => Object.keys(ratesData[l]))));

export default function TeaPricing() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const variety = searchParams.get('variety') || '';
  const location = searchParams.get('location') || '';
  const quantity = searchParams.get('quantity') || '';
  const timeline = searchParams.get('timeline') || '';

  const [selectedVariety, setSelectedVariety] = useState(variety || '');
  const [selectedLocation, setSelectedLocation] = useState(location || '');
  const [selectedQuantity, setSelectedQuantity] = useState(quantity || '1000KG');
  const [selectedTimeline, setSelectedTimeline] = useState(timeline || 'WITHIN_7_DAYS');
  const [cart, setCart] = useState([]);

  useDocumentMeta({
    title: 'Tea Pricing | India Trade Overseas',
    description: 'Live tea pricing and ordering',
    canonicalPath: '/tea/pricing'
  });

  const price = ratesData[selectedLocation]?.[selectedVariety];

  const distributorId = localStorage.getItem('prakriti_distributor_id');
  const token = localStorage.getItem('distributor_token');

  const addToCart = () => {
    if (!selectedVariety || !selectedLocation || !price) {
      toast.error('Please select variety, location and ensure price is available');
      return;
    }
    const kgToMT = {
      '100KG': 0.1,
      '500KG': 0.5,
      '1000KG': 1,
      '5000KG': 5,
      '10000KG': 10,
    };
    const qtyNum = parseInt(selectedQuantity.replace(/\D/g, '')) || 1;
    const itemMT = kgToMT[selectedQuantity] || (qtyNum / 1000);
    const lineTotal = price * qtyNum; // price is per KG, qtyNum is KG
    const newItem = {
      id: Date.now(),
      variety: selectedVariety,
      location: selectedLocation,
      quantity: selectedQuantity,
      timeline: selectedTimeline,
      unitPrice: price,
      lineTotal,
      itemMT,  // store MT for later use
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
      navigate('/prakriti');
      return;
    }
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

// Convert KG codes to MT (server requires minimum 40 MT = 40,000 KG)
    const kgToMT = {
      '100KG': 0.1,
      '500KG': 0.5,
      '1000KG': 1,
      '5000KG': 5,
      '10000KG': 10,
    };
    // Validate each cart item meets minimum 40 MT = 40,000 KG
    for (const item of cart) {
      const itemMT = kgToMT[item.quantity] || (parseInt(item.quantity.replace(/\D/g, '')) / 1000) || 0;
      if (itemMT < 40) {
        toast.error(`Minimum order quantity is 40 MT (40,000 KG). "${item.quantity}" = ${itemMT} MT.`);
        return;
      }
    }

    const proposalPayloads = cart.map(item => {
      const itemMT = item.itemMT || kgToMT[item.quantity] || (parseInt(item.quantity.replace(/\D/g, '')) / 1000) || 0;
      const itemQtyKG = itemMT * 1000;
      return {
        distributorId,
        division: 'TEA',
        lotId: `${item.variety}-${item.location}`,
        region: item.location,
        grade: item.variety,
        quantity: itemMT,  // server expects MT
        basePrice: item.unitPrice * 1000, // convert price per KG to price per MT
        paymentTerm: 'ADVANCE_100',
        estimatedValue: itemMT * (item.unitPrice * 1000),
        status: 'approved',
      };
    });

    try {
      const proposals = await Promise.all(
        proposalPayloads.map(p => distributorApi.createProposal(p))
      );
      const proposalIds = proposals.map(r => r.data._id);
      const total = cartTotal;

      const orderResult = await distributorApi.createRazorpayOrder({
        amount: total,
        lotId: proposalIds.join(','),
        quantity: cart.reduce((s, p) => s + (kgToMT[p.quantity] || (parseInt(p.quantity.replace(/\D/g, '')) / 1000) || 0), 0),
      });
      if (!orderResult.success) throw new Error(orderResult.message || 'Failed to create Razorpay order');

      const { orderId, keyId } = orderResult.data;
      try {
        await loadRazorpayScript();
      } catch (loadErr) {
        console.error(loadErr);
        toast.error('Unable to load payment gateway. Please try again.');
        return;
      }
      if (!window.Razorpay) {
        toast.error('Payment gateway failed to initialise.');
        return;
      }

      const options = {
        key: keyId,
        amount: total * 100,
        currency: 'INR',
        name: 'Prakriti Tea Division',
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
              pushDataLayerEvent('tea_payment_success', { transaction_id: response.razorpay_payment_id, value: total, currency: 'INR' });
            } else {
              toast.error(verifyResult.message || 'Payment verification failed');
            }
          } catch (err) {
            console.error(err);
            toast.error('Payment verification failed');
          }
        },
        theme: { color: '#0B3D2E' },
      };

      new window.Razorpay(options).open();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to place order');
    }
  };

  const quantityOptions = [
    { value: '100KG', label: '100 Kg' },
    { value: '500KG', label: '500 Kg' },
    { value: '1000KG', label: '1,000 Kg (1 MT)' },
    { value: '5000KG', label: '5,000 Kg (5 MT)' },
    { value: '10000KG', label: '10,000+ Kg (10+ MT)' },
  ];
  const timelineOptions = [
    { value: 'IMMEDIATE', label: 'Immediate' },
    { value: 'WITHIN_3_DAYS', label: 'Within 3 Days' },
    { value: 'WITHIN_7_DAYS', label: 'Within 7 Days' },
    { value: 'WITHIN_15_DAYS', label: 'Within 15 Days' },
    { value: 'FUTURE', label: 'Future / Planning' },
  ];

  return (
    <div className="min-h-screen bg-[#FAF9F5] py-12 px-4" style={{ color: '#0B3D2E' }}>
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-8">
        <Link to="/prakriti" className="inline-flex items-center text-[#0B3D2E] hover:underline mb-6">
          <FiArrowLeft className="mr-1" /> Back to Tea
        </Link>

        <h1 className="text-3xl font-bold text-[#0B3D2E] mb-6">Tea Pricing & Order</h1>

        {/* Selection Form */}
        <div className="mb-8 p-6 bg-[#FAF9F5] rounded-xl border border-[#50C878]">
          <h2 className="text-xl font-semibold mb-4">Select Your Requirements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-[#0B3D2E] mb-1">Variety</label>
              <select
                value={selectedVariety}
                onChange={e => setSelectedVariety(e.target.value)}
                className="w-full px-4 py-2 border border-[#50C878] bg-white rounded-lg focus:ring-2 focus:ring-[#50C878] focus:border-[#50C878]"
              >
                <option value="">Select variety</option>
                {varieties.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0B3D2E] mb-1">Location</label>
              <select
                value={selectedLocation}
                onChange={e => setSelectedLocation(e.target.value)}
                className="w-full px-4 py-2 border border-[#50C878] bg-white rounded-lg focus:ring-2 focus:ring-[#50C878] focus:border-[#50C878]"
              >
                <option value="">Select location</option>
                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0B3D2E] mb-1">Quantity</label>
              <select
                value={selectedQuantity}
                onChange={e => setSelectedQuantity(e.target.value)}
                className="w-full px-4 py-2 border border-[#50C878] bg-white rounded-lg focus:ring-2 focus:ring-[#50C878] focus:border-[#50C878]"
              >
                {quantityOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0B3D2E] mb-1">Timeline</label>
              <select
                value={selectedTimeline}
                onChange={e => setSelectedTimeline(e.target.value)}
                className="w-full px-4 py-2 border border-[#50C878] bg-white rounded-lg focus:ring-2 focus:ring-[#50C878] focus:border-[#50C878]"
              >
                {timelineOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedVariety && selectedLocation && (
            <div className="p-4 rounded-lg bg-[#50C878]/10 border border-[#50C878]/30 text-[#0B3D2E] text-sm">
              <strong>Estimated Rate (INR/Kg):</strong> {price != null ? `₹ ${price.toLocaleString()}` : 'N/A'}
            </div>
          )}

          <button
            onClick={addToCart}
            disabled={!selectedVariety || !selectedLocation || !price}
            className="px-6 py-2 bg-[#50C878] text-[#04140E] rounded-lg hover:bg-[#50C878]/90 flex items-center gap-2"
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
                  <tr className="bg-[#FAF9F5] text-[#0B3D2E]">
                    <th className="p-3 border-b">Variety</th>
                    <th className="p-3 border-b">Location</th>
                    <th className="p-3 border-b">Qty</th>
                    <th className="p-3 border-b">Timeline</th>
                    <th className="p-3 border-b">Unit Price (INR/Kg)</th>
                    <th className="p-3 border-b">Line Total</th>
                    <th className="p-3 border-b">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map(item => (
                    <tr key={item.id} className="border-b border-[#50C878] hover:bg-[#FAF9F5]">
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
                  <tr className="bg-[#FAF9F5] font-bold">
                    <td colSpan="4" className="p-3 text-right">Grand Total</td>
                    <td className="p-3 font-mono">₹ {cartTotal.toLocaleString()}</td>
                    <td className="p-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <button
              onClick={handlePlaceOrder}
              className="mt-4 px-8 py-3 bg-[#0B3D2E] text-white rounded-lg hover:bg-[#0F2E24] flex items-center justify-center gap-2"
            >
              <FiShoppingCart size={16} /> Place Order & Pay
            </button>
          </div>
        )}

        {/* Rate Table */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">Full Rate Table (INR/Kg)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F5] text-[#0B3D2E]">
                  <th className="p-3 border-b">Location</th>
                  {varieties.map(v => (
                    <th key={v} className="p-3 border-b">{v.replace(/_/g, ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(ratesData).map(([loc, rates]) => (
                  <tr key={loc} className="border-b border-[#50C878] hover:bg-[#FAF9F5]">
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