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

export const MAX_Q_WARNING = 45000;   // ~45 kPa — Falcon 9 Max Q is ~35-50 kPa
export const MAX_Q_FATAL   = 110000;  // ~110 kPa — structural limit with safety margin