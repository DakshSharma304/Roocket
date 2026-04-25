import type { RocketInputs } from './trajectory';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateInputs(inputs: RocketInputs): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { payloadMass, fuelMass, dryMass, thrustKN, diameter } = inputs;

  if (payloadMass < 0.1 || payloadMass > 100000)
    errors.push(`Payload mass must be 0.1–100,000 kg (got ${payloadMass} kg).`);
  if (fuelMass < 1 || fuelMass > 2000000)
    errors.push(`Fuel mass must be 1–2,000,000 kg (got ${fuelMass} kg).`);
  if (dryMass < 10 || dryMass > 500000)
    errors.push(`Dry mass must be 10–500,000 kg (got ${dryMass} kg).`);
  if (thrustKN < 0.1 || thrustKN > 100000)
    errors.push(`Thrust must be 0.1–100,000 kN (got ${thrustKN} kN).`);
  if (diameter < 0.1 || diameter > 20)
    errors.push(`Diameter must be 0.1–20 m (got ${diameter} m).`);

  const ratio = fuelMass / dryMass;
  if (ratio > 20)
    warnings.push(`Fuel/dry ratio is ${ratio.toFixed(1)}× — extremely exotic, structural failure likely.`);
  else if (ratio < 2)
    warnings.push(`Fuel/dry ratio is ${ratio.toFixed(1)}× — suspiciously low, check your design.`);

  return { valid: errors.length === 0, errors, warnings };
}