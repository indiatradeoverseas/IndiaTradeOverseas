import React, { useEffect, useRef } from 'react';

export default function FluidCursor() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let particles = [];
    // Deep navy & electric blue/orange fluid dye palette
    const colors = [
      'rgba(8, 26, 61, ',
      'rgba(15, 45, 102, ',
      'rgba(24, 76, 165, ',
      'rgba(247, 110, 1, '
    ];

    class FluidDrop {
      constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx * 0.4 + (Math.random() - 0.5) * 2;
        this.vy = vy * 0.4 + (Math.random() - 0.5) * 2;
        this.radius = Math.random() * 25 + 15;
        this.baseColor = colors[Math.floor(Math.random() * colors.length)];
        this.alpha = 0.55;
        this.decay = Math.random() * 0.02 + 0.015;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.95;
        this.vy *= 0.95;
        this.radius += 0.4;
        this.alpha -= this.decay;
      }

      draw() {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.beginPath();
        const grad = ctx.createRadialGradient(
          this.x, this.y, 0,
          this.x, this.y, this.radius
        );
        grad.addColorStop(0, `${this.baseColor}${this.alpha})`);
        grad.addColorStop(1, `${this.baseColor}0)`);
        ctx.fillStyle = grad;
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    let lastX = 0;
    let lastY = 0;

    const handlePointerMove = (e) => {
      const vx = e.clientX - lastX;
      const vy = e.clientY - lastY;
      const dist = Math.hypot(vx, vy);
      const count = Math.min(Math.floor(dist / 6) + 1, 5);

      for (let i = 0; i < count; i++) {
        particles.push(new FluidDrop(e.clientX, e.clientY, vx, vy));
      }

      lastX = e.clientX;
      lastY = e.clientY;
    };

    window.addEventListener('mousemove', handlePointerMove, { passive: true });

    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw();
        if (p.alpha <= 0) {
          particles.splice(i, 1);
        }
      }
    };
    animate();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-30 w-full h-full block"
    />
  );
}