'use client';
import { useState } from 'react';
import type { PlacedPart } from './Designer';
import type { PartType } from './PartsPanel';

interface Props {
  part: PlacedPart;
  onUpdate: (instanceId: string, key: string, value: number | string) => void;
  onRemove: (instanceId: string) => void;
  onMove: (instanceId: string, dir: -1 | 1) => void;
  onDuplicate?: (instanceId: string) => void;
  onOpenScience?: (partId: string) => void;
}

const ENGINE_PRESETS = {
  'Merlin 1D':  { thrustKN: 914,   ispSL: 282, ispVac: 311, dryMass: 470 },
  'Rutherford': { thrustKN: 24,    ispSL: 303, ispVac: 343, dryMass: 35  },
  'RS-25':      { thrustKN: 2279,  ispSL: 366, ispVac: 452, dryMass: 3177 },
  'Raptor 2':   { thrustKN: 2300,  ispSL: 327, ispVac: 380, dryMass: 1600 },
  'Solid SRB':  { thrustKN: 12500, ispSL: 242, ispVac: 268, dryMass: 86000 },
  'Custom':     { thrustKN: 500,   ispSL: 280, ispVac: 310, dryMass: 400  },
};

const WALL_MATERIALS = {
  'Aluminum 2219': { structuralFraction: 0.060, label: 'Al 2219 (Falcon 9)' },
  'Carbon Fiber':  { structuralFraction: 0.040, label: 'CF (Electron)' },
  'Stainless':     { structuralFraction: 0.090, label: 'Steel (Starship)' },
  'Titanium':      { structuralFraction: 0.050, label: 'Ti (premium)' },
};

type MaterialKey = keyof typeof WALL_MATERIALS;
type PresetKey = keyof typeof ENGINE_PRESETS;

function val(part: PlacedPart, key: string, fallback = 0) {
  return Number(part.overrides[key] ?? part.def.defaults[key] ?? fallback);
}
function str(part: PlacedPart, key: string, fallback = '') {
  return String(part.overrides[key] ?? part.def.defaults[key] ?? fallback);
}

function TankSection({ part, onUpdate }: { part: PlacedPart; onUpdate: Props['onUpdate'] }) {
  const fuelMass = val(part, 'fuelMass', 5000);
  const material = (str(part, 'material', 'Aluminum 2219')) as MaterialKey;
  const sf = WALL_MATERIALS[material]?.structuralFraction ?? 0.06;
  const structMass = Math.round(fuelMass * sf);
  const totalTankDryMass = Math.round(fuelMass * sf * 1.3);
  const density = 800;
  const volume = fuelMass / density;

  return (
    <>
      <Field label="Fuel Mass (kg)">
        <input type="number" value={fuelMass} onChange={e => onUpdate(part.instanceId, 'fuelMass', Number(e.target.value))}
          className="field-input" />
      </Field>
      <Field label="Wall Material">
        <select value={material} onChange={e => onUpdate(part.instanceId, 'material', e.target.value)} className="field-input">
          {Object.entries(WALL_MATERIALS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </Field>
      <div className="mt-3 pt-3 border-t border-[#1e1e35]">
        <p className="text-[9px] uppercase tracking-widest text-[#64748b] mb-1.5">Computed</p>
        <ComputedRow label="Structural mass" value={`~${structMass.toLocaleString()} kg`} />
        <ComputedRow label="Tank dry mass" value={`~${totalTankDryMass.toLocaleString()} kg`} />
        <ComputedRow label="Volume" value={`~${volume.toFixed(0)} m³`} />
      </div>
    </>
  );
}

function EngineSection({ part, onUpdate }: { part: PlacedPart; onUpdate: Props['onUpdate'] }) {
  const [preset, setPreset] = useState<PresetKey>('Custom');

  const applyPreset = (key: PresetKey) => {
    setPreset(key);
    const p = ENGINE_PRESETS[key];
    onUpdate(part.instanceId, 'thrustKN', p.thrustKN);
    onUpdate(part.instanceId, 'dryMass', p.dryMass);
  };

  const thrustKN = val(part, 'thrustKN', 500);
  const dryMass = val(part, 'dryMass', 400);
  const propellant = str(part, 'propellant', 'LOX/RP-1');

  return (
    <>
      <Field label="Engine Preset">
        <select value={preset} onChange={e => applyPreset(e.target.value as PresetKey)} className="field-input">
          {Object.keys(ENGINE_PRESETS).map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </Field>
      <Field label="Thrust (kN)">
        <input type="number" value={thrustKN} onChange={e => onUpdate(part.instanceId, 'thrustKN', Number(e.target.value))} className="field-input" />
      </Field>
      <Field label="Propellant">
        <select value={propellant} onChange={e => onUpdate(part.instanceId, 'propellant', e.target.value)} className="field-input">
          {['LOX/RP-1','LOX/LH2','UDMH/N2O4','Solid'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </Field>
      <Field label="Engine Dry Mass (kg)">
        <input type="number" value={dryMass} onChange={e => onUpdate(part.instanceId, 'dryMass', Number(e.target.value))} className="field-input" />
      </Field>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <label className="text-[10px] text-[#64748b] block mb-0.5">{label}</label>
      {children}
    </div>
  );
}

function ComputedRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[10px] mb-0.5">
      <span className="text-[#64748b]">{label}</span>
      <span className="text-[#06b6d4] font-mono">{value}</span>
    </div>
  );
}

export default function Inspector({ part, onUpdate, onRemove, onMove, onDuplicate, onOpenScience }: Props) {
  const id = part.def.id as PartType;
  const isTank = id.startsWith('tank-');
  const isEngine = id.startsWith('engine-');
  const isNose = id.startsWith('nose-');
  const isPayload = id === 'payload-bay' || id === 'fairing';

  return (
    <div className="p-3 flex-1 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[9px] uppercase tracking-widest text-[#64748b]">Inspector</h3>
        <button onClick={() => onRemove(part.instanceId)} className="text-[10px] text-[#ef4444] hover:text-red-300 transition-colors">Remove</button>
      </div>

      {/* Part name + color */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: part.def.color }} />
        <p className="text-sm font-semibold text-[#e2e8f0]">{part.def.label}</p>
      </div>

      {/* Move controls */}
      <div className="flex gap-1 mb-3">
        <button onClick={() => onMove(part.instanceId, -1)} className="flex-1 text-xs bg-[#12121e] hover:bg-[#1e1e35] border border-[#1e1e35] text-[#e2e8f0] py-1 rounded transition-colors">▲ Up</button>
        <button onClick={() => onMove(part.instanceId, 1)} className="flex-1 text-xs bg-[#12121e] hover:bg-[#1e1e35] border border-[#1e1e35] text-[#e2e8f0] py-1 rounded transition-colors">▼ Down</button>
        {onDuplicate && (
          <button onClick={() => onDuplicate(part.instanceId)} className="text-xs bg-[#12121e] hover:bg-[#1e1e35] border border-[#1e1e35] text-[#e2e8f0] px-2 py-1 rounded transition-colors">⧉</button>
        )}
      </div>

      {/* Fields by part type */}
      <style>{`.field-input { width: 100%; background: #040408; border: 1px solid #1e1e35; color: #e2e8f0; font-size: 12px; padding: 4px 8px; border-radius: 4px; outline: none; } .field-input:focus { border-color: #7c3aed; }`}</style>

      {isTank && <TankSection part={part} onUpdate={onUpdate} />}
      {isEngine && <EngineSection part={part} onUpdate={onUpdate} />}

      {isNose && (
        <Field label="Dry Mass (kg)">
          <input type="number" value={val(part, 'dryMass', 50)} onChange={e => onUpdate(part.instanceId, 'dryMass', Number(e.target.value))} className="field-input" />
        </Field>
      )}

      {isPayload && (
        <>
          {id === 'payload-bay' && (
            <Field label="Payload Mass (kg)">
              <input type="number" value={val(part, 'payloadMass', 300)} onChange={e => onUpdate(part.instanceId, 'payloadMass', Number(e.target.value))} className="field-input" />
            </Field>
          )}
          <Field label="Fairing Dry Mass (kg)">
            <input type="number" value={val(part, 'dryMass', 200)} onChange={e => onUpdate(part.instanceId, 'dryMass', Number(e.target.value))} className="field-input" />
          </Field>
        </>
      )}

      {id === 'fins' && (
        <>
          <Field label="Fin Dry Mass (kg)">
            <input type="number" value={val(part, 'dryMass', 20)} onChange={e => onUpdate(part.instanceId, 'dryMass', Number(e.target.value))} className="field-input" />
          </Field>
          <Field label="Span (m)">
            <input type="number" step="0.1" value={val(part, 'span', 1.5)} onChange={e => onUpdate(part.instanceId, 'span', Number(e.target.value))} className="field-input" />
          </Field>
          <Field label="Sweep Angle (°)">
            <input type="number" value={val(part, 'sweep', 45)} onChange={e => onUpdate(part.instanceId, 'sweep', Number(e.target.value))} className="field-input" />
          </Field>
        </>
      )}

      {/* Science link */}
      {onOpenScience && (
        <button
          onClick={() => onOpenScience(part.def.id)}
          className="mt-3 w-full text-xs text-[#7c3aed] hover:text-[#06b6d4] border border-[#1e1e35] hover:border-[#7c3aed]/50 py-1.5 rounded transition-colors"
        >
          🔬 Why does this part matter?
        </button>
      )}
    </div>
  );
}
