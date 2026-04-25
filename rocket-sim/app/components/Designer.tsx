'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import PartsPanel, { PART_DEFS, PartDef, PartType } from './PartsPanel';
import Inspector from './Inspector';
import type { RocketInputs } from '../physics/trajectory';
import type { NoseConeType } from '../physics/trajectory';
import type { PropellantType } from '../physics/propulsion';

export interface PlacedPart {
  instanceId: string;
  def: PartDef;
  overrides: Record<string, number | string>;
}

const CANVAS_W = 320;
const PART_HEIGHTS: Record<PartType, number> = {
  'nose-ogive': 80, 'nose-conical': 80, 'nose-blunt': 60,
  'fairing': 70, 'payload-bay': 60,
  'tank-small': 50, 'tank-medium': 90, 'tank-large': 140,
  'engine-merlin': 70, 'engine-rutherford': 50, 'engine-solid': 80,
  'fins': 30,
};
const PART_WIDTH = 80;

function drawPart(ctx: CanvasRenderingContext2D, part: PlacedPart, x: number, y: number, h: number, selected: boolean) {
  const { id, color } = part.def;
  ctx.save();
  if (selected) {
    ctx.shadowColor = '#7c3aed';
    ctx.shadowBlur = 12;
  }
  ctx.fillStyle = color;
  ctx.strokeStyle = selected ? '#7c3aed' : '#1e1e2e';
  ctx.lineWidth = selected ? 2 : 1;

  ctx.beginPath();
  if (id === 'nose-ogive') {
    ctx.moveTo(x + PART_WIDTH / 2, y);
    ctx.quadraticCurveTo(x + PART_WIDTH, y + h * 0.6, x + PART_WIDTH, y + h);
    ctx.lineTo(x, y + h);
    ctx.quadraticCurveTo(x, y + h * 0.6, x + PART_WIDTH / 2, y);
  } else if (id === 'nose-conical') {
    ctx.moveTo(x + PART_WIDTH / 2, y);
    ctx.lineTo(x + PART_WIDTH, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  } else if (id === 'nose-blunt') {
    ctx.arc(x + PART_WIDTH / 2, y + h / 2, h / 2, Math.PI, 0);
    ctx.lineTo(x + PART_WIDTH, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  } else if (id === 'fins') {
    ctx.moveTo(x, y);
    ctx.lineTo(x - 20, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + PART_WIDTH, y);
    ctx.lineTo(x + PART_WIDTH + 20, y + h);
    ctx.lineTo(x + PART_WIDTH, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.rect(x, y, PART_WIDTH, h);
  } else if (id === 'engine-merlin' || id === 'engine-rutherford' || id === 'engine-solid') {
    ctx.moveTo(x + 10, y);
    ctx.lineTo(x + PART_WIDTH - 10, y);
    ctx.lineTo(x + PART_WIDTH + 5, y + h);
    ctx.lineTo(x - 5, y + h);
    ctx.closePath();
  } else {
    ctx.rect(x, y, PART_WIDTH, h);
  }
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(part.def.label.slice(0, 12), x + PART_WIDTH / 2, y + h / 2 + 4);
  ctx.restore();
}

function deriveInputs(parts: PlacedPart[]): Partial<RocketInputs> {
  let dryMass = 0, fuelMass = 0, payloadMass = 0, thrustKN = 0;
  let noseCone: NoseConeType = 'Ogive';
  let propellant: PropellantType = 'LOX/RP-1';
  let diameter = 1.6;
  let hasEngine = false;

  for (const p of parts) {
    const v = (key: string, fallback = 0) => Number(p.overrides[key] ?? p.def.defaults[key] ?? fallback);
    const s = (key: string, fallback = '') => String(p.overrides[key] ?? p.def.defaults[key] ?? fallback);

    if (p.def.id.startsWith('nose-')) {
      noseCone = s('noseCone', 'Ogive') as NoseConeType;
      dryMass += v('dryMass');
    } else if (p.def.id === 'payload-bay') {
      payloadMass += v('payloadMass');
      dryMass += 100;
    } else if (p.def.id === 'fairing') {
      dryMass += v('dryMass');
    } else if (p.def.id.startsWith('tank-')) {
      fuelMass += v('fuelMass');
      dryMass += v('fuelMass') * 0.08;
    } else if (p.def.id.startsWith('engine-')) {
      thrustKN += v('thrustKN');
      dryMass += v('dryMass');
      propellant = s('propellant', 'LOX/RP-1') as PropellantType;
      hasEngine = true;
    } else if (p.def.id === 'fins') {
      dryMass += v('dryMass');
    }
  }

  if (parts.some(p => p.def.id === 'fairing' || p.def.id === 'payload-bay')) diameter = 3.7;
  else if (parts.some(p => p.def.id === 'tank-large')) diameter = 3.7;
  else if (parts.some(p => p.def.id === 'tank-medium')) diameter = 2.0;

  return { dryMass: Math.max(10, dryMass), fuelMass: Math.max(1, fuelMass), payloadMass: Math.max(0.1, payloadMass), thrustKN, noseCone, propellant, diameter };
}

interface Props {
  onRun: (inputs: RocketInputs) => void;
}

export default function Designer({ onRun }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [parts, setParts] = useState<PlacedPart[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [draggingPart, setDraggingPart] = useState<PartDef | null>(null);

  const canvasHeight = Math.max(400, parts.reduce((s, p) => s + PART_HEIGHTS[p.def.id], 0) + 80);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (parts.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Drag parts here to build', canvas.width / 2, canvas.height / 2);
      return;
    }

    const offsetX = (canvas.width - PART_WIDTH) / 2;
    let y = 20;

    for (const part of parts) {
      const h = PART_HEIGHTS[part.def.id];
      drawPart(ctx, part, offsetX, y, h, part.instanceId === selected);
      y += h;
    }

    // height measurement
    ctx.strokeStyle = '#1e1e2e';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(offsetX - 30, 20);
    ctx.lineTo(offsetX - 30, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${((y - 20) / 20).toFixed(1)}m`, offsetX - 30, y / 2);
  }, [parts, selected]);

  useEffect(() => { redraw(); }, [redraw]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!draggingPart) return;
    setParts(prev => [...prev, {
      instanceId: `${draggingPart.id}-${Date.now()}`,
      def: draggingPart,
      overrides: {},
    }]);
    setDraggingPart(null);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const offsetX = (canvas.width - PART_WIDTH) / 2;
    const clickX = e.clientX - rect.left;

    let y = 20;
    for (const part of parts) {
      const h = PART_HEIGHTS[part.def.id];
      if (clickY >= y && clickY <= y + h && clickX >= offsetX - 25 && clickX <= offsetX + PART_WIDTH + 25) {
        setSelected(part.instanceId === selected ? null : part.instanceId);
        return;
      }
      y += h;
    }
    setSelected(null);
  };

  const selectedPart = parts.find(p => p.instanceId === selected) ?? null;

  const updatePartOverride = (instanceId: string, key: string, value: number | string) => {
    setParts(prev => prev.map(p => p.instanceId === instanceId ? { ...p, overrides: { ...p.overrides, [key]: value } } : p));
  };

  const removePart = (instanceId: string) => {
    setParts(prev => prev.filter(p => p.instanceId !== instanceId));
    setSelected(null);
  };

  const movePart = (instanceId: string, dir: -1 | 1) => {
    setParts(prev => {
      const idx = prev.findIndex(p => p.instanceId === instanceId);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  };

  const derived = deriveInputs(parts);
  const [overrides, setOverrides] = useState<Partial<RocketInputs>>({});

  const finalInputs: RocketInputs = {
    payloadMass: overrides.payloadMass ?? derived.payloadMass ?? 300,
    fuelMass: overrides.fuelMass ?? derived.fuelMass ?? 5000,
    dryMass: overrides.dryMass ?? derived.dryMass ?? 500,
    thrustKN: overrides.thrustKN ?? derived.thrustKN ?? 162,
    diameter: overrides.diameter ?? derived.diameter ?? 1.6,
    propellant: overrides.propellant ?? derived.propellant ?? 'LOX/RP-1',
    noseCone: overrides.noseCone ?? derived.noseCone ?? 'Ogive',
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      <PartsPanel onDragStart={setDraggingPart} />

      {/* Canvas */}
      <div
        className={`flex-1 overflow-auto bg-[#0a0a0f] relative ${dragOver ? 'ring-2 ring-inset ring-[#7c3aed]' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={canvasHeight}
          className="mx-auto block"
          onClick={handleCanvasClick}
          style={{ cursor: 'pointer' }}
        />
        {parts.length > 0 && (
          <div className="absolute top-2 right-2 flex gap-2">
            <button onClick={() => { setParts([]); setSelected(null); }} className="text-xs bg-[#13131a] border border-[#1e1e2e] text-[#64748b] hover:text-[#ef4444] px-2 py-1 rounded">
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="w-72 flex-shrink-0 bg-[#13131a] border-l border-[#1e1e2e] overflow-y-auto flex flex-col">
        {selectedPart ? (
          <Inspector
            part={selectedPart}
            onUpdate={updatePartOverride}
            onRemove={removePart}
            onMove={movePart}
          />
        ) : (
          <SummaryPanel derived={derived} overrides={overrides} setOverrides={setOverrides} />
        )}
        <div className="p-3 border-t border-[#1e1e2e] mt-auto">
          <button
            onClick={() => onRun(finalInputs)}
            className="w-full bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-bold py-3 rounded text-sm tracking-wide transition-colors"
          >
            Run Simulation →
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryPanel({ derived, overrides, setOverrides }: {
  derived: Partial<RocketInputs>;
  overrides: Partial<RocketInputs>;
  setOverrides: (v: Partial<RocketInputs>) => void;
}) {
  const fields: { key: keyof RocketInputs; label: string; unit: string }[] = [
    { key: 'payloadMass', label: 'Payload', unit: 'kg' },
    { key: 'fuelMass', label: 'Fuel', unit: 'kg' },
    { key: 'dryMass', label: 'Dry Mass', unit: 'kg' },
    { key: 'thrustKN', label: 'Thrust', unit: 'kN' },
    { key: 'diameter', label: 'Diameter', unit: 'm' },
  ];

  return (
    <div className="p-3 flex-1">
      <h3 className="text-xs uppercase tracking-widest text-[#64748b] mb-3">Summary / Override</h3>
      {fields.map(({ key, label, unit }) => {
        const base = (derived as Record<string, unknown>)[key] as number | undefined;
        const over = (overrides as Record<string, unknown>)[key] as number | undefined;
        return (
          <div key={key} className="mb-2">
            <label className="text-[10px] text-[#64748b] block mb-0.5">{label} ({unit})</label>
            <input
              type="number"
              value={over ?? base ?? ''}
              onChange={e => setOverrides({ ...overrides, [key]: Number(e.target.value) })}
              className="w-full bg-[#0a0a0f] border border-[#1e1e2e] text-[#e2e8f0] text-xs px-2 py-1.5 rounded focus:outline-none focus:border-[#7c3aed]"
            />
          </div>
        );
      })}
      <div className="mb-2">
        <label className="text-[10px] text-[#64748b] block mb-0.5">Propellant</label>
        <select
          value={(overrides.propellant ?? derived.propellant ?? 'LOX/RP-1') as string}
          onChange={e => setOverrides({ ...overrides, propellant: e.target.value as PropellantType })}
          className="w-full bg-[#0a0a0f] border border-[#1e1e2e] text-[#e2e8f0] text-xs px-2 py-1.5 rounded focus:outline-none focus:border-[#7c3aed]"
        >
          {['LOX/RP-1','LOX/LH2','UDMH/N2O4','Solid'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="mb-2">
        <label className="text-[10px] text-[#64748b] block mb-0.5">Nose Cone</label>
        <select
          value={(overrides.noseCone ?? derived.noseCone ?? 'Ogive') as string}
          onChange={e => setOverrides({ ...overrides, noseCone: e.target.value as NoseConeType })}
          className="w-full bg-[#0a0a0f] border border-[#1e1e2e] text-[#e2e8f0] text-xs px-2 py-1.5 rounded focus:outline-none focus:border-[#7c3aed]"
        >
          {['Ogive','Conical','Blunt'].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
    </div>
  );
}
