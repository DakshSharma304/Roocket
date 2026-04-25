'use client';
import React, {
  useRef, useState, useCallback, useEffect, useImperativeHandle,
} from 'react';
import ReactDOM from 'react-dom';
import PartsPanel, { PART_DEFS, PartDef, PartType } from './PartsPanel';
import Inspector from './Inspector';
import SciencePanel from '../science/SciencePanel';
import type { RocketInputs } from '../physics/trajectory';
import type { NoseConeType } from '../physics/trajectory';
import type { PropellantType } from '../physics/propulsion';
import { interpolatedIsp } from '../physics/propulsion';
import { G0 } from '../physics/atmosphere';

// --- Types ---
export interface PlacedPart {
  instanceId: string;
  def: PartDef;
  overrides: Record<string, number | string>;
  x: number;   // center x in canvas coords
  y: number;   // center y in canvas coords
  width: number;
  height: number;
  attachedTo?: string;
}

export const PART_W: Record<PartType, number> = {
  'nose-ogive': 80,  'nose-conical': 80,  'nose-blunt': 80,
  'fairing': 100,    'payload-bay': 90,
  'tank-small': 80,  'tank-medium': 80,   'tank-large': 80,
  'engine-merlin': 80, 'engine-rutherford': 70, 'engine-solid': 90,
  'fin-left': 45, 'fin-right': 45,
};

export const PART_H: Record<PartType, number> = {
  'nose-ogive': 80,  'nose-conical': 80,  'nose-blunt': 60,
  'fairing': 70,     'payload-bay': 60,
  'tank-small': 55,  'tank-medium': 95,   'tank-large': 145,
  'engine-merlin': 75, 'engine-rutherford': 55, 'engine-solid': 85,
  'fin-left': 55, 'fin-right': 55,
};

export interface DesignerHandle {
  addPart: (def: PartDef, pos?: { x: number; y: number }) => void;
  swapPart: (category: string, def: PartDef) => void;
}

// --- SVG part shapes ---
function PartSVG({ type, color, uid }: {
  type: PartType; color: string; uid: string;
}) {
  const gid = `g-${uid}`;
  const overlay = `url(#${gid})`;

  const grad = (
    <defs>
      <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0"   stopColor="rgba(255,255,255,0.22)" />
        <stop offset="0.4" stopColor="rgba(255,255,255,0)" />
        <stop offset="1"   stopColor="rgba(0,0,0,0.28)" />
      </linearGradient>
    </defs>
  );

  const stroke = 'rgba(255,255,255,0.12)';
  const sw = '1.5';

  if (type === 'fin-left') {
    const d = 'M 90 0 L 90 100 L 0 100 Z';
    return (
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ display: 'block' }}>
        {grad}
        <path d={d} fill={color} stroke={stroke} strokeWidth={sw} />
        <path d={d} fill={overlay} />
      </svg>
    );
  }
  if (type === 'fin-right') {
    const d = 'M 10 0 L 10 100 L 100 100 Z';
    return (
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ display: 'block' }}>
        {grad}
        <path d={d} fill={color} stroke={stroke} strokeWidth={sw} />
        <path d={d} fill={overlay} />
      </svg>
    );
  }

  const paths: Record<string, string> = {
    'nose-ogive':       'M 50 0 C 85 40 100 70 100 100 L 0 100 C 0 70 15 40 50 0 Z',
    'nose-conical':     'M 50 2 L 100 100 L 0 100 Z',
    'nose-blunt':       'M 2 48 A 48 48 0 0 1 98 48 L 98 100 L 2 100 Z',
    'fairing':          'M 0 8 Q 0 0 8 0 L 92 0 Q 100 0 100 8 L 100 92 Q 100 100 92 100 L 8 100 Q 0 100 0 92 Z',
    'payload-bay':      'M 0 8 Q 0 0 8 0 L 92 0 Q 100 0 100 8 L 100 92 Q 100 100 92 100 L 8 100 Q 0 100 0 92 Z',
    'tank-small':       'M 0 8 Q 0 0 8 0 L 92 0 Q 100 0 100 8 L 100 92 Q 100 100 92 100 L 8 100 Q 0 100 0 92 Z',
    'tank-medium':      'M 0 8 Q 0 0 8 0 L 92 0 Q 100 0 100 8 L 100 92 Q 100 100 92 100 L 8 100 Q 0 100 0 92 Z',
    'tank-large':       'M 0 8 Q 0 0 8 0 L 92 0 Q 100 0 100 8 L 100 92 Q 100 100 92 100 L 8 100 Q 0 100 0 92 Z',
    'engine-merlin':    'M 12 0 L 88 0 L 100 100 L 0 100 Z',
    'engine-rutherford':'M 12 0 L 88 0 L 100 100 L 0 100 Z',
    'engine-solid':     'M 10 0 L 90 0 L 100 100 L 0 100 Z',
  };

  const d = paths[type] ?? paths['tank-medium'];

  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ display: 'block' }}>
      {grad}
      <path d={d} fill={color} stroke={stroke} strokeWidth={sw} />
      <path d={d} fill={overlay} />
    </svg>
  );
}

// --- Part renderer (absolutely positioned div) ---
function PartRenderer({ part, selected, snapHighlight, onMouseDown, onClick }: {
  part: PlacedPart;
  selected: boolean;
  snapHighlight: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: part.x - part.width / 2,
        top:  part.y - part.height / 2,
        width: part.width,
        height: part.height,
        cursor: 'grab',
        zIndex: selected ? 20 : 10,
        filter: selected
          ? 'drop-shadow(0 0 10px rgba(124,58,237,0.9))'
          : snapHighlight
          ? 'drop-shadow(0 0 10px rgba(6,182,212,0.8))'
          : undefined,
        userSelect: 'none',
        pointerEvents: 'auto',
      }}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      <PartSVG
        type={part.def.id}
        color={part.def.color}
        uid={part.instanceId}
      />
      {/* Part label */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
        justifyContent: 'center', pointerEvents: 'none',
      }}>
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 1.2 }}>
          {part.def.label.slice(0, 13)}
        </span>
      </div>
    </div>
  );
}

// --- Ghost (portal, fixed position) ---
function GhostPart({ def, x, y }: { def: PartDef; x: number; y: number }) {
  if (typeof document === 'undefined') return null;
  const w = PART_W[def.id];
  const h = PART_H[def.id];
  return ReactDOM.createPortal(
    <div style={{
      position: 'fixed',
      left: x - w / 2,
      top: y - h / 2,
      width: w, height: h,
      opacity: 0.55,
      pointerEvents: 'none',
      zIndex: 9999,
    }}>
      <PartSVG type={def.id} color={def.color} uid={`ghost-${def.id}`} />
    </div>,
    document.body,
  );
}

// --- Snap guide line ---
function SnapGuide({ axis, value }: { axis: 'x' | 'y'; value: number }) {
  if (axis === 'x') {
    return (
      <div style={{
        position: 'absolute', left: value, top: 0, width: 1, height: '100%',
        background: 'rgba(6,182,212,0.7)', pointerEvents: 'none', zIndex: 30,
      }} />
    );
  }
  return (
    <div style={{
      position: 'absolute', top: value, left: 0, height: 1, width: '100%',
      background: 'rgba(6,182,212,0.7)', pointerEvents: 'none', zIndex: 30,
    }} />
  );
}

// --- Snap detection ---
interface SnapResult {
  targetId: string;
  snapX: number;
  snapY: number;
  isFin: boolean;
}

function findSnap(
  dragX: number, dragY: number,
  dragW: number, dragH: number,
  dragType: PartType,
  others: PlacedPart[],
): SnapResult | null {
  const dLeft   = dragX - dragW / 2;
  const dRight  = dragX + dragW / 2;
  const dTop    = dragY - dragH / 2;
  const dBottom = dragY + dragH / 2;
  const BODY_SNAP = 25;
  const FIN_SNAP  = 45;

  for (const other of others) {
    const oLeft   = other.x - other.width  / 2;
    const oRight  = other.x + other.width  / 2;
    const oTop    = other.y - other.height / 2;
    const oBottom = other.y + other.height / 2;

    if (dragType === 'fin-left' && other.def.id.startsWith('tank-')) {
      if (Math.abs(dRight - oLeft) < FIN_SNAP && Math.abs(dragY - other.y) < other.height / 2 + 30)
        return { targetId: other.instanceId, snapX: oLeft - dragW / 2, snapY: other.y, isFin: true };
    }
    if (dragType === 'fin-right' && other.def.id.startsWith('tank-')) {
      if (Math.abs(dLeft - oRight) < FIN_SNAP && Math.abs(dragY - other.y) < other.height / 2 + 30)
        return { targetId: other.instanceId, snapX: oRight + dragW / 2, snapY: other.y, isFin: true };
    }
    if (dragType === 'fin-left' || dragType === 'fin-right') continue;
    if (other.def.id === 'fin-left' || other.def.id === 'fin-right') continue;

    const horizOk = Math.abs(dragX - other.x) < Math.max(dragW, other.width) * 0.65;
    if (horizOk && Math.abs(dBottom - oTop) < BODY_SNAP)
      return { targetId: other.instanceId, snapX: other.x, snapY: oTop - dragH / 2, isFin: false };
    if (horizOk && Math.abs(dTop - oBottom) < BODY_SNAP)
      return { targetId: other.instanceId, snapX: other.x, snapY: oBottom + dragH / 2, isFin: false };
  }
  return null;
}

// --- Attached position helper ---
function calcAttachedPos(child: PlacedPart, parent: PlacedPart): PlacedPart {
  const x = child.def.id === 'fin-left'
    ? parent.x - parent.width / 2 - child.width / 2
    : parent.x + parent.width / 2 + child.width / 2;
  return { ...child, x, y: parent.y };
}

// --- Physics helpers ---
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
      const sfMap: Record<string, number> = {
        'Aluminum 2219': 0.06, 'Carbon Fiber': 0.04, 'Stainless': 0.09, 'Titanium': 0.05,
      };
      const sf = sfMap[mat] ?? 0.06;
      fuelMass += fuel;
      dryMass += fuel * sf * 1.3;
    } else if (p.def.id.startsWith('engine-')) {
      thrustKN += v('thrustKN');
      dryMass += v('dryMass');
      propellant = s('propellant', 'LOX/RP-1') as PropellantType;
    } else if (p.def.id === 'fin-left' || p.def.id === 'fin-right') {
      dryMass += v('dryMass');
    }
  }

  if (parts.some(p => p.def.id === 'fairing' || p.def.id === 'payload-bay')) diameter = 3.7;
  else if (parts.some(p => p.def.id === 'tank-large')) diameter = 3.7;
  else if (parts.some(p => p.def.id === 'tank-medium')) diameter = 2.0;

  return {
    dryMass: Math.max(10, dryMass),
    fuelMass: Math.max(1, fuelMass),
    payloadMass: Math.max(0.1, payloadMass),
    thrustKN, noseCone, propellant, diameter,
  };
}

function calcCoM(parts: PlacedPart[]): number | null {
  if (parts.length === 0) return null;
  let totalMass = 0, momentSum = 0;
  for (const p of parts) {
    const v = (k: string, fb = 0) => Number(p.overrides[k] ?? p.def.defaults[k] ?? fb);
    const partMass =
      (p.def.id.startsWith('tank-') ? v('fuelMass', 5000) * 1.08 : 0) +
      v('dryMass', 50) +
      (p.def.id === 'payload-bay' ? v('payloadMass', 300) : 0);
    momentSum += p.y * partMass;
    totalMass += partMass;
  }
  return totalMass > 0 ? momentSum / totalMass : null;
}

// --- Main component ---
interface Props {
  onRun: (inputs: RocketInputs) => void;
}

const Designer = React.forwardRef<DesignerHandle, Props>(function Designer({ onRun }, ref) {
  const [parts, setParts] = useState<PlacedPart[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [showScience, setShowScience] = useState(false);
  const [sciencePartId, setSciencePartId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Partial<RocketInputs>>({});
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(null);
  const [snapTarget, setSnapTarget] = useState<SnapResult | null>(null);
  const [snapGuides, setSnapGuides] = useState<Array<{ axis: 'x' | 'y'; value: number }>>([]);

  const outerCanvasRef = useRef<HTMLDivElement>(null);
  const panelDragRef = useRef<{ def: PartDef } | null>(null);
  const canvasDragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const partsRef = useRef<PlacedPart[]>([]);
  const snapTargetRef = useRef<SnapResult | null>(null);
  const zoomRef = useRef(zoom);

  useEffect(() => { partsRef.current = parts; }, [parts]);
  useEffect(() => { snapTargetRef.current = snapTarget; }, [snapTarget]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // Expose imperative API for VerdictScreen recommendations
  useImperativeHandle(ref, () => ({
    addPart(def: PartDef, pos?: { x: number; y: number }) {
      const w = PART_W[def.id] ?? 80;
      const h = PART_H[def.id] ?? 80;
      const rect = outerCanvasRef.current?.getBoundingClientRect();
      const cw = rect ? rect.width : 600;
      const ch = rect ? rect.height : 500;
      let x = cw / 2, y = ch / 2;
      if (def.id.startsWith('engine-')) y = ch * 0.75;
      else if (def.id.startsWith('nose-')) y = ch * 0.18;
      else if (def.id === 'fin-left') { x = cw / 2 - 120; y = ch / 2; }
      else if (def.id === 'fin-right') { x = cw / 2 + 120; y = ch / 2; }
      if (pos) { x = pos.x; y = pos.y; }
      setParts(prev => [...prev, {
        instanceId: `${def.id}-${Date.now()}`,
        def, overrides: {}, x, y, width: w, height: h,
      }]);
    },
    swapPart(category: string, def: PartDef) {
      const w = PART_W[def.id] ?? 80;
      const h = PART_H[def.id] ?? 80;
      const rect = outerCanvasRef.current?.getBoundingClientRect();
      const cw = rect ? rect.width : 600;
      const ch = rect ? rect.height : 500;
      let x = cw / 2, y = ch * 0.18;
      setParts(prev => {
        const filtered = category === 'nose' ? prev.filter(p => !p.def.id.startsWith('nose-')) : prev;
        return [...filtered, {
          instanceId: `${def.id}-${Date.now()}`,
          def, overrides: {}, x, y, width: w, height: h,
        }];
      });
    },
  }), []);

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (panelDragRef.current) {
      const rect = outerCanvasRef.current?.getBoundingClientRect();
      if (rect) {
        const z = zoomRef.current;
        const def = panelDragRef.current.def;
        const w = PART_W[def.id];
        const h = PART_H[def.id];
        const cx = (e.clientX - rect.left) / z;
        const cy = (e.clientY - rect.top)  / z;
        const snap = findSnap(cx, cy, w, h, def.id, partsRef.current);
        setSnapTarget(snap);
        if (snap) {
          setGhostPos({ x: snap.snapX * z + rect.left, y: snap.snapY * z + rect.top });
        } else {
          setGhostPos({ x: e.clientX, y: e.clientY });
        }
      } else {
        setGhostPos({ x: e.clientX, y: e.clientY });
      }
      return;
    }

    if (canvasDragRef.current) {
      const rect = outerCanvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const z = zoomRef.current;
      let cx = (e.clientX - rect.left) / z - canvasDragRef.current.offsetX;
      let cy = (e.clientY - rect.top)  / z - canvasDragRef.current.offsetY;

      const guides: Array<{ axis: 'x' | 'y'; value: number }> = [];
      if (e.shiftKey) {
        const axisX = (rect.width / z) / 2;
        if (Math.abs(cx - axisX) < 30) { cx = axisX; guides.push({ axis: 'x', value: axisX }); }
      }
      setSnapGuides(guides);

      const dragId = canvasDragRef.current.id;
      const dragging = partsRef.current.find(p => p.instanceId === dragId);
      if (dragging) {
        const others = partsRef.current.filter(p => p.instanceId !== dragId && !p.attachedTo);
        const snap = findSnap(cx, cy, dragging.width, dragging.height, dragging.def.id, others);
        setSnapTarget(snap);
        if (snap) { cx = snap.snapX; cy = snap.snapY; }
      }

      setParts(prev => {
        const updated = prev.map(p =>
          p.instanceId === dragId ? { ...p, x: cx, y: cy } : p
        );
        const parent = updated.find(p => p.instanceId === dragId)!;
        return updated.map(p =>
          p.attachedTo === dragId ? calcAttachedPos(p, parent) : p
        );
      });
    }
  }, []);

  const handleGlobalMouseUp = useCallback((e: MouseEvent) => {
    if (panelDragRef.current) {
      const rect = outerCanvasRef.current?.getBoundingClientRect();
      if (rect &&
          e.clientX >= rect.left && e.clientX <= rect.right &&
          e.clientY >= rect.top  && e.clientY <= rect.bottom) {
        const def = panelDragRef.current.def;
        const w = PART_W[def.id];
        const h = PART_H[def.id];
        const z = zoomRef.current;
        const snap = snapTargetRef.current;
        const cx = snap ? snap.snapX : (e.clientX - rect.left) / z;
        const cy = snap ? snap.snapY : (e.clientY - rect.top)  / z;

        const newPart: PlacedPart = {
          instanceId: `${def.id}-${Date.now()}`,
          def, overrides: {}, x: cx, y: cy, width: w, height: h,
          attachedTo: snap?.isFin ? snap.targetId : undefined,
        };

        setParts(prev => [...prev, newPart]);
      }
      panelDragRef.current = null;
      setGhostPos(null);
      setSnapTarget(null);
      return;
    }

    if (canvasDragRef.current) {
      const dragId = canvasDragRef.current.id;
      const snap = snapTargetRef.current;
      setParts(prev => prev.map(p => {
        if (p.instanceId !== dragId) return p;
        if (p.def.id === 'fin-left' || p.def.id === 'fin-right') {
          return { ...p, attachedTo: snap?.isFin ? snap.targetId : undefined };
        }
        return p;
      }));
      canvasDragRef.current = null;
      setSnapGuides([]);
      setSnapTarget(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [handleGlobalMouseMove, handleGlobalMouseUp]);

  const startCanvasDrag = (part: PlacedPart, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = outerCanvasRef.current!.getBoundingClientRect();
    const z = zoom;
    const cx = (e.clientX - rect.left) / z;
    const cy = (e.clientY - rect.top) / z;
    canvasDragRef.current = {
      id: part.instanceId,
      offsetX: cx - part.x,
      offsetY: cy - part.y,
    };
    setSelected(part.instanceId);
  };

  const updatePartOverride = (instanceId: string, key: string, value: number | string) => {
    setParts(prev => prev.map(p =>
      p.instanceId === instanceId ? { ...p, overrides: { ...p.overrides, [key]: value } } : p
    ));
  };

  const removePart = (instanceId: string) => {
    setParts(prev => prev.filter(p => p.instanceId !== instanceId && p.attachedTo !== instanceId));
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
    const clone: PlacedPart = {
      ...orig,
      instanceId: `${orig.def.id}-${Date.now()}`,
      overrides: { ...orig.overrides },
      x: orig.x + 20,
      y: orig.y + 20,
      attachedTo: undefined,
    };
    setParts(prev => [...prev, clone]);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.max(0.4, Math.min(2.5, z + delta)));
  };

  const comY = calcCoM(parts);
  const selectedPart = parts.find(p => p.instanceId === selected) ?? null;
  const derived = deriveInputs(parts);
  const finalInputs: RocketInputs = {
    payloadMass: overrides.payloadMass ?? derived.payloadMass ?? 300,
    fuelMass:    overrides.fuelMass    ?? derived.fuelMass    ?? 5000,
    dryMass:     overrides.dryMass     ?? derived.dryMass     ?? 500,
    thrustKN:    overrides.thrustKN    ?? derived.thrustKN    ?? 162,
    diameter:    overrides.diameter    ?? derived.diameter    ?? 1.6,
    propellant:  overrides.propellant  ?? derived.propellant  ?? 'LOX/RP-1',
    noseCone:    overrides.noseCone    ?? derived.noseCone    ?? 'Ogive',
  };
  const totalMass = finalInputs.dryMass + finalInputs.payloadMass + finalInputs.fuelMass;
  const twr = finalInputs.thrustKN > 0 ? (finalInputs.thrustKN * 1000) / (totalMass * G0) : 0;
  const hasNoseCone = parts.some(p => p.def.id.startsWith('nose-'));
  const hasEngine   = parts.some(p => p.def.id.startsWith('engine-'));
  const hasFuel     = parts.some(p => p.def.id.startsWith('tank-'));
  const hasFins     = parts.some(p => p.def.id === 'fin-left' || p.def.id === 'fin-right');

  return (
    <div className="flex flex-1 overflow-hidden">
      <PartsPanel onPartMouseDown={(def, e) => {
        panelDragRef.current = { def };
        setGhostPos({ x: e.clientX, y: e.clientY });
      }} />

      {/* Canvas area */}
      <div
        ref={outerCanvasRef}
        className="flex-1 relative overflow-hidden"
        style={{ background: '#040408', cursor: canvasDragRef.current ? 'grabbing' : 'default' }}
        onClick={() => setSelected(null)}
        onWheel={handleWheel}
      >
        {/* Controls */}
        <div className="absolute top-2 left-2 flex gap-1.5 z-30">
          <button
            onClick={e => { e.stopPropagation(); setShowGrid(g => !g); }}
            className="text-[9px] px-2 py-1 rounded border transition-colors"
            style={{ background: '#0a0a12', borderColor: showGrid ? '#7c3aed' : '#1e1e35', color: showGrid ? '#7c3aed' : '#64748b' }}
          >
            Grid
          </button>
          <button
            onClick={e => { e.stopPropagation(); setZoom(1); }}
            className="text-[9px] px-2 py-1 rounded border transition-colors"
            style={{ background: '#0a0a12', borderColor: '#1e1e35', color: '#64748b' }}
          >
            {Math.round(zoom * 100)}%
          </button>
        </div>

        {parts.length > 0 && (
          <button
            onClick={e => { e.stopPropagation(); setParts([]); setSelected(null); }}
            className="absolute top-2 right-2 z-30 text-[10px] px-2 py-1 rounded border border-[#1e1e35] text-[#64748b] hover:text-[#ef4444] hover:border-[#ef4444]/30 transition-colors"
            style={{ background: '#0a0a12' }}
          >
            Clear
          </button>
        )}

        {/* Scalable part layer */}
        <div
          style={{
            position: 'absolute', inset: 0,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
          }}
        >
          {/* Grid overlay */}
          {showGrid && (
            <svg
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            >
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          )}

          {/* Snap guides */}
          {snapGuides.map((g, i) => <SnapGuide key={i} axis={g.axis} value={g.value} />)}

          {/* Parts */}
          {parts.map(part => (
            <PartRenderer
              key={part.instanceId}
              part={part}
              selected={selected === part.instanceId}
              snapHighlight={snapTarget?.targetId === part.instanceId}
              onMouseDown={e => startCanvasDrag(part, e)}
              onClick={e => { e.stopPropagation(); setSelected(s => s === part.instanceId ? null : part.instanceId); }}
            />
          ))}

          {/* CoM indicator */}
          {comY !== null && (
            <div style={{ position: 'absolute', left: 6, top: comY - 6, pointerEvents: 'none', zIndex: 25 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }} />
              <span style={{ position: 'absolute', left: 16, top: 0, fontSize: 8, color: '#3b82f6', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>CoM</span>
            </div>
          )}
        </div>

        {/* Empty state */}
        {parts.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <p style={{ color: '#1e1e35', fontSize: 12, fontFamily: 'monospace', marginBottom: 6 }}>Drag parts here to build</p>
            <p style={{ color: '#0f0f20', fontSize: 10, fontFamily: 'monospace' }}>↑ from Parts Library on the left</p>
          </div>
        )}
      </div>

      {/* Ghost follows cursor globally */}
      {ghostPos && panelDragRef.current && (
        <GhostPart def={panelDragRef.current.def} x={ghostPos.x} y={ghostPos.y} />
      )}

      {/* Right panel */}
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
          <SummaryPanel
            derived={derived}
            overrides={overrides}
            setOverrides={setOverrides}
            twr={twr}
            totalMass={totalMass}
            onOpenScience={() => { setSciencePartId(null); setShowScience(true); }}
            hasNoseCone={hasNoseCone}
            hasEngine={hasEngine}
            hasFuel={hasFuel}
            hasFins={hasFins}
          />
        )}

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
});

export default Designer;

// --- Summary Panel ---
function SummaryPanel({ derived, overrides, setOverrides, twr, totalMass, onOpenScience,
  hasNoseCone, hasEngine, hasFuel, hasFins }: {
  derived: Partial<RocketInputs>;
  overrides: Partial<RocketInputs>;
  setOverrides: (v: Partial<RocketInputs>) => void;
  twr: number;
  totalMass: number;
  onOpenScience: () => void;
  hasNoseCone: boolean;
  hasEngine: boolean;
  hasFuel: boolean;
  hasFins: boolean;
}) {
  const fields: { key: keyof RocketInputs; label: string; unit: string }[] = [
    { key: 'payloadMass', label: 'Payload',  unit: 'kg' },
    { key: 'fuelMass',    label: 'Fuel',     unit: 'kg' },
    { key: 'dryMass',     label: 'Dry Mass', unit: 'kg' },
    { key: 'thrustKN',    label: 'Thrust',   unit: 'kN' },
    { key: 'diameter',    label: 'Diameter', unit: 'm'  },
  ];

  // Live performance estimates
  const finalFuel      = overrides.fuelMass    ?? derived.fuelMass    ?? 0;
  const finalDry       = overrides.dryMass     ?? derived.dryMass     ?? 10;
  const finalPayload   = overrides.payloadMass ?? derived.payloadMass ?? 0.1;
  const finalThrust    = (overrides.thrustKN   ?? derived.thrustKN    ?? 0) * 1000;
  const finalPropellant = overrides.propellant ?? derived.propellant  ?? 'LOX/RP-1';
  const isp  = interpolatedIsp(finalPropellant as PropellantType, 40000);
  const m0   = finalDry + finalPayload + finalFuel;
  const m1   = finalDry + finalPayload;
  const dv   = m1 > 0 && m0 > m1 ? isp * G0 * Math.log(m0 / m1) : 0;
  const mdot = finalThrust > 0 ? finalThrust / (isp * G0) : 0;
  const burnTime = mdot > 0 ? finalFuel / mdot : 0;

  // Status
  const ready    = twr >= 1.3 && dv >= 4500 && hasEngine && hasFuel && hasNoseCone;
  const caution  = !ready && twr >= 1.0 && hasEngine && hasFuel;
  const statusColor = ready ? '#22c55e' : caution ? '#f59e0b' : '#ef4444';
  const statusDot   = ready ? '●' : caution ? '◉' : '○';
  const statusText  = ready ? 'GO' : caution ? 'CAUTION' : 'NO-GO';
  const missionLabel = !hasEngine || !hasFuel ? 'incomplete'
    : twr < 1.0   ? 'pad sitter'
    : dv  < 2000  ? 'ballistic'
    : dv  < 5000  ? 'suborbital likely'
    : dv  < 8500  ? 'high suborbital'
    : 'LEO capable';
  const twrColor = twr >= 1.3 ? '#22c55e' : twr >= 1.0 ? '#f59e0b' : '#ef4444';
  const dvColor  = dv  >= 8000 ? '#22c55e' : dv  >= 4000 ? '#f59e0b' : '#ef4444';

  return (
    <div className="p-3 flex-1 overflow-y-auto">
      <h3 className="text-[9px] uppercase tracking-widest text-[#64748b] mb-2">Assembly Status</h3>

      {/* Live status card — always visible once any part is placed */}
      <div className="mb-3 p-2 rounded border" style={{ background: '#040408', borderColor: '#1e1e35' }}>
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono font-semibold" style={{ color: statusColor }}>
            {statusDot} {statusText}
          </span>
          <span className="text-[9px] text-[#475569]">{missionLabel}</span>
        </div>

        {/* Key metrics */}
        <div className="flex justify-between text-[10px] mb-0.5">
          <span className="text-[#64748b]">TWR</span>
          <span className="font-mono" style={{ color: twrColor }}>{twr > 0 ? twr.toFixed(2) : '—'}</span>
        </div>
        <div className="flex justify-between text-[10px] mb-0.5">
          <span className="text-[#64748b]">Total Mass</span>
          <span className="font-mono text-[#e2e8f0]">{totalMass > 0 ? `${(totalMass / 1000).toFixed(1)} t` : '—'}</span>
        </div>
        <div className="flex justify-between text-[10px] mb-0.5">
          <span className="text-[#64748b]">Δv</span>
          <span className="font-mono" style={{ color: dvColor }}>{dv > 0 ? `${Math.round(dv).toLocaleString()} m/s` : '—'}</span>
        </div>
        <div className="flex justify-between text-[10px] mb-2">
          <span className="text-[#64748b]">Burn Time</span>
          <span className="font-mono text-[#e2e8f0]">{burnTime > 0 ? `${Math.round(burnTime)} s` : '—'}</span>
        </div>

        {/* Component checklist */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pt-1.5" style={{ borderTop: '1px solid #1e1e35' }}>
          {([
            { label: 'Nose Cone', ok: hasNoseCone, req: true },
            { label: 'Engine',    ok: hasEngine,   req: true },
            { label: 'Fuel Tank', ok: hasFuel,     req: true },
            { label: 'Fins',      ok: hasFins,     req: false },
          ] as { label: string; ok: boolean; req: boolean }[]).map(({ label, ok, req }) => (
            <div key={label} className="flex items-center gap-1">
              <span className="text-[9px]" style={{ color: ok ? '#22c55e' : req ? '#ef4444' : '#475569' }}>
                {ok ? '●' : '○'}
              </span>
              <span className="text-[9px]" style={{ color: ok ? '#94a3b8' : req ? '#fca5a5' : '#475569' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <h3 className="text-[9px] uppercase tracking-widest text-[#64748b] mb-2">Override</h3>

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
        <select
          value={(overrides.propellant ?? derived.propellant ?? 'LOX/RP-1') as string}
          onChange={e => setOverrides({ ...overrides, propellant: e.target.value as PropellantType })}
          className="sum-input"
        >
          {['LOX/RP-1', 'LOX/LH2', 'UDMH/N2O4', 'Solid'].map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label className="text-[9px] text-[#64748b] block mb-0.5">Nose Cone</label>
        <select
          value={(overrides.noseCone ?? derived.noseCone ?? 'Ogive') as string}
          onChange={e => setOverrides({ ...overrides, noseCone: e.target.value as NoseConeType })}
          className="sum-input"
        >
          {['Ogive', 'Conical', 'Blunt'].map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <button
        onClick={onOpenScience}
        className="w-full text-xs text-[#7c3aed] hover:text-[#06b6d4] border border-[#1e1e35] hover:border-[#7c3aed]/50 py-1.5 rounded transition-colors"
        style={{ background: 'transparent' }}
      >
        🔬 How do rockets work?
      </button>
    </div>
  );
}
