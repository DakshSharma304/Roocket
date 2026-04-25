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
  velocity: number;  // total speed magnitude
  vx: number;        // horizontal (orbital) velocity
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
  // 2D state: vx = horizontal (orbital), vy = vertical
  let vx = 0;
  let vy = 0;
  let altitude = 0;
  const dt = 0.5;
  const maxSteps = 4000;

  // Gravity turn pitch program: launch vertical, pitch to horizontal by 120km
  const KICK_ALT = 3000;        // m — start pitching here (clear dense lower troposphere first)
  const PITCH_END_ALT = 120000; // m — fully horizontal by here

  const launchTWR = calcTwr(thrustN, mass);

  if (launchTWR < 1.0) {
    return {
      trajectory: [{ time: 0, altitude: 0, velocity: 0, vx: 0, mass, dynamicPressure: 0 }],
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
  let burnoutVx = 0;
  let burnoutV = 0;
  let maxAlt = 0;
  let maxVel = 0;
  let maxQPressure = 0;
  let maxQAlt = 0;
  let maxQVel = 0;
  let disintegrated = false;
  let disintegrationAlt: number | undefined;
  let leoAchieved = false;
  const trajectory: TrajectoryPoint[] = [];

  for (let step = 0; step < maxSteps; step++) {
    const t = step * dt;
    const { density } = atmosphereAt(altitude);
    const sos = speedOfSound(altitude);
    const speed = Math.sqrt(vx * vx + vy * vy);
    const mach = speed / Math.max(sos, 1);
    const cd = dragCoeff(noseCone, mach);
    const dragMag = 0.5 * density * speed * speed * cd * area;
    const grav = G0 * (R_EARTH / (R_EARTH + altitude)) ** 2;

    // Pitch program: angle from horizontal (90° = vertical, 0° = horizontal)
    let pitchRad: number;
    if (altitude <= KICK_ALT) {
      pitchRad = Math.PI / 2;
    } else if (altitude >= PITCH_END_ALT) {
      pitchRad = 0;
    } else {
      pitchRad = (Math.PI / 2) * (1 - (altitude - KICK_ALT) / (PITCH_END_ALT - KICK_ALT));
    }

    const isp = interpolatedIsp(propellant, altitude);
    let thrustX = 0;
    let thrustY = 0;
    let mdot = 0;
    if (burning && fuelRemaining > 0) {
      // Auto-throttle through max Q — mirrors real launch vehicle guidance.
      // Full thrust below warning threshold; linearly taper to 20% at fatal limit.
      const qNow = dynamicPressure(altitude, speed);
      const throttle = qNow <= MAX_Q_WARNING ? 1.0
        : Math.max(0.2, 1.0 - 0.8 * (qNow - MAX_Q_WARNING) / (MAX_Q_FATAL - MAX_Q_WARNING));
      const effectiveThrust = thrustN * throttle;
      thrustX = effectiveThrust * Math.cos(pitchRad);
      thrustY = effectiveThrust * Math.sin(pitchRad);
      mdot = massFlowRate(effectiveThrust, isp);
    }

    // Drag opposes velocity vector
    const dragX = speed > 0 ? -dragMag * (vx / speed) : 0;
    const dragY = speed > 0 ? -dragMag * (vy / speed) : 0;

    const accelX = (thrustX + dragX) / mass;
    const accelY = (thrustY + dragY - grav * mass) / mass;

    vx += accelX * dt;
    vy += accelY * dt;
    altitude += vy * dt;

    if (burning && fuelRemaining > 0) {
      const consumed = mdot * dt;
      fuelRemaining -= consumed;
      mass -= consumed;
      burnTime += dt;
      if (fuelRemaining <= 0) {
        fuelRemaining = 0;
        burning = false;
        burnoutAlt = altitude;
        burnoutVx = vx;
        burnoutV = speed;
      }
    }

    const q = dynamicPressure(altitude, speed);
    if (q > maxQPressure) {
      maxQPressure = q;
      maxQAlt = altitude;
      maxQVel = speed;
    }

    if (altitude > maxAlt) maxAlt = altitude;
    if (speed > maxVel) maxVel = speed;

    if (!leoAchieved && altitude >= 200000 && vx >= 7800) leoAchieved = true;

    if (step % 4 === 0 || step < 20) {
      trajectory.push({ time: t, altitude, velocity: speed, vx, mass, dynamicPressure: q });
    }

    if (q > MAX_Q_FATAL) {
      disintegrated = true;
      disintegrationAlt = altitude;
      break;
    }

    if (altitude < 0 && step > 0) break;
    if (leoAchieved && !burning) break;
  }

  if (!burning) {
    burnoutAlt = burnoutAlt || altitude;
    burnoutV = burnoutV || Math.sqrt(vx * vx + vy * vy);
    burnoutVx = burnoutVx || vx;
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
  } else if (leoAchieved || (burnoutAlt >= 200000 && burnoutVx >= 7800)) {
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
    burnoutVelocityMs: burnoutVx || burnoutV,  // horizontal velocity for orbital context
    burnTimeS: burnTime,
    maxQ,
    finalDeltaV,
    launchTWR,
    outcome,
    disintegrationAlt,
  };
}