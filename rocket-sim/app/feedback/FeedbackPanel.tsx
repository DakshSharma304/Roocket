'use client';

import { useState } from 'react';
import { FeedbackItem, FeedbackSeverity } from './analyzer';
import { withGlossary } from '../glossary/autoWrap';

interface Props {
  items: FeedbackItem[];
}

const SEVERITY_ICON: Record<FeedbackSeverity, string> = {
  critical:  '🔴',
  warning:   '🟡',
  good:      '🟢',
  excellent: '⭐',
};

function MetricBadge({ label, value, target }: { label: string; value: string; target: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded text-xs border border-[#1e1e35] bg-[#0d0d1a]">
      <span className="text-[#94a3b8]">{withGlossary(label)}</span>
      <span className="text-[#e2e8f0] font-mono font-semibold">{value}</span>
      <span className="text-[#475569]">→</span>
      <span className="text-[#38bdf8] font-mono">{target}</span>
    </span>
  );
}

function FeedbackCard({ item }: { item: FeedbackItem }) {
  const isInference = item.id === 'inference';

  if (isInference) {
    return (
      <div className="rounded-md border border-indigo-800/60 bg-indigo-950/50 px-4 py-3">
        <p className="text-sm font-semibold text-indigo-300">{item.title}</p>
        <p className="mt-1 text-sm text-indigo-200/80">{withGlossary(item.explanation)}</p>
      </div>
    );
  }

  const icon = SEVERITY_ICON[item.severity];

  return (
    <div className="rounded-md border border-[#1e1e35] bg-[#0a0a12] px-4 py-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0 text-base leading-none" aria-hidden="true">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#e2e8f0]">{withGlossary(item.title)}</p>
          <p className="mt-0.5 text-sm text-[#94a3b8]">{withGlossary(item.explanation)}</p>
          {item.fix && (
            <p className="mt-1 text-sm text-cyan-400">
              → {withGlossary(item.fix)}
            </p>
          )}
          {item.metric && (
            <MetricBadge
              label={item.metric.label}
              value={item.metric.value}
              target={item.metric.target}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function FeedbackPanel({ items }: Props) {
  const [expanded, setExpanded] = useState(true);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-[#1e1e35] bg-[#0a0a12] px-5 py-4">
        <p className="text-sm text-[#94a3b8]">No issues detected — solid design.</p>
      </div>
    );
  }

  const mainItems = items.filter((i) => i.id !== 'inference');
  const inferenceItem = items.find((i) => i.id === 'inference');

  return (
    <div className="rounded-lg border border-[#1e1e35] bg-[#0a0a12] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-[#0d0d1a] transition-colors"
        aria-expanded={expanded}
      >
        <span className="text-xs font-bold tracking-widest text-[#e2e8f0] uppercase">
          Design Analysis
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 text-[#475569] transition-transform duration-200 ${
            expanded ? 'rotate-180' : 'rotate-0'
          }`}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {expanded && (
        <div className="flex flex-col gap-2 px-4 pb-4 pt-1">
          {mainItems.map((item) => (
            <FeedbackCard key={item.id} item={item} />
          ))}
          {inferenceItem && <FeedbackCard item={inferenceItem} />}
        </div>
      )}
    </div>
  );
}
