import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { FiArrowLeft, FiShoppingCart } from 'react-icons/fi';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import { BHUTAN_RATES, PAKUR_RATES_ADV100 } from '../../components/requirements/StoneRequirementBuilder';
import { useNavigate } from 'react-router-dom';
import { pushDataLayerEvent } from '../../utils/analytics';
import { softLeadsApi } from '../../api/leads';
import { distributorApi } from '../../api/distributor';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

export default function StonePricing() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const material = searchParams.get('material') || '';
  const location = searchParams.get('location') || '';
  const quantity = searchParams.get('quantity') || '';
  const timeline = searchParams.get('timeline') || '';
  const type = searchParams.get('type') || '';

  useDocumentMeta({
    title: `${material} – ${location} – Stone Pricing | India Trade Overseas`,
    description: `Live stone pricing for ${material} at ${location} (${type}).`,
    canonicalPath: '/stone/pricing',
  });

  const rates = type === 'BHUTAN' ? BHUTAN_RATES : PAKUR_RATES_ADV100;
  const locationRates = rates[location] || {};
  const price = locationRates[material];

  const handlePlaceOrder = async () => {
    if (!user) {
      toast.error('Please login to place an order');
      navigate('/login');
      return;
    }

    const payload = {
      distributorId: user._id,
      division: 'STONE',
      lotId: `${type}-${location}-${material}`,
      region: location,
      grade: material,
      quantity: parseInt(quantity.replace(/\D/g, '')) || 1,
      basePrice: price || 0,
      paymentTerm: 'ADVANCE_100',
      estimatedValue: (parseInt(quantity.replace(/\D/g, '')) || 1) * (price || 0),
      status: 'approved',
    };

    try {
      const res = await distributorApi.createProposal(payload);
      if (res.success) {
        toast.success('Proposal created, redirecting to payment...');
        pushDataLayerEvent('stone_proposal_submitted', { lot_id: payload.lotId, quantity: payload.quantity, value: payload.estimatedValue });
        // open payment modal? For now redirect to proposals page
        navigate('/crm/distributors/stone');
      } else {
        toast.error(res.message || 'Failed to create proposal');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
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
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-8">
        <Link to="/stone" className="inline-flex items-center text-primary hover:underline mb-6">
          <FiArrowLeft className="mr-1" /> Back to Stone
        </Link>

        <h1 className="text-3xl font-bold text-neutral-900 mb-2">
          {material.replace(/_/g, ' ')} – {location} ({type === 'BHUTAN' ? 'Bhutan' : 'Pakur'} Stone)
        </h1>

        {timeline && <p className="text-neutral-600 mb-4">Required by: {timeline.replace(/_/g, ' ')}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-neutral-100 text-neutral-700">
                <th className="p-3 border-b">Payment Term</th>
                <th className="p-3 border-b">Price (INR / MT)</th>
              </tr>
            </thead>
            <tbody>
              {type === 'PAKUR' ? (
                (['adv100','adv50','cod']).map(term => (
                  <tr key={term} className="border-b border-neutral-200 hover:bg-neutral-50">
                    <td className="p-3 font-medium">
                      {term === 'adv100' && '100 % Advance'}
                      {term === 'adv50'  && '50 % Advance'}
                      {term === 'cod'    && 'Cash on Delivery'}
                    </td>
                    <td className="p-3 font-mono font-semibold text-neutral-900">
                      {price[term] != null ? `₹ ${price[term].toLocaleString()}` : 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="border-b border-neutral-200">
                  <td className="p-3 font-medium">Standard (Rs 100 negotiable)</td>
                  <td className="p-3 font-mono font-semibold text-neutral-900">
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
            className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-semibold"
          >
            Place Order
          </button>
        </div>
      </div>
    </div>
  );
}