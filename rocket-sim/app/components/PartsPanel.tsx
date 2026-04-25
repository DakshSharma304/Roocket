'use client';
import { useState } from 'react';

export type PartType =
  | 'nose-ogive' | 'nose-conical' | 'nose-blunt'
  | 'fairing' | 'payload-bay'
  | 'tank-small' | 'tank-medium' | 'tank-large'
  | 'engine-merlin' | 'engine-rutherford' | 'engine-solid'
  | 'fin-left' | 'fin-right';

export interface PartDef {
  id: PartType;
  label: string;
  category: string;
  color: string;
  defaults: Record<string, number | string>;
  stats?: string;
}

export const PART_DEFS: PartDef[] = [
  { id: 'nose-ogive',       label: 'Ogive Nose',         category: 'Nose Cones', color: '#7c3aed', defaults: { cd: 0.15, dryMass: 50,  noseCone: 'Ogive' },          stats: 'Cd 0.15' },
  { id: 'nose-conical',     label: 'Conical Nose',        category: 'Nose Cones', color: '#6d28d9', defaults: { cd: 0.20, dryMass: 40,  noseCone: 'Conical' },        stats: 'Cd 0.20' },
  { id: 'nose-blunt',       label: 'Blunt Nose',          category: 'Nose Cones', color: '#5b21b6', defaults: { cd: 0.40, dryMass: 30,  noseCone: 'Blunt' },          stats: 'Cd 0.40' },
  { id: 'fairing',          label: 'Payload Fairing',     category: 'Payload',    color: '#0e7490', defaults: { dryMass: 200 },                                        stats: '200 kg' },
  { id: 'payload-bay',      label: 'Payload Bay',         category: 'Payload',    color: '#0891b2', defaults: { payloadMass: 300 },                                    stats: '300 kg' },
  { id: 'tank-small',       label: 'Fuel Tank (S)',       category: 'Tanks',      color: '#065f46', defaults: { fuelMass: 5000 },                                      stats: '5t fuel' },
  { id: 'tank-medium',      label: 'Fuel Tank (M)',       category: 'Tanks',      color: '#047857', defaults: { fuelMass: 50000 },                                     stats: '50t fuel' },
  { id: 'tank-large',       label: 'Fuel Tank (L)',       category: 'Tanks',      color: '#059669', defaults: { fuelMass: 200000 },                                    stats: '200t fuel' },
  { id: 'engine-merlin',    label: 'Merlin-class',        category: 'Engines',    color: '#b45309', defaults: { thrustKN: 914,  propellant: 'LOX/RP-1', dryMass: 470 }, stats: '914 kN' },
  { id: 'engine-rutherford',label: 'Rutherford-class',    category: 'Engines',    color: '#92400e', defaults: { thrustKN: 24,   propellant: 'LOX/RP-1', dryMass: 35  }, stats: '24 kN' },
  { id: 'engine-solid',     label: 'Solid Booster',       category: 'Engines',    color: '#7c2d12', defaults: { thrustKN: 1200, propellant: 'Solid',    dryMass: 800 }, stats: '1200 kN' },
  { id: 'fin-left',         label: 'Left Fin',            category: 'Stability',  color: '#374151', defaults: { dryMass: 10 },                                         stats: '10 kg' },
  { id: 'fin-right',        label: 'Right Fin',           category: 'Stability',  color: '#4b5563', defaults: { dryMass: 10 },                                         stats: '10 kg' },
];

const CATEGORIES = ['Nose Cones', 'Payload', 'Tanks', 'Engines', 'Stability'];

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

interface Props {
  onPartMouseDown: (part: PartDef, e: React.MouseEvent) => void;
}

function PartCard({ part, onPartMouseDown }: { part: PartDef; onPartMouseDown: (p: PartDef, e: React.MouseEvent) => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseDown={(e) => { e.preventDefault(); onPartMouseDown(part, e); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-center gap-2 px-2 py-2 rounded cursor-grab mb-0.5 select-none transition-colors"
      style={{
        background: hovered ? `rgba(${hexToRgb(part.color)},0.12)` : 'transparent',
        borderLeft: hovered ? `2px solid ${part.color}` : '2px solid transparent',
      }}
    >
      <div
        className="w-2.5 h-2.5 rounded-sm flex-shrink-0 transition-all duration-200"
        style={{
          background: part.color,
          boxShadow: hovered ? `0 0 8px ${part.color}` : 'none',
        }}
      />
      <div className="flex-1 min-w-0">
        <span className="text-xs text-[#e2e8f0] block">{part.label}</span>
        {hovered && part.stats && (
          <span className="text-[9px] text-[#64748b] font-mono">{part.stats}</span>
        )}
      </div>
    </div>
  );
}

export default function PartsPanel({ onPartMouseDown }: Props) {
  return (
    <div className="w-56 flex-shrink-0 overflow-y-auto flex flex-col" style={{ background: 'rgba(10,10,18,0.9)', borderRight: '1px solid #1e1e35' }}>
      <div className="p-3" style={{ borderBottom: '1px solid #1e1e35' }}>
        <h2 className="text-[9px] font-semibold uppercase tracking-widest text-[#64748b]">Parts Library</h2>
      </div>
      {CATEGORIES.map(cat => {
        const parts = PART_DEFS.filter(p => p.category === cat);
        return (
          <div key={cat} className="px-2 pt-3">
            <p className="text-[9px] uppercase tracking-widest text-[#64748b] mb-1 px-1">{cat}</p>
            {parts.map(part => (
              <PartCard key={part.id} part={part} onPartMouseDown={onPartMouseDown} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
