'use client';
import { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import type { GlossaryTerm } from './terms';

interface TooltipProps {
  term: GlossaryTerm;
  anchorRef: React.RefObject<HTMLSpanElement | null>;
}

const TOOLTIP_WIDTH = 280;
const TOOLTIP_MIN_SPACE_ABOVE = 200;

export default function Tooltip({ term, anchorRef }: TooltipProps) {
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; placement: 'above' | 'below' }>({
    top: 0,
    left: 0,
    placement: 'above',
  });

  useEffect(() => {
    if (!anchorRef.current) return;

    const rect = anchorRef.current.getBoundingClientRect();
    const spaceAbove = rect.top + window.scrollY;
    const placement: 'above' | 'below' = spaceAbove < TOOLTIP_MIN_SPACE_ABOVE ? 'below' : 'above';

    // Center tooltip on anchor, clamped to viewport
    const rawLeft = rect.left + window.scrollX + rect.width / 2 - TOOLTIP_WIDTH / 2;
    const maxLeft = window.innerWidth - TOOLTIP_WIDTH - 8;
    const clampedLeft = Math.max(8, Math.min(rawLeft, maxLeft));

    const top =
      placement === 'above'
        ? rect.top + window.scrollY - 8 // 8px gap; translateY(-100%) handles the rest
        : rect.bottom + window.scrollY + 8;

    setPos({ top, left: clampedLeft, placement });
    // Trigger fade-in on next frame
    requestAnimationFrame(() => setMounted(true));
  }, [anchorRef]);

  const categoryColor: Record<GlossaryTerm['category'], string> = {
    propulsion: '#7c3aed',
    aerodynamics: '#06b6d4',
    orbital: '#22c55e',
    structural: '#f59e0b',
    general: '#64748b',
  };

  const tooltipNode = (
    <div
      role="tooltip"
      style={{
        position: 'absolute',
        top: pos.top,
        left: pos.left,
        width: TOOLTIP_WIDTH,
        transform: pos.placement === 'above' ? 'translateY(-100%)' : 'none',
        zIndex: 9999,
        pointerEvents: 'none',
        opacity: mounted ? 1 : 0,
        transition: 'opacity 150ms ease',
        background: 'rgba(13,13,26,0.97)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(124,58,237,0.3)',
        boxShadow:
          '0 0 30px rgba(124,58,237,0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
        padding: 12,
        borderRadius: 8,
      }}
    >
      {/* Term name */}
      <span
        style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: 700,
          color: '#e2e8f0',
        }}
      >
        {term.term}
      </span>

      {/* Divider */}
      <div
        style={{
          borderTop: '1px solid rgba(124,58,237,0.2)',
          marginTop: 8,
          marginBottom: 8,
        }}
      />

      {/* Short definition */}
      <span
        style={{
          display: 'block',
          fontSize: '0.75rem',
          color: '#94a3b8',
          lineHeight: 1.625,
        }}
      >
        {term.short}
      </span>

      {/* Equation */}
      {term.equation !== undefined && (
        <code
          style={{
            display: 'block',
            fontFamily: 'monospace',
            color: '#06b6d4',
            fontSize: '0.75rem',
            background: '#0a0a0f',
            padding: '4px 8px',
            borderRadius: 4,
            marginTop: 8,
          }}
        >
          {term.equation}
        </code>
      )}

      {/* Real world */}
      {term.realWorld !== undefined && (
        <span
          style={{
            display: 'block',
            fontSize: '0.625rem',
            color: '#64748b',
            fontStyle: 'italic',
            marginTop: 8,
          }}
        >
          {term.realWorld}
        </span>
      )}

      {/* Category badge */}
      <span
        style={{
          display: 'inline-block',
          marginTop: 10,
          fontSize: '0.5625rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          padding: '2px 6px',
          borderRadius: 4,
          background: '#1e1e35',
          color: categoryColor[term.category],
        }}
      >
        {term.category}
      </span>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return ReactDOM.createPortal(tooltipNode, document.body);
}
