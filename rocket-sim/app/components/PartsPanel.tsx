'use client';

export type PartType =
  | 'nose-ogive' | 'nose-conical' | 'nose-blunt'
  | 'fairing' | 'payload-bay'
  | 'tank-small' | 'tank-medium' | 'tank-large'
  | 'engine-merlin' | 'engine-rutherford' | 'engine-solid'
  | 'fins';

export interface PartDef {
  id: PartType;
  label: string;
  category: string;
  color: string;
  defaults: Record<string, number | string>;
}

export const PART_DEFS: PartDef[] = [
  { id: 'nose-ogive',      label: 'Ogive Nose',        category: 'Nose Cones', color: '#7c3aed', defaults: { cd: 0.15, dryMass: 50, noseCone: 'Ogive' } },
  { id: 'nose-conical',    label: 'Conical Nose',       category: 'Nose Cones', color: '#6d28d9', defaults: { cd: 0.20, dryMass: 40, noseCone: 'Conical' } },
  { id: 'nose-blunt',      label: 'Blunt Nose',         category: 'Nose Cones', color: '#5b21b6', defaults: { cd: 0.40, dryMass: 30, noseCone: 'Blunt' } },
  { id: 'fairing',         label: 'Payload Fairing',    category: 'Payload',    color: '#0e7490', defaults: { dryMass: 200 } },
  { id: 'payload-bay',     label: 'Payload Bay',        category: 'Payload',    color: '#0891b2', defaults: { payloadMass: 300 } },
  { id: 'tank-small',      label: 'Fuel Tank (S)',      category: 'Tanks',      color: '#065f46', defaults: { fuelMass: 5000 } },
  { id: 'tank-medium',     label: 'Fuel Tank (M)',      category: 'Tanks',      color: '#047857', defaults: { fuelMass: 50000 } },
  { id: 'tank-large',      label: 'Fuel Tank (L)',      category: 'Tanks',      color: '#059669', defaults: { fuelMass: 200000 } },
  { id: 'engine-merlin',   label: 'Merlin-class',       category: 'Engines',    color: '#b45309', defaults: { thrustKN: 556, propellant: 'LOX/RP-1', dryMass: 500 } },
  { id: 'engine-rutherford', label: 'Rutherford-class', category: 'Engines',  color: '#92400e', defaults: { thrustKN: 25,  propellant: 'LOX/RP-1', dryMass: 35 } },
  { id: 'engine-solid',    label: 'Solid Booster',      category: 'Engines',    color: '#7c2d12', defaults: { thrustKN: 1200, propellant: 'Solid', dryMass: 800 } },
  { id: 'fins',            label: 'Fins',               category: 'Stability',  color: '#374151', defaults: { dryMass: 20 } },
];

const CATEGORIES = ['Nose Cones', 'Payload', 'Tanks', 'Engines', 'Stability'];

interface Props {
  onDragStart: (part: PartDef) => void;
}

export default function PartsPanel({ onDragStart }: Props) {
  return (
    <div className="w-60 flex-shrink-0 bg-[#13131a] border-r border-[#1e1e2e] overflow-y-auto flex flex-col">
      <div className="p-3 border-b border-[#1e1e2e]">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#64748b]">Parts Library</h2>
      </div>
      {CATEGORIES.map(cat => {
        const parts = PART_DEFS.filter(p => p.category === cat);
        return (
          <div key={cat} className="px-2 pt-3">
            <p className="text-[10px] uppercase tracking-widest text-[#64748b] mb-1 px-1">{cat}</p>
            {parts.map(part => (
              <div
                key={part.id}
                draggable
                onDragStart={() => onDragStart(part)}
                className="flex items-center gap-2 px-2 py-2 rounded cursor-grab hover:bg-[#1e1e2e] mb-0.5 select-none"
              >
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: part.color }} />
                <span className="text-xs text-[#e2e8f0]">{part.label}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}