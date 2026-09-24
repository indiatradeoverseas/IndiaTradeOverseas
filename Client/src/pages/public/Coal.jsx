import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import { pushDataLayerEvent } from '../../utils/analytics';
import { coalVisitorApi } from '../../api/coalVisitor';
import { toast } from 'react-hot-toast';
import CoalRequirementBuilder from '../../components/requirements/CoalRequirementBuilder';

const HERO_IMAGES = [
  '/images/coal-images/coal-1.png',
  '/images/coal-images/coal-2.png',
  '/images/coal-images/coal-3.png',
  '/images/coal-images/coal-4.png'
];

function Coal() {
  const navigate = useNavigate();

  const [showRequirementBuilder, setShowRequirementBuilder] = useState(false);
  const [showPersonalDetails, setShowPersonalDetails] = useState(false);
  const [builtRequirement, setBuiltRequirement] = useState(null);
  const [submittingPersonalDetails, setSubmittingPersonalDetails] = useState(false);
  const [personalDetails, setPersonalDetails] = useState({
    fullName: '',
    email: '',
    mobile: '',
    city: '',
    state: '',
  });

  useDocumentMeta({
    title: 'Coal Supplier in India | Domestic & Imported Coal | ITO',
    description: 'Source Assam, Jharkhand, Indonesian and U.S. coal through India Trade Overseas. Share GCV, quantity and destination for a bulk quotation.',
    canonicalPath: '/coal'
  });

  useEffect(() => {
    pushDataLayerEvent('view_coal_page', {});
  }, []);

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearTimeout(timer);
  }, [currentIndex]);

  const openRequirementBuilder = () => {
    setShowRequirementBuilder(true);
    pushDataLayerEvent('start_coal_quote', { vertical: 'COAL' });
  };

  const handleRequirementComplete = (requirement) => {
    setBuiltRequirement(requirement);
    setShowRequirementBuilder(false);
    setShowPersonalDetails(true);
  };

  const handlePersonalDetailsChange = (event) => {
    const { name, value } = event.target;
    setPersonalDetails((previous) => ({ ...previous, [name]: value }));
  };

  const handlePersonalDetailsSubmit = async (event) => {
    event.preventDefault();

    if (!builtRequirement) {
      toast.error('Please complete the Coal Requirement Builder first.');
      return;
    }

    setSubmittingPersonalDetails(true);

    try {
      const response = await coalVisitorApi.create({
        fullName: personalDetails.fullName.trim(),
        email: personalDetails.email.trim(),
        mobile: personalDetails.mobile.trim(),
        city: personalDetails.city.trim(),
        state: personalDetails.state.trim(),
        company: builtRequirement.company,
        requirement: builtRequirement,
      });

      const visitorId =
        response?.data?.visitorId ||
        response?.visitorId;

      const pricing =
        response?.data?.pricing ||
        response?.pricing ||
        null;

      if (!response?.success || !visitorId) {
        throw new Error(
          response?.message ||
          'Unable to create Coal visitor.'
        );
      }

      const visitorSnapshot = {
        visitorId,
        fullName: personalDetails.fullName.trim(),
        email: personalDetails.email.trim(),
        mobile: personalDetails.mobile.trim(),
        city: personalDetails.city.trim(),
        state: personalDetails.state.trim(),
        company: builtRequirement.company || '',
        requirement: builtRequirement,
        pricing,
      };

      sessionStorage.setItem(
        'ito_coal_visitor_id',
        visitorId
      );

      sessionStorage.setItem(
        'ito_coal_requirement',
        JSON.stringify(builtRequirement)
      );

      sessionStorage.setItem(
        'ito_coal_visitor_snapshot',
        JSON.stringify(visitorSnapshot)
      );

      pushDataLayerEvent('coal_visitor_created', {
        visitorId,
        origin: builtRequirement.origin,
        coalType: builtRequirement.coalType,
      });

      setShowPersonalDetails(false);

      navigate('/coal/pricing', {
        state: {
          visitor: visitorSnapshot,
        },
      });
    } catch (error) {
      console.error('Coal visitor creation error:', error);
      toast.error(
        error?.response?.data?.message ||
        error?.message ||
        'Unable to continue. Please try again.'
      );
    } finally {
      setSubmittingPersonalDetails(false);
    }
  };

  const scrollToSpecs = () => {
    document.getElementById('specifications')?.scrollIntoView({ behavior: 'smooth' });
    pushDataLayerEvent('view_gcv_table', {});
  };

  const handleOriginSelect = (origin) => {
    pushDataLayerEvent('select_coal_origin', { origin });
  };

  const goToImage = (index) => setCurrentIndex(index);

  return (
    <>
      <style>{`
        .coal-page {
          --coal: #071826;
          --coal-2: #101214;
          --coal-3: #171c20;
          --slate: #2B3036;
          --gold: #D4A84F;
          --ivory: #F4F0E7;
          --muted: rgba(244,240,231,.68);
          --line: rgba(244,240,231,.12);
          color: var(--ivory);
          background: var(--coal);
          overflow: hidden;
        }
        .coal-page * { box-sizing: border-box; }
        .coal-shell { width:min(1240px, calc(100% - 40px)); margin:auto; }
        .coal-eyebrow { font-size:10px; font-weight:800; letter-spacing:.2em; text-transform:uppercase; color:var(--gold); }
        .coal-display { font-family: Georgia, 'Times New Roman', serif; font-weight:500; letter-spacing:-.045em; }
        .coal-section { padding:clamp(72px,9vw,132px) 0; position:relative; }
        .coal-section-head { max-width:780px; margin-bottom:52px; }
        .coal-section-head h2 { margin:12px 0 16px; font-size:clamp(40px,5.8vw,76px); line-height:.98; }
        .coal-section-head p { margin:0; color:var(--muted); font-size:16px; line-height:1.8; max-width:720px; }
        .coal-glass { background:rgba(255,255,255,.045); border:1px solid rgba(244,240,231,.13); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); }
        .coal-button { display:inline-flex; align-items:center; justify-content:center; min-height:50px; padding:0 22px; border-radius:999px; border:1px solid var(--gold); text-decoration:none; font-size:11px; font-weight:900; letter-spacing:.1em; text-transform:uppercase; cursor:pointer; transition:.25s ease; }
        .coal-button.primary { background:var(--gold); color:var(--coal); }
        .coal-button.primary:hover { transform:translateY(-2px); filter:brightness(1.08); }
        .coal-button.ghost { background:transparent; color:var(--ivory); border-color:rgba(244,240,231,.3); }
        .coal-button.ghost:hover { background:rgba(244,240,231,.08); border-color:var(--gold); }
        .coal-hero { min-height:100svh; position:relative; display:flex; align-items:flex-end; isolation:isolate; }
        .coal-hero-media { position:absolute; inset:0; z-index:-2; }
        .coal-hero-media img { width:100%; height:100%; object-fit:cover; display:block; filter:brightness(.78) contrast(1.05) saturate(.9); }
        .coal-hero-media:after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,rgba(7,24,38,.94) 0%,rgba(7,24,38,.72) 34%,rgba(7,24,38,.18) 72%,rgba(7,24,38,.12) 100%),linear-gradient(0deg,rgba(7,24,38,.95) 0%,transparent 48%,rgba(7,24,38,.2) 100%); }
        .coal-hero-inner { width:min(1240px,calc(100% - 40px)); margin:auto; padding:150px 0 74px; }
        .coal-hero-copy { max-width:820px; }
        .coal-kicker { display:inline-flex; align-items:center; gap:9px; padding:8px 12px; border:1px solid rgba(212,168,79,.38); border-radius:999px; background:rgba(7,24,38,.35); backdrop-filter:blur(12px); font-size:10px; font-weight:800; letter-spacing:.15em; text-transform:uppercase; }
        .coal-kicker i { width:7px; height:7px; border-radius:50%; background:var(--gold); box-shadow:0 0 0 5px rgba(212,168,79,.12); }
        .coal-hero h1 { margin:22px 0 20px; font-size:clamp(54px,8vw,108px); line-height:.86; }
        .coal-hero-lead { max-width:650px; color:rgba(244,240,231,.82); font-size:clamp(16px,1.8vw,21px); line-height:1.65; }
        .coal-hero-actions { display:flex; flex-wrap:wrap; gap:12px; margin-top:30px; }
        .coal-hero-meta { display:flex; flex-wrap:wrap; gap:10px; margin-top:38px; }
        .coal-meta { padding:10px 13px; border:1px solid rgba(244,240,231,.16); border-radius:999px; background:rgba(255,255,255,.05); color:rgba(244,240,231,.78); font-size:10px; letter-spacing:.06em; }
        .coal-hero-nav { display:flex; align-items:center; justify-content:space-between; gap:20px; margin-top:48px; max-width:760px; }
        .coal-thumbs { display:flex; gap:8px; }
        .coal-thumb { width:62px; height:44px; padding:0; border:1px solid rgba(244,240,231,.2); border-radius:7px; overflow:hidden; background:none; opacity:.55; cursor:pointer; transition:.25s; }
        .coal-thumb.active,.coal-thumb:hover { opacity:1; border-color:var(--gold); transform:translateY(-2px); }
        .coal-thumb img { width:100%; height:100%; object-fit:cover; }
        .coal-counter { color:var(--gold); font:700 11px/1 monospace; letter-spacing:.12em; }
        .coal-trust { border-top:1px solid var(--line); border-bottom:1px solid var(--line); background:#101214; }
        .coal-trust-inner { display:grid; grid-template-columns:repeat(4,1fr); }
        .coal-trust-item { padding:22px 18px; border-right:1px solid var(--line); text-align:center; }
        .coal-trust-item:last-child { border-right:0; }
        .coal-trust-item strong { display:block; color:var(--ivory); font-size:13px; }
        .coal-trust-item span { color:rgba(244,240,231,.48); font-size:10px; }
        .coal-origin-intro { display:grid; grid-template-columns:1fr 1fr; gap:40px; align-items:end; }
        .coal-origin-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        .coal-origin-card { min-height:310px; padding:24px; border-radius:18px; background:linear-gradient(145deg,#242a30,#11171c); border:1px solid rgba(212,168,79,.2); transition:.3s ease; }
        .coal-origin-card:hover { transform:translateY(-6px); border-color:rgba(212,168,79,.7); box-shadow:0 25px 60px rgba(0,0,0,.25); }
        .coal-origin-index { color:var(--gold); font:700 10px monospace; letter-spacing:.15em; }
        .coal-origin-card h3 { margin:55px 0 12px; font-size:26px; }
        .coal-origin-card p { color:rgba(244,240,231,.65); font-size:12px; line-height:1.65; }
        .coal-origin-card .origin-link { margin-top:18px; color:var(--gold); font-size:10px; font-weight:800; letter-spacing:.1em; text-transform:uppercase; }
        .coal-feature { display:grid; grid-template-columns:1.15fr .85fr; min-height:600px; }
        .coal-feature-media { position:relative; min-height:520px; overflow:hidden; }
        .coal-feature-media img { width:100%; height:100%; object-fit:cover; transition:transform .8s; }
        .coal-feature:hover img { transform:scale(1.035); }
        .coal-feature-copy { padding:clamp(36px,6vw,80px); display:flex; flex-direction:column; justify-content:center; background:#101214; border:1px solid var(--line); }
        .coal-feature-copy h2 { font-size:clamp(40px,5vw,68px); line-height:.96; margin:12px 0 18px; }
        .coal-feature-copy p { color:var(--muted); line-height:1.8; }
        .coal-mini-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:28px; }
        .coal-mini-card { padding:18px; border:1px solid var(--line); background:rgba(255,255,255,.025); }
        .coal-mini-card strong { color:var(--gold); display:block; font-size:12px; margin-bottom:5px; }
        .coal-mini-card span { color:rgba(244,240,231,.62); font-size:11px; }
        .coal-table-wrap { border:1px solid var(--line); border-radius:18px; overflow:hidden; background:rgba(255,255,255,.025); }
        .coal-table-wrap table { width:100%; border-collapse:collapse; }
        .coal-table-wrap th { color:var(--gold); background:rgba(212,168,79,.06); text-align:left; font-size:11px; letter-spacing:.08em; text-transform:uppercase; }
        .coal-table-wrap th,.coal-table-wrap td { padding:13px 16px; border-bottom:1px solid var(--line); }
        .coal-table-wrap td { color:rgba(244,240,231,.72); font-size:12px; }
        .coal-table-wrap tr:last-child td { border-bottom:0; }
        .coal-section-light { background:#101214; }
        .coal-section-deep { background:#071826; }
        .coal-section-black { background:#0c0f12; }
        .coal-image-band { position:relative; min-height:520px; display:flex; align-items:center; overflow:hidden; }
        .coal-image-band img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; filter:brightness(.55) saturate(.8); }
        .coal-image-band:after { content:''; position:absolute; inset:0; background:linear-gradient(90deg,rgba(7,24,38,.95),rgba(7,24,38,.45),rgba(7,24,38,.65)); }
        .coal-image-band-content { position:relative; z-index:1; width:min(1240px,calc(100% - 40px)); margin:auto; }
        .coal-image-band h2 { max-width:750px; font-size:clamp(46px,7vw,88px); line-height:.9; margin:12px 0 18px; }
        .coal-image-band p { max-width:620px; color:rgba(244,240,231,.72); line-height:1.75; }
        .coal-form-shell { display:grid; grid-template-columns:.75fr 1.25fr; gap:50px; align-items:start; }
        .coal-form-intro { position:sticky; top:110px; }
        .coal-form-intro h2 { font-size:clamp(44px,5vw,70px); line-height:.95; margin:12px 0 18px; }
        .coal-form-intro p { color:var(--muted); line-height:1.8; }
        .coal-form-points { display:grid; gap:10px; margin-top:26px; }
        .coal-form-point { padding:13px 15px; border-left:2px solid var(--gold); background:rgba(255,255,255,.035); color:rgba(244,240,231,.7); font-size:11px; }
        .coal-page .coal-form { background:rgba(255,255,255,.045); border:1px solid var(--line); border-radius:24px; padding:clamp(20px,3vw,34px); box-shadow:0 30px 80px rgba(0,0,0,.25); }
        .coal-final { text-align:center; padding:110px 20px; background:linear-gradient(135deg,#101214,#071826); border-top:1px solid var(--line); }
        .coal-final h2 { max-width:900px; margin:12px auto 18px; font-size:clamp(44px,6vw,82px); line-height:.92; }
        .coal-final p { max-width:620px; margin:0 auto 28px; color:var(--muted); line-height:1.8; }
        .coal-email { color:var(--gold); font-size:12px; letter-spacing:.08em; }
        @media(max-width:900px){
          .coal-origin-grid{grid-template-columns:repeat(2,1fr);}
          .coal-feature{grid-template-columns:1fr;}
          .coal-feature-media{min-height:420px;}
          .coal-form-shell{grid-template-columns:1fr;}
          .coal-form-intro{position:static;}
        }
        @media(max-width:680px){
          .coal-shell,.coal-hero-inner,.coal-image-band-content{width:min(100% - 28px,1240px);}
          .coal-hero-inner{padding-top:130px;padding-bottom:45px;}
          .coal-hero h1{font-size:clamp(48px,14vw,72px);}
          .coal-hero-nav{align-items:flex-end;}
          .coal-thumb{width:48px;height:36px;}
          .coal-trust-inner{grid-template-columns:repeat(2,1fr);}
          .coal-trust-item:nth-child(2){border-right:0;}
          .coal-trust-item:nth-child(-n+2){border-bottom:1px solid var(--line);}
          .coal-origin-intro{grid-template-columns:1fr;gap:20px;}
          .coal-origin-grid{grid-template-columns:1fr;}
          .coal-mini-grid{grid-template-columns:1fr;}
          .coal-feature-media{min-height:330px;}
          .coal-table-wrap{overflow-x:auto;}
          .coal-table-wrap table{min-width:520px;}
        }
        /* Mobile-only Hero alignment */
        @media (max-width: 680px) {
          .coal-hero-inner {
            text-align: center;
          }

          .coal-hero-copy {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .coal-kicker {
            justify-content: center;
            text-align: center;
          }

          .coal-hero h1 {
            width: 100%;
            max-width: 100%;
            margin-left: auto;
            margin-right: auto;
            text-align: center;
          }

          .coal-hero-lead {
            width: 100%;
            max-width: 620px;
            margin-left: auto;
            margin-right: auto;
            text-align: center;
          }

          .coal-hero-actions {
            width: 100%;
            justify-content: center;
          }

          .coal-hero-meta {
            width: 100%;
            justify-content: center;
          }

          .coal-meta {
            text-align: center;
          }

          .coal-hero-nav {
            width: 100%;
            max-width: 100%;
            justify-content: center;
            flex-wrap: wrap;
            gap: 18px;
          }

          .coal-thumbs {
            justify-content: center;
          }

          .coal-counter {
            text-align: center;
          }
        }

      `}</style>

      <main className="coal-page">
        <section className="coal-hero" aria-label="Coal supply">
          <div className="coal-hero-media">
            <AnimatePresence mode="wait">
              <motion.img key={currentIndex} src={HERO_IMAGES[currentIndex]} alt="Coal mining and supply"
                initial={{opacity:0,scale:1.04}} animate={{opacity:1,scale:1}} exit={{opacity:0}}
                transition={{duration:1.25,ease:'easeInOut'}} />
            </AnimatePresence>
          </div>
          <div className="coal-hero-inner">
            <motion.div className="coal-hero-copy" initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} transition={{duration:1,ease:[.16,1,.3,1]}}>
              <span className="coal-kicker"><i/> Coal & Industrial Materials</span>
              <h1 className="coal-display">Powering Industry.<br/>Delivering Reliability.</h1>
              <p className="coal-hero-lead">Domestic and imported coal supply coordinated around specification, quantity and destination.</p>
              <div className="coal-hero-actions">
                <button onClick={openRequirementBuilder} className="coal-button primary">Request Bulk Quote</button>
                <button onClick={scrollToSpecs} className="coal-button ghost">View Coal Specifications</button>
              </div>
              <div className="coal-hero-meta">
                <span className="coal-meta">Domestic & Imported</span>
                <span className="coal-meta">Specification-led sourcing</span>
                <span className="coal-meta">Logistics coordination</span>
              </div>
              <div className="coal-hero-nav">
                <div className="coal-thumbs">
                  {HERO_IMAGES.map((src,index)=>(
                    <button key={src} className={`coal-thumb ${index===currentIndex?'active':''}`} onClick={()=>goToImage(index)} aria-label={`Show coal image ${index+1}`}>
                      <img src={src} alt="" />
                    </button>
                  ))}
                </div>
                <span className="coal-counter">{String(currentIndex+1).padStart(2,'0')} / {String(HERO_IMAGES.length).padStart(2,'0')}</span>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="coal-trust">
          <div className="coal-shell coal-trust-inner">
            <div className="coal-trust-item"><strong>ISO‑9001 certified</strong><span>Quality-led operations</span></div>
            <div className="coal-trust-item"><strong>150+ satisfied clients</strong><span>Commercial relationships</span></div>
            <div className="coal-trust-item"><strong>24/7 dedicated support</strong><span>Responsive coordination</span></div>
            <div className="coal-trust-item"><strong>Origin to destination</strong><span>One supply workflow</span></div>
          </div>
        </section>

        <section className="coal-section coal-section-light">
          <div className="coal-shell">
            <div className="coal-origin-intro coal-section-head">
              <div><span className="coal-eyebrow">Core capabilities</span><h2 className="coal-display">One Supply Desk.<br/>Multiple Origins.</h2></div>
              <p>Every industrial requirement is different. Coal selection must consider calorific value, moisture, ash, sulphur, volatile matter, fixed carbon, sizing, application, delivery location and commercial terms.</p>
            </div>
            <div className="coal-origin-grid">
              {[
                ['01','Domestic Coal','Assam and Jharkhand sourcing coordinated around current grade, COA and loading conditions.','Assam'],
                ['02','Imported Coal','Indonesia and U.S. options assessed against basis, specification and destination.','Indonesia'],
                ['03','Industrial Fit','Thermal, steam, coking and metallurgical requirements mapped to application.','Jharkhand'],
                ['04','Logistics Support','Road, rail, port, vessel and multimodal coordination around destination.','logistics']
              ].map(([n,title,desc,key])=>(
                <article className="coal-origin-card" key={title} onClick={()=>handleOriginSelect(key)}>
                  <span className="coal-origin-index">{n}</span><h3 className="coal-display">{title}</h3><p>{desc}</p><div className="origin-link">Explore requirement →</div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="coal-section coal-section-deep" id="specifications">
          <div className="coal-shell">
            <div className="coal-feature">
              <div className="coal-feature-media"><img src={HERO_IMAGES[1]} alt="Coal supply operations" /></div>
              <div className="coal-feature-copy">
                <span className="coal-eyebrow">Specification-led sourcing</span>
                <h2 className="coal-display">Built Around Your Specification.</h2>
                <p>India Trade Overseas coordinates each requirement according to the buyer's declared technical and commercial parameters. Reference values remain subject to current source declaration and commercial confirmation.</p>
                <div className="coal-mini-grid">
                  <div className="coal-mini-card"><strong>GCV</strong><span>Basis must always be defined.</span></div>
                  <div className="coal-mini-card"><strong>Quality</strong><span>Ash, sulphur, moisture & more.</span></div>
                  <div className="coal-mini-card"><strong>Delivery</strong><span>Origin, port and destination.</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="coal-section coal-section-light">
          <div className="coal-shell">
            <div className="coal-section-head">
              <span className="coal-eyebrow">Origin portfolio</span>
              <h2 className="coal-display">Coal Supply by Origin</h2>
              <p>Multiple coalfields, product categories and commercial structures require origin-specific evaluation.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <OriginCard name="ASSAM" description="High-calorific domestic option with low-ash characteristics. Sulphur can be comparatively high – confirm via current mine declaration / COA." grades={[{ label:'G1', range:'>7,500–7,600 kcal/kg' },{ label:'G2', range:'>6,700–7,000 kcal/kg' },{ label:'G4', range:'>6,100–6,400 kcal/kg' }]} details={['Reference: North Eastern Coalfields, Tikak Colliery','Mandatory checks: grade, GCV basis, moisture, ash, sulphur, VM, FC, sizing, qty, loading point, transport, application, COA']} onSelect={()=>handleOriginSelect('Assam')}/>
              <OriginCard name="JHARKHAND" description="Multiple coalfields, seams & product categories – never market under one GCV." grades={[]} details={['Non-coking thermal – G-grade, size, COA','Steam / industrial – boiler GCV, ash, sulphur, moisture, size','ROM or Sized – source permission, oversize/undersize tolerance','Washed – yield, ash guarantee, moisture, test method','Coking / Metallurgical – ash + full coking analysis (CSN/FSI, CSR, CRI, fluidity, vitrinite…)']} onSelect={()=>handleOriginSelect('Jharkhand')}/>
              <OriginCard name="INDONESIA" description="Thermal coal quoted on GAR unless otherwise agreed. HBA benchmarks (Ministry of EMR, Dec 227/2023) are reference only." grades={[{label:'HBA',gcv:'6,322',tm:'12.26%',s:'0.66%',ash:'7.94%'},{label:'HBA I',gcv:'5,300',tm:'21.32%',s:'0.75%',ash:'6.04%'},{label:'HBA II',gcv:'4,100',tm:'35.73%',s:'0.23%',ash:'3.90%'},{label:'HBA III',gcv:'3,400',tm:'44.30%',s:'0.24%',ash:'3.88%'}]} details={['Enquiry fields: GAR/NAR, rejection value, TM, IM, ash, S, VM, FC, HGI, AFT, cargo size, load/discharge ports, laycan, Incoterm, inspection agency, sampling method, accepted lab']} isTable onSelect={()=>handleOriginSelect('Indonesia')}/>
              <OriginCard name="UNITED STATES" description="Enquiries may cover Anthracite, Bituminous, Sub-bituminous, Lignite, Thermal, Metallurgical." grades={[{label:'Anthracite',mmbtu:'25.090',kcal:'6,976'},{label:'Bituminous',mmbtu:'23.270',kcal:'6,470'},{label:'Sub-bituminous',mmbtu:'17.490',kcal:'4,863'},{label:'Lignite',mmbtu:'12.970',kcal:'3,606'}]} details={['Conversion: 1 MMBtu/short ton ≈ 278 kcal/kg','Reference values are not cargo guarantees']} isUsTable onSelect={()=>handleOriginSelect('U.S.')}/>
            </div>
          </div>
        </section>

        <section className="coal-image-band">
          <img src={HERO_IMAGES[2]} alt="Coal industrial material" />
          <div className="coal-image-band-content">
            <span className="coal-eyebrow">Technical clarity</span>
            <h2 className="coal-display">The Right Coal Starts With the Right Basis.</h2>
            <p>A value such as “5,500 kcal/kg” is incomplete unless the basis (GAR, ARB, ADB, DB, NAR, DAF…) is also stated.</p>
          </div>
        </section>

        <section className="coal-section coal-section-light">
          <div className="coal-shell">
            <div className="coal-section-head"><span className="coal-eyebrow">Indian classification</span><h2 className="coal-display">G1–G17 Coal Classification</h2><p>Actual mine availability and dispatch grade remain subject to current source declaration and commercial confirmation.</p></div>
            <div className="coal-table-wrap"><table><thead><tr><th>Grade</th><th>GCV (kcal/kg)</th></tr></thead><tbody>{[['G1','>7,000'],['G2','>6,700–7,000'],['G3','>6,400–6,700'],['G4','>6,100–6,400'],['G5','>5,800–6,100'],['G6','>5,500–5,800'],['G7','>5,200–5,500'],['G8','>4,900–5,200'],['G9','>4,600–4,900'],['G10','>4,300–4,600'],['G11','>4,000–4,300'],['G12','>3,700–4,000'],['G13','>3,400–3,700'],['G14','>3,100–3,400'],['G15','>2,800–3,100'],['G16','>2,500–2,800'],['G17','>2,200–2,500']].map(([grade,gcv])=><tr key={grade}><td>{grade}</td><td>{gcv}</td></tr>)}</tbody></table></div>
          </div>
        </section>

        <section className="coal-section coal-section-deep">
          <div className="coal-shell">
            <div className="coal-section-head"><span className="coal-eyebrow">Metallurgical applications</span><h2 className="coal-display">Coking Coal Cannot Be Evaluated by GCV Alone.</h2><p>Additional metallurgical parameters include total ash, sulphur, phosphorus, VM, FC, CSN/FSI, CSR, CRI, max fluidity, vitrinite, moisture, size distribution and coke-making suitability.</p></div>
            <div className="coal-table-wrap"><table><thead><tr><th>Category</th><th>Ash %</th></tr></thead><tbody>{[['Steel Grade I','≤15'],['Steel Grade II','15–18'],['Washery Grade I','18–21'],['Washery Grade II','21–24'],['Washery Grade III','24–28'],['Washery Grade IV','28–35'],['Washery Grade V','35–42'],['Washery Grade VI','42–49']].map(([cat,ash])=><tr key={cat}><td>{cat}</td><td>{ash}</td></tr>)}</tbody></table></div>
            <h3 style={{marginTop:45,marginBottom:18}}>Semi-coking / Weakly coking</h3>
            <div className="coal-table-wrap"><table><thead><tr><th>Grade</th><th>Ash + Moisture %</th></tr></thead><tbody>{[['Semi-Coking I','≤19'],['Semi-Coking II','19–24']].map(([g,v])=><tr key={g}><td>{g}</td><td>{v}</td></tr>)}</tbody></table></div>
          </div>
        </section>

        <section className="coal-section coal-section-light">
          <div className="coal-shell">
            <div className="coal-feature">
              <div className="coal-feature-copy">
                <span className="coal-eyebrow">Calorific terminology</span>
                <h2 className="coal-display">Specification First. Commercial Clarity Second.</h2>
                <p>GCV, NCV, GAR, NAR, ARB, ADB, DB and DAF describe different bases. The commercial offer should state the applicable basis explicitly.</p>
                <div className="coal-mini-grid">
                  <div className="coal-mini-card"><strong>GAR</strong><span>Gross calorific value, as received.</span></div>
                  <div className="coal-mini-card"><strong>NAR</strong><span>Net calorific value, as received.</span></div>
                  <div className="coal-mini-card"><strong>DAF</strong><span>Dry, ash-free basis.</span></div>
                </div>
              </div>
              <div className="coal-feature-media"><img src={HERO_IMAGES[3]} alt="Coal specification" /></div>
            </div>
          </div>
        </section>

        <section id="quote-form" className="coal-section coal-section-deep">
          <div className="coal-shell coal-form-shell">
            <div className="coal-form-intro">
              <span className="coal-eyebrow">Commercial enquiry</span>
              <h2 className="coal-display">Build Your Coal Requirement.</h2>
              <p>
                Tell us exactly what you need — origin, coal type, GCV and basis,
                quality parameters, quantity, destination, logistics and commercial terms.
              </p>
              <div className="coal-form-points">
                <div className="coal-form-point">Coal origin + product type</div>
                <div className="coal-form-point">GCV + complete quality specification</div>
                <div className="coal-form-point">Order + trial + recurring quantity</div>
                <div className="coal-form-point">Destination + transport + Incoterm</div>
              </div>
            </div>

            <div className="coal-form coal-glass" style={{ display:'flex', flexDirection:'column', gap:18 }}>
              <div>
                <span className="coal-eyebrow">Coal Requirement Builder</span>
                <h3 className="coal-display" style={{ fontSize:'clamp(30px,4vw,48px)', margin:'10px 0 12px' }}>
                  Specification first.
                </h3>
                <p style={{ color:'var(--muted)', lineHeight:1.75, margin:0 }}>
                  Complete the requirement builder and then enter your contact details.
                  Your requirement is registered as a Coal visitor before pricing.
                </p>
              </div>
              <button type="button" onClick={openRequirementBuilder} className="coal-button primary">
                BUILD COAL REQUIREMENT
              </button>
            </div>
          </div>
        </section>

        <section className="coal-final">
          <span className="coal-eyebrow">India Trade Overseas</span>
          <h2 id="final-title" className="coal-display">Looking for a Reliable Coal Supply Partner?</h2>
          <p>Share your required coal origin, GCV, testing basis, quantity, application and destination. India Trade Overseas will review the specification and coordinate the next available commercial steps.</p>
          <button onClick={openRequirementBuilder} className="coal-button primary">Request Bulk Quote</button>
          <div className="coal-email">info@indiatradeoverseas.com</div>
        </section>

        <CoalRequirementBuilder
          isOpen={showRequirementBuilder}
          onClose={() => setShowRequirementBuilder(false)}
          onComplete={handleRequirementComplete}
        />

        <AnimatePresence>
          {showPersonalDetails && (
            <PersonalDetailsModal
              requirement={builtRequirement}
              values={personalDetails}
              submitting={submittingPersonalDetails}
              onChange={handlePersonalDetailsChange}
              onClose={() => setShowPersonalDetails(false)}
              onSubmit={handlePersonalDetailsSubmit}
            />
          )}
        </AnimatePresence>
      </main>
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


function PersonalDetailsModal({ requirement, values, submitting, onChange, onClose, onSubmit }) {
  const inputClass =
    'w-full mt-2 px-3 py-3 rounded-lg border border-white/20 bg-[#071826]/70 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#D4A84F]';

  return (
    <motion.div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-[#D4A84F]/30 bg-[#101214] shadow-2xl"
        initial={{ opacity: 0, y: 20, scale: .98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: .98 }}
      >
        <div className="p-6 md:p-8 border-b border-white/10">
          <div className="flex justify-between gap-4">
            <div>
              <span className="coal-eyebrow">Coal Visitor Registration</span>
              <h2 className="coal-display text-4xl mt-2">Your contact details.</h2>
              <p className="text-white/55 text-sm mt-2">We use these details to create your Coal visitor and prepare the pricing step.</p>
            </div>
            <button type="button" onClick={onClose} className="text-white/60 hover:text-white text-2xl" aria-label="Close">×</button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="p-6 md:p-8 space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              ['fullName','Full name','text','Your name'],
              ['email','Work email','email','you@company.com'],
              ['mobile','Mobile / WhatsApp','tel','10-digit mobile number'],
              ['city','City','text','City'],
              ['state','State','text','State'],
            ].map(([name, label, type, placeholder]) => (
              <label key={name} className={`block ${name === 'state' ? 'sm:col-span-2' : ''}`}>
                <span className="text-sm text-white/90 font-medium">{label} <span className="text-[#D4A84F]">*</span></span>
                <input
                  className={inputClass}
                  name={name}
                  type={type}
                  value={values[name]}
                  onChange={onChange}
                  placeholder={placeholder}
                  required
                />
              </label>
            ))}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[.025] p-4">
            <div className="text-[10px] uppercase tracking-[.12em] text-[#D4A84F] mb-3">Requirement summary</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <SummaryItem label="Company" value={requirement?.company} />
              <SummaryItem label="Origin" value={requirement?.origin} />
              <SummaryItem label="Coal type" value={requirement?.coalType} />
              <SummaryItem label="GCV" value={requirement?.gcv ? `${requirement.gcv} kcal/kg` : 'Not specified'} />
              <SummaryItem label="Quantity" value={requirement?.orderQty ? `${requirement.orderQty} MT` : 'Not specified'} />
              <SummaryItem label="Destination" value={requirement?.dest} />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full coal-button primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'CREATING COAL VISITOR...' : 'CONTINUE TO COAL PRICING'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[.1em] text-white/40">{label}</div>
      <div className="text-white/80 mt-1 break-words">{value || 'Not specified'}</div>
    </div>
  );
}

export default Coal;
