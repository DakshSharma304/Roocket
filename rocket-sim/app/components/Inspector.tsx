'use client';
import type { PlacedPart } from './Designer';

interface Props {
  part: PlacedPart;
  onUpdate: (instanceId: string, key: string, value: number | string) => void;
  onRemove: (instanceId: string) => void;
  onMove: (instanceId: string, dir: -1 | 1) => void;
}

const EDITABLE_FIELDS: Record<string, { key: string; label: string; type: 'number' | 'select'; options?: string[] }[]> = {
  'nose-ogive':        [{ key: 'dryMass', label: 'Dry Mass (kg)', type: 'number' }],
  'nose-conical':      [{ key: 'dryMass', label: 'Dry Mass (kg)', type: 'number' }],
  'nose-blunt':        [{ key: 'dryMass', label: 'Dry Mass (kg)', type: 'number' }],
  'fairing':           [{ key: 'dryMass', label: 'Dry Mass (kg)', type: 'number' }],
  'payload-bay':       [{ key: 'payloadMass', label: 'Payload Mass (kg)', type: 'number' }],
  'tank-small':        [{ key: 'fuelMass', label: 'Fuel Mass (kg)', type: 'number' }],
  'tank-medium':       [{ key: 'fuelMass', label: 'Fuel Mass (kg)', type: 'number' }],
  'tank-large':        [{ key: 'fuelMass', label: 'Fuel Mass (kg)', type: 'number' }],
  'engine-merlin':     [
    { key: 'thrustKN', label: 'Thrust (kN)', type: 'number' },
    { key: 'propellant', label: 'Propellant', type: 'select', options: ['LOX/RP-1','LOX/LH2','UDMH/N2O4','Solid'] },
    { key: 'dryMass', label: 'Dry Mass (kg)', type: 'number' },
  ],
  'engine-rutherford': [
    { key: 'thrustKN', label: 'Thrust (kN)', type: 'number' },
    { key: 'propellant', label: 'Propellant', type: 'select', options: ['LOX/RP-1','LOX/LH2','UDMH/N2O4','Solid'] },
    { key: 'dryMass', label: 'Dry Mass (kg)', type: 'number' },
  ],
  'engine-solid':      [
    { key: 'thrustKN', label: 'Thrust (kN)', type: 'number' },
    { key: 'dryMass', label: 'Dry Mass (kg)', type: 'number' },
  ],
  'fins':              [{ key: 'dryMass', label: 'Dry Mass (kg)', type: 'number' }],
};

export default function Inspector({ part, onUpdate, onRemove, onMove }: Props) {
  const fields = EDITABLE_FIELDS[part.def.id] ?? [];

  return (
    <div className="p-3 flex-1">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase tracking-widest text-[#64748b]">Inspector</h3>
        <button onClick={() => onRemove(part.instanceId)} className="text-xs text-[#ef4444] hover:text-red-300">Remove</button>
      </div>
      <div className="flex gap-1 mb-3">
        <button onClick={() => onMove(part.instanceId, -1)} className="flex-1 text-xs bg-[#1e1e2e] hover:bg-[#2a2a3e] text-[#e2e8f0] py-1 rounded">▲ Up</button>
        <button onClick={() => onMove(part.instanceId, 1)} className="flex-1 text-xs bg-[#1e1e2e] hover:bg-[#2a2a3e] text-[#e2e8f0] py-1 rounded">▼ Down</button>
      </div>
      <p className="text-sm font-semibold text-[#e2e8f0] mb-3">{part.def.label}</p>
      {fields.map(f => {
        const value = part.overrides[f.key] ?? part.def.defaults[f.key] ?? '';
        return (
          <div key={f.key} className="mb-2">
            <label className="text-[10px] text-[#64748b] block mb-0.5">{f.label}</label>
            {f.type === 'select' ? (
              <select
                value={String(value)}
                onChange={e => onUpdate(part.instanceId, f.key, e.target.value)}
                className="w-full bg-[#0a0a0f] border border-[#1e1e2e] text-[#e2e8f0] text-xs px-2 py-1.5 rounded"
              >
                {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                type="number"
                value={Number(value)}
                onChange={e => onUpdate(part.instanceId, f.key, Number(e.target.value))}
                className="w-full bg-[#0a0a0f] border border-[#1e1e2e] text-[#e2e8f0] text-xs px-2 py-1.5 rounded focus:outline-none focus:border-[#7c3aed]"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
