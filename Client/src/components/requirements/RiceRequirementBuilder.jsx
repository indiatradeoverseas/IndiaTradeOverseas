import React from 'react';
import { RequirementBuilder } from './RequirementBuilder';

const RICE_VARIETIES = [
  { value: '1121_BASMATI', label: '1121 Basmati', description: 'Premium long-grain, 8.35mm' },
  { value: '1885_BASMATI', label: '1885 Basmati', description: 'Premium long-grain, 8.35mm' },
  { value: '1718_BASMATI', label: '1718 Basmati', description: 'Premium long-grain, 8.35mm' },
  { value: '1509_BASMATI', label: '1509 Basmati', description: 'Premium long-grain, 8.40mm' },
  { value: '1847_BASMATI', label: '1847 Basmati', description: 'Premium long-grain, 8.40mm' },
  { value: '1401_BASMATI', label: '1401 Basmati', description: 'Premium long-grain, 7.70mm' },
  { value: 'PUSA_BASMATI', label: 'PUSA Basmati', description: 'Traditional aromatic, 7.45mm' },
  { value: 'SUGANDHA', label: 'Sugandha', description: 'Aromatic value segment, 7.90mm' },
  { value: 'TAJ', label: 'Taj', description: 'Aromatic value segment, 8.15mm' },
  { value: 'SHARBATI', label: 'Sharbati', description: 'Aromatic value segment, 7.10mm' },
  { value: 'RH10', label: 'RH-10', description: 'Aromatic value segment, 7.40mm' },
  { value: 'PR11_PR14', label: 'PR-11 / PR-14', description: 'Commercial non-basmati, 6.90mm' },
  { value: 'PR106_PR47', label: 'PR-106 / PR-47', description: 'Commercial non-basmati, 6.50mm' },
  { value: 'PR26', label: 'PR-26', description: 'Commercial non-basmati, 6.40mm' },
];

const RICE_QUANTITIES = [
  { value: '1_TRUCK', label: '1 Truck (20 MT)', description: '20,000 Kg - Single truckload' },
  { value: '2_5_TRUCKS', label: '2–5 Trucks (40-100 MT)', description: '40,000-100,000 Kg' },
  { value: '6_10_TRUCKS', label: '6–10 Trucks (120-200 MT)', description: '120,000-200,000 Kg' },
  { value: '10_PLUS_TRUCKS', label: '10+ Trucks (200+ MT)', description: '200,000+ Kg' },
  { value: 'CUSTOM', label: 'Custom Quantity', description: 'Specify exact Kg requirement' },
];

const PACKAGING_OPTIONS = [
  { value: '25KG_PP', label: '25 KG PP Bags', description: 'Standard trade polypropylene bags' },
  { value: '30KG_PP', label: '30 KG PP Bags', description: 'Heavy-duty trade packaging' },
  { value: '50KG_PP', label: '50 KG PP Bags', description: 'Bulk handling format' },
  { value: 'JUMBO_BAGS', label: 'Jumbo Bags (1 MT)', description: 'For institutional/export supply' },
  { value: 'BULK_LOOSE', label: 'Bulk Loose', description: 'Direct silo/truck loading' },
];

const TRADE_TYPES = [
  { value: 'DOMESTIC', label: 'Domestic', description: 'Supply within India' },
  { value: 'EXPORT', label: 'Export', description: 'International supply with documentation' },
];

// Representative price (INR per MT) for each variety – using Steam price where available,
// otherwise the first available price (Raw / White / Golden).
const RICE_VARIETY_PRICES = {
  '1121_BASMATI': 109000,
  '1885_BASMATI': 107000,
  '1718_BASMATI': 106000,
  '1509_BASMATI': 98000,
  '1847_BASMATI': 98000,
  '1401_BASMATI': 105000,
  'PUSA_BASMATI': 100000,
  'SUGANDHA': 88000,
  'TAJ': 86500,
  'SHARBATI': 81000,
  'RH10': 82000,
  'PR11_PR14': 56000,
  'PR106_PR47': 52000,
  'PR26': 49500,
};

const destinationData = [
  {
    location: 'Haryana',
    rates: RICE_VARIETY_PRICES,
  },
];

export const RICE_RATES = {
  Haryana: RICE_VARIETY_PRICES,
};

export function RiceRequirementBuilder({ onComplete }) {
  const config = {
    options: {
      variety: RICE_VARIETIES,
      quantity: RICE_QUANTITIES,
      packaging: [
        { value: '25KG_PP', label: '25 KG PP Bags', description: 'Standard trade polypropylene bags' },
        { value: '30KG_PP', label: '30 KG PP Bags', description: 'Heavy-duty trade packaging' },
        { value: '50KG_PP', label: '50 KG PP Bags', description: 'Bulk handling format' },
        { value: 'JUMBO_BAGS', label: 'Jumbo Bags (1 MT)', description: 'For institutional/export supply' },
        { value: 'BULK_LOOSE', label: 'Bulk Loose', description: 'Direct silo/truck loading' },
      ],
      tradeType: [
        { value: 'DOMESTIC', label: 'Domestic', description: 'Supply within India' },
        { value: 'EXPORT', label: 'Export', description: 'International supply with documentation' },
      ],
    },
    stepDescriptions: {
      variety: 'Select the rice variety and grade',
      quantity: 'How much rice do you need?',
      packaging: 'Preferred packaging format',
      tradeType: 'Is this for domestic or export supply?',
      destination: 'Delivery location or port of discharge',
      timeline: 'When do you need the rice delivered?',
      eligibility: 'Checking serviceability for your requirement',
    },
    destinationData,
  };

  return <RequirementBuilder division="RICE" config={config} onComplete={onComplete} />;
}

export default RiceRequirementBuilder;