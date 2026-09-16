import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiShoppingCart, FiPlus, FiTrash2 } from 'react-icons/fi';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import { RICE_RATES } from '../../components/requirements/RiceRequirementBuilder';
import { useNavigate } from 'react-router-dom';
import { pushDataLayerEvent } from '../../utils/analytics';
import { distributorApi } from '../../api/distributor';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import { PlaceOrderButton } from '../../components/ui/PlaceOrderButton';

export default function RicePricing() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

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

  const payloadBuilder = () => {
    return cart.map(item => ({
      distributorId: user?._id,
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
  };

  const handlePlaceOrder = async () => {
    // handled by PlaceOrderButton
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

  if (!selectedVariety && !cart.length) {
    // Show selection UI only
  }

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-8">
        <Link to="/prakriti/rice" className="inline-flex items-center text-primary hover:underline mb-6">
          <FiArrowLeft className="mr-1" /> Back to Rice
        </Link>

        <h1 className="text-3xl font-bold text-neutral-900 mb-6">Rice Pricing & Order</h1>

        {/* Selection Form */}
        <div className="mb-8 p-6 bg-neutral-50 rounded-xl">
          <h2 className="text-xl font-semibold mb-4">Select Your Requirements</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Variety</label>
              <select
                value={selectedVariety}
                onChange={e => setSelectedVariety(e.target.value)}
                className="w-full px-4 py-2 border border-teal-200 bg-white rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
              >
                <option value="">Select variety</option>
                {varieties.map(v => <option key={v} value={v}>{v.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Location</label>
              <select
                value={selectedLocation}
                onChange={e => setSelectedLocation(e.target.value)}
                className="w-full px-4 py-2 border border-teal-200 bg-white rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
              >
                <option value="">Select location</option>
                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Quantity</label>
              <select
                value={selectedQuantity}
                onChange={e => setSelectedQuantity(e.target.value)}
                className="w-full px-4 py-2 border border-teal-200 bg-white rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
              >
                {quantityOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Timeline</label>
              <select
                value={selectedTimeline}
                onChange={e => setSelectedTimeline(e.target.value)}
                className="w-full px-4 py-2 border border-teal-200 bg-white rounded-lg focus:ring-2 focus:ring-teal-400 focus:border-teal-400"
              >
                {timelineOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Price Preview */}
          {selectedVariety && selectedLocation && (
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm">
              <strong>Estimated Rate (INR/MT):</strong> {price != null ? `₹ ${price.toLocaleString()}` : 'N/A'}
            </div>
          )}

          <button
            onClick={addToCart}
            disabled={!selectedVariety || !selectedLocation || !price}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
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
                  <tr className="bg-neutral-100 text-neutral-700">
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
                    <tr key={item.id} className="border-b border-neutral-200 hover:bg-neutral-50">
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
                  <tr className="bg-neutral-100 font-bold">
                    <td colSpan="4" className="p-3 text-right">Grand Total</td>
                    <td className="p-3 font-mono">₹ {cartTotal.toLocaleString()}</td>
                    <td className="p-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <PlaceOrderButton
              payloadBuilder={() => cart.map(item => ({
                distributorId: user?._id,
                division: 'RICE',
                lotId: `${item.variety}-${item.location}`,
                region: item.location,
                grade: item.variety,
                quantity: parseInt(item.quantity.replace(/\D/g, '')) || 1,
                basePrice: item.unitPrice,
                paymentTerm: 'ADVANCE_100',
                estimatedValue: item.lineTotal,
                status: 'approved',
              }))}
            />
          </div>
        )}

        {/* Rate Table */}
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">Full Rate Table (INR/MT)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-neutral-100 text-neutral-700">
                  <th className="p-3 border-b">Location</th>
                  {varieties.map(v => (
                    <th key={v} className="p-3 border-b">{v.replace(/_/g, ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(RICE_RATES).map(([loc, rates]) => (
                  <tr key={loc} className="border-b border-neutral-200 hover:bg-neutral-50">
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

const locations = ['Haryana'];
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