'use client';
import { useRef, useState, useCallback, useEffect, useReducer } from 'react';
import PartsPanel, { PART_DEFS, PartDef, PartType } from './PartsPanel';
import Inspector from './Inspector';
import SciencePanel from '../science/SciencePanel';
import type { RocketInputs } from '../physics/trajectory';
import type { NoseConeType } from '../physics/trajectory';
import type { PropellantType } from '../physics/propulsion';
import { G0 } from '../physics/atmosphere';

export interface PlacedPart {
  instanceId: string;
  def: PartDef;
  overrides: Record<string, number | string>;
}

// --- Part geometry config ---
const PART_H: Record<PartType, number> = {
  'nose-ogive': 80, 'nose-conical': 80, 'nose-blunt': 60,
  'fairing': 70, 'payload-bay': 60,
  'tank-small': 55, 'tank-medium': 95, 'tank-large': 145,
  'engine-merlin': 75, 'engine-rutherford': 55, 'engine-solid': 85,
  'fins': 32,
};
const PART_W = 80;
const ORIGIN_X = 160; // canvas center x

// --- Draw individual part shapes ---
function drawPartShape(
  ctx: CanvasRenderingContext2D,
  id: PartType,
  color: string,
  x: number, y: number,
  w: number, h: number,
  selected: boolean,
  label: string,
) {
  ctx.save();
  if (selected) { ctx.shadowColor = '#7c3aed'; ctx.shadowBlur = 16; }
  ctx.strokeStyle = selected ? '#7c3aed' : 'rgba(255,255,255,0.08)';
  ctx.lineWidth = selected ? 1.5 : 1;

  // gradient shading for cylinder effect
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0,   lighten(color, 0.3));
  grad.addColorStop(0.4, color);
  grad.addColorStop(1,   darken(color, 0.35));
  ctx.fillStyle = grad;

  ctx.beginPath();
  if (id === 'nose-ogive') {
    ctx.moveTo(x + w / 2, y);
    ctx.bezierCurveTo(x + w * 0.85, y + h * 0.4, x + w, y + h * 0.7, x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.bezierCurveTo(x, y + h * 0.7, x + w * 0.15, y + h * 0.4, x + w / 2, y);
  } else if (id === 'nose-conical') {
    ctx.moveTo(x + w / 2, y + 2);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  } else if (id === 'nose-blunt') {
    const cx = x + w / 2;
    const cy = y + h * 0.45;
    const rx = w / 2;
    const ry = h * 0.5;
    ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  } else if (id === 'engine-merlin' || id === 'engine-rutherford' || id === 'engine-solid') {
    ctx.moveTo(x + 8, y);
    ctx.lineTo(x + w - 8, y);
    ctx.bezierCurveTo(x + w - 8, y, x + w + 10, y + h, x + w + 8, y + h);
    ctx.lineTo(x - 8, y + h);
    ctx.bezierCurveTo(x - 8, y + h, x + 8, y, x + 8, y);
    ctx.closePath();
  } else if (id === 'fins') {
    // fins on both sides, slim center body
    ctx.rect(x + 10, y, w - 20, h);
    ctx.fill();
    ctx.stroke();
    // left fin
    ctx.beginPath();
    ctx.moveTo(x + 10, y + h * 0.2);
    ctx.lineTo(x - 20, y + h);
    ctx.lineTo(x + 10, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // right fin
    ctx.beginPath();
    ctx.moveTo(x + w - 10, y + h * 0.2);
    ctx.lineTo(x + w + 20, y + h);
    ctx.lineTo(x + w - 10, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  } else {
    // cylinder with domed ends (tanks, fairings, payload)
    const dome = Math.min(12, h * 0.12);
    ctx.moveTo(x, y + dome);
    ctx.quadraticCurveTo(x, y, x + w / 2, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + dome);
    ctx.lineTo(x + w, y + h - dome);
    ctx.quadraticCurveTo(x + w, y + h, x + w / 2, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - dome);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();

  // label
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label.slice(0, 13), x + w / 2, y + h / 2 + 3);
  ctx.restore();
}

function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + Math.round(255 * amt));
  const g = Math.min(255, ((n >> 8) & 0xff) + Math.round(255 * amt));
  const b = Math.min(255, (n & 0xff) + Math.round(255 * amt));
  return `rgb(${r},${g},${b})`;
}

function darken(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - Math.round(255 * amt));
  const g = Math.max(0, ((n >> 8) & 0xff) - Math.round(255 * amt));
  const b = Math.max(0, (n & 0xff) - Math.round(255 * amt));
  return `rgb(${r},${g},${b})`;
}

// --- Physics derivation ---
function deriveInputs(parts: PlacedPart[]): Partial<RocketInputs> {
  let dryMass = 0, fuelMass = 0, payloadMass = 0, thrustKN = 0;
  let noseCone: NoseConeType = 'Ogive';
  let propellant: PropellantType = 'LOX/RP-1';
  let diameter = 1.6;

  for (const p of parts) {
    const v = (k: string, fb = 0) => Number(p.overrides[k] ?? p.def.defaults[k] ?? fb);
    const s = (k: string, fb = '') => String(p.overrides[k] ?? p.def.defaults[k] ?? fb);

    if (p.def.id.startsWith('nose-')) {
      noseCone = s('noseCone', 'Ogive') as NoseConeType;
      dryMass += v('dryMass');
    } else if (p.def.id === 'payload-bay') {
      payloadMass += v('payloadMass');
      dryMass += 100;
    } else if (p.def.id === 'fairing') {
      dryMass += v('dryMass');
    } else if (p.def.id.startsWith('tank-')) {
      const fuel = v('fuelMass');
      const mat = s('material', 'Aluminum 2219');
      const sfMap: Record<string,number> = { 'Aluminum 2219': 0.06, 'Carbon Fiber': 0.04, 'Stainless': 0.09, 'Titanium': 0.05 };
      const sf = sfMap[mat] ?? 0.06;
      fuelMass += fuel;
      dryMass += fuel * sf * 1.3;
    } else if (p.def.id.startsWith('engine-')) {
      thrustKN += v('thrustKN');
      dryMass += v('dryMass');
      propellant = s('propellant', 'LOX/RP-1') as PropellantType;
    } else if (p.def.id === 'fins') {
      dryMass += v('dryMass');
    }
  }

  if (parts.some(p => p.def.id === 'fairing' || p.def.id === 'payload-bay')) diameter = 3.7;
  else if (parts.some(p => p.def.id === 'tank-large')) diameter = 3.7;
  else if (parts.some(p => p.def.id === 'tank-medium')) diameter = 2.0;

  return { dryMass: Math.max(10, dryMass), fuelMass: Math.max(1, fuelMass), payloadMass: Math.max(0.1, payloadMass), thrustKN, noseCone, propellant, diameter };
}

// --- CoM calculation (simplified centroid of stacked parts) ---
function calcCoM(parts: PlacedPart[]): number | null {
  if (parts.length === 0) return null;
  let totalMass = 0;
  let momentSum = 0;
  let y = 0;
  for (const p of parts) {
    const h = PART_H[p.def.id];
    const v = (k: string, fb = 0) => Number(p.overrides[k] ?? p.def.defaults[k] ?? fb);
    const partMass =
      (p.def.id.startsWith('tank-') ? v('fuelMass', 5000) * 1.08 : 0) +
      v('dryMass', 50) +
      (p.def.id === 'payload-bay' ? v('payloadMass', 300) : 0);
    momentSum += (y + h / 2) * partMass;
    totalMass += partMass;
    y += h;
  }
  return totalMass > 0 ? momentSum / totalMass : null;
}

// --- Main component ---
interface Props {
  onRun: (inputs: RocketInputs) => void;
}

export default function Designer({ onRun }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [parts, setParts] = useState<PlacedPart[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [draggingPart, setDraggingPart] = useState<PartDef | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panY, setPanY] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [showScience, setShowScience] = useState(false);
  const [sciencePartId, setSciencePartId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Partial<RocketInputs>>({});
  const [, forceRedraw] = useReducer(x => x + 1, 0);

  const totalH = Math.max(400, parts.reduce((s, p) => s + PART_H[p.def.id], 0) + 80);
  const CANVAS_W = 320;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#040408';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // faint grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < canvas.width; gx += 20) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, canvas.height); ctx.stroke();
      }
      for (let gy = 0; gy < canvas.height; gy += 20) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(canvas.width, gy); ctx.stroke();
      }
    }

    if (parts.length === 0) {
      ctx.fillStyle = '#1e1e35';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Drag parts here to build', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#0f0f20';
      ctx.font = '10px monospace';
      ctx.fillText('↑ from Parts Library on the left', canvas.width / 2, canvas.height / 2 + 10);
      return;
    }

    const ox = ORIGIN_X - PART_W / 2;
    let y = 20;

    // draw parts
    for (const part of parts) {
      const h = PART_H[part.def.id];
      drawPartShape(ctx, part.def.id as PartType, part.def.color, ox, y, PART_W, h, part.instanceId === selected, part.def.label);
      y += h;
    }

    // height measurement line
    const totalPartH = y - 20;
    ctx.strokeStyle = 'rgba(100,116,139,0.4)';
    ctx.setLineDash([3, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ox - 28, 20); ctx.lineTo(ox - 28, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${(totalPartH / 20).toFixed(1)}m`, ox - 28, 20 + totalPartH / 2);

    // diameter indicator
    ctx.strokeStyle = 'rgba(100,116,139,0.3)';
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(ox, y + 12); ctx.lineTo(ox + PART_W, y + 12); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`⌀ ${(PART_W / 20).toFixed(1)}m`, ox + PART_W / 2, y + 22);

    // CoM dot
    const comY = calcCoM(parts);
    if (comY !== null) {
      const comCanvasY = 20 + comY;
      ctx.beginPath();
      ctx.arc(ox + PART_W + 16, comCanvasY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6';
      ctx.fill();
      ctx.shadowColor = '#3b82f6';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#3b82f6';
      ctx.font = '8px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('CoM', ox + PART_W + 24, comCanvasY + 3);
    }

    // CoP estimate (3/4 of total height — rough aerodynamic estimate)
    const copY = 20 + totalPartH * 0.72;
    ctx.beginPath();
    ctx.arc(ox + PART_W + 16, copY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ef4444';
    ctx.font = '8px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('CoP', ox + PART_W + 24, copY + 3);

    // stability label
    const stable = comY !== null && comY < totalPartH * 0.72;
    ctx.fillStyle = stable ? '#22c55e' : '#ef4444';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(stable ? '✓ STABLE' : '⚠ UNSTABLE', ox + PART_W / 2, y + 36);
  }, [parts, selected, showGrid]);

  useEffect(() => { redraw(); }, [redraw]);
  useEffect(() => { forceRedraw(); }, [parts, selected, showGrid]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
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
    const clickY = (e.clientY - rect.top) / zoom;
    const clickX = (e.clientX - rect.left) / zoom;
    const ox = ORIGIN_X - PART_W / 2;

    let y = 20;
    for (const part of parts) {
      const h = PART_H[part.def.id];
      if (clickY >= y && clickY <= y + h && clickX >= ox - 25 && clickX <= ox + PART_W + 25) {
        setSelected(part.instanceId === selected ? null : part.instanceId);
        return;
      }
      y += h;
    }
    setSelected(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.max(0.4, Math.min(2.5, z + delta)));
  };

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

  const duplicatePart = (instanceId: string) => {
    const orig = parts.find(p => p.instanceId === instanceId);
    if (!orig) return;
    const clone: PlacedPart = { ...orig, instanceId: `${orig.def.id}-${Date.now()}`, overrides: { ...orig.overrides } };
    const idx = parts.findIndex(p => p.instanceId === instanceId);
    setParts(prev => [...prev.slice(0, idx + 1), clone, ...prev.slice(idx + 1)]);
  };

  const selectedPart = parts.find(p => p.instanceId === selected) ?? null;
  const derived = deriveInputs(parts);
  const finalInputs: RocketInputs = {
    payloadMass: overrides.payloadMass ?? derived.payloadMass ?? 300,
    fuelMass: overrides.fuelMass ?? derived.fuelMass ?? 5000,
    dryMass: overrides.dryMass ?? derived.dryMass ?? 500,
    thrustKN: overrides.thrustKN ?? derived.thrustKN ?? 162,
    diameter: overrides.diameter ?? derived.diameter ?? 1.6,
    propellant: overrides.propellant ?? derived.propellant ?? 'LOX/RP-1',
    noseCone: overrides.noseCone ?? derived.noseCone ?? 'Ogive',
  };

  const totalMass = finalInputs.dryMass + finalInputs.payloadMass + finalInputs.fuelMass;
  const twr = finalInputs.thrustKN > 0 ? (finalInputs.thrustKN * 1000) / (totalMass * G0) : 0;

  return (
    <div className="flex flex-1 overflow-hidden">
      <PartsPanel onDragStart={setDraggingPart} />

      {/* Canvas area */}
      <div
        className="flex-1 overflow-auto relative"
        style={{ background: '#040408' }}
        onDragOver={e => { e.preventDefault(); }}
        onDrop={handleDrop}
        onWheel={handleWheel}
      >
        {/* Canvas controls */}
        <div className="absolute top-2 left-2 flex gap-1.5 z-10">
          <button
            onClick={() => setShowGrid(g => !g)}
            className="text-[9px] px-2 py-1 rounded border transition-colors"
            style={{ background: '#0a0a12', borderColor: showGrid ? '#7c3aed' : '#1e1e35', color: showGrid ? '#7c3aed' : '#64748b' }}
          >
            Grid
          </button>
          <button
            onClick={() => setZoom(1)}
            className="text-[9px] px-2 py-1 rounded border transition-colors"
            style={{ background: '#0a0a12', borderColor: '#1e1e35', color: '#64748b' }}
          >
            {Math.round(zoom * 100)}%
          </button>
        </div>

        {parts.length > 0 && (
          <button
            onClick={() => { setParts([]); setSelected(null); }}
            className="absolute top-2 right-2 z-10 text-[10px] px-2 py-1 rounded border border-[#1e1e35] text-[#64748b] hover:text-[#ef4444] hover:border-[#ef4444]/30 transition-colors"
            style={{ background: '#0a0a12' }}
          >
            Clear
          </button>
        )}

        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', paddingTop: panY }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={Math.max(400, totalH + 60)}
            className="mx-auto block"
            onClick={handleCanvasClick}
            style={{ cursor: 'crosshair' }}
          />
        </div>
      </div>

      {/* Right panel — inspector or summary, with optional science */}
      <div className="w-72 flex-shrink-0 flex flex-col overflow-hidden" style={{ background: '#0a0a12', borderLeft: '1px solid #1e1e35' }}>
        {showScience ? (
          <SciencePanel selectedPartId={sciencePartId} onClose={() => setShowScience(false)} />
        ) : selectedPart ? (
          <Inspector
            part={selectedPart}
            onUpdate={updatePartOverride}
            onRemove={removePart}
            onMove={movePart}
            onDuplicate={duplicatePart}
            onOpenScience={id => { setSciencePartId(id); setShowScience(true); }}
          />
        ) : (
          <SummaryPanel derived={derived} overrides={overrides} setOverrides={setOverrides} twr={twr} totalMass={totalMass}
            onOpenScience={() => { setSciencePartId(null); setShowScience(true); }}
          />
        )}

        {/* Run button */}
        <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid #1e1e35' }}>
          <button
            onClick={() => onRun(finalInputs)}
            className="btn-primary w-full py-3 rounded text-sm tracking-wide"
          >
            Run Simulation →
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Summary Panel ---
function SummaryPanel({ derived, overrides, setOverrides, twr, totalMass, onOpenScience }: {
  derived: Partial<RocketInputs>;
  overrides: Partial<RocketInputs>;
  setOverrides: (v: Partial<RocketInputs>) => void;
  twr: number;
  totalMass: number;
  onOpenScience: () => void;
}) {
  const fields: { key: keyof RocketInputs; label: string; unit: string }[] = [
    { key: 'payloadMass', label: 'Payload', unit: 'kg' },
    { key: 'fuelMass',    label: 'Fuel',    unit: 'kg' },
    { key: 'dryMass',     label: 'Dry Mass', unit: 'kg' },
    { key: 'thrustKN',   label: 'Thrust',   unit: 'kN' },
    { key: 'diameter',   label: 'Diameter', unit: 'm' },
  ];

  const twrColor = twr >= 1.3 ? '#22c55e' : twr >= 1.0 ? '#f59e0b' : '#ef4444';

  return (
    <div className="p-3 flex-1 overflow-y-auto">
      <h3 className="text-[9px] uppercase tracking-widest text-[#64748b] mb-2">Summary / Override</h3>

      {/* Live TWR indicator */}
      {totalMass > 0 && (
        <div className="mb-3 p-2 rounded border" style={{ background: '#040408', borderColor: '#1e1e35' }}>
          <div className="flex justify-between text-[10px]">
            <span className="text-[#64748b]">Launch TWR</span>
            <span className="font-mono" style={{ color: twrColor }}>{twr.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[10px] mt-0.5">
            <span className="text-[#64748b]">Total Mass</span>
            <span className="font-mono text-[#e2e8f0]">{(totalMass / 1000).toFixed(1)}t</span>
          </div>
        </div>
      )}

      <style>{`.sum-input { width: 100%; background: #040408; border: 1px solid #1e1e35; color: #e2e8f0; font-size: 11px; padding: 4px 8px; border-radius: 4px; outline: none; } .sum-input:focus { border-color: #7c3aed; }`}</style>

      {fields.map(({ key, label, unit }) => {
        const base = (derived as Record<string, unknown>)[key] as number | undefined;
        const over = (overrides as Record<string, unknown>)[key] as number | undefined;
        return (
          <div key={key} className="mb-1.5">
            <label className="text-[9px] text-[#64748b] block mb-0.5">{label} ({unit})</label>
            <input
              type="number"
              value={over ?? base ?? ''}
              onChange={e => setOverrides({ ...overrides, [key]: Number(e.target.value) })}
              className="sum-input"
            />
          </div>
        );
      })}

      <div className="mb-1.5">
        <label className="text-[9px] text-[#64748b] block mb-0.5">Propellant</label>
        <select value={(overrides.propellant ?? derived.propellant ?? 'LOX/RP-1') as string}
          onChange={e => setOverrides({ ...overrides, propellant: e.target.value as PropellantType })}
          className="sum-input">
          {['LOX/RP-1','LOX/LH2','UDMH/N2O4','Solid'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="mb-3">
        <label className="text-[9px] text-[#64748b] block mb-0.5">Nose Cone</label>
        <select value={(overrides.noseCone ?? derived.noseCone ?? 'Ogive') as string}
          onChange={e => setOverrides({ ...overrides, noseCone: e.target.value as NoseConeType })}
          className="sum-input">
          {['Ogive','Conical','Blunt'].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      <button onClick={onOpenScience} className="w-full text-xs text-[#7c3aed] hover:text-[#06b6d4] border border-[#1e1e35] hover:border-[#7c3aed]/50 py-1.5 rounded transition-colors" style={{ background: 'transparent' }}>
        🔬 How do rockets work?
      </button>
    </div>
  );
}
