import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiShoppingCart } from 'react-icons/fi';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import { BHUTAN_RATES, PAKUR_RATES_ADV100 } from '../../components/requirements/StoneRequirementBuilder';
import { useNavigate } from 'react-router-dom';
import { pushDataLayerEvent } from '../../utils/analytics';
import { distributorApi } from '../../api/distributor';
import { toast } from 'react-hot-toast';
import { loadRazorpayScript } from '../../utils/razorpay';

export default function StonePricing() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const material = searchParams.get('material') || '';
  const location = searchParams.get('location') || '';
  const quantity = searchParams.get('quantity') || '';
  const timeline = searchParams.get('timeline') || '';
  const type = searchParams.get('type') || '';
  const ratePaymentTerm = searchParams.get('paymentTerm') || 'ADVANCE_100';

  useDocumentMeta({
    title: `${material} – ${location} – Stone Pricing | India Trade Overseas`,
    description: `Live stone pricing for ${material} at ${location} (${type}).`,
    canonicalPath: '/stone/pricing',
  });

  const rates = type === 'BHUTAN' ? BHUTAN_RATES : PAKUR_RATES_ADV100;
  const locationRates = rates[location] || {};
  const price = locationRates[material];

  const distributorId = localStorage.getItem('ito_stone_buyer_id');
  const token = localStorage.getItem('distributor_token');

  const handlePlaceOrder = async () => {
    if (!distributorId || !token) {
      toast.error('Session expired. Please re‑enter the terminal.');
      navigate('/stone');
      return;
    }
    if (!price) {
      toast.error('Price not available for this selection');
      return;
    }

    // Convert truck codes to MT (server requires minimum 40 MT)
    const truckToMT = {
      '1_TRUCK': 30,
      '2_5_TRUCKS': 80,
      '6_10_TRUCKS': 200,
      '10_PLUS_TRUCKS': 400,
    };
    const qty = truckToMT[quantity] || parseInt(quantity.replace(/\D/g, '')) || 40;
    if (qty < 40) {
      toast.error('Minimum order quantity is 40 MT (one truckload).');
      return;
    }
    // price may be an object with adv100/adv50/cod for PAKUR
    const basePrice = typeof price === 'object' ? (price[ratePaymentTerm] ?? price.adv100) : price;
    if (basePrice == null) {
      toast.error('Price not available for selected payment term');
      return;
    }
    const estimatedValue = qty * basePrice;

    // Create proposal (approved) first
    const proposalPayload = {
      distributorId,
      division: 'STONE',
      lotId: `${type}-${location}-${material}`,
      region: location,
      grade: material,
      quantity: qty,
      basePrice,
      paymentTerm: ratePaymentTerm,
      estimatedValue,
      status: 'approved',
    };

    try {
      const propRes = await distributorApi.createProposal(proposalPayload);
      if (!propRes.success) throw new Error(propRes.message || 'Failed to create proposal');
      const proposalId = propRes.data._id;

      // Razorpay order
      const orderResult = await distributorApi.createRazorpayOrder({
        amount: estimatedValue,
        lotId: proposalId,
        quantity: qty,
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
        amount: estimatedValue * 100,
        currency: 'INR',
        name: 'Stone & Infrastructure Division',
        description: `Order ${proposalId}`,
        order_id: orderId,
        handler: async (response) => {
          try {
            const verifyResult = await distributorApi.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              lotId: proposalId,
              quantity: qty,
              amount: estimatedValue,
            });
            if (verifyResult.success) {
              await distributorApi.updateProposalStatus(proposalId, 'paid');
              toast.success('Payment successful!');
              pushDataLayerEvent('stone_payment_success', { transaction_id: response.razorpay_payment_id, value: estimatedValue, currency: 'INR' });
              // refresh proposals list if needed
            } else {
              toast.error(verifyResult.message || 'Payment verification failed');
            }
          } catch (err) {
            console.error(err);
            toast.error('Payment verification failed');
          }
        },
        theme: { color: '#37424B' },
      };

      new window.Razorpay(options).open();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to place order');
    }
  };

  if (!material || !location || !price) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-neutral-800">No pricing data</h1>
          <p className="mt-2 text-neutral-600">No rate found for the selected material / location.</p>
          <Link to="/stone" className="mt-4 inline-block text-primary hover:underline">
            <FiArrowLeft className="inline mr-1" /> Back to Stone
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F2EE] py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-8">
        <Link to="/stone" className="inline-flex items-center text-[#37424B] hover:underline mb-6">
          <FiArrowLeft className="mr-1" /> Back to Stone
        </Link>

        <h1 className="text-3xl font-bold text-[#37424B] mb-2">
          {material.replace(/_/g, ' ')} – {location} ({type === 'BHUTAN' ? 'Bhutan' : 'Pakur'} Stone)
        </h1>

        {timeline && <p className="text-[#6D6760] mb-4">Required by: {timeline.replace(/_/g, ' ')}</p>}

        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-[#F4F2EE] text-[#6D6760]">
                <th className="p-3 border-b">Payment Term</th>
                <th className="p-3 border-b">Price (INR / MT)</th>
              </tr>
            </thead>
            <tbody>
              {type === 'PAKUR' ? (
                (['adv100','adv50','cod']).map(term => (
                  <tr key={term} className="border-b border-[#DCCCB4] hover:bg-[#F4F2EE]">
                    <td className="p-3 font-medium">
                      {term === 'adv100' && '100 % Advance'}
                      {term === 'adv50'  && '50 % Advance'}
                      {term === 'cod'    && 'Cash on Delivery'}
                    </td>
                    <td className="p-3 font-mono font-semibold text-[#37424B]">
                      {price[term] != null ? `₹ ${price[term].toLocaleString()}` : 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-[#DCCCB4]">
                  <td className="p-3 font-medium">Standard (Rs 100 negotiable)</td>
                  <td className="p-3 font-mono font-semibold text-[#37424B]">
                    {price != null ? `₹ ${price.toLocaleString()}` : 'N/A'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={handlePlaceOrder}
            className="px-8 py-3 bg-[#37424B] text-white rounded-lg hover:bg-[#252c34] font-semibold flex items-center justify-center gap-2"
          >
            <FiShoppingCart size={16} /> Place Order & Pay
          </button>
        </div>
      </div>
    </div>
  );
}