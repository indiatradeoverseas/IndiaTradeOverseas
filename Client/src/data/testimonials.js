// Product-benefit captions overlaid on division photography for the coverflow
// testimonial carousels (Prakriti, Rice, Stone). Card count is intentionally
// tied 1:1 to each division's image folder (see Client/public/images/<division>_images).
// `trustTag` is a short quality/assurance marker (not an attributed customer quote)
// shown under the headline to reinforce credibility.

export const TEA_ACCENT = '#50C878';
export const TEA_ACCENT_TEXT = '#04140E';

export const RICE_ACCENT = '#D9B85C';
export const RICE_ACCENT_TEXT = '#2A1F08';

export const STONE_ACCENT = '#C5A059';
export const STONE_ACCENT_TEXT = '#1B2126';

// Trust-building copy shown beside the carousel on each division's Testimonials section.
export const TEA_TRUST_PARAGRAPH = "Every batch we export traces back to the estate it was grown on — from leaf pluck to final packing. Our sourcing team works directly with growers across India's finest tea-growing regions, verifying quality at each stage before a single kilogram ships. Rigorous grading, transparent documentation, and consistent batch-to-batch quality mean trade partners know exactly what they're getting, every time.";

export const RICE_TRUST_PARAGRAPH = 'From paddy field to export container, every stage of our rice supply chain is built for consistency. We partner directly with growers, mill to precise grain specifications, and triple-check every batch for purity and grade before it leaves our facilities. Complete documentation, reliable dispatch timelines, and verifiable grain quality are what keep our trade partners coming back.';

export const STONE_TRUST_PARAGRAPH = "Our aggregate and construction materials are sourced from verified quarries and graded to exact specifications before dispatch — no shortcuts, no inconsistent batches. Whether it's a single truckload or a bulk infrastructure order, every consignment is quality-checked and documented for compliance. That reliability is why contractors and developers trust us for repeat, large-scale orders.";

export const teaTestimonials = [
  { id: 'tea-g1', image: '/images/tea_images/g1.jpeg', alt: 'Tea estate house at dusk overlooking the plantation', headline: 'Straight From The Estate To Your Cup', trustTag: 'Estate-Direct Sourcing' },
  { id: 'tea-g2', image: '/images/tea_images/g2.jpeg', alt: 'Misty sunrise over a high-altitude tea valley', headline: 'Grown At Altitude. Graded For Excellence.', trustTag: 'High-Altitude Grown' },
  { id: 'tea-g3', image: '/images/tea_images/g3.jpeg', alt: 'Heritage colonial estate house amid tea gardens', headline: 'Legacy Estates. Consistent Quality, Season After Season.', trustTag: 'Century-Old Estate Legacy' },
  { id: 'tea-g4', image: '/images/tea_images/g4.jpeg', alt: 'Tea being poured from a cast-iron kettle into a glass cup', headline: 'Full-Leaf Character In Every Batch', trustTag: 'Full-Leaf Grade Guaranteed' },
  { id: 'tea-g5', image: '/images/tea_images/g5.jpeg', alt: 'Steaming cup of tea surrounded by fresh leaves', headline: 'Freshly Processed. Ready To Export.', trustTag: 'Freshly Processed Daily' },
  { id: 'tea-g6', image: '/images/tea_images/g6.jpeg', alt: 'Tea picker walking through the plantation with a woven basket', headline: 'Hand-Plucked By Growers We Know By Name', trustTag: 'Hand-Plucked, Not Machine-Cut' },
  { id: 'tea-g7', image: '/images/tea_images/g7.jpeg', alt: 'Tea estate house lit up at night beside the fields', headline: 'Quality Control Never Sleeps', trustTag: 'Round-The-Clock Quality Checks' },
];

export const riceTestimonials = [
  { id: 'rice-1', image: '/images/rice_images/rice_1.jpeg', alt: 'Bowl of premium rice beside golden paddy fields at sunrise', headline: 'From Paddy Field To Premium Bowl', trustTag: 'Farm-Fresh Harvest' },
  { id: 'rice-2', image: '/images/rice_images/rice_2.jpeg', alt: 'Rice grains pouring into a brass bowl', headline: 'Every Grain, Triple-Cleaned And Graded', trustTag: 'Triple-Cleaned & Graded' },
  { id: 'rice-3', image: '/images/rice_images/rice_3.jpeg', alt: 'Rice processing mill beside a container port at sunrise', headline: 'Milled, Packed, And Shipped — On Schedule', trustTag: 'On-Time Export Dispatch' },
  { id: 'rice-4', image: '/images/rice_images/rice_4.jpeg', alt: 'Close-up of a rice sorting and milling machine', headline: 'Precision Sorting For Uniform Grain Length', trustTag: 'Precision Grain Sorting' },
  { id: 'rice-5', image: '/images/rice_images/rice_5.jpeg', alt: 'Dramatic sunlight over a rice paddy field', headline: "Sourced From India's Finest Growing Belts", trustTag: 'Prime Growing Belt Sourced' },
  { id: 'rice-6', image: '/images/rice_images/rice_6.jpeg', alt: "Farmer's hands holding a freshly harvested bundle of rice paddy", headline: 'Backed By Farmers We Partner With Directly', trustTag: 'Direct Farmer Partnerships' },
  { id: 'rice-7', image: '/images/rice_images/rice_7.jpeg', alt: 'Family sharing a meal with a bowl of rice in the foreground', headline: 'Trusted On Tables Across The Globe', trustTag: 'Family-Trusted Quality' },
  { id: 'rice-8', image: '/images/rice_images/rice_8.jpeg', alt: 'Minimalist studio shot of a rice bowl with a paddy sprig', headline: 'Premium Basmati. Uncompromising Standards.', trustTag: 'Premium Grade Basmati' },
  { id: 'rice-9', image: '/images/rice_images/rice_9.jpeg', alt: 'Golden hour light over a ripe rice paddy field', headline: 'Harvested At Peak Ripeness', trustTag: 'Peak-Ripeness Harvest' },
  { id: 'rice-10', image: '/images/rice_images/rice_10.jpeg', alt: 'Warehouse stacked with rice sacks and a forklift', headline: 'Bulk-Ready. Export-Grade. Always In Stock.', trustTag: 'Bulk Stock Always Ready' },
  { id: 'rice-11', image: '/images/rice_images/rice_11.jpeg', alt: 'Aromatic rice dish served in a copper handi', headline: 'The Aroma That Sets Our Rice Apart', trustTag: 'Signature Aroma, Every Batch' },
];

export const stoneTestimonials = [
  { id: 'stone-10mm', image: '/images/stone_images/10mmm.jpg', alt: '10mm graded stone aggregate', headline: '10MM Aggregate — Precision-Graded For Concrete Mixes', trustTag: 'IS-Graded Aggregate' },
  { id: 'stone-20mm', image: '/images/stone_images/20mmm.jpg', alt: '20mm graded stone aggregate', headline: '20MM Aggregate — Engineered For Structural Strength', trustTag: 'Structural-Grade Strength' },
  { id: 'stone-30mm', image: '/images/stone_images/30mmm.jpg', alt: '30mm graded stone aggregate', headline: '30MM Aggregate — Built For Heavy-Duty Infrastructure', trustTag: 'Heavy-Duty Infrastructure Ready' },
  { id: 'stone-40mm', image: '/images/stone_images/40mmm.jpg', alt: '40mm graded stone aggregate', headline: '40MM Aggregate — Uniform Size, Reliable Load-Bearing', trustTag: 'Uniform Load-Bearing Size' },
  { id: 'stone-60mm', image: '/images/stone_images/60mmm.jpg', alt: '60mm graded stone aggregate', headline: '60MM Aggregate — Bulk Supply For Large-Scale Projects', trustTag: 'Large-Scale Bulk Supply' },
  { id: 'stone-dust', image: '/images/stone_images/Stone_dust.png', alt: 'Fine stone dust product', headline: 'Stone Dust — The Finishing Layer Every Project Needs', trustTag: 'Consistent Fine Grading' },
  { id: 'stone-wmm', image: '/images/stone_images/Wmm.png', alt: 'Wet mix macadam road base material', headline: 'Wet Mix Macadam — Road-Ready Base Material', trustTag: 'Road-Base Compliance Tested' },
];
