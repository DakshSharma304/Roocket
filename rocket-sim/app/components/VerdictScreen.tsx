'use client';
import { useEffect, useRef, useState } from 'react';
import TrajectoryArc from './TrajectoryArc';
import FeedbackPanel from '../feedback/FeedbackPanel';
import { analyzeDesign } from '../feedback/analyzer';
import type { SimResult } from '../physics/trajectory';
import type { RocketInputs } from '../physics/trajectory';
import { MAX_Q_WARNING, MAX_Q_FATAL } from '../physics/maxq';

const REAL_ROCKETS = [
  { name: 'Electron',  deltaV: 9200, payloadLEO: 300,  note: 'small sat specialist' },
  { name: 'Falcon 1',  deltaV: 9400, payloadLEO: 670,  note: 'first commercial success' },
  { name: 'Vanguard',  deltaV: 8100, payloadLEO: 1.5,  note: 'historic first US satellite' },
  { name: 'V-2',       deltaV: 3200, payloadLEO: 0,    note: 'suborbital only' },
];

function closestRocket(dv: number, payloadKg: number) {
  return REAL_ROCKETS.reduce((best, r) => {
    const score = Math.abs(r.deltaV - dv) + Math.abs((r.payloadLEO - payloadKg) * 2);
    const bestScore = Math.abs(best.deltaV - dv) + Math.abs((best.payloadLEO - payloadKg) * 2);
    return score < bestScore ? r : best;
  });
}

function comparisonLine(result: SimResult, inputs: RocketInputs) {
  const rocket = closestRocket(result.finalDeltaV, inputs.payloadMass);
  const dvDiff = result.finalDeltaV - rocket.deltaV;
  const pct = Math.abs((dvDiff / rocket.deltaV) * 100).toFixed(0);
  if (Math.abs(dvDiff) < 200) return `Performs similarly to ${rocket.name} (${rocket.note}).`;
  if (dvDiff < 0) return `Performs similarly to ${rocket.name}, except with ${pct}% less delta-v.`;
  return `Performs similarly to ${rocket.name}, except with ${pct}% more delta-v — impressive.`;
}

function twrComparison(result: SimResult) {
  if (result.launchTWR < 1.2) return 'Performs similarly to Falcon 1, except your TWR is dangerously low.';
  return null;
}

function AnimatedNumber({ target, suffix = '', decimals = 0 }: { target: number; suffix?: string; decimals?: number }) {
  const [current, setCurrent] = useState(0);
  const startTime = useRef<number | null>(null);
  const duration = 800;

  useEffect(() => {
    startTime.current = null;
    const step = (ts: number) => {
      if (!startTime.current) startTime.current = ts;
      const progress = Math.min((ts - startTime.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(target * eased);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target]);

  return <>{current.toFixed(decimals)}{suffix}</>;
}

interface Stat { label: string; rawValue: number; value: string; sub?: string; color?: string; animate?: boolean; animDecimals?: number; animSuffix?: string; }
interface Props { result: SimResult; inputs: RocketInputs; onBack: () => void; }

export default function VerdictScreen({ result, inputs, onBack }: Props) {
  const { outcome, finalDeltaV, maxAltitudeM, burnTimeS, maxQ, launchTWR, burnoutVelocityMs } = result;
  const feedback = analyzeDesign(result, inputs);

  const badge = {
    LEO:          { text: 'REACHED LEO ✅',        color: '#22c55e' },
    SUBORBITAL:   { text: 'SUBORBITAL 🔶',          color: '#f59e0b' },
    PAD_SITTER:   { text: 'NEVER LEFT PAD 💀',      color: '#ef4444' },
    DISINTEGRATED:{ text: 'DISINTEGRATED 💀',       color: '#ef4444' },
    NO_SPACE:     { text: 'DID NOT REACH SPACE 💀', color: '#ef4444' },
  }[outcome];

  const failureMessage = (() => {
    if (outcome === 'PAD_SITTER')
      return `TWR is ${launchTWR.toFixed(2)} — your rocket will sit on the pad and slowly melt 💀`;
    if (outcome === 'DISINTEGRATED')
      return `Disintegrates at Max Q — ${(maxQ.pressure / 1000).toFixed(1)}kPa at ${(maxQ.altitudeM / 1000).toFixed(1)}km. The atmosphere won. 💀`;
    if (outcome === 'NO_SPACE')
      return `Peak altitude: ${(maxAltitudeM / 1000).toFixed(1)}km. Not even close to space. A weather balloon does better. 💀`;
    if (outcome === 'SUBORBITAL')
      return `Reached ${(maxAltitudeM / 1000).toFixed(0)}km — technically space, no orbit. You went up, you came down. 🔶`;
    const needed = 7800;
    const diff = needed - burnoutVelocityMs;
    if (diff > 200)
      return `Delta-v is ${finalDeltaV.toFixed(0)}m/s. You needed ${needed}m/s. ${diff.toFixed(0)}m/s short — add more fuel or cry. 🔶`;
    return `Reached ${(maxAltitudeM / 1000).toFixed(0)}km at ${burnoutVelocityMs.toFixed(0)}m/s. Orbital velocity confirmed. 🛰️ ✅`;
  })();

  const stats: Stat[] = [
    { label: 'Delta-v', rawValue: finalDeltaV / 1000, value: `${(finalDeltaV / 1000).toFixed(2)} km/s`, sub: 'LEO needs 7.80 km/s', color: finalDeltaV >= 7800 ? '#22c55e' : '#ef4444', animate: true, animDecimals: 2, animSuffix: ' km/s' },
    { label: 'Max Altitude', rawValue: maxAltitudeM / 1000, value: `${(maxAltitudeM / 1000).toFixed(1)} km`, color: maxAltitudeM >= 200000 ? '#22c55e' : maxAltitudeM >= 100000 ? '#f59e0b' : '#ef4444', animate: true, animDecimals: 1, animSuffix: ' km' },
    { label: 'Burn Time', rawValue: burnTimeS, value: `${burnTimeS.toFixed(0)} s`, animate: true, animDecimals: 0, animSuffix: ' s' },
    { label: 'Max Q', rawValue: maxQ.pressure / 1000, value: `${(maxQ.pressure / 1000).toFixed(1)} kPa`, sub: `at ${(maxQ.altitudeM / 1000).toFixed(1)} km`, color: maxQ.pressure > MAX_Q_FATAL ? '#ef4444' : maxQ.pressure > MAX_Q_WARNING ? '#f59e0b' : '#22c55e', animate: true, animDecimals: 1, animSuffix: ' kPa' },
    { label: 'Launch TWR', rawValue: launchTWR, value: launchTWR.toFixed(2), color: launchTWR >= 1.3 ? '#22c55e' : launchTWR >= 1.0 ? '#f59e0b' : '#ef4444', animate: true, animDecimals: 2 },
    { label: 'Burnout Velocity', rawValue: burnoutVelocityMs, value: `${burnoutVelocityMs.toFixed(0)} m/s`, sub: 'LEO needs 7,800 m/s', color: burnoutVelocityMs >= 7800 ? '#22c55e' : '#ef4444', animate: true, animDecimals: 0, animSuffix: ' m/s' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(6,182,212,0.06) 0%, transparent 50%), #040408' }}>
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Badge */}
        <div className="text-center mb-8">
          <div className="text-xs uppercase tracking-widest text-[#64748b] mb-3">Mission Outcome</div>
          <div
            className={`text-4xl font-black tracking-tight ${outcome === 'LEO' ? 'leo-pulse' : ''}`}
            style={{ color: badge.color, textShadow: `0 0 30px ${badge.color}60` }}
          >
            {badge.text}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {stats.map(s => (
            <div key={s.label} className="glass-card rounded-lg p-4">
              <div className="text-[10px] uppercase tracking-widest text-[#64748b] mb-1">{s.label}</div>
              <div className="text-xl font-bold font-mono" style={{ color: s.color ?? '#e2e8f0' }}>
                {s.animate
                  ? <AnimatedNumber target={s.rawValue} decimals={s.animDecimals ?? 0} suffix={s.animSuffix ?? ''} />
                  : s.value
                }
              </div>
              {s.sub && <div className="text-[10px] text-[#64748b] mt-0.5">{s.sub}</div>}
            </div>
          ))}
        </div>

        {/* Trajectory */}
        <div className="mb-8">
          <div className="text-xs uppercase tracking-widest text-[#64748b] mb-2">Trajectory</div>
          <TrajectoryArc result={result} />
        </div>

        {/* Comparison */}
        <div className="glass-card rounded-lg p-4 mb-6 text-sm text-[#e2e8f0]">
          {twrComparison(result) ?? comparisonLine(result, inputs)}
        </div>

        {/* Failure message */}
        <div className="text-center mb-8">
          <p className="text-xl font-semibold text-[#e2e8f0] max-w-xl mx-auto leading-snug">{failureMessage}</p>
        </div>

        {/* Design Analysis */}
        <div className="mb-8">
          <FeedbackPanel items={feedback} />
        </div>

        <div className="text-center">
          <button onClick={onBack} className="btn-primary px-8 py-3 rounded text-sm tracking-wide font-bold">
            ← Redesign
          </button>
        </div>
      </div>

      <style>{`
        @keyframes leoPulse {
          0%, 100% { opacity: 1; text-shadow: 0 0 30px #22c55e60; }
          50% { opacity: 0.85; text-shadow: 0 0 60px #22c55e, 0 0 80px #22c55e40; }
        }
        .leo-pulse { animation: leoPulse 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
