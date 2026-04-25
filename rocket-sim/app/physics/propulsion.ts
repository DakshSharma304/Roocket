import { G0 } from './atmosphere';

export type PropellantType = 'LOX/RP-1' | 'LOX/LH2' | 'UDMH/N2O4' | 'Solid';

interface PropellantSpec {
  ispSL: number;
  ispVac: number;
  structuralFraction: number;
}

export const PROPELLANTS: Record<PropellantType, PropellantSpec> = {
  'LOX/RP-1':   { ispSL: 282, ispVac: 311, structuralFraction: 0.06 },
  'LOX/LH2':    { ispSL: 381, ispVac: 451, structuralFraction: 0.08 },
  'UDMH/N2O4':  { ispSL: 290, ispVac: 324, structuralFraction: 0.07 },
  'Solid':      { ispSL: 230, ispVac: 250, structuralFraction: 0.10 },
};

export function interpolatedIsp(propellant: PropellantType, altitudeM: number): number {
  const spec = PROPELLANTS[propellant];
  const blendTop = 80000;
  const t = Math.min(1, Math.max(0, altitudeM / blendTop));
  return spec.ispSL + t * (spec.ispVac - spec.ispSL);
}

export function deltaV(
  propellant: PropellantType,
  fuelMassKg: number,
  dryMassKg: number,
  payloadMassKg: number,
  avgAltitudeM = 40000
): number {
  const isp = interpolatedIsp(propellant, avgAltitudeM);
  const m0 = dryMassKg + payloadMassKg + fuelMassKg;
  const m1 = dryMassKg + payloadMassKg;
  if (m1 <= 0 || m0 <= m1) return 0;
  return isp * G0 * Math.log(m0 / m1);
}

export function twr(thrustN: number, totalMassKg: number): number {
  return thrustN / (totalMassKg * G0);
}

export function massFlowRate(thrustN: number, ispSL: number): number {
  return thrustN / (ispSL * G0);
}