import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import useDocumentMeta from '../../hooks/useDocumentMeta';
import SmokeyCursor from '../../components/lightswind/smokey-cursor';
import { 
  FiCheck, FiTarget, FiBarChart2, FiUsers, FiZap, 
  FiShield, FiGlobe, FiMessageSquare, FiSpeaker, FiChevronRight,
  FiTrendingUp, FiLayers, FiCpu, FiDatabase, FiAward, FiClock, FiMail, FiPhone, FiMapPin
} from 'react-icons/fi';

const COLORS = {
  orange: '#F76E01',
  orangeLight: '#ff8c2e',
  navy: '#01102D',
  navyLight: '#081a3d',
  navyCard: '#041536',
  white: '#ffffff',
  gray: '#9ca3af',
  darkGray: '#374151'
};

const STORM_CONFIG = {
  bgColor: '#01102D',
  flameColor: '#F76E01',
  flameColor2: '#ffb066',
  flameAmt: 0.18,
  atmoColor: '#ffa04d',
  atmoCount: 80,
  atmoSize: 22,
  atmoSpeed: 1.0,
  coreColor: '#0a1f4a',
  midColor: '#F76E01',
  rimColor: '#ffb066',
  opacity: 2,
  pointSize: 75,
  brightness: 1.5,
  spin: 0.03,
  blowUp: 0,
  repelRadius: 1.4,
  repelStrength: 4,
  scrollDive: 3,
  scrollGrow: 0.5,
  scrollSpin: 0.6,
  parallax: 0.7,
};

function hexToVec3(hex) {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

// 3D Storm Canvas Component for Section Background - Optimized
function SectionStormBackground() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const animIdRef = useRef(null);
  const threeRef = useRef(null);

  // IntersectionObserver to only run when visible
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { rootMargin: '100px', threshold: 0.01 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Initialize Three.js only when visible
  useEffect(() => {
    if (!isVisible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let width = canvas.parentElement.clientWidth || window.innerWidth;
    let height = canvas.parentElement.clientHeight || 800;

    const renderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: true, 
      powerPreference: 'high-performance' 
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 0, 15);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 80);
    camera.position.set(0, 0, 7);
    scene.add(camera);

    // Single composer with bloom - simpler and faster
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.35, 0.4, 0);
    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // Drastically reduced particle count: 50000 -> 8000
    const count = 8000;
    const radius = 2.5;
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const noises = new Float32Array(count);
    const radialPush = new Float32Array(count);
    const mixv = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      let u, v, s;
      do {
        u = Math.random() * 2 - 1;
        v = Math.random() * 2 - 1;
        s = u * u + v * v;
      } while (s >= 1 || s === 0);
      const factor = 2 * Math.sqrt(1 - s);
      const dx = u * factor, dy = v * factor, dz = 1 - 2 * s;
      const rN = Math.pow(Math.random(), 0.4);
      const r = radius * (0.55 + rN * 0.45);
      positions[i3] = dx * r;
      positions[i3 + 1] = dy * r;
      positions[i3 + 2] = dz * r;
      mixv[i] = rN;
      scales[i] = 0.45 + Math.random() * 0.8;
      noises[i] = Math.random();
      radialPush[i] = 0.4 + rN * 1.1;
    }

    const stormGeo = new THREE.BufferGeometry();
    stormGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    stormGeo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    stormGeo.setAttribute('aNoise', new THREE.BufferAttribute(noises, 1));
    stormGeo.setAttribute('aRadialPush', new THREE.BufferAttribute(radialPush, 1));
    stormGeo.setAttribute('aMix', new THREE.BufferAttribute(mixv, 1));

    const stormUniforms = {
      uTime: { value: 0 },
      uSize: { value: STORM_CONFIG.pointSize },
      uOpacity: { value: 0 },
      uBlowUp: { value: 0 },
      uCursor: { value: new THREE.Vector3() },
      uRepelRadius: { value: STORM_CONFIG.repelRadius },
      uRepelStrength: { value: STORM_CONFIG.repelStrength },
      uActivity: { value: 0 },
      uCore: { value: hexToVec3(STORM_CONFIG.coreColor) },
      uMid: { value: hexToVec3(STORM_CONFIG.midColor) },
      uRim: { value: hexToVec3(STORM_CONFIG.rimColor) },
      uBrightness: { value: STORM_CONFIG.brightness }
    };

    const stormMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: stormUniforms,
      vertexShader: `
        uniform float uTime; uniform float uSize; uniform float uBlowUp;
        uniform vec3 uCursor; uniform float uRepelRadius; uniform float uRepelStrength; uniform float uActivity;
        uniform vec3 uCore; uniform vec3 uMid; uniform vec3 uRim;
        attribute float aScale; attribute float aNoise; attribute float aRadialPush; attribute float aMix;
        varying vec3 vColor; varying float vBlowUp;
        void main() {
          vec3 pos = position;
          float t = uTime * 1.4 + aNoise * 6.2831;
          float wobble = sin(t) * 0.1 * aRadialPush;
          pos *= 1.0 + wobble;

          float swirlAngle = uTime * 0.05 + aNoise * 6.2831;
          mat2 swirl = mat2(cos(swirlAngle), -sin(swirlAngle), sin(swirlAngle), cos(swirlAngle));
          pos.xz = swirl * pos.xz;

          vec3 outward = normalize(pos + vec3(0.0001));
          float blow = uBlowUp * uBlowUp;
          pos += outward * blow * (10.0 + aNoise * 18.0) * aRadialPush;

          vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
          vec3 toParticle = modelPosition.xyz - uCursor;
          float dist = length(toParticle);
          float falloff = smoothstep(uRepelRadius, 0.0, dist);
          modelPosition.xyz += normalize(toParticle + vec3(0.0001)) * falloff * uRepelStrength * uActivity;

          vec4 viewPosition = viewMatrix * modelPosition;
          gl_Position = projectionMatrix * viewPosition;
          gl_PointSize = uSize * aScale * (1.0 / -viewPosition.z);

          float t1 = smoothstep(0.25, 0.85, aMix);
          vec3 mix1 = mix(uCore, uMid, t1);
          float t2 = clamp((aMix - 0.7) * 3.0, 0.0, 1.0);
          vColor = mix(mix1, uRim, t2);
          vBlowUp = uBlowUp;
        }
      `,
      fragmentShader: `
        uniform float uOpacity; uniform float uBrightness;
        varying vec3 vColor; varying float vBlowUp;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float strength = pow(1.0 - d * 2.0, 4.5);
          vec3 color = mix(vec3(0.0), vColor, strength);
          float blowFade = 1.0 - smoothstep(0.15, 1.0, vBlowUp);
          gl_FragColor = vec4(color * uBrightness, strength * uOpacity * blowFade);
        }
      `
    });

    const stormPoints = new THREE.Points(stormGeo, stormMat);
    const stormGroup = new THREE.Group();
    stormGroup.add(stormPoints);
    scene.add(stormGroup);

    // Reduced atmosphere particles: 260 -> 80
    const N = 80;
    const atmoPos = new Float32Array(N * 3);
    const atmoSizes = new Float32Array(N);
    const atmoSeeds = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      atmoPos[i * 3] = 2 * Math.random() - 1;
      atmoPos[i * 3 + 1] = 2 * Math.random() - 1;
      atmoPos[i * 3 + 2] = 2 * Math.random() - 1;
      atmoSizes[i] = STORM_CONFIG.atmoSize * (0.4 + Math.random());
      atmoSeeds[i] = Math.random();
    }

    const atmoGeo = new THREE.BufferGeometry();
    atmoGeo.setAttribute('position', new THREE.BufferAttribute(atmoPos, 3));
    atmoGeo.setAttribute('size', new THREE.BufferAttribute(atmoSizes, 1));
    atmoGeo.setAttribute('seed', new THREE.BufferAttribute(atmoSeeds, 1));

    const atmoMat = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: hexToVec3(STORM_CONFIG.atmoColor) },
        uRes: { value: new THREE.Vector2(width * renderer.getPixelRatio(), height * renderer.getPixelRatio()) }
      },
      vertexShader: `
        attribute float size; attribute float seed; uniform float uTime; uniform vec2 uRes;
        varying float vA;
        vec3 warp(vec3 p, float t){ 
          float c = 0.9, a = 1.9, b = 0.02, s = 0.05; 
          p *= 2.0;
          p.x += c * sin(s * t + a * p.y) + t * b; 
          p.y += c * cos(s * t + a * p.x); 
          p.y += c * sin(s * t + a * p.z) + t * b;
          p.z += c * cos(s * t + a * p.y); 
          p.z += c * sin(s * t + a * p.x); 
          p.x += c * cos(s * t + a * p.z);
          return cos(p + vec3(1.0, 2.0, 4.0)); 
        }
        void main(){
          vec3 v = position * 4.0 + warp(position, uTime) * 1.2;
          vec4 mv = modelViewMatrix * vec4(v, 1.0);
          float r = length(v); 
          float farF = 1.0 - smoothstep(5.0, 6.5, r); 
          float nearF = smoothstep(0.0, 0.5, -mv.z);
          vA = farF * nearF;
          gl_PointSize = size * uRes.y / 900.0 / -mv.z; 
          gl_PointSize = max(gl_PointSize, 1.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor; varying float vA;
        void main(){ 
          vec2 p = gl_PointCoord - 0.5; 
          float l = length(p); 
          if (l > 0.5) discard;
          float tex = smoothstep(0.5, 0.0, l); 
          gl_FragColor = vec4(uColor * tex, tex * vA * 0.6); 
        }
      `
    });

    const atmoPoints = new THREE.Points(atmoGeo, atmoMat);
    atmoPoints.frustumCulled = false;
    scene.add(atmoPoints);

    const Lerp = (a, b, t) => a + (b - a) * t;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    let scrollTarget = 0, scrollSmooth = 0, scrollCurrent = 0;
    const mouseSmooth = { x: 0, y: 0 };
    const POINTER = { 
      ndc: new THREE.Vector2(0, 0), 
      world: new THREE.Vector3(), 
      activity: 0, 
      active: false, 
      lastMove: performance.now() 
    };

    const onMouseMove = (e) => {
      POINTER.ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
      POINTER.ndc.y = -((e.clientY / window.innerHeight) * 2 - 1);
      POINTER.active = true;
      POINTER.lastMove = performance.now();
    };

    const onMouseOut = () => { POINTER.active = false; };

    const updateScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollTarget = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseout', onMouseOut, { passive: true });
    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll();

    const _ndc = new THREE.Vector3(), _dir = new THREE.Vector3(), _target = new THREE.Vector3();
    const updatePointer = () => {
      _target.set(0, 0, 0);
      if (POINTER.active) {
        _ndc.set(POINTER.ndc.x, POINTER.ndc.y, 0.5).unproject(camera);
        _dir.copy(_ndc).sub(camera.position).normalize();
        const denom = _dir.z;
        if (Math.abs(denom) > 1e-4) {
          const t = -camera.position.z / denom;
          if (t > 0 && Number.isFinite(t)) _target.copy(camera.position).addScaledVector(_dir, t);
        }
      }
      POINTER.world.lerp(_target, 0.12);
      const idle = (performance.now() - POINTER.lastMove) / 1000;
      const want = (POINTER.active && idle < 3) ? 1 : 0;
      POINTER.activity += (want - POINTER.activity) * 0.06;
    };

    const appearStart = performance.now();
    let t0 = appearStart / 1000;

    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);

      scrollSmooth = Lerp(scrollSmooth, scrollTarget, 0.10);
      scrollCurrent = Lerp(scrollCurrent, scrollSmooth, 0.06);
      mouseSmooth.x = Lerp(mouseSmooth.x, POINTER.ndc.x, 0.06);
      mouseSmooth.y = Lerp(mouseSmooth.y, POINTER.ndc.y, 0.06);

      updatePointer();

      const t = performance.now() / 1000;
      const dt = Math.min(0.05, t - t0);
      t0 = t;

      stormUniforms.uTime.value = t;
      camera.position.set(
        mouseSmooth.x * STORM_CONFIG.parallax, 
        mouseSmooth.y * STORM_CONFIG.parallax, 
        7 - scrollCurrent * STORM_CONFIG.scrollDive
      );
      camera.lookAt(0, 0, 0);

      stormGroup.scale.setScalar(1 + scrollCurrent * STORM_CONFIG.scrollGrow);
      const elapsed = performance.now() - appearStart;
      const fade = Math.max(0, Math.min(1, (elapsed - 300) / 1400));
      stormUniforms.uOpacity.value = fade * STORM_CONFIG.opacity;
      stormUniforms.uCursor.value.copy(POINTER.world);
      stormUniforms.uActivity.value = POINTER.activity;

      stormGroup.rotation.y += dt * (STORM_CONFIG.spin + scrollCurrent * STORM_CONFIG.scrollSpin);
      stormGroup.rotation.x += dt * STORM_CONFIG.spin * 0.33;

      atmoMat.uniforms.uTime.value = t * STORM_CONFIG.atmoSpeed * 8.0;
      atmoPoints.position.copy(camera.position);

      composer.render();
    };

    animate();

    const onResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.parentElement.clientWidth;
      height = canvas.parentElement.clientHeight;
      const pr = Math.min(window.devicePixelRatio, 2);

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setPixelRatio(pr);
      renderer.setSize(width, height);

      composer.setPixelRatio(pr);
      composer.setSize(width, height);

      atmoMat.uniforms.uRes.value.set(width * pr, height * pr);
      updateScroll();
    };

    window.addEventListener('resize', onResize);

    threeRef.current = { renderer, scene, camera, composer, stormGeo, stormMat, atmoGeo, atmoMat };

    return () => {
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseout', onMouseOut);
      window.removeEventListener('scroll', updateScroll);
      window.removeEventListener('resize', onResize);

      if (threeRef.current) {
        const { renderer, stormGeo, stormMat, atmoGeo, atmoMat } = threeRef.current;
        renderer.dispose();
        stormGeo.dispose();
        stormMat.dispose();
        atmoGeo.dispose();
        atmoMat.dispose();
      }
    };
  }, [isVisible]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full pointer-events-none z-0 block opacity-80"
      />
    </div>
  );
}

// Lightweight 3D Tilt Card using CSS transforms (no framer-motion overhead)
function TiltCard3D({ children, className = '', style = {}, glare = true, ...props }) {
  const cardRef = useRef(null);
  const [transform, setTransform] = useState('perspective(1200px) rotateX(0deg) rotateY(0deg)');
  const [glareStyle, setGlareStyle] = useState({});

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const rotateY = ((mouseX / width) - 0.5) * 24; // -12 to 12
    const rotateX = -((mouseY / height) - 0.5) * 24; // -12 to 12
    
    setTransform(`perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
    
    if (glare) {
      const glareX = (mouseX / width) * 100;
      const glareY = (mouseY / height) * 100;
      setGlareStyle({
        background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(247, 110, 1, 0.22) 0%, rgba(255, 255, 255, 0.05) 30%, transparent 70%)`,
        opacity: 1
      });
    }
  };

  const handleMouseLeave = () => {
    setTransform('perspective(1200px) rotateX(0deg) rotateY(0deg)');
    if (glare) {
      setGlareStyle(prev => ({ ...prev, opacity: 0 }));
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform,
        transformStyle: 'preserve-3d',
        transition: 'transform 0.15s ease-out',
        ...style
      }}
      className={`relative ${className}`}
      {...props}
    >
      {glare && (
        <div 
          className="absolute inset-0 rounded-2xl pointer-events-none z-30 transition-opacity duration-300"
          style={{ ...glareStyle, opacity: glareStyle.opacity ?? 0 }}
        />
      )}
      {children}
    </div>
  );
}

/*

const particles = Array.from({ length: 35 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1.5,
  opacity: Math.random() * 0.4 + 0.1
}));

*/

const services = [
  {
    icon: FiTarget,
    title: 'Paid Inbound Lead Generation',
    description: 'High-intent campaigns across Google, Meta, LinkedIn & programmatic channels. We build funnels that convert clicks into qualified business inquiries.',
    features: ['Search & Display Networks', 'Social Media Advertising', 'LinkedIn B2B Targeting', 'Programmatic & Native Ads']
  },
  {
    icon: FiBarChart2,
    title: 'Performance Marketing',
    description: 'Data-driven campaign optimization with real-time bidding, audience segmentation, and ROAS maximization. Every rupee tracked, measured, and improved.',
    features: ['Real-time Bidding', 'A/B Testing Framework', 'Conversion Rate Optimization', 'Attribution Modeling']
  },
  {
    icon: FiUsers,
    title: 'Customer Acquisition Systems',
    description: 'End-to-end acquisition funnels from impression to opportunity. Landing pages, lead magnets, qualification workflows, and nurture sequences built for scale.',
    features: ['Custom Landing Pages', 'Lead Magnets & Forms', 'Qualification Scoring', 'Automated Nurture Sequences']
  },
  {
    icon: FiZap,
    title: 'CRM Automation & Integration',
    description: 'Seamless CRM-ready lead delivery with instant notifications, auto-assignment, and pipeline synchronization. Your sales team gets leads in real-time.',
    features: ['Instant Lead Push', 'Auto-assignment Rules', 'Pipeline Sync', 'WhatsApp/Email Alerts']
  },
  {
    icon: FiGlobe,
    title: 'Pan-India Targeting',
    description: 'Geo-fenced campaigns across 28 states and 8 union territories. Hyper-local targeting for manufacturers, distributors, and industrial buyers.',
    features: ['State & City Targeting', 'Pincode-level Precision', 'Industrial Zone Focus', 'Multi-language Campaigns']
  },
  {
    icon: FiShield,
    title: 'Transparent Reporting',
    description: 'Live dashboards with spend, CPL, lead quality scores, and pipeline revenue attribution. No black boxes — full visibility into every campaign.',
    features: ['Real-time Dashboards', 'Lead Quality Scoring', 'Revenue Attribution', 'Weekly Performance Reviews']
  }
];

const packages = [
  {
    name: 'Starter',
    price: '₹5,000',
    leads: '50 Leads',
    cpl: '₹100/Lead',
    description: 'Ideal for businesses testing paid lead generation for the first time.',
    features: ['Google Search Campaigns', 'Meta Lead Ads', 'Basic Landing Page', 'Weekly Reports', 'Email Lead Delivery', '1 Target Location']
  },
  {
    name: 'Growth',
    price: '₹10,000',
    leads: '125 Leads',
    cpl: '₹80/Lead',
    description: 'Best for growing businesses needing consistent lead flow with better targeting.',
    features: ['Everything in Starter', 'LinkedIn Campaigns', 'Advanced Landing Page', 'Bi-weekly Optimization', 'CRM Integration', '3 Target Locations', 'WhatsApp Alerts']
  },
  {
    name: 'Business',
    price: '₹15,000',
    leads: '200 Leads',
    cpl: '₹75/Lead',
    description: 'For established businesses scaling acquisition across multiple channels.',
    features: ['Everything in Growth', 'Programmatic Display', 'Custom Lead Scoring', 'Weekly Optimization', 'Dedicated Account Manager', '5 Target Locations', 'API Integration']
  },
  {
    name: 'Scale',
    price: '₹20,000',
    leads: '300 Leads',
    cpl: '≈₹66.67/Lead',
    description: 'High-volume campaigns for aggressive market expansion.',
    features: ['Everything in Business', 'YouTube & Video Ads', 'Advanced Attribution', 'Daily Monitoring', 'Priority Support', '10 Target Locations', 'Custom Integrations']
  },
  {
    name: 'Enterprise',
    price: '₹30,000',
    leads: '500 Leads',
    cpl: '₹60/Lead',
    description: 'Full-scale acquisition engine for market leaders and large organizations.',
    features: ['Everything in Scale', 'Omnichannel Strategy', 'Predictive Lead Scoring', 'Real-time Optimization', 'Strategic Consulting', 'Unlimited Locations', 'SLA Guarantee']
  }
];

const processSteps = [
  { num: '01', title: 'Understand', desc: 'Deep-dive into your business, product, audience, and revenue goals. We map your ideal customer profile and competitive landscape.' },
  { num: '02', title: 'Plan', desc: 'Channel strategy, budget allocation, targeting parameters, creative briefs, and KPI frameworks. Every decision backed by data.' },
  { num: '03', title: 'Create', desc: 'High-converting ad creatives, landing pages, lead forms, and automation workflows. Built for your brand voice and buyer intent.' },
  { num: '04', title: 'Launch', desc: 'Campaigns go live across selected channels with tracking, pixels, and conversion events configured. Day-one monitoring begins.' },
  { num: '05', title: 'Optimize', desc: 'Continuous A/B testing, bid adjustments, audience refinement, and creative rotation. Performance compounds week over week.' },
  { num: '06', title: 'Deliver', desc: 'Qualified leads delivered to your CRM in real-time with full context. Transparent reporting and strategic review sessions.' }
];

const leadQualityStages = [
  { stage: 'Raw Lead', description: 'Form submission received. No verification yet.', color: COLORS.gray },
  { stage: 'Valid Lead', description: 'Contact info verified. Business details confirmed.', color: COLORS.orangeLight },
  { stage: 'Validated Lead', description: 'Budget, authority, need, timeline (BANT) assessed.', color: COLORS.orange },
  { stage: 'Sales-Qualified', description: 'Ready for sales conversation. High intent confirmed.', color: '#ffa861' },
  { stage: 'Opportunity', description: 'Active deal in pipeline. High revenue potential.', color: COLORS.white }
];

const faqs = [
  {
    q: 'What type of businesses do you work with?',
    a: 'We work with B2B manufacturers, distributors, dealers, industrial businesses, machinery/equipment companies, and B2B service providers across India. Our campaigns are designed for considered purchases with longer sales cycles.'
  },
  {
    q: 'What exactly is a lead?',
    a: 'A lead is a business inquiry from a decision-maker or influencer who has expressed interest in your product or service by submitting a form, calling, or messaging. It includes their name, company, contact details, and requirement summary.'
  },
  {
    q: 'Are the leads qualified?',
    a: 'We deliver validated leads — contact info verified and basic intent confirmed. Sales-qualification (BANT) happens on your sales calls. We don\'t guarantee sales; we guarantee qualified inquiries that your team can convert.'
  },
  {
    q: 'How are leads delivered?',
    a: 'Leads are pushed to your CRM (HubSpot, Zoho, Salesforce, Pipedrive, or custom) in real-time via API. You also get instant WhatsApp/email alerts. A daily digest and weekly performance report are included.'
  },
  {
    q: 'Do you provide CRM-ready information?',
    a: 'Yes. Every lead includes: full name, company, designation, phone, email, location, product interest, requirement summary, source channel, campaign ID, timestamp, and lead score. Ready for immediate sales follow-up.'
  },
  {
    q: 'Can campaigns target specific cities or regions?',
    a: 'Absolutely. We can target by state, city, pincode, or radius around industrial zones. Multi-location campaigns with localized ad copy and landing pages are standard in Growth package and above.'
  },
  {
    q: 'Can campaigns run across India?',
    a: 'Yes. Pan-India targeting is available in all packages. Enterprise includes unlimited locations with dedicated geo-strategy per region.'
  },
  {
    q: 'Do you guarantee sales?',
    a: 'No. Lead generation ≠ guaranteed sales. We deliver qualified business inquiries. Conversion depends on your product, pricing, sales process, and market fit. We optimize for lead quality and volume; you close the deals.'
  }
];

export default function ITOAds() {
  useDocumentMeta({
    title: 'ITO Ads | Paid Inbound Lead Generation & Performance Marketing',
    description: 'ITO Ads delivers qualified B2B leads through paid advertising, performance marketing, and CRM automation. Transparent pricing. Pan-India targeting. Real results.',
    canonicalPath: '/ito-ads'
  });

  const [activePackage, setActivePackage] = useState(2);
  const [activeFAQ, setActiveFAQ] = useState(null);
  const heroRef = useRef(null);

  const scrollIndicator = (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 pointer-events-none">
      <span className="font-mono text-[10px] tracking-widest uppercase">Scroll</span>
      <div className="w-px h-6 bg-gradient-to-b from-[#F76E01] to-transparent animate-scroll-line" />
    </div>
  );

  return (
    <>
    <SmokeyCursor
        transparent={true}
        densityDissipation={7}
        velocityDissipation={4}
        splatRadius={0.20}
        splatForce={3200}
        colorUpdateSpeed={2}
        enableShading={false}
        className="fixed inset-0 pointer-events-none z-30"
      />
      <style>{`
        @keyframes orb-pulse {
          0%, 100% { transform: scale(1); opacity: 0.18; }
          50% { transform: scale(1.2); opacity: 0.28; }
        }
        .animate-orb-pulse {
          animation: orb-pulse infinite ease-in-out;
          will-change: transform, opacity;
        }
        @keyframes scroll-bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(8px); }
        }
        @keyframes scroll-line {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }
        .animate-scroll-bounce {
          animation: scroll-bounce 2s infinite ease-in-out;
        }
        .animate-scroll-line {
          animation: scroll-line 1.5s infinite ease-in-out;
        }
      `}</style>
      <div 
        className="min-h-screen text-white font-sans overflow-x-hidden relative"
        style={{ backgroundColor: COLORS.navy }}
      >
        {/* 3D Global Ambient Glowing Orbs - CSS animated */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div 
          className="absolute -top-[15%] left-1/2 -translate-x-1/2 w-[950px] h-[520px] rounded-full blur-[170px] animate-orb-pulse"
          style={{ background: `radial-gradient(circle, ${COLORS.orange} 0%, transparent 70%)`, animationDuration: '10s', animationDelay: '0s' }}
        />
        <div 
          className="absolute top-[45%] -left-[15%] w-[650px] h-[650px] rounded-full blur-[190px] animate-orb-pulse"
          style={{ background: `radial-gradient(circle, ${COLORS.orange} 0%, transparent 70%)`, animationDuration: '12s', animationDelay: '2s' }}
        />
      </div>

      {/* Navigation */}
      <nav 
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b"
        style={{ 
          background: 'rgba(1, 16, 45, 0.85)',
          borderColor: 'rgba(247, 110, 1, 0.25)',
          boxShadow: '0 10px 30px -10px rgba(1, 16, 45, 0.8)'
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <img 
              src="/images/web_trans_icon.jpeg" 
              alt="ITO Ads Logo" 
              className="w-10 h-10 rounded-xl object-cover shadow-lg transition-transform group-hover:scale-105 group-hover:rotate-3"
            />
            <span className="font-serif text-xl font-bold tracking-tight text-white">ITO Ads</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#services" className="text-sm font-medium text-white/80 hover:text-white transition-colors">Services</a>
            <a href="#packages" className="text-sm font-medium text-white/80 hover:text-white transition-colors">Packages</a>
            <a href="#process" className="text-sm font-medium text-white/80 hover:text-white transition-colors">Process</a>
            <a href="#faq" className="text-sm font-medium text-white/80 hover:text-white transition-colors">FAQ</a>
            <Link 
              to="/contact" 
              className="px-5 py-2.5 text-white font-semibold text-sm rounded-xl transition-all shadow-lg hover:shadow-orange-500/25 active:scale-95"
              style={{ background: `linear-gradient(135deg, ${COLORS.orange}, ${COLORS.orangeLight})` }}
            >
              Start Your Campaign
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative min-h-screen flex items-center justify-center pt-28 pb-20 overflow-hidden" ref={heroRef}>
        {/* Background Video Layer */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="w-full h-full object-cover opacity-30"
            style={{ filter: 'brightness(1.2) contrast(2.2)' }}
          >
            <source src="/images/glass-flower.mp4" type="video/mp4" />
          </video>
          <div 
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at center, transparent 0%, ${COLORS.navy} 85%), linear-gradient(180deg, ${COLORS.navy} 0%, transparent 20%, transparent 80%, ${COLORS.navy} 100%)`
            }}
          />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="max-w-4xl mx-auto"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-8 backdrop-blur-md"
              style={{ 
                background: 'rgba(247, 110, 1, 0.1)', 
                borderColor: 'rgba(247, 110, 1, 0.35)' 
              }}
            >
              <span className="w-2 h-2 rounded-full bg-[#F76E01] animate-pulse" />
              <span className="font-mono text-[11px] tracking-widest uppercase text-white font-semibold">
                Powered by ITC — India Trade Center
              </span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7, ease: 'easeOut' }}
              className="font-serif text-5xl md:text-7xl lg:text-8xl font-normal leading-[1.05] tracking-tight uppercase mb-6"
            >
              <span className="block text-white">WE GENERATE</span>
              <span 
                className="block bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(to right, ${COLORS.orange}, #ffffff)` }}
              >
                QUALIFIED LEADS.
              </span>
              <span className="block text-white mt-2 text-3xl md:text-4xl lg:text-5xl font-light">
                YOU CONVERT OPPORTUNITIES.
              </span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-12 leading-relaxed font-light"
            >
              Paid inbound lead generation systems built for B2B manufacturers, distributors & industrial businesses. Targeted campaigns. CRM-ready delivery. Transparent reporting.
            </motion.p>

            {/* CTA Buttons with 3D Pop */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.7 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link
                to="/contact"
                className="group px-8 py-4 text-white font-semibold text-sm tracking-wider uppercase rounded-xl transition-all shadow-2xl hover:shadow-orange-500/40 hover:-translate-y-1 flex items-center gap-2 active:scale-95"
                style={{ background: `linear-gradient(135deg, ${COLORS.orange}, ${COLORS.orangeLight})` }}
              >
                Talk to ITO Ads on WhatsApp
                <FiMessageSquare size={18} className="group-hover:translate-x-1.5 transition-transform" />
              </Link>
              <a
                href="#packages"
                className="px-8 py-4 border text-white font-semibold text-sm tracking-wider uppercase rounded-xl transition-all backdrop-blur-md hover:border-[#F76E01] hover:-translate-y-1"
                style={{ 
                  background: 'rgba(8, 26, 61, 0.6)', 
                  borderColor: 'rgba(247, 110, 1, 0.35)' 
                }}
              >
                View Packages
              </a>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.7 }}
              className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-white/70"
            >
              {['No long-term contracts', 'Cancel anytime', '14-day performance review', 'Dedicated account manager'].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <FiCheck style={{ color: COLORS.orange }} size={16} />
                  <span>{item}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* 3D Floating Interactive HUD Metric Cards */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto" style={{ perspective: '1100px' }}>
            {[
              { icon: FiTrendingUp, label: 'Active Pipeline', value: '₹12Cr+' },
              { icon: FiTarget, label: 'Avg Qualified CPL', value: '₹75' },
              { icon: FiZap, label: 'Push Velocity', value: '< 2 Mins' },
              { icon: FiUsers, label: 'Client Retention', value: '94%' }
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                whileHover={{ translateZ: 35, scale: 1.05, rotateX: 6, rotateY: -6 }}
                transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                className="p-4 rounded-2xl border backdrop-blur-md group text-left cursor-default"
                style={{
                  background: 'linear-gradient(135deg, rgba(8, 26, 61, 0.8), rgba(4, 21, 54, 0.9))',
                  borderColor: 'rgba(247, 110, 1, 0.25)',
                  boxShadow: '0 15px 35px -10px rgba(0,0,0,0.6)',
                  transformStyle: 'preserve-3d'
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold font-mono text-white tracking-tight">{stat.value}</span>
                  <div className="p-1.5 rounded-lg bg-[#F76E01]/10 text-[#F76E01]">
                    <stat.icon size={16} />
                  </div>
                </div>
                <div className="text-xs text-white/70 font-light">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          {scrollIndicator}
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section 
        id="services" 
        className="relative py-32 px-6"
        style={{ 
          background: `linear-gradient(180deg, ${COLORS.navy} 0%, ${COLORS.navyCard} 50%, ${COLORS.navy} 100%)` 
        }}
      >
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-20"
          >
            <span className="font-mono text-xs tracking-widest uppercase block mb-3 font-semibold" style={{ color: COLORS.orange }}>
              What You Get
            </span>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight uppercase text-white mb-4">
              Six Pillars of <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${COLORS.orange}, #ffffff)` }}>Acquisition</span>
            </h2>
            <p className="text-white/70 max-w-2xl mx-auto text-lg leading-relaxed font-light">
              Every campaign is built on these six foundations — no exceptions, no shortcuts.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={{ perspective: '1200px' }}>
            {services.map((service, index) => (
              <TiltCard3D
                key={service.title}
                className="rounded-2xl p-8 border group transition-all duration-300"
                style={{ 
                  background: 'rgba(8, 26, 61, 0.7)',
                  borderColor: 'rgba(247, 110, 1, 0.2)',
                  boxShadow: '0 20px 40px -15px rgba(1, 16, 45, 0.9)'
                }}
              >
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110"
                  style={{ 
                    background: 'rgba(247, 110, 1, 0.15)', 
                    border: '1px solid rgba(247, 110, 1, 0.3)',
                    transform: 'translateZ(30px)' 
                  }}
                >
                  <service.icon size={26} style={{ color: COLORS.orange }} />
                </div>
                <h3 className="font-serif text-xl font-medium text-white mb-3" style={{ transform: 'translateZ(25px)' }}>
                  {service.title}
                </h3>
                <p className="text-white/70 mb-6 leading-relaxed font-light text-sm" style={{ transform: 'translateZ(15px)' }}>
                  {service.description}
                </p>
                <ul className="space-y-2.5" style={{ transform: 'translateZ(20px)' }}>
                  {service.features.map((feature, fi) => (
                    <li key={fi} className="flex items-center gap-2 text-sm text-white/80">
                      <FiCheck style={{ color: COLORS.orange }} size={14} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </TiltCard3D>
            ))}
          </div>
        </div>
      </section>

      {/* LEAD QUALITY SECTION */}
      <section 
        className="relative py-32 px-6 overflow-hidden"
        style={{ background: COLORS.navy }}
      >
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <span className="font-mono text-xs tracking-widest uppercase block mb-3 font-semibold" style={{ color: COLORS.orange }}>
              Lead Quality
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-normal tracking-tight uppercase text-white">
              Not Every Form Submission Has <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${COLORS.orange}, #ffffff)` }}>Equal Value</span>
            </h2>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-6 relative z-10" style={{ perspective: '1100px' }}>
            {leadQualityStages.map((stage, index) => (
              <motion.div
                key={stage.stage}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.1, rotateY: 10, rotateX: 6, translateZ: 40 }}
                transition={{ delay: index * 0.08, duration: 0.4 }}
                className="flex flex-col items-center max-w-[200px] text-center group cursor-default"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div
                  className="w-28 h-28 rounded-2xl flex items-center justify-center p-4 mb-4 border transition-all shadow-2xl backdrop-blur-md group-hover:border-[#F76E01]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(8, 26, 61, 0.9), rgba(4, 21, 54, 0.95))',
                    borderColor: 'rgba(247, 110, 1, 0.35)',
                    boxShadow: '0 20px 35px -10px rgba(247, 110, 1, 0.25)',
                    transform: 'translateZ(20px)'
                  }}
                >
                  <span className="font-semibold text-sm leading-tight text-white">{stage.stage}</span>
                </div>
                <p className="text-xs text-white/70 font-light leading-relaxed">{stage.description}</p>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-16 text-center text-white/60 text-sm font-light max-w-2xl mx-auto"
          >
            <span className="font-medium text-white">Lead generation ≠ guaranteed sales.</span> We deliver qualified business inquiries. Conversion depends on your product, pricing, sales process, and market fit.
          </motion.p>
        </div>
      </section>

      {/* PACKAGES SECTION WITH INTEGRATED 3D STORM BACKGROUND */}
      <section 
        id="packages" 
        className="relative py-32 px-6 overflow-hidden min-h-[950px]"
        style={{ background: COLORS.navy }}
      >
        {/* 3D Storm Canvas embedded behind the packages */}
        <SectionStormBackground />

        {/* Semi-transparent Vignette Overlays for Maximum Contrast */}
        <div 
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{
            background: `radial-gradient(circle at center, transparent 30%, ${COLORS.navy} 95%), linear-gradient(180deg, ${COLORS.navy} 0%, transparent 15%, transparent 85%, ${COLORS.navy} 100%)`
          }}
        />

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <span className="font-mono text-xs tracking-widest uppercase block mb-3 font-semibold" style={{ color: COLORS.orange }}>
              Transparent Pricing
            </span>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight uppercase text-white mb-4">
              Choose Your <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${COLORS.orange}, #ffffff)` }}>Package</span>
            </h2>
            <p className="text-white/80 max-w-2xl mx-auto text-lg leading-relaxed font-light">
              Fixed pricing. No hidden fees. Scale as you grow. All packages include campaign setup, management, optimization, and reporting.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6" style={{ perspective: '1200px' }}>
            {packages.map((pkg, index) => {
              const isSelected = activePackage === index;
              return (
                <TiltCard3D
                  key={pkg.name}
                  className="rounded-2xl p-6 flex flex-col transition-all duration-300 backdrop-blur-md group"
                  style={{
                    background: isSelected ? 'rgba(8, 26, 61, 0.90)' : 'rgba(8, 26, 61, 0.60)',
                    border: isSelected ? `2px solid ${COLORS.orange}` : '1px solid rgba(247, 110, 1, 0.25)',
                    boxShadow: isSelected ? '0 25px 50px -10px rgba(247, 110, 1, 0.4)' : '0 15px 35px -10px rgba(0,0,0,0.6)',
                    transform: isSelected ? 'translateZ(25px)' : 'none'
                  }}
                  onMouseEnter={() => setActivePackage(index)}
                >
                  {pkg.name === 'Business' && (
                    <div 
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 font-mono text-[10px] tracking-widest uppercase rounded-full font-bold text-white shadow-lg"
                      style={{ background: COLORS.orange, transform: 'translateZ(35px)' }}
                    >
                      Most Popular
                    </div>
                  )}

                  <div className="mb-6" style={{ transform: 'translateZ(25px)' }}>
                    <h3 className="font-serif text-2xl font-medium text-white mb-2">{pkg.name}</h3>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-4xl font-bold text-white">{pkg.price}</span>
                      <span className="text-white/60 font-light text-sm">/mo</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="font-semibold" style={{ color: COLORS.orange }}>{pkg.leads}</span>
                      <span className="text-white/60 text-xs">({pkg.cpl})</span>
                    </div>
                  </div>

                  <p className="text-white/70 text-sm mb-6 leading-relaxed font-light flex-1" style={{ transform: 'translateZ(15px)' }}>
                    {pkg.description}
                  </p>

                  <ul className="space-y-3 mb-8 flex-1" style={{ transform: 'translateZ(20px)' }}>
                    {pkg.features.map((feature, fi) => (
                      <li key={fi} className="flex items-start gap-2 text-sm text-white/80">
                        <FiCheck style={{ color: COLORS.orange }} className="mt-0.5 shrink-0" size={16} />
                        <span className="font-light">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div style={{ transform: 'translateZ(30px)' }}>
                    <Link
                      to="/contact"
                      className="block w-full py-3 px-4 rounded-xl text-center font-semibold text-sm tracking-wider uppercase transition-all duration-300 active:scale-95 shadow-xl"
                      style={{
                        background: isSelected ? `linear-gradient(135deg, ${COLORS.orange}, ${COLORS.orangeLight})` : 'rgba(1, 16, 45, 0.85)',
                        color: '#ffffff',
                        border: isSelected ? 'none' : '1px solid rgba(247, 110, 1, 0.35)'
                      }}
                    >
                      {isSelected ? 'Select Package' : 'Get Started'}
                    </Link>
                  </div>
                </TiltCard3D>
              );
            })}
          </div>

          <p className="mt-12 text-center text-white/60 text-sm font-light relative z-10">
            All prices exclusive of 18% GST. Lead counts are monthly targets based on historical performance data.
          </p>
        </div>
      </section>

      {/* PROCESS SECTION */}
      <section id="process" className="relative py-32 px-6" style={{ background: COLORS.navy }}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <span className="font-mono text-xs tracking-widest uppercase block mb-3 font-semibold" style={{ color: COLORS.orange }}>
              How It Works
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-normal tracking-tight uppercase text-white">
              From Strategy to <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${COLORS.orange}, #ffffff)` }}>Scale</span> in 6 Steps
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={{ perspective: '1200px' }}>
            {processSteps.map((step) => (
              <TiltCard3D
                key={step.num}
                className="rounded-2xl p-8 border transition-all duration-300 group"
                style={{
                  background: 'rgba(8, 26, 61, 0.65)',
                  borderColor: 'rgba(247, 110, 1, 0.2)',
                  boxShadow: '0 15px 30px -10px rgba(0,0,0,0.5)'
                }}
              >
                <div className="flex items-center gap-3 mb-4" style={{ transform: 'translateZ(25px)' }}>
                  <span className="font-mono text-2xl font-bold" style={{ color: COLORS.orange }}>{step.num}</span>
                  <h3 className="font-serif text-xl font-medium text-white">{step.title}</h3>
                </div>
                <p className="text-white/70 leading-relaxed font-light text-sm" style={{ transform: 'translateZ(15px)' }}>
                  {step.desc}
                </p>
              </TiltCard3D>
            ))}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US SECTION */}
      <section className="relative py-32 px-6" style={{ background: `linear-gradient(180deg, ${COLORS.navy} 0%, ${COLORS.navyCard} 100%)` }}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <span className="font-mono text-xs tracking-widest uppercase block mb-3 font-semibold" style={{ color: COLORS.orange }}>
              Why Choose Us
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-normal tracking-tight uppercase text-white">
              <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${COLORS.orange}, #ffffff)` }}>Strategy</span> Before Spending
            </h2>
            <p className="text-white/70 max-w-2xl mx-auto mt-4 text-lg leading-relaxed font-light">
              We audit your market, competitors, and buyers before spending a single rupee on ads.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style={{ perspective: '1200px' }}>
            {[
              { icon: FiTarget, title: 'Strategy Before Spending', desc: 'We audit your market, competitors, and buyers before spending a single rupee on ads. No spray-and-pray.' },
              { icon: FiUsers, title: 'Audience-Focused Campaigns', desc: 'Targeting built on your ideal customer profile — job titles, industries, company sizes, intent signals, and geo-data.' },
              { icon: FiTrendingUp, title: 'Performance & Optimization', desc: 'Weekly optimization cycles. Creative rotation. Bid strategy refinement. Audience expansion. Performance compounds.' },
              { icon: FiCpu, title: 'Technology & Data', desc: 'Server-side tracking, enhanced conversions, offline conversion import, and first-party data activation for precision.' },
              { icon: FiDatabase, title: 'CRM-Ready Delivery', desc: 'Leads pushed to your CRM with full context — source, campaign, score, timestamp. Your sales team acts in minutes, not hours.' },
              { icon: FiShield, title: 'Transparent Communication', desc: 'Live dashboard access. Weekly performance calls. Monthly strategy reviews. No black boxes. No surprises.' }
            ].map((item) => (
              <TiltCard3D
                key={item.title}
                className="group rounded-2xl p-8 border transition-all duration-300"
                style={{
                  background: 'rgba(8, 26, 61, 0.65)',
                  borderColor: 'rgba(247, 110, 1, 0.2)',
                  boxShadow: '0 15px 35px -10px rgba(0,0,0,0.5)'
                }}
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300"
                  style={{ background: 'rgba(247, 110, 1, 0.15)', border: '1px solid rgba(247, 110, 1, 0.3)', transform: 'translateZ(30px)' }}
                >
                  <item.icon size={26} style={{ color: COLORS.orange }} />
                </div>
                <h3 className="font-serif text-lg font-medium text-white mb-3" style={{ transform: 'translateZ(25px)' }}>{item.title}</h3>
                <p className="text-white/70 leading-relaxed font-light text-sm" style={{ transform: 'translateZ(15px)' }}>{item.desc}</p>
              </TiltCard3D>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section 
        id="faq" 
        className="relative py-32 px-6"
        style={{ 
          background: `linear-gradient(180deg, ${COLORS.navyCard} 0%, ${COLORS.navy} 100%)` 
        }}
      >
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <span className="font-mono text-xs tracking-widest uppercase block mb-3 font-semibold" style={{ color: COLORS.orange }}>
              Frequently Asked
            </span>
            <h2 className="font-serif text-4xl md:text-5xl font-normal tracking-tight uppercase text-white">
              Questions You Should <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${COLORS.orange}, #ffffff)` }}>Ask</span>
            </h2>
          </motion.div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={faq.q}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="border rounded-xl overflow-hidden backdrop-blur-md transition-all duration-300 hover:border-[#F76E01]/50"
                style={{ 
                  background: 'rgba(8, 26, 61, 0.6)', 
                  borderColor: 'rgba(247, 110, 1, 0.2)' 
                }}
              >
                <button
                  onClick={() => setActiveFAQ(activeFAQ === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                >
                  <span className="font-medium text-white pr-10">{faq.q}</span>
                  <motion.div
                    animate={{ rotate: activeFAQ === index ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ color: COLORS.orange }}
                    className="shrink-0"
                  >
                    <FiChevronRight size={20} />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {activeFAQ === index && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="px-6 pb-6 border-t"
                      style={{ borderColor: 'rgba(247, 110, 1, 0.15)' }}
                    >
                      <p className="text-white/70 leading-relaxed font-light text-sm pt-4">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section 
        className="relative py-32 px-6 overflow-hidden text-center"
        style={{ 
          background: `linear-gradient(135deg, ${COLORS.navy} 0%, ${COLORS.navyCard} 50%, ${COLORS.navy} 100%)`,
          borderTop: '1px solid rgba(247, 110, 1, 0.2)'
        }}
      >
        <div className="relative z-10 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight uppercase text-white mb-6">
              Ready to Build Your <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${COLORS.orange}, #ffffff)` }}>Acquisition Engine</span>?
            </h2>
            <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-light">
              Pick a package. Share your goals. We'll have campaigns live in 7 business days.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/contact"
                className="px-10 py-4 text-white font-semibold text-sm tracking-wider uppercase rounded-xl transition-all shadow-2xl hover:shadow-orange-500/40 hover:-translate-y-1 flex items-center gap-2 active:scale-95"
                style={{ background: `linear-gradient(135deg, ${COLORS.orange}, ${COLORS.orangeLight})` }}
              >
                Talk to ITO Ads on WhatsApp
                <FiMessageSquare size={18} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer 
        className="py-16 px-6 border-t"
        style={{ 
          background: COLORS.navy, 
          borderColor: 'rgba(247, 110, 1, 0.2)' 
        }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center space-x-3 mb-6">
              <img 
              src="/images/web_trans_icon.jpeg" 
              alt="ITO Ads Logo" 
              className="w-10 h-10 rounded-xl object-cover shadow-lg transition-transform group-hover:scale-105 group-hover:rotate-3"
            />
                <span className="font-serif text-xl font-bold tracking-tight text-white">ITO Ads</span>
              </Link>
              <p className="text-white/70 max-w-md font-light leading-relaxed text-sm">
                Paid inbound lead generation for B2B manufacturers, distributors & industrial businesses. Powered by ITC — India Trade Center.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4 tracking-wider uppercase text-xs">Quick Links</h4>
              <nav className="space-y-2 text-sm">
                <a href="#services" className="block text-white/70 hover:text-white transition-colors font-light">Services</a>
                <a href="#packages" className="block text-white/70 hover:text-white transition-colors font-light">Packages</a>
                <a href="#process" className="block text-white/70 hover:text-white transition-colors font-light">Process</a>
                <a href="#faq" className="block text-white/70 hover:text-white transition-colors font-light">FAQ</a>
              </nav>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4 tracking-wider uppercase text-xs">Contact</h4>
              <address className="space-y-3 text-white/70 font-light not-italic text-sm">
                <div className="flex items-center gap-2"><FiMapPin size={16} />Kishanganj, Siliguri, Jaigaon, Noida</div>
                <div className="flex items-center gap-2"><FiMail size={16} />info@indiatradeoverseas.com</div>
                <div className="flex items-center gap-2"><FiPhone size={16} />01169262028</div>
                <div className="flex items-center gap-2"><FiClock size={16} />Mon–Sat, 9:30 AM – 6:30 PM IST</div>
              </address>
            </div>
          </div>
          <div className="pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderColor: 'rgba(247, 110, 1, 0.15)' }}>
            <p className="text-white/50 text-sm font-light">
              © {new Date().getFullYear()} India Trade Overseas. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
      </div>
    </>
  );
}