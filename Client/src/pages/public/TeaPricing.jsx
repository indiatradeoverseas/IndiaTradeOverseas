import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import { TEA_RATES } from '../../components/requirements/TeaRequirementBuilder';

export default function TeaPricing() {
  useDocumentMeta({
    title: 'Tea Pricing | India Trade Overseas',
    description: 'Live tea pricing and ordering',
    canonicalPath: '/tea/pricing'
  });
  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow p-8 text-center">
        <Link to="/prakriti" className="inline-flex items-center text-primary hover:underline mb-6">
          <FiArrowLeft className="mr-1" /> Back to Tea
        </Link>
        <h1 className="text-3xl font-bold text-neutral-900 mb-4">Tea Pricing</h1>
        <p className="text-neutral-600 mb-8">Tea pricing page coming soon. Rate tables will be added once available.</p>
        <div className="bg-neutral-50 rounded-xl p-8">
          <h2 className="text-xl font-semibold mb-4">Tea Rate Tables (Coming Soon)</h2>
          <p className="text-neutral-600">The tea rate tables will be added here once the rate list is provided.</p>
        </div>
      </div>
    </div>
  );
}