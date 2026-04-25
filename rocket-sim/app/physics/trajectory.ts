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

  // Guidance targets requested by user tuning.
  const TURN_START_SPEED = 100;    // m/s — begin gravity turn once clear of initial pad acceleration
  const INITIAL_TILT_DEG = 4;      // deg from vertical immediately after turn starts (2-5 deg target)
  const TURN_END_ALT = 40000;      // m — be close to horizon by this altitude
  const FINAL_PITCH_DEG = 5;       // deg above horizon (near-horizontal, not exactly zero)
  const MAX_Q_TARGET = 35000;      // Pa — keep ascent max-Q under ~35 kPa when guidance can do so
  const MAX_Q_BAND_MIN = 5000;     // m
  const MAX_Q_BAND_MAX = 12000;    // m
  const HIGH_TWR_THRESHOLD = 1.6;  // only apply active max-Q throttle shaping for punchy liftoff TWR
  const MIN_THROTTLE = 0.1;        // global lower bound to avoid engine cutoff artifacts
  const MIN_MAXQ_THROTTLE = 0.35;  // practical floor inside the 5-12 km max-Q control band

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
  let dvAccum = 0;          // actual Δv delivered: ∫(F_thrust / m) dt
  let turnStarted = false;
  let turnStartAltitude = 0;
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

    // Pitch program: angle from horizontal (90deg = vertical, 0deg = horizontal)
    if (!turnStarted && speed >= TURN_START_SPEED) {
      turnStarted = true;
      turnStartAltitude = altitude;
    }
    let pitchRad: number;
    if (!turnStarted) {
      pitchRad = Math.PI / 2;
    } else {
      const startPitch = ((90 - INITIAL_TILT_DEG) * Math.PI) / 180;
      const endPitch = (FINAL_PITCH_DEG * Math.PI) / 180;
      const turnSpan = Math.max(1, TURN_END_ALT - turnStartAltitude);
      const progress = Math.max(0, Math.min(1, (altitude - turnStartAltitude) / turnSpan));
      const eased = 1 - Math.pow(1 - progress, 1.6); // front-load pitch-over for a more aggressive turn
      pitchRad = startPitch + (endPitch - startPitch) * eased;
    }

    const isp = interpolatedIsp(propellant, altitude);
    let thrustX = 0;
    let thrustY = 0;
    let mdot = 0;
    if (burning && fuelRemaining > 0) {
      // Auto-throttle through max Q — mirrors real launch vehicle guidance.
      // Full thrust below warning threshold; taper aggressively as q rises.
      const qNow = dynamicPressure(altitude, speed);
      let throttle = 1.0;
      if (qNow > MAX_Q_WARNING) {
        const over = (qNow - MAX_Q_WARNING) / Math.max(MAX_Q_FATAL - MAX_Q_WARNING, 1);
        // Quadratic taper softens the onset and clamps hard near the structural limit.
        throttle = Math.max(MIN_THROTTLE, 1.0 - 0.9 * over * over);
      }
      const inMaxQControlBand = altitude >= MAX_Q_BAND_MIN && altitude <= MAX_Q_BAND_MAX;
      if (launchTWR >= HIGH_TWR_THRESHOLD && inMaxQControlBand && qNow > MAX_Q_TARGET) {
        // q scales with v^2; gently trim thrust in the 5-12 km band to stay near the target.
        const targetScale = Math.sqrt(MAX_Q_TARGET / qNow);
        throttle = Math.min(throttle, Math.max(MIN_MAXQ_THROTTLE, targetScale));
      }
      const effectiveThrust = thrustN * throttle;
      thrustX = effectiveThrust * Math.cos(pitchRad);
      thrustY = effectiveThrust * Math.sin(pitchRad);
      mdot = massFlowRate(effectiveThrust, isp);
      dvAccum += (effectiveThrust / mass) * dt;  // accumulate engine Δv each step
    }

    // Drag opposes velocity vector
    const dragX = speed > 0 ? -dragMag * (vx / speed) : 0;
    const dragY = speed > 0 ? -dragMag * (vy / speed) : 0;

    const accelX = (thrustX + dragX) / mass;
    const accelY = (thrustY + dragY - grav * mass) / mass;

    vx += accelX * dt;
    vy += accelY * dt;
    altitude += vy * dt;
    const updatedSpeed = Math.sqrt(vx * vx + vy * vy);

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
        burnoutV = updatedSpeed;
      }
    }

    const q = dynamicPressure(altitude, updatedSpeed);
    if (q > maxQPressure) {
      maxQPressure = q;
      maxQAlt = altitude;
      maxQVel = updatedSpeed;
    }

    if (altitude > maxAlt) maxAlt = altitude;
    if (updatedSpeed > maxVel) maxVel = updatedSpeed;

    if (!leoAchieved && altitude >= 200000 && vx >= 7800) leoAchieved = true;

    if (step % 4 === 0 || step < 20) {
      trajectory.push({ time: t, altitude, velocity: updatedSpeed, vx, mass, dynamicPressure: q });
    }

    // This simulator models ascent guidance only; stop at apogee instead of simulating reentry.
    // Otherwise descent can dominate Max-Q and make ascent feedback look physically wrong.
    if (!burning && vy < 0) break;

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

  // Δv = integral of (F_thrust / m) dt — actual engine contribution, independent of gravity/drag losses.
  // This correctly reflects Tsiolkovsky even with altitude-varying Isp and auto-throttle.
  const finalDeltaV = dvAccum;

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