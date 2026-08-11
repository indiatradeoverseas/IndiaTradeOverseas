import React, { useEffect, useRef } from 'react';

const hexToRgb = (hex) => {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

const lighten = ({ r, g, b }, amount) => ({
  r: Math.round(r + (255 - r) * amount),
  g: Math.round(g + (255 - g) * amount),
  b: Math.round(b + (255 - b) * amount),
});

const rgbaStr = ({ r, g, b }, a) => `rgba(${r}, ${g}, ${b}, ${a})`;

// Animated canvas backdrop for a Testimonials section: 3 large, slow-drifting
// soft-glow color blobs (an "aurora") with a network of brighter connected
// particles layered on top. Pure Canvas 2D, no extra graphics library.
// Meant to sit as the first child of a `relative overflow-hidden` <section>.
export default function TestimonialSectionBackground({ accentColor }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let particles = [];
    let animationFrameId;
    let startTime = performance.now();

    const base = hexToRgb(accentColor);
    const bright = lighten(base, 0.45);

    const blobConfigs = [
      { rx: 0.32, ry: 0.35, radiusFactor: 0.55, speed: 0.00018, phase: 0, color: base, alpha: 0.5 },
      { rx: 0.72, ry: 0.6, radiusFactor: 0.45, speed: 0.00022, phase: 2.1, color: bright, alpha: 0.35 },
      { rx: 0.5, ry: 0.8, radiusFactor: 0.4, speed: 0.00015, phase: 4.2, color: base, alpha: 0.4 },
    ];

    const createParticles = () => {
      const count = Math.min(60, Math.max(24, Math.round((width * height) / 16000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 1.8 + 1.4,
      }));
    };

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      createParticles();
    };

    const LINK_DISTANCE = 140;

    const tick = (now) => {
      const t = now - startTime;
      ctx.clearRect(0, 0, width, height);

      // Aurora blobs
      blobConfigs.forEach((blob) => {
        const cx = blob.rx * width + Math.sin(t * blob.speed + blob.phase) * width * 0.18;
        const cy = blob.ry * height + Math.cos(t * blob.speed * 0.85 + blob.phase) * height * 0.18;
        const radius = Math.max(width, height) * blob.radiusFactor;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, rgbaStr(blob.color, blob.alpha));
        gradient.addColorStop(1, rgbaStr(blob.color, 0));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      });

      // Particle network on top
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        p.x = Math.min(Math.max(p.x, 0), width);
        p.y = Math.min(Math.max(p.y, 0), height);
      }

      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const a = particles[i];
          const b2 = particles[j];
          const dx = a.x - b2.x;
          const dy = a.y - b2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DISTANCE) {
            ctx.strokeStyle = rgbaStr(bright, (1 - dist / LINK_DISTANCE) * 0.45);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b2.x, b2.y);
            ctx.stroke();
          }
        }
      }

      ctx.fillStyle = rgbaStr(bright, 0.85);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    resize();
    animationFrameId = requestAnimationFrame(tick);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, [accentColor]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
