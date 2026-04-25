'use client';

import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  r: number;
  color: string;
  opacity: number;
  layer: 0 | 1 | 2; // 0 = small, 1 = medium, 2 = large
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  startTime: number;
  duration: number;
  active: boolean;
}

const STAR_COLORS = ['#ffffff', '#cce0ff', '#fff5cc'];

function randomColor(): string {
  return STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function buildStars(width: number, height: number): Star[] {
  const stars: Star[] = [];

  // 100 small
  for (let i = 0; i < 100; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.5,
      color: randomColor(),
      opacity: randomBetween(0.3, 0.8),
      layer: 0,
    });
  }
  // 150 medium
  for (let i = 0; i < 150; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1,
      color: randomColor(),
      opacity: randomBetween(0.3, 0.8),
      layer: 1,
    });
  }
  // 50 large
  for (let i = 0; i < 50; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 1.5,
      color: randomColor(),
      opacity: randomBetween(0.3, 0.8),
      layer: 2,
    });
  }

  return stars;
}

function spawnShootingStar(width: number, height: number): ShootingStar {
  return {
    x: Math.random() * width * 0.8,
    y: Math.random() * height * 0.4,
    length: randomBetween(80, 150),
    startTime: performance.now(),
    duration: 600,
    active: true,
  };
}

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Non-null aliases so closures below satisfy strict null checks
    const el: HTMLCanvasElement = canvas;
    const c: CanvasRenderingContext2D = ctx;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let stars: Star[] = [];
    let shootingStar: ShootingStar | null = null;
    let nextShootAt = performance.now() + randomBetween(8000, 15000);
    let rafId: number;

    // Mouse parallax state
    let mouseOffsetX = 0;
    let mouseOffsetY = 0;
    let targetOffsetX = 0;
    let targetOffsetY = 0;

    const LAYER_FACTORS: [number, number, number] = [-0.02, -0.04, -0.08];

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      el.width = width;
      el.height = height;
      stars = buildStars(width, height);
    }

    function onMouseMove(e: MouseEvent) {
      const cx = width / 2;
      const cy = height / 2;
      targetOffsetX = e.clientX - cx;
      targetOffsetY = e.clientY - cy;
    }

    function drawNebula() {
      const blobs: { x: number; y: number; r: number; color: string }[] = [
        { x: width * 0.2, y: height * 0.5, r: width * 0.35, color: 'rgba(59,7,100,0.05)' },
        { x: width * 0.8, y: height * 0.2, r: width * 0.30, color: 'rgba(30,58,95,0.04)' },
        { x: width * 0.5, y: height * 0.8, r: width * 0.40, color: 'rgba(13,71,68,0.04)' },
      ];

      for (const blob of blobs) {
        const grad = c.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r);
        grad.addColorStop(0, blob.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = grad;
        c.beginPath();
        c.arc(blob.x, blob.y, blob.r, 0, Math.PI * 2);
        c.fill();
      }
    }

    function drawStars() {
      for (const star of stars) {
        const factor = LAYER_FACTORS[star.layer];
        const sx = star.x + mouseOffsetX * factor;
        const sy = star.y + mouseOffsetY * factor;

        c.save();
        c.globalAlpha = star.opacity;
        c.fillStyle = star.color;
        c.beginPath();
        c.arc(sx, sy, star.r, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    }

    function drawShootingStar(now: number) {
      if (!shootingStar || !shootingStar.active) return;

      const elapsed = now - shootingStar.startTime;
      const progress = Math.min(elapsed / shootingStar.duration, 1);

      // Fade in then out
      const alpha = progress < 0.2
        ? progress / 0.2
        : 1 - (progress - 0.2) / 0.8;

      const headX = shootingStar.x + shootingStar.length * progress * 2;
      const headY = shootingStar.y + shootingStar.length * progress * 2;
      const tailX = headX - shootingStar.length;
      const tailY = headY - shootingStar.length;

      const grad = c.createLinearGradient(tailX, tailY, headX, headY);
      grad.addColorStop(0, `rgba(255,255,255,0)`);
      grad.addColorStop(1, `rgba(255,255,255,${alpha.toFixed(3)})`);

      c.save();
      c.strokeStyle = grad;
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(tailX, tailY);
      c.lineTo(headX, headY);
      c.stroke();
      c.restore();

      if (progress >= 1) {
        shootingStar.active = false;
      }
    }

    function loop(now: number) {
      // Smooth mouse parallax
      mouseOffsetX += (targetOffsetX - mouseOffsetX) * 0.05;
      mouseOffsetY += (targetOffsetY - mouseOffsetY) * 0.05;

      c.clearRect(0, 0, width, height);

      drawNebula();
      drawStars();

      // Shooting star scheduling
      if (!shootingStar || !shootingStar.active) {
        if (now >= nextShootAt) {
          shootingStar = spawnShootingStar(width, height);
          nextShootAt = now + randomBetween(8000, 15000);
        }
      }
      drawShootingStar(now);

      rafId = requestAnimationFrame(loop);
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove);
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        display: 'block',
      }}
      aria-hidden="true"
    />
  );
}
