import { atmosphereAt } from './atmosphere';

export interface MaxQResult {
  pressure: number;
  altitudeM: number;
  velocity: number;
  isFatal: boolean;
  isWarning: boolean;
}

export function dynamicPressure(altitudeM: number, velocityMs: number): number {
  const { density } = atmosphereAt(altitudeM);
  return 0.5 * density * velocityMs * velocityMs;
}

export const MAX_Q_WARNING = 30000;
export const MAX_Q_FATAL   = 80000;