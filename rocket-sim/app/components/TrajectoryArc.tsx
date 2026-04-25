'use client';
import { useEffect, useRef } from 'react';
import type { SimResult } from '../physics/trajectory';

interface Props {
  result: SimResult;
}

export default function TrajectoryArc({ result }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const PAD = { top: 30, right: 20, bottom: 40, left: 60 };

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, W, H);

    const { trajectory, maxAltitudeM, maxQ } = result;
    if (trajectory.length < 2) return;

    const maxAltKm = Math.max(maxAltitudeM / 1000, 10);
    const maxTime = trajectory[trajectory.length - 1].time;

    const toX = (t: number) => PAD.left + ((t / maxTime) * (W - PAD.left - PAD.right));
    const toY = (altM: number) => H - PAD.bottom - ((altM / 1000 / maxAltKm) * (H - PAD.top - PAD.bottom));

    // Grid lines
    ctx.strokeStyle = '#1e1e2e';
    ctx.lineWidth = 1;
    [100, 200].forEach(kmLine => {
      if (kmLine > maxAltKm * 1.1) return;
      const y = toY(kmLine * 1000);
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(W - PAD.right, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${kmLine}km`, PAD.left - 4, y + 4);
      if (kmLine === 100) {
        ctx.fillStyle = '#f59e0b44';
        ctx.fillText('Kármán', W - PAD.right - 2, y - 4);
      }
    });

    // Axes
    ctx.strokeStyle = '#1e1e2e';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(PAD.left, PAD.top);
    ctx.lineTo(PAD.left, H - PAD.bottom);
    ctx.lineTo(W - PAD.right, H - PAD.bottom);
    ctx.stroke();

    // Trajectory
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    trajectory.forEach((pt, i) => {
      const x = toX(pt.time);
      const y = toY(Math.max(0, pt.altitude));
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Max Q dot
    if (maxQ.pressure > 0) {
      const mqPt = trajectory.reduce((best, pt) =>
        Math.abs(pt.dynamicPressure - maxQ.pressure) < Math.abs(best.dynamicPressure - maxQ.pressure) ? pt : best
      );
      const mx = toX(mqPt.time);
      const my = toY(Math.max(0, mqPt.altitude));
      ctx.beginPath();
      ctx.arc(mx, my, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`⚡ Max Q ${(maxQ.pressure / 1000).toFixed(1)}kPa`, mx + 8, my + 4);
    }

    // Launch dot
    ctx.beginPath();
    ctx.arc(toX(0), toY(0), 5, 0, Math.PI * 2);
    ctx.fillStyle = '#22c55e';
    ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('🚀 Launch', toX(0) + 8, toY(0) - 4);

    // Apogee dot
    const apoPt = trajectory.reduce((best, pt) => pt.altitude > best.altitude ? pt : best);
    const ax = toX(apoPt.time);
    const ay = toY(apoPt.altitude);
    ctx.beginPath();
    ctx.arc(ax, ay, 5, 0, Math.PI * 2);
    ctx.fillStyle = result.outcome === 'LEO' ? '#22c55e' : result.outcome === 'SUBORBITAL' ? '#f59e0b' : '#ef4444';
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${(apoPt.altitude / 1000).toFixed(0)}km`, ax, ay - 10);

    // Axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Time (s)', W / 2, H - 5);
    ctx.save();
    ctx.translate(12, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Altitude (km)', 0, 0);
    ctx.restore();
  }, [result]);

  return <canvas ref={canvasRef} width={600} height={300} className="w-full rounded border border-[#1e1e2e]" />;
}
