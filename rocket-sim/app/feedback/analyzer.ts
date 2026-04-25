import type { SimResult, RocketInputs } from '../physics/trajectory';
import { MAX_Q_WARNING, MAX_Q_FATAL } from '../physics/maxq';
import { G0 } from '../physics/atmosphere';
import { PROPELLANTS } from '../physics/propulsion';

export type FeedbackSeverity = 'critical' | 'warning' | 'good' | 'excellent';

export interface FeedbackItem {
  id: string;
  severity: FeedbackSeverity;
  category: 'propulsion' | 'structure' | 'aerodynamics' | 'trajectory' | 'mission';
  title: string;
  explanation: string;
  scienceWhy: string;
  fix?: string;
  metric?: { label: string; value: string; target: string };
}

const SEVERITY_ORDER: Record<FeedbackSeverity, number> = {
  critical:  0,
  warning:   1,
  good:      2,
  excellent: 3,
};

export function analyzeDesign(result: SimResult, inputs: RocketInputs): FeedbackItem[] {
  const items: FeedbackItem[] = [];

  const {
    maxQ,
    finalDeltaV,
    burnoutAltitudeM,
    burnoutVelocityMs,
    burnTimeS,
    maxVelocityMs,
    maxAltitudeM,
    outcome,
    launchTWR,
  } = result;

  const { fuelMass, dryMass, payloadMass, thrustKN, propellant, noseCone } = inputs;

  const thrustN = thrustKN * 1000;
  const totalMass = dryMass + payloadMass + fuelMass;

  // ─── PROPULSION ───────────────────────────────────────────────────────────

  if (launchTWR < 1.0) {
    const minThrustKN = Math.ceil((totalMass * G0) / 1000);
    const massToRemove = Math.floor(totalMass - thrustN / G0);
    items.push({
      id: 'twr-critical',
      severity: 'critical',
      category: 'propulsion',
      title: 'Thrust insufficient to lift off',
      explanation: `Launch TWR is ${launchTWR.toFixed(2)} — the rocket cannot overcome gravity.`,
      scienceWhy:
        'Thrust-to-weight ratio must exceed 1.0 at liftoff for any vertical acceleration. Below 1.0 the net force is downward regardless of fuel burned.',
      fix: `Increase thrust to at least ${minThrustKN}kN, or reduce total mass by ${massToRemove}kg`,
      metric: {
        label: 'TWR',
        value: launchTWR.toFixed(2),
        target: '1.5',
      },
    });
  } else if (launchTWR <= 1.3) {
    items.push({
      id: 'twr-warning',
      severity: 'warning',
      category: 'propulsion',
      title: 'Marginal TWR — slow ascent, high gravity losses',
      explanation: `Launch TWR of ${launchTWR.toFixed(2)} means the rocket accelerates slowly through the lower atmosphere, wasting delta-v fighting gravity.`,
      scienceWhy:
        'Gravity losses accumulate proportionally to time spent at low velocity. A TWR between 1.0 and 1.3 can lose hundreds of m/s to gravity drag.',
      fix: 'Aim for TWR > 1.5 for efficient ascent',
      metric: {
        label: 'TWR',
        value: launchTWR.toFixed(2),
        target: '1.5',
      },
    });
  } else if (launchTWR > 2.5) {
    items.push({
      id: 'twr-excessive',
      severity: 'warning',
      category: 'propulsion',
      title: 'Excessive TWR — structural stress, wasted performance',
      explanation: `Launch TWR of ${launchTWR.toFixed(2)} subjects the airframe to high acceleration loads and peaks dynamic pressure early in ascent.`,
      scienceWhy:
        'Very high TWR creates intense aerodynamic and structural loads during max-Q, and the extra engine mass reduces the mass ratio without proportional delta-v gain.',
      metric: {
        label: 'TWR',
        value: launchTWR.toFixed(2),
        target: '1.5–2.5',
      },
    });
  }

  // Delta-V checks
  const orbitalVelocity = 7800;
  const dvRatio = finalDeltaV / orbitalVelocity;

  if (dvRatio >= 0.95 && dvRatio < 1.0) {
    const diff = Math.ceil(orbitalVelocity - finalDeltaV);
    items.push({
      id: 'dv-close',
      severity: 'warning',
      category: 'propulsion',
      title: `Almost made it — ${diff}m/s short of orbital velocity`,
      explanation: `Delta-v budget reaches ${finalDeltaV.toFixed(0)}m/s, just ${diff}m/s below the 7800m/s needed for LEO.`,
      scienceWhy:
        'Orbital insertion requires continuous velocity — falling even slightly short means a ballistic trajectory rather than a stable orbit.',
      fix: `Add more propellant or reduce payload to recover the final ${diff}m/s`,
    });
  } else if (dvRatio >= 1.05) {
    const pct = ((dvRatio - 1) * 100).toFixed(1);
    items.push({
      id: 'dv-good',
      severity: 'good',
      category: 'propulsion',
      title: `Delta-v margin of ${pct}% — solid propellant budget`,
      explanation: `The rocket has ${finalDeltaV.toFixed(0)}m/s of delta-v, exceeding the 7800m/s orbital target by ${pct}%.`,
      scienceWhy:
        'A delta-v margin above the theoretical minimum accounts for gravity and drag losses during ascent, improving mission reliability.',
    });
  }
  // dvRatio < 0.5: no delta-v warning — covered by mission checks

  // ISP / propellant check
  if (propellant === 'Solid' && thrustKN > 0) {
    items.push({
      id: 'isp-solid',
      severity: 'warning',
      category: 'propulsion',
      title: 'Low specific impulse — solid propellant limits performance',
      explanation: `Solid propellants have an Isp of ~${PROPELLANTS['Solid'].ispSL}s (SL) vs ~${PROPELLANTS['LOX/RP-1'].ispSL}s for LOX/RP-1, reducing total delta-v.`,
      scienceWhy:
        'Isp directly multiplies the logarithmic delta-v term in the Tsiolkovsky equation — a higher Isp produces more velocity from the same propellant mass.',
      fix: 'Consider higher-energy propellant like LOX/RP-1',
    });
  }

  // ─── STRUCTURE ────────────────────────────────────────────────────────────

  const massRatio = fuelMass / dryMass;

  if (massRatio > 20) {
    items.push({
      id: 'mass-ratio-critical',
      severity: 'critical',
      category: 'structure',
      title: 'Structural mass fraction unrealistic — rocket would collapse',
      explanation: `Fuel-to-dry-mass ratio of ${massRatio.toFixed(1)} far exceeds what real structures can support. The airframe would buckle under propellant weight.`,
      scienceWhy:
        'Even the most optimised orbital vehicles achieve ratios around 15–17:1. Exceeding 20:1 requires materials and engineering beyond current technology.',
    });
  } else if (massRatio < 3) {
    items.push({
      id: 'mass-ratio-low',
      severity: 'warning',
      category: 'structure',
      title: 'Very heavy structure relative to fuel — poor mass ratio',
      explanation: `Fuel-to-dry-mass ratio of ${massRatio.toFixed(1)} means the rocket carries proportionally too much inert mass.`,
      scienceWhy:
        'Tsiolkovsky punishes low mass ratios exponentially — the delta-v equation uses ln(m0/m1), so a low ratio compresses the logarithm and drastically reduces achievable velocity.',
    });
  }

  const payloadFraction = payloadMass / totalMass;
  if (payloadFraction > 0.1) {
    items.push({
      id: 'payload-heavy',
      severity: 'warning',
      category: 'structure',
      title: 'Heavy payload fraction',
      explanation: `Payload is ${(payloadFraction * 100).toFixed(1)}% of total mass (${payloadMass}kg of ${totalMass}kg). Typical LEO payload fractions are 1–4%.`,
      scienceWhy:
        'Payload sits above the propellant in the mass ratio denominator (m1). Increasing payload directly reduces the mass ratio and the achievable delta-v.',
    });
  }

  if (dryMass < 500) {
    items.push({
      id: 'dry-mass-low',
      severity: 'warning',
      category: 'structure',
      title: 'Suspiciously light dry mass — real rockets have minimum structural mass',
      explanation: `Dry mass of ${dryMass}kg seems unrealistically low for a vehicle carrying this much propellant and payload.`,
      scienceWhy:
        'Tanks, plumbing, engines, avionics, and airframe all contribute dry mass. Underestimating it produces an over-optimistic simulation.',
    });
  }

  // ─── AERODYNAMICS ─────────────────────────────────────────────────────────

  if (maxQ.pressure > MAX_Q_FATAL) {
    items.push({
      id: 'maxq-fatal',
      severity: 'critical',
      category: 'aerodynamics',
      title: 'Dynamic pressure exceeds structural limits',
      explanation: `Peak dynamic pressure reached ${(maxQ.pressure / 1000).toFixed(1)}kPa at ${(maxQ.altitudeM / 1000).toFixed(1)}km — above the fatal threshold of ${(MAX_Q_FATAL / 1000).toFixed(0)}kPa.`,
      scienceWhy:
        'Dynamic pressure (q = ½ρv²) determines aerodynamic loads on the airframe. Above the structural limit, the vehicle will disintegrate.',
    });
  } else if (maxQ.pressure > MAX_Q_WARNING) {
    items.push({
      id: 'maxq-warning',
      severity: 'warning',
      category: 'aerodynamics',
      title: 'High dynamic pressure — borderline structural integrity',
      explanation: `Peak dynamic pressure of ${(maxQ.pressure / 1000).toFixed(1)}kPa at ${(maxQ.altitudeM / 1000).toFixed(1)}km exceeds the caution threshold of ${(MAX_Q_WARNING / 1000).toFixed(0)}kPa.`,
      scienceWhy:
        'Real vehicles throttle engines during max-Q to reduce aerodynamic stress. Sustained high q causes fatigue and can trigger structural failure.',
    });
  }

  if (noseCone === 'Blunt' && maxVelocityMs > 500) {
    items.push({
      id: 'nose-blunt',
      severity: 'warning',
      category: 'aerodynamics',
      title: 'Blunt nose cone creates excessive drag at supersonic speeds',
      explanation: `Peak velocity of ${maxVelocityMs.toFixed(0)}m/s is well into the supersonic regime where a blunt nose produces a strong bow shock and high wave drag.`,
      scienceWhy:
        'A blunt body in supersonic flow generates a detached bow shock. The pressure drag coefficient rises steeply, consuming delta-v as heat and acoustic energy.',
      fix: 'Switch to ogive nose cone',
    });
  }

  if (noseCone === 'Ogive' && maxVelocityMs > 300) {
    items.push({
      id: 'nose-ogive-good',
      severity: 'good',
      category: 'aerodynamics',
      title: 'Nose cone geometry appropriate for flight regime',
      explanation: `The ogive nose cone maintains attached flow well into the supersonic regime, keeping drag near its minimum for this velocity profile.`,
      scienceWhy:
        'Ogive profiles smoothly accelerate flow around the tip, delaying boundary-layer separation and minimising wave drag coefficient across subsonic and supersonic speeds.',
    });
  }

  // ─── TRAJECTORY ───────────────────────────────────────────────────────────

  if (burnoutAltitudeM < 50000 && burnTimeS > 0) {
    items.push({
      id: 'burnout-low',
      severity: 'warning',
      category: 'trajectory',
      title: 'Engine burns out in dense atmosphere — high drag losses',
      explanation: `Burnout at ${(burnoutAltitudeM / 1000).toFixed(1)}km means the engine consumes propellant where atmospheric drag is still significant.`,
      scienceWhy:
        'Air density below 50km is high enough to impose meaningful drag losses throughout the burn. Staging or higher thrust would push burnout to a lower-density altitude.',
    });
  }

  if (burnoutAltitudeM >= 80000) {
    items.push({
      id: 'burnout-vacuum',
      severity: 'good',
      category: 'trajectory',
      title: 'Burnout in near-vacuum — minimal drag losses',
      explanation: `Engine cutoff at ${(burnoutAltitudeM / 1000).toFixed(0)}km places burnout above 99% of the atmosphere, maximising propulsive efficiency.`,
      scienceWhy:
        'Above ~80km atmospheric density is negligible. Drag losses during the burn approach zero and vacuum Isp is fully realised.',
    });
  }

  if (outcome === 'NO_SPACE') {
    const peakKm = (maxAltitudeM / 1000).toFixed(1);
    items.push({
      id: 'no-space',
      severity: 'critical',
      category: 'trajectory',
      title: `Did not reach space — peak altitude ${peakKm}km`,
      explanation: `Maximum altitude of ${peakKm}km falls short of the Kármán line at 100km.`,
      scienceWhy:
        'Reaching space requires enough delta-v to overcome both gravity and drag to 100km. Insufficient thrust, too little propellant, or excessive drag can all prevent space access.',
    });
  }

  if (outcome === 'LEO') {
    items.push({
      id: 'leo-trajectory',
      severity: 'excellent',
      category: 'trajectory',
      title: `Achieved orbital insertion velocity at ${burnoutVelocityMs.toFixed(0)}m/s`,
      explanation: `Burnout velocity of ${burnoutVelocityMs.toFixed(0)}m/s at ${(burnoutAltitudeM / 1000).toFixed(0)}km satisfies the LEO insertion condition (≥7800m/s above 200km).`,
      scienceWhy:
        'LEO requires horizontal velocity high enough that the curvature of the Earth matches the arc of free-fall. At 7.8km/s the rocket is in continuous free-fall around the planet.',
    });
  }

  // ─── MISSION ──────────────────────────────────────────────────────────────

  if (outcome === 'SUBORBITAL' && finalDeltaV > 5000) {
    items.push({
      id: 'mission-suborbital',
      severity: 'good',
      category: 'mission',
      title: 'Reached space — suborbital trajectory achieved',
      explanation: `The vehicle crossed the Kármán line and achieved a suborbital trajectory with ${finalDeltaV.toFixed(0)}m/s of total delta-v.`,
      scienceWhy:
        'A suborbital trajectory passes through space but re-enters before completing an orbit. It proves the propulsion system can overcome gravity and atmospheric drag to reach space.',
    });
  }

  if (outcome === 'LEO') {
    items.push({
      id: 'mission-leo',
      severity: 'excellent',
      category: 'mission',
      title: 'Mission success — LEO insertion confirmed',
      explanation: `All mission criteria met: burnout above 200km, velocity ≥7800m/s, stable orbit achieved.`,
      scienceWhy:
        'LEO insertion is the primary goal for most orbital missions. The payload is now in a stable Keplerian orbit and can perform on-orbit operations.',
    });
  }

  // ─── INFERENCE ────────────────────────────────────────────────────────────

  // Sort non-inference items first so we can identify the most impactful fix
  items.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  const anchor = items.find((i) => i.severity === 'critical') ?? items.find((i) => i.severity === 'warning');

  let inferenceBody: string;
  if (anchor) {
    let nextMilestone: string;
    if (outcome === 'PAD_SITTER' || outcome === 'NO_SPACE') {
      nextMilestone = 'reach space on a suborbital trajectory';
    } else if (outcome === 'SUBORBITAL') {
      nextMilestone = 'achieve LEO orbital insertion';
    } else {
      nextMilestone = 'improve mission margins and reliability';
    }
    inferenceBody = `If you fix "${anchor.title}", this rocket would likely ${nextMilestone}.`;
  } else {
    inferenceBody = 'No critical issues detected — this design is performing well across all categories.';
  }

  items.push({
    id: 'inference',
    severity: 'good',
    category: 'mission',
    title: '💡 Most impactful next step',
    explanation: inferenceBody,
    scienceWhy: 'Addressing the highest-severity issue typically unlocks the largest performance gain per unit of design effort.',
  });

  return items;
}
