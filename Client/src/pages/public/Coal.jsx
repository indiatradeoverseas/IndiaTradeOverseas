import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import { pushDataLayerEvent } from '../../utils/analytics';

const HERO_IMAGES = [
  '/images/coal-images/coal-1.png',
  '/images/coal-images/coal-2.png',
  '/images/coal-images/coal-3.png',
  '/images/coal-images/coal-4.png'
];

function Coal() {
  useDocumentMeta({
    title: 'Coal Supplier in India | Domestic & Imported Coal | ITO',
    description: 'Source Assam, Jharkhand, Indonesian and U.S. coal through India Trade Overseas. Share GCV, quantity and destination for a bulk quotation.',
    canonicalPath: '/coal'
  });

  useEffect(() => {
    pushDataLayerEvent('view_coal_page', {});
  }, []);

  const [currentIndex, setCurrentIndex] = useState(0);

  // Match the Rice.jsx hero carousel: one active image at a time,
  // AnimatePresence handles the premium cross-fade/scale transition.
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % HERO_IMAGES.length);
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentIndex]);

  const scrollToQuote = () => {
    document.getElementById('quote-form')?.scrollIntoView({ behavior: 'smooth' });
    pushDataLayerEvent('start_coal_quote', {});
  };

  const scrollToSpecs = () => {
    document.getElementById('specifications')?.scrollIntoView({ behavior: 'smooth' });
    pushDataLayerEvent('view_gcv_table', {});
  };

  const handleOriginSelect = (origin) => {
    pushDataLayerEvent('select_coal_origin', { origin });
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up { animation: fade-up 0.9s ease-out forwards; }
      `}} />
      <div className="relative z-10">
        <section className="coal-hero relative min-h-screen overflow-hidden" aria-label="Hero with auto-rotating coal images" style={{ backgroundColor: '#071826' }}>
          <div className="absolute inset-0 z-0">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentIndex}
                src={HERO_IMAGES[currentIndex]}
                alt="Coal mining and supply"
                initial={{
                  opacity: 0,
                  scale: 1.02
                }}
                animate={{
                  opacity: 1,
                  scale: 1
                }}
                exit={{
                  opacity: 0
                }}
                transition={{
                  duration: 1.2,
                  ease: 'easeInOut'
                }}
                className="absolute inset-0 w-full h-full object-cover object-center"
                style={{
                  filter: 'brightness(1.2) contrast(1.02)'
                }}
              />
            </AnimatePresence>

            <div
              className="absolute inset-0 z-1"
              style={{
                background:
                  'linear-gradient(to right, rgba(7, 24, 38, 0.55) 35%, rgba(7, 24, 38, 0.30) 70%, transparent 100%)'
              }}
            />

            <div
              className="absolute inset-0 z-1"
              style={{
                background:
                  'linear-gradient(to right, #071826 10%, transparent 65%)'
              }}
            />
          </div>

          {/* Hero copy with entrance animation */}
          <div className="relative z-10 min-h-screen flex flex-col justify-start md:justify-center px-6 pt-32 md:pt-0 pb-10 md:pb-0 text-white opacity-0 animate-fade-up">
            <span className="text-white text-sm md:text-base tracking-widest uppercase mb-4">COAL & INDUSTRIAL MATERIALS</span>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6">
              POWERING INDUSTRY.<br />DELIVERING RELIABILITY.
            </h1>
            <p className="text-lg md:text-xl max-w-2xl mb-8">
              Domestic and imported coal supply coordinated around specification, quantity and destination.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={scrollToQuote}
                className="bg-[#D4A84F] text-[#F4F0E7] px-8 py-4 rounded font-bold text-lg hover:brightness-110 transition"
              >
                REQUEST BULK QUOTE
              </button>
              <button
                onClick={scrollToSpecs}
                className="border-2 border-[#D4A84F] text-white px-8 py-4 rounded font-bold text-lg bg-transparent hover:bg-[#D4A84F] hover:text-[#F4F0E7] transition"
              >
                VIEW COAL SPECIFICATIONS
              </button>
            </div>
          </div>

        </section>

        {/* Trust strip */}
        <div className="px-6 py-4 text-center text-sm text-[#F4F0E7]/70 border-y border-white/10 bg-[#101214]/80 backdrop-blur">
          ✔ ISO‑9001 certified &nbsp;|&nbsp; 150+ satisfied clients &nbsp;|&nbsp; 24/7 dedicated support
        </div>

      <section className="py-20 px-6" aria-labelledby="capability-title" style={{ backgroundColor: '#101214' }}>
        <h2 id="capability-title" className="text-3xl md:text-4xl text-[#F4F0E7] text-center mb-12">CORE CAPABILITIES</h2>
        <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-6">
          <span className="bg-transparent border border-[#D4A84F]/70 text-[#F4F0E7] px-6 py-3 rounded-full font-semibold" onClick={() => handleOriginSelect('domestic')}>Domestic Coal</span>
          <span className="bg-transparent border border-[#D4A84F]/70 text-[#F4F0E7] px-6 py-3 rounded-full font-semibold" onClick={() => handleOriginSelect('imported')}>Imported Coal</span>
          <span className="bg-transparent border border-[#D4A84F]/70 text-[#F4F0E7] px-6 py-3 rounded-full font-semibold" onClick={() => handleOriginSelect('logistics')}>Logistics Support</span>
        </div>
      </section>

      <section id="specifications" className="py-20 px-6" aria-labelledby="portfolio-title" style={{ backgroundColor: '#071826' }}>
        <div className="max-w-6xl mx-auto">
          <h2 id="portfolio-title" className="text-3xl md:text-4xl text-[#F4F0E7] mb-6">COAL SUPPLY BUILT AROUND YOUR SPECIFICATION</h2>
          <p className="text-[#F4F0E7] mb-12 max-w-3xl">
            Every industrial requirement is different. Coal selection must consider calorific value, moisture, ash, sulphur, volatile matter, fixed carbon, sizing, application, delivery location and commercial terms. India Trade Overseas coordinates each requirement according to the buyer's declared technical and commercial parameters.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <OriginCard
              name="ASSAM"
              description="High-calorific domestic option with low-ash characteristics. Sulphur can be comparatively high – confirm via current mine declaration / COA."
              grades={[
                { label: 'G1', range: '>7,500–7,600 kcal/kg' },
                { label: 'G2', range: '>6,700–7,000 kcal/kg' },
                { label: 'G4', range: '>6,100–6,400 kcal/kg' }
              ]}
              details={[
                'Reference: North Eastern Coalfields, Tikak Colliery',
                'Mandatory checks: grade, GCV basis, moisture, ash, sulphur, VM, FC, sizing, qty, loading point, transport, application, COA'
              ]}
              onSelect={() => handleOriginSelect('Assam')}
            />
            <OriginCard
              name="JHARKHAND"
              description="Multiple coalfields, seams & product categories – never market under one GCV."
              grades={[]}
              details={[
                'Non-coking thermal – G-grade, size, COA',
                'Steam / industrial – boiler GCV, ash, sulphur, moisture, size',
                'ROM or Sized – source permission, oversize/undersize tolerance',
                'Washed – yield, ash guarantee, moisture, test method',
                'Coking / Metallurgical – ash + full coking analysis (CSN/FSI, CSR, CRI, fluidity, vitrinite…)'
              ]}
              onSelect={() => handleOriginSelect('Jharkhand')}
            />
            <OriginCard
              name="INDONESIA"
              description="Thermal coal quoted on GAR unless otherwise agreed. HBA benchmarks (Ministry of EMR, Dec 227/2023) are reference only."
              grades={[
                { label: 'HBA', gcv: '6,322', tm: '12.26%', s: '0.66%', ash: '7.94%' },
                { label: 'HBA I', gcv: '5,300', tm: '21.32%', s: '0.75%', ash: '6.04%' },
                { label: 'HBA II', gcv: '4,100', tm: '35.73%', s: '0.23%', ash: '3.90%' },
                { label: 'HBA III', gcv: '3,400', tm: '44.30%', s: '0.24%', ash: '3.88%' }
              ]}
              details={[
                'Enquiry fields: GAR/NAR, rejection value, TM, IM, ash, S, VM, FC, HGI, AFT, cargo size, load/discharge ports, laycan, Incoterm, inspection agency, sampling method, accepted lab'
              ]}
              isTable={true}
              onSelect={() => handleOriginSelect('Indonesia')}
            />
            <OriginCard
              name="UNITED STATES"
              description="Enquiries may cover Anthracite, Bituminous, Sub-bituminous, Lignite, Thermal, Metallurgical."
              grades={[
                { label: 'Anthracite', mmbtu: '25.090', kcal: '6,976' },
                { label: 'Bituminous', mmbtu: '23.270', kcal: '6,470' },
                { label: 'Sub-bituminous', mmbtu: '17.490', kcal: '4,863' },
                { label: 'Lignite', mmbtu: '12.970', kcal: '3,606' }
              ]}
              details={[
                'Conversion: 1 MMBtu/short ton ≈ 278 kcal/kg',
                'Reference values are not cargo guarantees'
              ]}
              isUsTable={true}
              onSelect={() => handleOriginSelect('U.S.')}
            />
          </div>
        </div>
      </section>

      <section className="py-16 px-6" aria-labelledby="g-title" style={{ backgroundColor: '#101214' }}>
        <div className="max-w-6xl mx-auto overflow-x-auto">
          <h2 id="g-title" className="text-3xl md:text-4xl text-[#F4F0E7] mb-6 text-center">INDIAN G1–G17 COAL CLASSIFICATION (Ministry of Coal)</h2>
          <div className="mx-auto w-full max-w-md rounded-md border border-white/20 bg-[#071826]/35 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.25)] overflow-hidden">
            <table className="w-full border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-[#071826]/45 text-[#F4F0E7] border-b border-[#D4A84F]/60">
                  <th className="px-4 py-2 text-left font-semibold">Grade</th>
                  <th className="px-4 py-2 text-left font-semibold">GCV (kcal/kg)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['G1', '>7,000'],
                  ['G2', '>6,700–7,000'],
                  ['G3', '>6,400–6,700'],
                  ['G4', '>6,100–6,400'],
                  ['G5', '>5,800–6,100'],
                  ['G6', '>5,500–5,800'],
                  ['G7', '>5,200–5,500'],
                  ['G8', '>4,900–5,200'],
                  ['G9', '>4,600–4,900'],
                  ['G10', '>4,300–4,600'],
                  ['G11', '>4,000–4,300'],
                  ['G12', '>3,700–4,000'],
                  ['G13', '>3,400–3,700'],
                  ['G14', '>3,100–3,400'],
                  ['G15', '>2,800–3,100'],
                  ['G16', '>2,500–2,800'],
                  ['G17', '>2,200–2,500']
                ].map(([grade, gcv]) => (
                  <tr key={grade} className="border-b border-white/15 last:border-b-0">
                    <td className="px-4 py-1.5 font-mono font-semibold text-[#F4F0E7]">{grade}</td>
                    <td className="px-4 py-1.5 text-[#F4F0E7]">{gcv}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="max-w-md mx-auto text-xs text-[#F4F0E7]/65 mt-3 text-center">Actual mine availability and dispatch grade remain subject to current source declaration and commercial confirmation.</p>
        </div>
      </section>

      <section className="py-20 px-6" aria-labelledby="cok-title" style={{ backgroundColor: '#071826' }}>
        <div className="max-w-6xl mx-auto">
          <h2 id="cok-title" className="text-3xl md:text-4xl text-[#F4F0E7] mb-4 text-center">COKING COAL CLASSIFICATION</h2>
          <p className="text-center text-[#F4F0E7] mb-8">Coking coal cannot be evaluated by GCV alone.</p>

          <div className="mx-auto w-full max-w-md rounded-md border border-white/20 bg-[#071826]/35 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.25)] overflow-hidden mb-10">
            <table className="w-full border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-[#071826]/45 text-[#F4F0E7] border-b border-[#D4A84F]/60">
                  <th className="px-4 py-2 text-left font-semibold">Category</th>
                  <th className="px-4 py-2 text-left font-semibold">Ash %</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Steel Grade I', '≤15'],
                  ['Steel Grade II', '15–18'],
                  ['Washery Grade I', '18–21'],
                  ['Washery Grade II', '21–24'],
                  ['Washery Grade III', '24–28'],
                  ['Washery Grade IV', '28–35'],
                  ['Washery Grade V', '35–42'],
                  ['Washery Grade VI', '42–49']
                ].map(([cat, ash]) => (
                  <tr key={cat} className="border-b border-[#F4F0E7]/20 last:border-b-0">
                    <td className="px-4 py-1.5 text-[#F4F0E7]">{cat}</td>
                    <td className="px-4 py-1.5 text-[#F4F0E7]">{ash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-xl text-[#F4F0E7] mb-4 text-center">Semi-coking / Weakly coking</h3>
          <div className="mx-auto w-full max-w-md rounded-md border border-white/20 bg-[#071826]/35 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.25)] overflow-hidden mb-5">
            <table className="w-full border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-[#071826]/45 text-[#F4F0E7] border-b border-[#D4A84F]/60">
                  <th className="px-4 py-2 text-left font-semibold">Grade</th>
                  <th className="px-4 py-2 text-left font-semibold">Ash + Moisture %</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Semi-Coking I', '≤19'],
                  ['Semi-Coking II', '19–24']
                ].map(([grade, val]) => (
                  <tr key={grade} className="border-b border-[#F4F0E7]/20 last:border-b-0">
                    <td className="px-4 py-1.5 text-[#F4F0E7]">{grade}</td>
                    <td className="px-4 py-1.5 text-[#F4F0E7]">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="max-w-md mx-auto text-sm text-[#F4F0E7]/70 mt-4 text-center">Additional metallurgical parameters: total ash, sulphur, phosphorus, VM, FC, CSN/FSI, CSR, CRI, max fluidity, vitrinite, moisture, size distribution, coke-making suitability.</p>
        </div>
      </section>

      <section className="py-20 px-6" aria-labelledby="cv-title" style={{ backgroundColor: '#101214' }}>
        <div className="max-w-6xl mx-auto">
          <h2 id="cv-title" className="text-3xl md:text-4xl text-[#F4F0E7] mb-6 text-center">CALORIFIC VALUE TERMINOLOGY</h2>

          <div className="mx-auto w-full max-w-md rounded-md border border-white/20 bg-[#071826]/35 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.25)] overflow-hidden">
            <table className="w-full border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-[#071826]/45 text-[#F4F0E7] border-b border-[#D4A84F]/60">
                  <th className="px-4 py-2 text-left font-semibold">Term</th>
                  <th className="px-4 py-2 text-left font-semibold">Meaning</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['GCV', 'Gross Calorific Value / Higher Heating Value'],
                  ['NCV', 'Net Calorific Value / Lower Heating Value'],
                  ['GAR', 'Gross calorific value on as-received basis'],
                  ['NAR', 'Net calorific value on as-received basis'],
                  ['ARB', 'As-received basis'],
                  ['ADB', 'Air-dried basis'],
                  ['DB', 'Dry basis'],
                  ['DAF', 'Dry ash-free basis']
                ].map(([term, meaning]) => (
                  <tr key={term} className="border-b border-white/15 last:border-b-0">
                    <td className="px-4 py-1.5 font-mono font-semibold text-[#F4F0E7]">{term}</td>
                    <td className="px-4 py-1.5 text-[#F4F0E7]">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="max-w-md mx-auto mt-3 text-xs text-[#D4A84F] font-semibold text-center">Mandatory: A value such as "5,500 kcal/kg" is incomplete unless the basis (GAR, ARB, ADB, DB, NAR, DAF…) is also stated.</p>
        </div>
      </section>

      <section id="quote-form" className="py-20 px-6" aria-labelledby="quote-title" style={{ backgroundColor: '#071826' }}>
        <div className="max-w-4xl mx-auto">
          <h2 id="quote-title" className="text-3xl md:text-4xl text-[#F4F0E7] mb-8 text-center">REQUEST BULK QUOTE</h2>
          <CoalQuoteForm onSubmit={scrollToQuote} />
        </div>
      </section>

      <section className="py-20 px-6 text-white text-center" aria-labelledby="final-title" style={{ backgroundColor: '#101214' }}>
        <h2 id="final-title" className="text-3xl md:text-4xl text-[#D4A84F] mb-6">LOOKING FOR A RELIABLE COAL SUPPLY PARTNER?</h2>
        <p className="mb-4 max-w-2xl mx-auto">Share your required coal origin, GCV, testing basis, quantity, application and destination.</p>
        <p className="mb-8 max-w-2xl mx-auto">India Trade Overseas will review the specification and coordinate the next available commercial steps.</p>
        <button onClick={scrollToQuote} className="bg-[#D4A84F] text-[#F4F0E7] px-8 py-4 rounded font-bold text-lg hover:brightness-110 transition">
          REQUEST BULK QUOTE
        </button>
        <p className="mt-8 text-[#D4A84F]">info@indiatradeoverseas.com</p>
      </section>
      </div>
    </>
  );
}

function OriginCard({ name, description, grades, details, isTable, isUsTable, onSelect }) {
  return (
    <article className="bg-[#2B3036] border border-[#D4A84F]/30 rounded-xl p-6 hover:border-[#D4A84F] hover:bg-[#071826] transition cursor-pointer" onClick={onSelect}>
      <h3 className="text-xl font-bold text-[#F4F0E7] mb-3">{name}</h3>
      <p className="text-[#F4F0E7]/90 text-sm mb-4">{description}</p>
      {(isTable || isUsTable) ? (
        <div className={isTable ? "px-1" : ""}>
          <table className={`w-full text-xs border-collapse mb-4 ${isTable ? "table-fixed" : ""}`}>
            <thead>
            <tr className="bg-[#071826] text-[#F4F0E7] border-b border-[#D4A84F]/60">
              {isUsTable ? (
                <>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">MMBtu/st</th>
                  <th className="p-2 text-left">≈ kcal/kg</th>
                </>
              ) : (
                <>
                  <th className="px-1.5 py-2 text-left align-top leading-tight">Grade</th>
                  <th className="px-1.5 py-2 text-left align-top leading-tight">GCV (GAR)</th>
                  <th className="px-1.5 py-2 text-left align-top leading-tight">TM %</th>
                  <th className="px-1.5 py-2 text-left align-top leading-tight">S %</th>
                  <th className="px-1.5 py-2 text-left align-top leading-tight">Ash %</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {grades.map((g, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-[#2B3036]/50' : 'bg-[#071826]/50'}>
                {isUsTable ? (
                  <>
                    <td className="px-1.5 py-2 text-[#F4F0E7] font-medium break-words">{g.label}</td>
                    <td className="px-1.5 py-2 text-[#F4F0E7]">{g.mmbtu}</td>
                    <td className="px-1.5 py-2 text-[#F4F0E7]">{g.kcal}</td>
                  </>
                ) : (
                  <>
                    <td className="px-1.5 py-2 text-[#F4F0E7] font-medium break-words">{g.label}</td>
                    <td className="px-1.5 py-2 text-[#F4F0E7]">{g.gcv}</td>
                    <td className="px-1.5 py-2 text-[#F4F0E7]">{g.tm}</td>
                    <td className="px-1.5 py-2 text-[#F4F0E7]">{g.s}</td>
                    <td className="px-1.5 py-2 text-[#F4F0E7]">{g.ash}</td>
                  </>
                )}
              </tr>
            ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {grades.map(g => (
              <span key={g.label} className="bg-[#071826] border border-[#D4A84F]/50 text-[#D4A84F] px-2 py-1 rounded text-xs font-mono">{g.label}: {g.range}</span>
            ))}
          </div>
          <ul className="text-xs text-[#F4F0E7]/90 space-y-1">
            {details.map((d, i) => <li key={i} className="flex items-start gap-1">• {d}</li>)}
          </ul>
        </>
      )}
    </article>
  );
}

function CoalQuoteForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    fullName: '', company: '', email: '', phone: '', buyerType: '',
    industry: '', plant: '', use: '',
    origin: '', coalType: '', gcv: '', basis: '', rejVal: '',
    ash: '', sulphur: '', tm: '', vm: '', fc: '', hgiAft: '',
    orderQty: '', trialQty: '', monthly: '',
    dest: '', tMode: '', incoterm: '', reqDate: '',
    notes: '', privacy: false
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    pushDataLayerEvent('submit_coal_quote', { origin: formData.origin, coalType: formData.coalType });
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 6000);
    e.target.reset();
    setFormData({
      fullName: '', company: '', email: '', phone: '', buyerType: '',
      industry: '', plant: '', use: '',
      origin: '', coalType: '', gcv: '', basis: '', rejVal: '',
      ash: '', sulphur: '', tm: '', vm: '', fc: '', hgiAft: '',
      orderQty: '', trialQty: '', monthly: '',
      dest: '', tMode: '', incoterm: '', reqDate: '',
      notes: '', privacy: false
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 " noValidate>
      <fieldset className="border border-[#F4F0E7]/35 rounded-xl p-6 bg-[#071826]/35 backdrop-blur-[2px] shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
        <legend className="text-lg font-semibold text-[#F4F0E7] px-2">Identity</legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block"><span className="text-sm text-[#F4F0E7]/95 font-medium">Full name</span><input name="fullName" value={formData.fullName} onChange={handleChange} required className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-[1px] focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/95 font-medium">Company</span><input name="company" value={formData.company} onChange={handleChange} required className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/95 font-medium">Work email</span><input name="email" type="email" value={formData.email} onChange={handleChange} required className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/95 font-medium">Phone / WhatsApp</span><input name="phone" value={formData.phone} onChange={handleChange} required className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/95 font-medium">Buyer type</span><select name="buyerType" value={formData.buyerType} onChange={handleChange} required className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]"><option value="" className="bg-[#071826] text-[#F4F0E7]">Select</option><option className="bg-[#071826] text-[#F4F0E7]">Thermal power plant</option><option className="bg-[#071826] text-[#F4F0E7]">Cement / sponge-iron</option><option className="bg-[#071826] text-[#F4F0E7]">Steel / rolling mill</option><option className="bg-[#071826] text-[#F4F0E7]">Trader / distributor</option><option className="bg-[#071826] text-[#F4F0E7]">Other</option></select></label>
        </div>
      </fieldset>

      <fieldset className="border border-[#F4F0E7]/35 rounded-xl p-6 backdrop-blur-[2px] bg-[#071826]/35">
        <legend className="text-lg font-semibold text-[#F4F0E7] px-2">Application</legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block"><span className="text-sm text-[#F4F0E7]/95 font-medium">Industry</span><input name="industry" value={formData.industry} onChange={handleChange} required className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/95 font-medium">Plant / Process</span><input name="plant" value={formData.plant} onChange={handleChange} required className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block sm:col-span-2"><span className="text-sm text-[#F4F0E7]/95 font-medium">Intended use</span><textarea name="use" value={formData.use} onChange={handleChange} rows={2} className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
        </div>
      </fieldset>

      <fieldset className="border border-[#F4F0E7]/35 rounded-xl p-6 backdrop-blur-[2px] bg-[#071826]/35">
        <legend className="text-lg font-semibold text-[#F4F0E7] px-2">Product</legend>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="block"><span className="text-sm text-[#F4F0E7]/95 font-medium">Origin</span><select name="origin" value={formData.origin} onChange={handleChange} required className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]"><option value="" className="bg-[#071826] text-[#F4F0E7]">Select</option><option className="bg-[#071826] text-[#F4F0E7]">Assam</option><option className="bg-[#071826] text-[#F4F0E7]">Jharkhand</option><option className="bg-[#071826] text-[#F4F0E7]">Indonesia</option><option className="bg-[#071826] text-[#F4F0E7]">U.S.</option><option className="bg-[#071826] text-[#F4F0E7]">Other domestic</option><option className="bg-[#071826] text-[#F4F0E7]">Other imported</option></select></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/95 font-medium">Coal type</span><select name="coalType" value={formData.coalType} onChange={handleChange} required className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]"><option value="" className="bg-[#071826] text-[#F4F0E7]">Select</option><option className="bg-[#071826] text-[#F4F0E7]">Non-coking thermal</option><option className="bg-[#071826] text-[#F4F0E7]">Steam</option><option className="bg-[#071826] text-[#F4F0E7]">Coking</option><option className="bg-[#071826] text-[#F4F0E7]">Metallurgical</option><option className="bg-[#071826] text-[#F4F0E7]">Anthracite</option><option className="bg-[#071826] text-[#F4F0E7]">Sub-bituminous</option><option className="bg-[#071826] text-[#F4F0E7]">Lignite</option><option className="bg-[#071826] text-[#F4F0E7]">Not sure</option></select></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/95 font-medium">GCV</span><input name="gcv" type="number" step="1" value={formData.gcv} onChange={handleChange} placeholder="e.g. 6200" className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/95 font-medium">Basis</span><select name="basis" value={formData.basis} onChange={handleChange} required className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]"><option value="" className="bg-[#071826] text-[#F4F0E7]">Select</option><option className="bg-[#071826] text-[#F4F0E7]">GAR</option><option className="bg-[#071826] text-[#F4F0E7]">NAR</option><option className="bg-[#071826] text-[#F4F0E7]">ARB</option><option className="bg-[#071826] text-[#F4F0E7]">ADB</option><option className="bg-[#071826] text-[#F4F0E7]">DB</option><option className="bg-[#071826] text-[#F4F0E7]">DAF</option><option className="bg-[#071826] text-[#F4F0E7]">Other</option></select></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/95 font-medium">Rejection value</span><input name="rejVal" type="number" step="1" value={formData.rejVal} onChange={handleChange} placeholder="kcal/kg" className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
        </div>
      </fieldset>

      

      <fieldset className="border border-[#F4F0E7]/35 rounded-xl p-6 backdrop-blur-[2px] bg-[#071826]/35">
        <legend className="text-lg font-semibold text-[#F4F0E7] px-2">Volume</legend>
        <div className="grid sm:grid-cols-3 gap-4">
          <label className="block"><span className="text-sm text-[#F4F0E7]/95 font-medium">Order qty (MT)</span><input name="orderQty" type="number" step="1" value={formData.orderQty} onChange={handleChange} className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/95 font-medium">Trial qty (MT)</span><input name="trialQty" type="number" step="1" value={formData.trialQty} onChange={handleChange} className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/95 font-medium">Recurring monthly demand (MT)</span><input name="monthly" type="number" step="1" value={formData.monthly} onChange={handleChange} className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
        </div>
      </fieldset>

      <fieldset className="border border-[#F4F0E7]/35 rounded-xl p-6 backdrop-blur-[2px] bg-[#071826]/35">
        <legend className="text-lg font-semibold text-[#F4F0E7] px-2">Delivery</legend>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="block"><span className="text-sm text-[#F4F0E7]/95 font-medium">City / Plant / Port / Country</span><input name="dest" value={formData.dest} onChange={handleChange} required className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/95 font-medium">Transport mode</span><select name="tMode" value={formData.tMode} onChange={handleChange} required className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]"><option value="" className="bg-[#071826] text-[#F4F0E7]">Select</option><option className="bg-[#071826] text-[#F4F0E7]">Road</option><option className="bg-[#071826] text-[#F4F0E7]">Rail</option><option className="bg-[#071826] text-[#F4F0E7]">Port</option><option className="bg-[#071826] text-[#F4F0E7]">Vessel</option><option className="bg-[#071826] text-[#F4F0E7]">Multimodal</option><option className="bg-[#071826] text-[#F4F0E7]">To be advised</option></select></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/95 font-medium">Incoterm</span><input name="incoterm" value={formData.incoterm} onChange={handleChange} placeholder="e.g. FOB, CIF" className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/95 font-medium">Required date</span><input name="reqDate" type="date" value={formData.reqDate} onChange={handleChange} className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
        </div>
      </fieldset>

      <fieldset className="border border-[#F4F0E7]/35 rounded-xl p-6 backdrop-blur-[2px] bg-[#071826]/35">
        <legend className="text-lg font-semibold text-[#F4F0E7] px-2">Evidence</legend>
        <div className="space-y-4">
          <label className="block"><span className="text-sm text-[#F4F0E7]/95 font-medium">Specification sheet (PDF/Excel)</span><input name="specFile" type="file" accept=".pdf,.xls,.xlsx" className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/95 font-medium">Additional notes</span><textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
        </div>
      </fieldset>

      <fieldset className="border border-[#F4F0E7]/35 rounded-xl p-6 backdrop-blur-[2px] bg-[#071826]/35">
        <legend className="text-lg font-semibold text-[#F4F0E7] px-2">Consent</legend>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="privacy" checked={formData.privacy} onChange={handleChange} required className="mt-1 w-4 h-4 accent-[#D4A84F]" />
          <span className="text-sm text-[#F4F0E7]">I acknowledge the privacy policy and allow India Trade Overseas to contact me.</span>
        </label>
      </fieldset>

      <button type="submit" className="w-full bg-[#D4A84F] text-[#F4F0E7] py-4 rounded font-bold text-lg hover:brightness-110 transition">SUBMIT QUOTE REQUEST</button>

      {submitted && (
        <p id="formMsg" className="text-center text-[#D4A84F] font-medium" role="status">
          Thank you. Your coal requirement has been received by India Trade Overseas. Our commercial team will review the specification, quantity and destination before responding with the next available commercial steps.
        </p>
      )}
    </form>
  );
}

export default Coal;