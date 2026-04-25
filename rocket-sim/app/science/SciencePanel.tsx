'use client';

import { useState } from 'react';
import { getScienceFor } from './content';
import type { ScienceSection } from './content';

interface Props {
  selectedPartId: string | null;
  onClose: () => void;
}

function SectionRow({ section }: { section: ScienceSection }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[#1e1e35]/60 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[#0d0d1a] transition-colors"
        aria-expanded={open}
      >
        <span className="text-xs font-semibold text-[#e2e8f0] pr-2">{section.title}</span>
        <span
          className="text-[#475569] text-xs flex-shrink-0 transition-transform duration-200"
          style={{ display: 'inline-block', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
          aria-hidden="true"
        >
          ▶
        </span>
      </button>

      <div
        className="overflow-hidden transition-all duration-200"
        style={{ maxHeight: open ? '600px' : '0px', opacity: open ? 1 : 0 }}
      >
        <div className="px-4 pb-4 flex flex-col gap-2.5">
          <p className="text-xs text-[#94a3b8] leading-relaxed">{section.body}</p>

          {section.equation && (
            <code className="block font-mono text-[#06b6d4] bg-[#040408] px-3 py-2 rounded text-xs">
              {section.equation}
            </code>
          )}

          {section.tradeoff && (
            <p className="text-xs text-amber-400/90 leading-relaxed">
              ⚖️ {section.tradeoff}
            </p>
          )}

          {section.realExample && (
            <p className="text-xs text-[#64748b] leading-relaxed">
              🚀 {section.realExample}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SciencePanel({ selectedPartId, onClose }: Props) {
  const content = getScienceFor(selectedPartId ?? '');

  if (!content) return null;

  return (
    <div className="bg-[#0a0a12] border-l border-[#1e1e35] w-72 flex flex-col h-full overflow-y-auto flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e35]">
        <span className="text-xs font-bold tracking-widest text-[#e2e8f0] uppercase">
          🔬 THE SCIENCE
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-[#475569] hover:text-[#e2e8f0] transition-colors text-base leading-none"
          aria-label="Close science panel"
        >
          ×
        </button>
      </div>

      {/* Headline */}
      <div className="px-4 py-4 border-b border-[#1e1e35]">
        <h2
          className="text-sm font-bold"
          style={{
            background: 'linear-gradient(to right, #a855f7, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {content.headline}
        </h2>
      </div>

      {/* Sections */}
      <div className="flex-1">
        {content.sections.map((section) => (
          <SectionRow key={section.title} section={section} />
        ))}
      </div>

      {/* Did You Know */}
      <div className="px-4 py-4">
        <div className="bg-[#12121e] border border-[#1e1e35]/50 rounded p-3">
          <p className="text-[10px] font-bold tracking-widest text-[#7c3aed] uppercase mb-1.5">
            💫 DID YOU KNOW?
          </p>
          <p className="text-xs italic text-[#94a3b8] leading-relaxed">
            {content.didYouKnow}
          </p>
        </div>
      </div>
    </div>
  );
}
