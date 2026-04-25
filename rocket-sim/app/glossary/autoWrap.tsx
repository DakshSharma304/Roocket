'use client';
import React from 'react';
import GlossaryTerm from './GlossaryTerm';
import { GLOSSARY } from './terms';

const termMap = new Map<string, string>();
for (const entry of GLOSSARY) {
  termMap.set(entry.term.toLowerCase(), entry.term);
  for (const alias of entry.aliases) {
    termMap.set(alias.toLowerCase(), entry.term);
  }
}

const sortedKeys = Array.from(termMap.keys()).sort((a, b) => b.length - a.length);
const escapedKeys = sortedKeys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const PATTERN = new RegExp(`(${escapedKeys.join('|')})`, 'gi');

export function withGlossary(text: string): React.ReactNode {
  if (!text) return text;
  const parts = text.split(PATTERN);
  const seen = new Set<string>();

  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return part || null;
        const canonical = termMap.get(part.toLowerCase());
        if (!canonical || seen.has(canonical)) return part;
        seen.add(canonical);
        return <GlossaryTerm key={i} word={canonical}>{part}</GlossaryTerm>;
      })}
    </>
  );
}
