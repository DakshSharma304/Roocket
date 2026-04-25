'use client';
import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import Designer, { DesignerHandle } from '../components/Designer';
import VerdictScreen from '../components/VerdictScreen';
import StarfieldWrapper from '../components/StarfieldWrapper';
import { PART_DEFS } from '../components/PartsPanel';
import { runSimulation } from '../physics/trajectory';
import { validateInputs } from '../physics/validation';
import type { RocketInputs, SimResult } from '../physics/trajectory';

export default function DesignerPage() {
  const designerRef = useRef<DesignerHandle>(null);
  const [result, setResult] = useState<SimResult | null>(null);
  const [lastInputs, setLastInputs] = useState<RocketInputs | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleRun = (inputs: RocketInputs) => {
    const validation = validateInputs(inputs);
    if (!validation.valid) { setErrors(validation.errors); return; }
    setErrors([]);
    setCalculating(true);
    setProgress(0);

    let tick = 0;
    const interval = setInterval(() => {
      tick += Math.random() * 18 + 8;
      setProgress(Math.min(90, tick));
    }, 80);

    setTimeout(() => {
      const sim = runSimulation(inputs);
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => {
        setLastInputs(inputs);
        setResult(sim);
        setCalculating(false);
      }, 300);
    }, 0);
  };

  const handleAddPart = (partId: string, isSwap: boolean, swapCategory?: string) => {
    const def = PART_DEFS.find(d => d.id === partId);
    if (!def) return;
    setResult(null);
    // Small delay so the verdict screen closes before the part lands on the canvas
    setTimeout(() => {
      if (isSwap && swapCategory) {
        designerRef.current?.swapPart(swapCategory, def);
      } else {
        designerRef.current?.addPart(def);
      }
      setToast(`${def.label} added — re-run simulation to see improvement`);
    }, 50);
  };

  return (
    <div className="flex flex-col h-screen text-[#e2e8f0]" style={{ background: '#040408' }}>
      <StarfieldWrapper />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 flex-shrink-0 relative z-10" style={{ background: 'rgba(10,10,18,0.9)', borderBottom: '1px solid #1e1e35', backdropFilter: 'blur(8px)' }}>
        <Link href="/" className="text-[10px] text-[#64748b] hover:text-[#e2e8f0] transition-colors">
          ← Home
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#7c3aed]" style={{ boxShadow: '0 0 6px #7c3aed' }} />
          <span className="text-sm font-bold tracking-widest uppercase" style={{ fontFamily: 'var(--font-space, sans-serif)' }}>Roocket</span>
          <span className="text-xs text-[#64748b]">/ Designer</span>
        </div>
        <div className="w-16" />
      </header>

      {/* Error bar */}
      {errors.length > 0 && (
        <div className="px-4 py-2 flex-shrink-0 relative z-10" style={{ background: 'rgba(239,68,68,0.1)', borderBottom: '1px solid rgba(239,68,68,0.3)' }}>
          {errors.map((e, i) => <p key={i} className="text-xs text-[#ef4444]">{e}</p>)}
        </div>
      )}

      {/* Main */}
      <div className="flex-1 overflow-hidden relative z-10">
        <Designer ref={designerRef} onRun={handleRun} />
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg text-sm text-[#e2e8f0] shadow-2xl"
          style={{ background: 'rgba(13,13,26,0.97)', border: '1px solid rgba(124,58,237,0.4)', backdropFilter: 'blur(12px)' }}
        >
          {toast}
        </div>
      )}

      {/* Calculating overlay */}
      {calculating && (
        <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(4,4,8,0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="text-center p-8 rounded-xl" style={{ background: 'rgba(18,18,30,0.95)', border: '1px solid rgba(124,58,237,0.3)', boxShadow: '0 0 40px rgba(124,58,237,0.15)' }}>
            <div className="text-xs uppercase tracking-widest text-[#7c3aed] mb-4">◉ Calculating</div>
            <p className="text-sm text-[#94a3b8] mb-4">Running Euler integration...</p>
            <div className="w-48 h-1.5 rounded-full overflow-hidden" style={{ background: '#1e1e35' }}>
              <div className="h-full rounded-full transition-all duration-100" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #7c3aed, #06b6d4)' }} />
            </div>
            <div className="text-[10px] text-[#64748b] mt-2 font-mono">{Math.round(progress)}%</div>
          </div>
        </div>
      )}

      {/* Verdict overlay */}
      {result && lastInputs && (
        <VerdictScreen
          result={result}
          inputs={lastInputs}
          onBack={() => setResult(null)}
          onAddPart={handleAddPart}
        />
      )}
    </div>
  );
}
