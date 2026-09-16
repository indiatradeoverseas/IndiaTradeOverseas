import React from 'react';
import { RequirementBuilder } from './RequirementBuilder';

export const TEA_RATES = {};

const TEA_TYPES = [
  { value: 'CTC_DUST', label: 'CTC Dust', description: 'Strong liquor, quick brewing - commercial use' },
  { value: 'CTC_BP', label: 'CTC BP (Broken Pekoe)', description: 'Balanced body & aroma - daily tea' },
  { value: 'CTC_BOP', label: 'CTC BOP (Broken Orange Pekoe)', description: 'Popular grade - colour, character, body' },
  { value: 'CTC_BOPSM', label: 'CTC BOPSM', description: 'Fine broken grade - strong, brisk cup' },
  { value: 'CTC_OF', label: 'CTC OF (Orange Fannings)', description: 'Fine grade - quick brewing applications' },
  { value: 'ORTHODOX_P', label: 'Orthodox Pekoe', description: 'Leaf tea - aroma-led premium' },
  { value: 'ORTHODOX_FTGFOP1', label: 'FTGFOP1 (Finest Tippy Golden Flowery OP)', description: 'Premium whole leaf - first flush' },
  { value: 'ORTHODOX_TGFOP', label: 'TGFOP (Tippy Golden Flowery OP)', description: 'High grade whole leaf - second flush' },
  { value: 'GREEN_TEA', label: 'Green Tea', description: 'Unoxidized - health & wellness segment' },
  { value: 'WHITE_TEA', label: 'White Tea', description: 'Minimally processed - premium niche' },
  { value: 'FLAVOURED', label: 'Flavoured Tea', description: 'Value-added - retail differentiation' },
  { value: 'CUSTOM_BLEND', label: 'Custom Blend', description: 'Grade & taste matched to requirements' },
];

const TEA_QUANTITIES = [
  { value: '100KG', label: '100 Kg', description: 'Small lot - retail/tea shop' },
  { value: '500KG', label: '500 Kg', description: 'Medium lot - distributor/blender' },
  { value: '1000KG', label: '1,000 Kg (1 MT)', description: 'Standard truckload - wholesale' },
  { value: '5000KG', label: '5,000 Kg (5 MT)', description: 'Large lot - institutional/export' },
  { value: '10000KG', label: '10,000+ Kg (10+ MT)', description: 'Container load - major buyer' },
  { value: 'CUSTOM', label: 'Custom Quantity', description: 'Specify exact Kg requirement' },
];

const TEA_PACKAGING = [
  { value: '100G_RETAIL', label: '100 g Retail Packs', description: 'Consumer shelf-ready format' },
  { value: '250G_RETAIL', label: '250 g Retail Packs', description: 'Standard consumer format' },
  { value: '500G_RETAIL', label: '500 g Retail Packs', description: 'Family consumer format' },
  { value: '1KG_TRADE', label: '1 Kg Trade Packs', description: 'Tea shops, cafes, restaurants' },
  { value: '5KG_BULK', label: '5 Kg Bulk Packs', description: 'Distributors, wholesalers, foodservice' },
  { value: '20KG_PP', label: '20 Kg PP Bags', description: 'Standard export/trade bulk' },
  { value: '40KG_PP', label: '40 Kg PP Bags', description: 'Large bulk handling' },
  { value: 'CUSTOM', label: 'Custom Packaging', description: 'Private label / buyer specified' },
];

const TRADE_TYPES = [
  { value: 'DOMESTIC', label: 'Domestic', description: 'Supply within India' },
  { value: 'EXPORT', label: 'Export', description: 'International supply with documentation' },
];

const PRIVATE_LABEL_OPTIONS = [
  { value: 'YES', label: 'Yes - Private Label Required', description: 'Custom blend, label, packaging & commercial config' },
  { value: 'NO', label: 'No - Standard Supply', description: 'Prakriti branded or bulk supply' },
];

export function TeaRequirementBuilder({ onComplete }) {
  const config = {
    options: {
      teaType: TEA_TYPES,
      quantity: TEA_QUANTITIES,
      packaging: TEA_PACKAGING,
      tradeType: TRADE_TYPES,
      privateLabel: PRIVATE_LABEL_OPTIONS,
    },
    stepDescriptions: {
      teaType: 'Select the tea type and grade',
      quantity: 'How much tea do you need?',
      packaging: 'Preferred packaging format',
      tradeType: 'Is this for domestic or export supply?',
      privateLabel: 'Do you need private label / custom blend?',
      destination: 'Delivery location',
      timeline: 'When do you need the tea delivered?',
      eligibility: 'Checking serviceability for your requirement',
    },
    destinationData: [], // will be filled later when rates are available
  };

  return <RequirementBuilder division="TEA" config={config} onComplete={onComplete} />;
}

export default TeaRequirementBuilder;