import React from 'react';
import { RequirementBuilder } from './RequirementBuilder';

// Stone material options (combined Bhutan & Pakur materials)
const STONE_MATERIALS = [
  { value: 'DUST', label: 'Stone Dust', description: 'Fine stone powder' },
  { value: '10MM_WHITE', label: '10 MM White', description: '10mm white stone' },
  { value: '20MM_WHITE', label: '20 MM White', description: '20mm white stone' },
  { value: '30_40_WHITE', label: '30/40 White', description: '30/40 white stone' },
  { value: '30MM_WHITE', label: '30 MM White', description: '30mm white stone' },
  { value: '40_60_WHITE', label: '40/60 White', description: '40/60 white stone' },
  { value: '10MM_BLACK_KAMJI', label: '10 MM Black Kamji', description: '10mm black kamji' },
  { value: '20MM_BLACK_KAMJI', label: '20 MM Black Kamji', description: '20mm black kamji' },
  { value: '30MM_BLACK_KAMJI', label: '30 MM Black Kamji', description: '30mm black kamji' },
  { value: '40_60_BLACK_KAMJI', label: '40/60 Black Kamji', description: '40/60 black kamji' },
  { value: 'PAKUR_20MM', label: 'Pakur 20 MM (5/8)', description: 'Pakur 20mm' },
  { value: 'PAKUR_30MM', label: 'Pakur 30 MM', description: 'Pakur 30mm' },
  { value: 'PAKUR_40MM', label: 'Pakur 40 MM', description: 'Pakur 40mm' },
  { value: 'PAKUR_10MM', label: 'Pakur 10 MM', description: 'Pakur 10mm' },
];

const STONE_QUANTITIES = [
  { value: '1_TRUCK', label: '1 Truck', description: '~25-30 MT (Single truckload)' },
  { value: '2_5_TRUCKS', label: '2–5 Trucks', description: '50-150 MT (Small project)' },
  { value: '6_10_TRUCKS', label: '6–10 Trucks', description: '150-300 MT (Medium project)' },
  { value: '10_PLUS_TRUCKS', label: '10+ Trucks', description: '300+ MT (Large project)' },
  { value: 'CUSTOM', label: 'Custom Quantity', description: 'Specify exact MT requirement' },
];

// Bhutan Stone rate data (INR per MT)
export const BHUTAN_RATES = {
  'Jalpaiguri': { DUST:1130, '10MM_WHITE':1230, '20MM_WHITE':1600, '30_40_WHITE':1510, '30MM_WHITE':1530, '40_60_WHITE':1430, '10MM_BLACK_KAMJI':1610, '20MM_BLACK_KAMJI':1835, '30MM_BLACK_KAMJI':1795, '40_60_BLACK_KAMJI':1730 },
  'Siliguri': { DUST:1180, '10MM_WHITE':1280, '20MM_WHITE':1650, '30_40_WHITE':1560, '30MM_WHITE':1580, '40_60_WHITE':1480, '10MM_BLACK_KAMJI':1660, '20MM_BLACK_KAMJI':1885, '30MM_BLACK_KAMJI':1845, '40_60_BLACK_KAMJI':1780 },
  'Sonapur': { DUST:1200, '10MM_WHITE':1300, '20MM_WHITE':1670, '30_40_WHITE':1580, '30MM_WHITE':1600, '40_60_WHITE':1500, '10MM_BLACK_KAMJI':1680, '20MM_BLACK_KAMJI':1905, '30MM_BLACK_KAMJI':1865, '40_60_BLACK_KAMJI':1800 },
  'Islampur': { DUST:1230, '10MM_WHITE':1330, '20MM_WHITE':1700, '30_40_WHITE':1610, '30MM_WHITE':1630, '40_60_WHITE':1530, '10MM_BLACK_KAMJI':1710, '20MM_BLACK_KAMJI':1935, '30MM_BLACK_KAMJI':1895, '40_60_BLACK_KAMJI':1830 },
  'Kanki': { DUST:1300, '10MM_WHITE':1400, '20MM_WHITE':1770, '30_40_WHITE':1680, '30MM_WHITE':1700, '40_60_WHITE':1600, '10MM_BLACK_KAMJI':1780, '20MM_BLACK_KAMJI':2005, '30MM_BLACK_KAMJI':1965, '40_60_BLACK_KAMJI':1900 },
  'Thakurganj': { DUST:1230, '10MM_WHITE':1330, '20MM_WHITE':1700, '30_40_WHITE':1610, '30MM_WHITE':1630, '40_60_WHITE':1530, '10MM_BLACK_KAMJI':1710, '20MM_BLACK_KAMJI':1935, '30MM_BLACK_KAMJI':1895, '40_60_BLACK_KAMJI':1830 },
  'Kishanganj': { DUST:1280, '10MM_WHITE':1380, '20MM_WHITE':1750, '30_40_WHITE':1660, '30MM_WHITE':1680, '40_60_WHITE':1580, '10MM_BLACK_KAMJI':1760, '20MM_BLACK_KAMJI':1985, '30MM_BLACK_KAMJI':1945, '40_60_BLACK_KAMJI':1880 },
  'Bahadurgunj': { DUST:1330, '10MM_WHITE':1430, '20MM_WHITE':1800, '30_40_WHITE':1710, '30MM_WHITE':1730, '40_60_WHITE':1630, '10MM_BLACK_KAMJI':1810, '20MM_BLACK_KAMJI':2035, '30MM_BLACK_KAMJI':1995, '40_60_BLACK_KAMJI':1930 },
  'Araria': { DUST:1380, '10MM_WHITE':1480, '20MM_WHITE':1850, '30_40_WHITE':1760, '30MM_WHITE':1780, '40_60_WHITE':1680, '10MM_BLACK_KAMJI':1860, '20MM_BLACK_KAMJI':2085, '30MM_BLACK_KAMJI':2045, '40_60_BLACK_KAMJI':1980 },
  'Kursakata': { DUST:1380, '10MM_WHITE':1480, '20MM_WHITE':1850, '30_40_WHITE':1760, '30MM_WHITE':1780, '40_60_WHITE':1680, '10MM_BLACK_KAMJI':1860, '20MM_BLACK_KAMJI':2085, '30MM_BLACK_KAMJI':2045, '40_60_BLACK_KAMJI':1980 },
  'Bardha': { DUST:1380, '10MM_WHITE':1480, '20MM_WHITE':1850, '30_40_WHITE':1760, '30MM_WHITE':1780, '40_60_WHITE':1680, '10MM_BLACK_KAMJI':1860, '20MM_BLACK_KAMJI':2085, '30MM_BLACK_KAMJI':2045, '40_60_BLACK_KAMJI':1980 },
  'Supaul': { DUST:1380, '10MM_WHITE':1480, '20MM_WHITE':1850, '30_40_WHITE':1760, '30MM_WHITE':1780, '40_60_WHITE':1680, '10MM_BLACK_KAMJI':1860, '20MM_BLACK_KAMJI':2085, '30MM_BLACK_KAMJI':2045, '40_60_BLACK_KAMJI':1980 },
  'Forbesganj': { DUST:1410, '10MM_WHITE':1510, '20MM_WHITE':1880, '30_40_WHITE':1790, '30MM_WHITE':1810, '40_60_WHITE':1710, '10MM_BLACK_KAMJI':1890, '20MM_BLACK_KAMJI':2115, '30MM_BLACK_KAMJI':2075, '40_60_BLACK_KAMJI':2010 },
  'Narpatganj': { DUST:1430, '10MM_WHITE':1530, '20MM_WHITE':1900, '30_40_WHITE':1810, '30MM_WHITE':1830, '40_60_WHITE':1730, '10MM_BLACK_KAMJI':1910, '20MM_BLACK_KAMJI':2135, '30MM_BLACK_KAMJI':2095, '40_60_BLACK_KAMJI':2030 },
  'Kositool': { DUST:1480, '10MM_WHITE':1580, '20MM_WHITE':1950, '30_40_WHITE':1860, '30MM_WHITE':1880, '40_60_WHITE':1780, '10MM_BLACK_KAMJI':1960, '20MM_BLACK_KAMJI':2185, '30MM_BLACK_KAMJI':2145, '40_60_BLACK_KAMJI':2080 },
  'Birpur': { DUST:1480, '10MM_WHITE':1580, '20MM_WHITE':1950, '30_40_WHITE':1860, '30MM_WHITE':1880, '40_60_WHITE':1780, '10MM_BLACK_KAMJI':1960, '20MM_BLACK_KAMJI':2185, '30MM_BLACK_KAMJI':2145, '40_60_BLACK_KAMJI':2080 },
  'Phulparas': { DUST:1530, '10MM_WHITE':1630, '20MM_WHITE':2000, '30_40_WHITE':1910, '30MM_WHITE':1930, '40_60_WHITE':1830, '10MM_BLACK_KAMJI':2010, '20MM_BLACK_KAMJI':2235, '30MM_BLACK_KAMJI':2195, '40_60_BLACK_KAMJI':2130 },
  'Narhiya S Bihar': { DUST:1530, '10MM_WHITE':1630, '20MM_WHITE':2000, '30_40_WHITE':1910, '30MM_WHITE':1930, '40_60_WHITE':1830, '10MM_BLACK_KAMJI':2010, '20MM_BLACK_KAMJI':2235, '30MM_BLACK_KAMJI':2195, '40_60_BLACK_KAMJI':2130 },
  'Jhanjharpur': { DUST:1580, '10MM_WHITE':1680, '20MM_WHITE':2050, '30_40_WHITE':1960, '30MM_WHITE':1980, '40_60_WHITE':1880, '10MM_BLACK_KAMJI':2060, '20MM_BLACK_KAMJI':2285, '30MM_BLACK_KAMJI':2245, '40_60_BLACK_KAMJI':2180 },
  'Khutauna': { DUST:1580, '10MM_WHITE':1680, '20MM_WHITE':2050, '30_40_WHITE':1960, '30MM_WHITE':1980, '40_60_WHITE':1880, '10MM_BLACK_KAMJI':2060, '20MM_BLACK_KAMJI':2285, '30MM_BLACK_KAMJI':2245, '40_60_BLACK_KAMJI':2180 },
  'Darbhanga': { DUST:1630, '10MM_WHITE':1730, '20MM_WHITE':2100, '30_40_WHITE':2010, '30MM_WHITE':2030, '40_60_WHITE':1930, '10MM_BLACK_KAMJI':2110, '20MM_BLACK_KAMJI':2335, '30MM_BLACK_KAMJI':2295, '40_60_BLACK_KAMJI':2230 },
  'Madhubani': { DUST:1630, '10MM_WHITE':1730, '20MM_WHITE':2100, '30_40_WHITE':2010, '30MM_WHITE':2030, '40_60_WHITE':1930, '10MM_BLACK_KAMJI':2110, '20MM_BLACK_KAMJI':2335, '30MM_BLACK_KAMJI':2295, '40_60_BLACK_KAMJI':2230 },
  'Samastipur': { DUST:1680, '10MM_WHITE':1780, '20MM_WHITE':2150, '30_40_WHITE':2060, '30MM_WHITE':2080, '40_60_WHITE':1980, '10MM_BLACK_KAMJI':2160, '20MM_BLACK_KAMJI':2385, '30MM_BLACK_KAMJI':2345, '40_60_BLACK_KAMJI':2280 },
  'Sitamarhi': { DUST:1740, '10MM_WHITE':1840, '20MM_WHITE':2210, '30_40_WHITE':2120, '30MM_WHITE':2140, '40_60_WHITE':2040, '10MM_BLACK_KAMJI':2220, '20MM_BLACK_KAMJI':2445, '30MM_BLACK_KAMJI':2405, '40_60_BLACK_KAMJI':2340 },
  'Muzaffarpur': { DUST:1800, '10MM_WHITE':1900, '20MM_WHITE':2270, '30_40_WHITE':2180, '30MM_WHITE':2200, '40_60_WHITE':2100, '10MM_BLACK_KAMJI':2280, '20MM_BLACK_KAMJI':2505, '30MM_BLACK_KAMJI':2465, '40_60_BLACK_KAMJI':2400 },
};

// Pakur Stone rate data (three payment terms) - we will use 100% Advance as default for estimation
export const PAKUR_RATES_ADV100 = {
  'Kolkata': { 'PAKUR_20MM':2020, 'PAKUR_30MM':2020, 'PAKUR_40MM':1920, 'PAKUR_10MM':1410 },
  'Siliguri': { 'PAKUR_20MM':2330, 'PAKUR_30MM':2330, 'PAKUR_40MM':2230, 'PAKUR_10MM':1755 },
  'Malda': { 'PAKUR_20MM':1555, 'PAKUR_30MM':1555, 'PAKUR_40MM':null, 'PAKUR_10MM':905 },
  'Sitamarhi': { 'PAKUR_20MM':2705, 'PAKUR_30MM':2705, 'PAKUR_40MM':2555, 'PAKUR_10MM':2105 },
  'Chhapra': { 'PAKUR_20MM':2705, 'PAKUR_30MM':2705, 'PAKUR_40MM':2555, 'PAKUR_10MM':2105 },
  'Madhepura': { 'PAKUR_20MM':2455, 'PAKUR_30MM':2455, 'PAKUR_40MM':2305, 'PAKUR_10MM':1855 },
  'Hajipur': { 'PAKUR_20MM':2605, 'PAKUR_30MM':2605, 'PAKUR_40MM':2455, 'PAKUR_10MM':2005 },
  'Katihar': { 'PAKUR_20MM':2055, 'PAKUR_30MM':2055, 'PAKUR_40MM':1905, 'PAKUR_10MM':1455 },
  'Purnia': { 'PAKUR_20MM':2055, 'PAKUR_30MM':2055, 'PAKUR_40MM':1905, 'PAKUR_10MM':1555 },
  'Bhagalpur': { 'PAKUR_20MM':1880, 'PAKUR_30MM':1880, 'PAKUR_40MM':1830, 'PAKUR_10MM':1280 },
  'Bihar Sharif': { 'PAKUR_20MM':2380, 'PAKUR_30MM':2380, 'PAKUR_40MM':2230, 'PAKUR_10MM':1780 },
  'Siwan': { 'PAKUR_20MM':2730, 'PAKUR_30MM':2730, 'PAKUR_40MM':2580, 'PAKUR_10MM':2130 },
  'Darbhanga': { 'PAKUR_20MM':2705, 'PAKUR_30MM':2705, 'PAKUR_40MM':2555, 'PAKUR_10MM':2105 },
  'Araria': { 'PAKUR_20MM':2155, 'PAKUR_30MM':2155, 'PAKUR_40MM':2005, 'PAKUR_10MM':1555 },
  'Sheikhpura': { 'PAKUR_20MM':2380, 'PAKUR_30MM':2380, 'PAKUR_40MM':2230, 'PAKUR_10MM':1780 },
  'Madhubani': { 'PAKUR_20MM':2605, 'PAKUR_30MM':2605, 'PAKUR_40MM':2455, 'PAKUR_10MM':2005 },
  'Muzaffarpur': { 'PAKUR_20MM':2505, 'PAKUR_30MM':2505, 'PAKUR_40MM':2355, 'PAKUR_10MM':1905 },
  'Kahalgaon': { 'PAKUR_20MM':1780, 'PAKUR_30MM':1780, 'PAKUR_40MM':1630, 'PAKUR_10MM':1180 },
  'Patna': { 'PAKUR_20MM':2480, 'PAKUR_30MM':2480, 'PAKUR_40MM':2330, 'PAKUR_10MM':1880 },
  'Kishanganj': { 'PAKUR_20MM':2005, 'PAKUR_30MM':2005, 'PAKUR_40MM':1905, 'PAKUR_10MM':1505 },
  'Forbesganj': { 'PAKUR_20MM':2205, 'PAKUR_30MM':2205, 'PAKUR_40MM':2055, 'PAKUR_10MM':1705 },
  'Naugachia': { 'PAKUR_20MM':2205, 'PAKUR_30MM':2205, 'PAKUR_40MM':2055, 'PAKUR_10MM':1755 },
  'Banka': { 'PAKUR_20MM':1780, 'PAKUR_30MM':1780, 'PAKUR_40MM':1630, 'PAKUR_10MM':1180 },
  'Sheohar': { 'PAKUR_20MM':2680, 'PAKUR_30MM':2680, 'PAKUR_40MM':2530, 'PAKUR_10MM':2080 },
};

// Build destinationData array for RequirementBuilder
const destinationData = [];

// Add Bhutan locations
Object.entries(BHUTAN_RATES).forEach(([location, rates]) => {
  destinationData.push({ location, rates, type: 'BHUTAN' });
});

// Add Pakur locations
Object.entries(PAKUR_RATES_ADV100).forEach(([location, rates]) => {
  destinationData.push({ location, rates, type: 'PAKUR' });
});

export function StoneRequirementBuilder({ onComplete }) {
  const config = {
    options: {
      material: STONE_MATERIALS,
      quantity: STONE_QUANTITIES,
    },
    stepDescriptions: {
      material: 'Select the stone material',
      quantity: 'How many truckloads do you need?',
      destination: 'Where should we deliver the material?',
      timeline: 'When do you need the material delivered?',
    },
    destinationData,
  };

  return <RequirementBuilder division="STONE" config={config} onComplete={onComplete} />;
}

export default StoneRequirementBuilder;