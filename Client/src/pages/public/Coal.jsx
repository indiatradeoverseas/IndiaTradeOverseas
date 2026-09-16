import React, { useEffect, useRef, useState } from 'react';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import { pushDataLayerEvent } from '../../utils/analytics';

const FRAME_COUNT = 240;
const FRAME_DIR = '/images/coal-frames/';

function Coal() {
  useDocumentMeta({
    title: 'Coal Supplier in India | Domestic & Imported Coal | ITO',
    description: 'Source Assam, Jharkhand, Indonesian and U.S. coal through India Trade Overseas. Share GCV, quantity and destination for a bulk quotation.',
    canonicalPath: '/coal'
  });

  const canvasRef = useRef(null);
  const framesRef = useRef([]);
  const loadedRef = useRef(0);
  const currentFrameRef = useRef(0);
  const rafRef = useRef(null);
  const resizeHandlerRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    pushDataLayerEvent('view_coal_page', {});
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current);
      }
    };
  }, []);

  // Files inside /public are served from the site root.
  // Example: /public/images/coal-frames/ezgif-frame-001.jpg
  // is requested in the browser as /images/coal-frames/ezgif-frame-001.jpg
  const getFrameSrc = (index) =>
    `${FRAME_DIR}ezgif-frame-${String(index + 1).padStart(3, '0')}.jpg`;

  const preloadFrames = () => {
    return new Promise((resolve) => {
      framesRef.current = new Array(FRAME_COUNT);
      loadedRef.current = 0;

      for (let i = 0; i < FRAME_COUNT; i++) {
        const img = new Image();
        img.decoding = 'async';
        img.src = getFrameSrc(i);

        const finish = () => {
          loadedRef.current++;
          if (loadedRef.current === FRAME_COUNT) resolve();
        };

        img.onload = finish;
        img.onerror = finish;
        framesRef.current[i] = img;
      }
    });
  };

  const drawFrame = (idx) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const img = framesRef.current[idx];

    if (!img || !img.complete || !img.naturalWidth) return;

    const cw = window.innerWidth;
    const ch = window.innerHeight;

    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    // CONTAIN the entire frame inside the viewport.
    // Cover the entire viewport so the animation reaches every edge.
    // The original frame aspect ratio is preserved; only the excess area
    // outside the viewport is cropped.
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) * 0.5;
    const dy = (ch - dh) * 0.5;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  };

  const handleScroll = () => {
    // IMPORTANT:
    // Frame progress is based on the ENTIRE document height,
    // not the .coal-hero section.
    const scrollableHeight =
      document.documentElement.scrollHeight - window.innerHeight;

    if (scrollableHeight <= 0) return;

    const progress = Math.max(
      0,
      Math.min(1, window.scrollY / scrollableHeight)
    );

    const target = Math.min(
      FRAME_COUNT - 1,
      Math.floor(progress * (FRAME_COUNT - 1))
    );

    if (target === currentFrameRef.current) return;

    currentFrameRef.current = target;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      drawFrame(target);
      rafRef.current = null;
    });
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      await preloadFrames();

      if (cancelled) return;

      const canvas = canvasRef.current;

      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        drawFrame(0);
        setIsLoaded(true);
      }

      resizeHandlerRef.current = () => {
        if (!canvasRef.current) return;

        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        drawFrame(currentFrameRef.current);
      };

      window.addEventListener('resize', resizeHandlerRef.current);
      window.addEventListener('scroll', handleScroll, { passive: true });

      // Handle the case where the page is refreshed at a scrolled position.
      handleScroll();
    };

    init();

    return () => {
      cancelled = true;

      window.removeEventListener('scroll', handleScroll);

      if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current);
      }

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

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
      {/*
        Fixed canvas = the lifecycle animation remains attached to the viewport
        while the user scrolls through the ENTIRE Coal page.
        The frame index is calculated from document scroll progress.
      */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      />

      {!isLoaded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071826] text-[#F4F0E7]">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#2B3036] border-t-[#D4A84F]" />
            <p className="text-sm tracking-[0.2em] uppercase text-[#D4A84F]">
              Loading coal lifecycle
            </p>
          </div>
        </div>
      )}

      <div className="relative z-10">
        <section className="coal-hero relative min-h-screen overflow-hidden" aria-label="Hero with scroll-linked coal lifecycle animation">
          <div className="relative z-10 min-h-screen flex flex-col justify-start md:justify-center px-6 pt-32 md:pt-0 pb-10 md:pb-0 text-white bg-gradient-to-b from-[#071826]/90 via-[#071826]/55 to-[#071826]/20">
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

      <section className="py-20 px-6 bg-transparent/90 backdrop-blur-[1px]" aria-labelledby="capability-title">
        <h2 id="capability-title" className="text-3xl md:text-4xl text-[#F4F0E7] text-center mb-12">CORE CAPABILITIES</h2>
        <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-6">
          <span className="bg-transparent border border-[#D4A84F]/70 text-[#F4F0E7] px-6 py-3 rounded-full font-semibold" onClick={() => handleOriginSelect('domestic')}>Domestic Coal</span>
          <span className="bg-transparent border border-[#D4A84F]/70 text-[#F4F0E7] px-6 py-3 rounded-full font-semibold" onClick={() => handleOriginSelect('imported')}>Imported Coal</span>
          <span className="bg-transparent border border-[#D4A84F]/70 text-[#F4F0E7] px-6 py-3 rounded-full font-semibold" onClick={() => handleOriginSelect('logistics')}>Logistics Support</span>
        </div>
      </section>

      <section id="specifications" className="py-20 px-6 bg-transparent/90 backdrop-blur-[1px]" aria-labelledby="portfolio-title">
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

      <section className="py-16 px-6 bg-transparent" aria-labelledby="g-title">
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

      <section className="py-20 px-6 bg-transparent" aria-labelledby="cok-title">
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

      <section className="py-20 px-6 bg-transparent" aria-labelledby="cv-title">
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

      <section id="quote-form" className="py-20 px-6 bg-transparent/90 backdrop-blur-[1px]" aria-labelledby="quote-title">
        <div className="max-w-4xl mx-auto">
          <h2 id="quote-title" className="text-3xl md:text-4xl text-[#F4F0E7] mb-8 text-center">REQUEST BULK QUOTE</h2>
          <CoalQuoteForm onSubmit={scrollToQuote} />
        </div>
      </section>

      <section className="py-20 px-6  text-white text-center " aria-labelledby="final-title">
        <h2 id="final-title" className="text-3xl md:text-4xl text-[#D4A84F] mb-6">LOOKING FOR A RELIABLE COAL SUPPLY PARTNER?</h2>
        <p className="mb-4 max-w-2xl mx-auto">Share your required coal origin, GCV, testing basis, quantity, application and destination.</p>
        <p className="mb-8 max-w-2xl mx-auto">India Trade Overseas will review the specification and coordinate the next available commercial steps.</p>
        <button onClick={scrollToQuote} className="bg-[#D4A84F] text-[#F4F0E7] px-8 py-4 rounded font-bold text-lg hover:brightness-110 transition">
          REQUEST BULK QUOTE
        </button>
        <p className="mt-8 text-[#D4A84F]">info@indiatradeoverseas.com</p>
      </section>

      {/* <footer className="bg-[#101214] text-white py-12 px-6 text-center text-sm">
        <p className="font-bold text-lg mb-2">India Trade Overseas</p>
        <p className="mb-1">Where Quality Meets Global Demand</p>
        <p className="mb-4">Website: <a href="https://www.indiatradeoverseas.com" target="_blank" rel="noopener noreferrer" className="underline">www.indiatradeoverseas.com</a> | Email: info@indiatradeoverseas.com | Phone: 011 6926 2028</p>
        <p className="mb-6">Registered address: Deramari, Kishanganj, Bihar – 855107, India</p>
        <hr className="border-[#2B3036] my-6 mx-auto max-w-md" />
        <p className="text-white text-xs max-w-3xl mx-auto">
          Coal specifications, grades, calorific values, moisture, ash, sulphur, volatile matter, fixed carbon, sizing, origin, quantity, price, freight, taxes, port charges, exchange rate, loading schedule, inspection, documentation, delivery period and payment terms are subject to source availability, current test reports, statutory requirements and final written commercial confirmation. All GCV figures displayed on the website are classification or reference values unless expressly identified as guaranteed contractual specifications. No website content overrides the final signed quotation, purchase order, sale contract, certificate of analysis or mutually agreed inspection result. India Trade Overseas does not represent itself as the owner or operator of any mine, coal block, washery, railway siding, port or vessel unless such ownership or operating authority is separately documented.
        </p>
      </footer> */}
      </div>
    </>
  );
}

function OriginCard({ name, description, grades, details, isTable, isUsTable, onSelect }) {
  return (
    <article className="bg-[#071826]/30 backdrop-blur-md border border-white/25 rounded-xl p-6 hover:border-[#D4A84F] transition cursor-pointer" onClick={onSelect}>
      <h3 className="text-xl font-bold text-[#F4F0E7] mb-3">{name}</h3>
      <p className="text-[#F4F0E7] text-sm mb-4">{description}</p>
      {(isTable || isUsTable) ? (
        <table className="w-full text-xs border-collapse mb-4">
          <thead>
            <tr className="bg-transparent text-[#F4F0E7] border-b border-[#D4A84F]/60">
              {isUsTable ? (
                <>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">MMBtu/st</th>
                  <th className="p-2 text-left">≈ kcal/kg</th>
                </>
              ) : (
                <>
                  <th className="p-2 text-left">Grade</th>
                  <th className="p-2 text-left">GCV (GAR)</th>
                  <th className="p-2 text-left">TM %</th>
                  <th className="p-2 text-left">S %</th>
                  <th className="p-2 text-left">Ash %</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {grades.map((g, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-[#2B3036]/05' : ''}>
                {isUsTable ? (
                  <>
                    <td className="p-2 text-[#F4F0E7] font-medium">{g.label}</td>
                    <td className="p-2 text-[#F4F0E7]">{g.mmbtu}</td>
                    <td className="p-2 text-[#F4F0E7]">{g.kcal}</td>
                  </>
                ) : (
                  <>
                    <td className="p-2 text-[#F4F0E7] font-medium">{g.label}</td>
                    <td className="p-2 text-[#F4F0E7]">{g.gcv}</td>
                    <td className="p-2 text-[#F4F0E7]">{g.tm}</td>
                    <td className="p-2 text-[#F4F0E7]">{g.s}</td>
                    <td className="p-2 text-[#F4F0E7]">{g.ash}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {grades.map(g => (
              <span key={g.label} className="bg-transparent border border-[#D4A84F]/50 text-[#D4A84F] px-2 py-1 rounded text-xs font-mono">{g.label}: {g.range}</span>
            ))}
          </div>
          <ul className="text-xs text-[#F4F0E7] space-y-1">
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
      <fieldset className="border border-[#F4F0E7]/35  rounded-xl p-6 bg-transparent">
        <legend className="text-lg font-semibold text-[#F4F0E7] px-2">Identity</legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">Full name</span><input name="fullName" value={formData.fullName} onChange={handleChange} required className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">Company</span><input name="company" value={formData.company} onChange={handleChange} required className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">Work email</span><input name="email" type="email" value={formData.email} onChange={handleChange} required className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">Phone / WhatsApp</span><input name="phone" value={formData.phone} onChange={handleChange} required className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">Buyer type</span><select name="buyerType" value={formData.buyerType} onChange={handleChange} required className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]"><option value="" className="bg-[#071826] text-[#F4F0E7]">Select</option><option className="bg-[#071826] text-[#F4F0E7]">Thermal power plant</option><option className="bg-[#071826] text-[#F4F0E7]">Cement / sponge-iron</option><option className="bg-[#071826] text-[#F4F0E7]">Steel / rolling mill</option><option className="bg-[#071826] text-[#F4F0E7]">Trader / distributor</option><option className="bg-[#071826] text-[#F4F0E7]">Other</option></select></label>
        </div>
      </fieldset>

      <fieldset className="border border-[#F4F0E7]/35 rounded-xl p-6 bg-transparent">
        <legend className="text-lg font-semibold text-[#F4F0E7] px-2">Application</legend>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">Industry</span><input name="industry" value={formData.industry} onChange={handleChange} required className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">Plant / Process</span><input name="plant" value={formData.plant} onChange={handleChange} required className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block sm:col-span-2"><span className="text-sm text-[#F4F0E7]/70">Intended use</span><textarea name="use" value={formData.use} onChange={handleChange} rows={2} className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
        </div>
      </fieldset>

      <fieldset className="border border-[#F4F0E7]/35 rounded-xl p-6 bg-transparent">
        <legend className="text-lg font-semibold text-[#F4F0E7] px-2">Product</legend>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">Origin</span><select name="origin" value={formData.origin} onChange={handleChange} required className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]"><option value="" className="bg-[#071826] text-[#F4F0E7]">Select</option><option className="bg-[#071826] text-[#F4F0E7]">Assam</option><option className="bg-[#071826] text-[#F4F0E7]">Jharkhand</option><option className="bg-[#071826] text-[#F4F0E7]">Indonesia</option><option className="bg-[#071826] text-[#F4F0E7]">U.S.</option><option className="bg-[#071826] text-[#F4F0E7]">Other domestic</option><option className="bg-[#071826] text-[#F4F0E7]">Other imported</option></select></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">Coal type</span><select name="coalType" value={formData.coalType} onChange={handleChange} required className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]"><option value="" className="bg-[#071826] text-[#F4F0E7]">Select</option><option className="bg-[#071826] text-[#F4F0E7]">Non-coking thermal</option><option className="bg-[#071826] text-[#F4F0E7]">Steam</option><option className="bg-[#071826] text-[#F4F0E7]">Coking</option><option className="bg-[#071826] text-[#F4F0E7]">Metallurgical</option><option className="bg-[#071826] text-[#F4F0E7]">Anthracite</option><option className="bg-[#071826] text-[#F4F0E7]">Sub-bituminous</option><option className="bg-[#071826] text-[#F4F0E7]">Lignite</option><option className="bg-[#071826] text-[#F4F0E7]">Not sure</option></select></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">GCV</span><input name="gcv" type="number" step="1" value={formData.gcv} onChange={handleChange} placeholder="e.g. 6200" className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">Basis</span><select name="basis" value={formData.basis} onChange={handleChange} required className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]"><option value="" className="bg-[#071826] text-[#F4F0E7]">Select</option><option className="bg-[#071826] text-[#F4F0E7]">GAR</option><option className="bg-[#071826] text-[#F4F0E7]">NAR</option><option className="bg-[#071826] text-[#F4F0E7]">ARB</option><option className="bg-[#071826] text-[#F4F0E7]">ADB</option><option className="bg-[#071826] text-[#F4F0E7]">DB</option><option className="bg-[#071826] text-[#F4F0E7]">DAF</option><option className="bg-[#071826] text-[#F4F0E7]">Other</option></select></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">Rejection value</span><input name="rejVal" type="number" step="1" value={formData.rejVal} onChange={handleChange} placeholder="kcal/kg" className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
        </div>
      </fieldset>

      <fieldset className="border border-[#F4F0E7]/35 rounded-xl p-6 bg-transparent">
        <legend className="text-lg font-semibold text-[#F4F0E7] px-2">Quality (key parameters)</legend>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">Ash %</span><input name="ash" type="number" step="0.01" value={formData.ash} onChange={handleChange} className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">Sulphur %</span><input name="sulphur" type="number" step="0.01" value={formData.sulphur} onChange={handleChange} className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">Total moisture %</span><input name="tm" type="number" step="0.01" value={formData.tm} onChange={handleChange} className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">Volatile matter %</span><input name="vm" type="number" step="0.01" value={formData.vm} onChange={handleChange} className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">Fixed carbon %</span><input name="fc" type="number" step="0.01" value={formData.fc} onChange={handleChange} className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">HGI / AFT (if needed)</span><input name="hgiAft" value={formData.hgiAft} onChange={handleChange} className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
        </div>
      </fieldset>

      <fieldset className="border border-[#F4F0E7]/35 rounded-xl p-6 bg-transparent">
        <legend className="text-lg font-semibold text-[#F4F0E7] px-2">Volume</legend>
        <div className="grid sm:grid-cols-3 gap-4">
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">Order qty (MT)</span><input name="orderQty" type="number" step="1" value={formData.orderQty} onChange={handleChange} className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">Trial qty (MT)</span><input name="trialQty" type="number" step="1" value={formData.trialQty} onChange={handleChange} className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">Recurring monthly demand (MT)</span><input name="monthly" type="number" step="1" value={formData.monthly} onChange={handleChange} className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
        </div>
      </fieldset>

      <fieldset className="border border-[#F4F0E7]/35 rounded-xl p-6 bg-transparent">
        <legend className="text-lg font-semibold text-[#F4F0E7] px-2">Delivery</legend>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">City / Plant / Port / Country</span><input name="dest" value={formData.dest} onChange={handleChange} required className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">Transport mode</span><select name="tMode" value={formData.tMode} onChange={handleChange} required className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]"><option value="" className="bg-[#071826] text-[#F4F0E7]">Select</option><option className="bg-[#071826] text-[#F4F0E7]">Road</option><option className="bg-[#071826] text-[#F4F0E7]">Rail</option><option className="bg-[#071826] text-[#F4F0E7]">Port</option><option className="bg-[#071826] text-[#F4F0E7]">Vessel</option><option className="bg-[#071826] text-[#F4F0E7]">Multimodal</option><option className="bg-[#071826] text-[#F4F0E7]">To be advised</option></select></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">Incoterm</span><input name="incoterm" value={formData.incoterm} onChange={handleChange} placeholder="e.g. FOB, CIF" className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">Required date</span><input name="reqDate" type="date" value={formData.reqDate} onChange={handleChange} className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
        </div>
      </fieldset>

      <fieldset className="border border-[#F4F0E7]/35 rounded-xl p-6 bg-transparent">
        <legend className="text-lg font-semibold text-[#F4F0E7] px-2">Evidence</legend>
        <div className="space-y-4">
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">Specification sheet (PDF/Excel)</span><input name="specFile" type="file" accept=".pdf,.xls,.xlsx" className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
          <label className="block"><span className="text-sm text-[#F4F0E7]/70">Additional notes</span><textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="w-full mt-1 p-2 border border-white/30 bg-[#071826]/25 text-white placeholder:text-white/55 rounded backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#D4A84F]" /></label>
        </div>
      </fieldset>

      <fieldset className="border border-[#F4F0E7]/35 rounded-xl p-6 bg-transparent">
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