'use client';
import { useRef, useState, useCallback } from 'react';
import { findTerm } from './terms';
import Tooltip from './Tooltip';

interface Props {
  word: string;
  children: React.ReactNode;
}

export default function GlossaryTerm({ word, children }: Props) {
  const entry = findTerm(word);
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(true), 150);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  }, []);

  // No match — render children plain
  if (!entry) {
    return <>{children}</>;
  }

  return (
    <span
      ref={wrapperRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
        display: 'inline',
        cursor: 'help',
        borderBottom: '1px dotted rgba(124,58,237,0.6)',
        pointerEvents: 'auto',
      }}
    >
      {children}
      {visible && <Tooltip term={entry} anchorRef={wrapperRef} />}
    </span>
  );
}
