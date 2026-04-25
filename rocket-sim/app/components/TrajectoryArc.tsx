'use client';
import { useEffect, useRef } from 'react';
import type { SimResult } from '../physics/trajectory';

interface Props { result: SimResult; }

export default function TrajectoryArc({ result }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const PAD = { top: 30, right: 30, bottom: 45, left: 65 };

    // Space bg
    ctx.fillStyle = '#040408';
    ctx.fillRect(0, 0, W, H);

    // Stars above Kármán line
    const karmanY_canvas = H - PAD.bottom - ((100 / (Math.max(result.maxAltitudeM / 1000, 15))) * (H - PAD.top - PAD.bottom));
    for (let i = 0; i < 60; i++) {
      const sx = PAD.left + Math.random() * (W - PAD.left - PAD.right);
      const sy = PAD.top + Math.random() * Math.max(0, karmanY_canvas - PAD.top - 4);
      const sr = Math.random() * 0.8 + 0.2;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${(Math.random() * 0.4 + 0.2).toFixed(2)})`;
      ctx.fill();
    }

    const { trajectory, maxAltitudeM, maxQ } = result;
    if (trajectory.length < 2) return;

    const maxAltKm = Math.max(maxAltitudeM / 1000, 15);
    const maxTime = trajectory[trajectory.length - 1].time;

    const toX = (t: number) => PAD.left + ((t / maxTime) * (W - PAD.left - PAD.right));
    const toY = (altM: number) => H - PAD.bottom - ((altM / 1000 / maxAltKm) * (H - PAD.top - PAD.bottom));

    // Earth curvature hint
    const earthGrad = ctx.createLinearGradient(0, H - PAD.bottom, 0, H - PAD.bottom + 20);
    earthGrad.addColorStop(0, 'rgba(34,197,94,0.15)');
    earthGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = earthGrad;
    ctx.beginPath();
    ctx.ellipse(W / 2, H - PAD.bottom + 10, W * 0.6, 20, 0, Math.PI, 0, true);
    ctx.fill();

    // Dashed altitude lines
    [100, 200].forEach(km => {
      if (km > maxAltKm * 1.15) return;
      const y = toY(km * 1000);
      ctx.strokeStyle = km === 100 ? 'rgba(234,179,8,0.25)' : 'rgba(34,197,94,0.2)';
      ctx.setLineDash([5, 6]);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = km === 100 ? 'rgba(234,179,8,0.6)' : 'rgba(34,197,94,0.5)';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(km === 100 ? 'Kármán 100km' : 'LEO 200km', PAD.left + 2, y - 4);
    });

    // Faint grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let t = 0; t <= maxTime; t += maxTime / 5) {
      const x = toX(t);
      ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, H - PAD.bottom); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = '#1e1e35';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD.left, PAD.top); ctx.lineTo(PAD.left, H - PAD.bottom);
    ctx.lineTo(W - PAD.right, H - PAD.bottom);
    ctx.stroke();

    // Glow trajectory line
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 4;
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    trajectory.forEach((pt, i) => {
      const x = toX(pt.time);
      const y = toY(Math.max(0, pt.altitude));
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Max Q dot
    if (maxQ.pressure > 0) {
      const mqPt = trajectory.reduce((b, pt) => Math.abs(pt.dynamicPressure - maxQ.pressure) < Math.abs(b.dynamicPressure - maxQ.pressure) ? pt : b);
      const mx = toX(mqPt.time);
      const my = toY(Math.max(0, mqPt.altitude));
      ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(mx, my, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b'; ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#f59e0b';
      ctx.font = '9px monospace'; ctx.textAlign = 'left';
      ctx.fillText(`⚡ ${(maxQ.pressure / 1000).toFixed(1)}kPa`, mx + 7, my + 3);
    }

    // Launch dot
    ctx.shadowColor = '#22c55e'; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(toX(0), toY(0), 5, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e'; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#22c55e'; ctx.font = '9px monospace'; ctx.textAlign = 'left';
    ctx.fillText('🚀', toX(0) - 5, toY(0) - 8);

    // Apogee dot
    const apoPt = trajectory.reduce((b, pt) => pt.altitude > b.altitude ? pt : b);
    const apoColor = result.outcome === 'LEO' ? '#22c55e' : result.outcome === 'SUBORBITAL' ? '#f59e0b' : '#ef4444';
    ctx.shadowColor = apoColor; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(toX(apoPt.time), toY(apoPt.altitude), 5, 0, Math.PI * 2);
    ctx.fillStyle = apoColor; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e2e8f0'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
    ctx.fillText(`${(apoPt.altitude / 1000).toFixed(0)}km`, toX(apoPt.time), toY(apoPt.altitude) - 10);

    // Axis labels
    ctx.fillStyle = '#64748b'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
    ctx.fillText('Time (s)', W / 2, H - 8);
    ctx.save(); ctx.translate(14, H / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('Altitude (km)', 0, 0); ctx.restore();

    // Y-axis ticks
    ctx.textAlign = 'right';
    for (let km = 0; km <= maxAltKm; km += Math.round(maxAltKm / 4)) {
      const ty = toY(km * 1000);
      ctx.fillText(`${km}`, PAD.left - 4, ty + 3);
    }

  }, [result]);

  return (
    <canvas
      ref={canvasRef}
      width={580}
      height={280}
      className="w-full rounded-lg"
      style={{ border: '1px solid #1e1e35', filter: 'drop-shadow(0 0 8px rgba(6,182,212,0.15))' }}
    />
  );
}
