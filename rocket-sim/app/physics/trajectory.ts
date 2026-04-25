import { atmosphereAt, speedOfSound, G0, R_EARTH } from './atmosphere';
import { interpolatedIsp, twr as calcTwr, massFlowRate } from './propulsion';
import { dynamicPressure, MAX_Q_WARNING, MAX_Q_FATAL } from './maxq';
import type { PropellantType } from './propulsion';

export type NoseConeType = 'Ogive' | 'Conical' | 'Blunt';

export interface RocketInputs {
  payloadMass: number;
  fuelMass: number;
  dryMass: number;
  thrustKN: number;
  diameter: number;
  propellant: PropellantType;
  noseCone: NoseConeType;
}

export interface TrajectoryPoint {
  time: number;
  altitude: number;
  velocity: number;
  mass: number;
  dynamicPressure: number;
}

export interface SimResult {
  trajectory: TrajectoryPoint[];
  maxAltitudeM: number;
  maxVelocityMs: number;
  burnoutAltitudeM: number;
  burnoutVelocityMs: number;
  burnTimeS: number;
  maxQ: { pressure: number; altitudeM: number; velocity: number };
  finalDeltaV: number;
  launchTWR: number;
  outcome: 'LEO' | 'SUBORBITAL' | 'PAD_SITTER' | 'DISINTEGRATED' | 'NO_SPACE';
  disintegrationAlt?: number;
}

function dragCoeff(noseCone: NoseConeType, mach: number): number {
  type CdSpec = [number, number, number];
  const specs: Record<NoseConeType, CdSpec> = {
    Ogive:   [0.15, 0.25, 0.20],
    Conical: [0.20, 0.35, 0.25],
    Blunt:   [0.40, 0.55, 0.45],
  };
  const [cdSub, cdTrans, cdSuper] = specs[noseCone];
  if (mach < 0.8) return cdSub;
  if (mach > 1.2) return cdSuper;
  const t = (mach - 0.8) / 0.4;
  if (mach <= 1.0) return cdSub + t * (cdTrans - cdSub);
  return cdTrans + ((mach - 1.0) / 0.2) * (cdSuper - cdTrans);
}

export function runSimulation(inputs: RocketInputs): SimResult {
  const { payloadMass, fuelMass, dryMass, thrustKN, diameter, propellant, noseCone } = inputs;
  const thrustN = thrustKN * 1000;
  const area = Math.PI * (diameter / 2) ** 2;

  let mass = dryMass + payloadMass + fuelMass;
  let velocity = 0;
  let altitude = 0;
  const dt = 0.5;
  const maxSteps = 4000;

  const launchTWR = calcTwr(thrustN, mass);

  if (launchTWR < 1.0) {
    return {
      trajectory: [{ time: 0, altitude: 0, velocity: 0, mass, dynamicPressure: 0 }],
      maxAltitudeM: 0,
      maxVelocityMs: 0,
      burnoutAltitudeM: 0,
      burnoutVelocityMs: 0,
      burnTimeS: 0,
      maxQ: { pressure: 0, altitudeM: 0, velocity: 0 },
      finalDeltaV: 0,
      launchTWR,
      outcome: 'PAD_SITTER',
    };
  }

  let fuelRemaining = fuelMass;
  let burning = true;
  let burnTime = 0;
  let burnoutAlt = 0;
  let burnoutV = 0;
  let maxAlt = 0;
  let maxVel = 0;
  let maxQPressure = 0;
  let maxQAlt = 0;
  let maxQVel = 0;
  let disintegrated = false;
  let disintegrationAlt: number | undefined;
  const trajectory: TrajectoryPoint[] = [];

  for (let step = 0; step < maxSteps; step++) {
    const t = step * dt;
    const { density } = atmosphereAt(altitude);
    const sos = speedOfSound(altitude);
    const mach = velocity / Math.max(sos, 1);
    const cd = dragCoeff(noseCone, mach);
    const drag = 0.5 * density * velocity * velocity * cd * area;
    const grav = G0 * (R_EARTH / (R_EARTH + altitude)) ** 2;

    const isp = interpolatedIsp(propellant, altitude);
    let thrust = 0;
    let mdot = 0;
    if (burning && fuelRemaining > 0) {
      thrust = thrustN;
      mdot = massFlowRate(thrust, isp);
    }

    const netForce = thrust - drag - grav * mass;
    const accel = netForce / mass;
    velocity += accel * dt;
    altitude += velocity * dt;

    if (burning && fuelRemaining > 0) {
      const consumed = mdot * dt;
      fuelRemaining -= consumed;
      mass -= consumed;
      burnTime += dt;
      if (fuelRemaining <= 0) {
        fuelRemaining = 0;
        burning = false;
        burnoutAlt = altitude;
        burnoutV = velocity;
      }
    }

    const q = dynamicPressure(altitude, Math.abs(velocity));
    if (q > maxQPressure) {
      maxQPressure = q;
      maxQAlt = altitude;
      maxQVel = velocity;
    }

    if (altitude > maxAlt) maxAlt = altitude;
    if (velocity > maxVel) maxVel = velocity;

    if (step % 4 === 0 || step < 20) {
      trajectory.push({ time: t, altitude, velocity, mass, dynamicPressure: q });
    }

    if (q > MAX_Q_FATAL) {
      disintegrated = true;
      disintegrationAlt = altitude;
      break;
    }

    if (altitude < 0 && step > 0) break;
  }

  if (!burning) {
    burnoutAlt = burnoutAlt || altitude;
    burnoutV = burnoutV || velocity;
  }

  const maxQ = { pressure: maxQPressure, altitudeM: maxQAlt, velocity: maxQVel };

  const avgAlt = maxAlt / 2;
  const isp = interpolatedIsp(propellant, avgAlt);
  const m0 = dryMass + payloadMass + fuelMass;
  const m1 = dryMass + payloadMass;
  const finalDeltaV = isp * G0 * Math.log(m0 / m1);

  let outcome: SimResult['outcome'];
  if (disintegrated) {
    outcome = 'DISINTEGRATED';
  } else if (launchTWR < 1.0) {
    outcome = 'PAD_SITTER';
  } else if (burnoutAlt >= 200000 && burnoutV >= 7800) {
    outcome = 'LEO';
  } else if (maxAlt >= 100000) {
    outcome = 'SUBORBITAL';
  } else {
    outcome = 'NO_SPACE';
  }

  return {
    trajectory,
    maxAltitudeM: maxAlt,
    maxVelocityMs: maxVel,
    burnoutAltitudeM: burnoutAlt,
    burnoutVelocityMs: burnoutV,
    burnTimeS: burnTime,
    maxQ,
    finalDeltaV,
    launchTWR,
    outcome,
    disintegrationAlt,
  };
}