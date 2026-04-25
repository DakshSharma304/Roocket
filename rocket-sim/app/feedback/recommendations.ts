import type { SimResult, RocketInputs } from '../physics/trajectory';
import { G0 } from '../physics/atmosphere';
import { interpolatedIsp } from '../physics/propulsion';

export type RecommendationPriority = 'fix' | 'optimize' | 'nice-to-have';

export interface PartRecommendation {
  id: string;
  reason: string;
  partId: string;
  actionLabel: string;
  expectedImprovement: string;
  priority: RecommendationPriority;
  isSwap?: boolean;
  swapCategory?: string;
}

export function generateRecommendations(result: SimResult, inputs: RocketInputs): PartRecommendation[] {
  const recs: PartRecommendation[] = [];
  const { launchTWR, finalDeltaV, maxQ } = result;
  const { fuelMass, dryMass, payloadMass, thrustKN, noseCone, propellant } = inputs;
  const thrustN = thrustKN * 1000;
  const totalMass = dryMass + payloadMass + fuelMass;
  const ORBITAL_DV = 7800;

  if (launchTWR < 1.0) {
    const newTWR = ((thrustN + 914000) / (totalMass * G0)).toFixed(2);
    recs.push({
      id: 'add-engine',
      reason: `TWR is ${launchTWR.toFixed(2)} — rocket cannot lift off. Needs ≥1.0 to clear the pad.`,
      partId: 'engine-merlin',
      actionLabel: 'Add Merlin 1D Engine',
      expectedImprovement: `TWR ${launchTWR.toFixed(2)} → ${newTWR}`,
      priority: 'fix',
    });
  } else if (launchTWR < 1.3) {
    const newTWR = ((thrustN + 914000) / (totalMass * G0)).toFixed(2);
    recs.push({
      id: 'boost-engine',
      reason: `TWR of ${launchTWR.toFixed(2)} causes slow ascent and heavy gravity losses.`,
      partId: 'engine-merlin',
      actionLabel: 'Add Merlin 1D Engine',
      expectedImprovement: `TWR ${launchTWR.toFixed(2)} → ${newTWR}`,
      priority: 'optimize',
    });
  }

  const dvRatio = finalDeltaV / ORBITAL_DV;
  if (dvRatio < 0.8) {
    const isp = interpolatedIsp(propellant, 50000);
    const addedFuel = 50000;
    const newDV = isp * G0 * Math.log((totalMass + addedFuel) / (dryMass + payloadMass));
    const gain = Math.round(newDV - finalDeltaV);
    recs.push({
      id: 'add-tank',
      reason: `Delta-v is ${finalDeltaV.toFixed(0)} m/s — ${((1 - dvRatio) * 100).toFixed(0)}% below the 7,800 m/s needed for orbit.`,
      partId: 'tank-medium',
      actionLabel: 'Add Medium Fuel Tank (50t)',
      expectedImprovement: `+${gain.toLocaleString()} m/s delta-v`,
      priority: dvRatio < 0.5 ? 'fix' : 'optimize',
    });
  } else if (dvRatio >= 0.8 && dvRatio < 0.97 && propellant !== 'LOX/LH2') {
    const isp = interpolatedIsp(propellant, 50000);
    const lh2Isp = interpolatedIsp('LOX/LH2', 50000);
    const currentDV = isp * G0 * Math.log(totalMass / (dryMass + payloadMass));
    const newDV = lh2Isp * G0 * Math.log(totalMass / (dryMass + payloadMass));
    const gain = Math.round(newDV - currentDV);
    recs.push({
      id: 'upgrade-propellant',
      reason: `You're ${(ORBITAL_DV - finalDeltaV).toFixed(0)} m/s short of orbit. LOX/LH2 has higher Isp (${lh2Isp.toFixed(0)}s vs ${isp.toFixed(0)}s).`,
      partId: 'engine-merlin',
      actionLabel: 'Switch to LOX/LH2',
      expectedImprovement: `+${gain} m/s from Isp improvement`,
      priority: 'optimize',
    });
  }

  if (maxQ.pressure > 80000 && noseCone !== 'Ogive') {
    const cdOld = noseCone === 'Blunt' ? 0.40 : 0.20;
    const reduction = Math.round((1 - 0.15 / cdOld) * 100);
    recs.push({
      id: 'switch-nose',
      reason: `Max Q is ${(maxQ.pressure / 1000).toFixed(1)} kPa — aerodynamic forces near structural limits.`,
      partId: 'nose-ogive',
      actionLabel: 'Switch to Ogive Nose Cone',
      expectedImprovement: `Cd ${cdOld} → 0.15, Max Q ~${reduction}% lower`,
      priority: 'fix',
      isSwap: true,
      swapCategory: 'nose',
    });
  }

  if (launchTWR >= 1.0) {
    recs.push({
      id: 'add-fins',
      reason: 'No fins detected — passive aerodynamic stability uncontrolled during ascent.',
      partId: 'fin-left',
      actionLabel: 'Add Fins',
      expectedImprovement: 'Passive stabilization through Max Q',
      priority: 'nice-to-have',
    });
  }

  const payloadFraction = payloadMass / totalMass;
  if (payloadFraction > 0.08 && launchTWR >= 1.0) {
    recs.push({
      id: 'reduce-payload',
      reason: `Payload is ${(payloadFraction * 100).toFixed(1)}% of total mass. Typical LEO missions: 1–4%.`,
      partId: 'payload-bay',
      actionLabel: 'Reduce Payload Mass',
      expectedImprovement: `Reducing to ~3% saves ${(payloadMass - totalMass * 0.03).toFixed(0)} kg dead weight`,
      priority: 'nice-to-have',
    });
  }

  return recs.slice(0, 4);
}
