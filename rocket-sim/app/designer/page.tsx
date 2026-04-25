'use client';
import { useState } from 'react';
import Link from 'next/link';
import Designer from '../components/Designer';
import VerdictScreen from '../components/VerdictScreen';
import { runSimulation } from '../physics/trajectory';
import { validateInputs } from '../physics/validation';
import type { RocketInputs, SimResult } from '../physics/trajectory';

export default function DesignerPage() {
  const [result, setResult] = useState<SimResult | null>(null);
  const [lastInputs, setLastInputs] = useState<RocketInputs | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const handleRun = (inputs: RocketInputs) => {
    const validation = validateInputs(inputs);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors([]);
    const sim = runSimulation(inputs);
    setLastInputs(inputs);
    setResult(sim);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0f] text-[#e2e8f0]">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-[#13131a] border-b border-[#1e1e2e] flex-shrink-0">
        <Link href="/" className="text-xs text-[#64748b] hover:text-[#e2e8f0] transition-colors">
          ← Back to Home
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#7c3aed]" />
          <span className="text-sm font-bold tracking-widest uppercase text-[#e2e8f0]">Roocket</span>
          <span className="text-xs text-[#64748b]">/ Designer</span>
        </div>
        <div className="w-24" />
      </header>

      {/* Error bar */}
      {errors.length > 0 && (
        <div className="bg-[#ef4444]/10 border-b border-[#ef4444]/30 px-4 py-2">
          {errors.map((e, i) => (
            <p key={i} className="text-xs text-[#ef4444]">{e}</p>
          ))}
        </div>
      )}

      {/* Main */}
      <Designer onRun={handleRun} />

      {/* Verdict overlay */}
      {result && lastInputs && (
        <VerdictScreen result={result} inputs={lastInputs} onBack={() => setResult(null)} />
      )}
    </div>
  );
}
