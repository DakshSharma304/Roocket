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

// Keep units in Pa internally; UI converts to kPa for display.
export const MAX_Q_WARNING = 35000;  // 35 kPa caution band (typical modern launchers)
export const MAX_Q_FATAL   = 90000;  // 90 kPa structural failure envelope for this sim
