const G0 = 9.80665;
const R_AIR = 287.058;
const GAMMA = 1.4;
const R_EARTH = 6371000;

interface Layer {
  hBase: number;
  tBase: number;
  pBase: number;
  lapse: number;
}

const LAYERS: Layer[] = [
  { hBase: 0,     tBase: 288.15, pBase: 101325.0,  lapse: -6.5e-3 },
  { hBase: 11000, tBase: 216.65, pBase: 22632.1,   lapse: 0 },
  { hBase: 20000, tBase: 216.65, pBase: 5474.89,   lapse: 1e-3 },
  { hBase: 32000, tBase: 228.65, pBase: 868.019,   lapse: 2.8e-3 },
  { hBase: 47000, tBase: 270.65, pBase: 110.906,   lapse: 0 },
  { hBase: 51000, tBase: 270.65, pBase: 66.9389,   lapse: -2.8e-3 },
  { hBase: 71000, tBase: 214.65, pBase: 3.95642,   lapse: -2.0e-3 },
  { hBase: 86000, tBase: 186.87, pBase: 0.3734,    lapse: 0 },
];

export function atmosphereAt(altitudeM: number): { temperature: number; pressure: number; density: number } {
  if (altitudeM < 0) altitudeM = 0;

  if (altitudeM >= 86000) {
    const scale = 7200;
    // Corrected constant: 6.96e-6 kg/m^3
    const density = 0.00000696 * Math.exp(-(altitudeM - 86000) / scale);
    const temp = 186.87;
    const pressure = density * R_AIR * temp;
    return { temperature: temp, pressure, density };
  }

  let layer = LAYERS[0];
  for (let i = LAYERS.length - 1; i >= 0; i--) {
    if (altitudeM >= LAYERS[i].hBase) { layer = LAYERS[i]; break; }
  }

  const dh = altitudeM - layer.hBase;
  let temp: number;
  let pressure: number;

  if (Math.abs(layer.lapse) < 1e-10) {
    temp = layer.tBase;
    pressure = layer.pBase * Math.exp((-G0 * dh) / (R_AIR * temp));
  } else {
    temp = layer.tBase + layer.lapse * dh;
    const exp = (-G0) / (R_AIR * layer.lapse);
    pressure = layer.pBase * Math.pow(temp / layer.tBase, exp);
  }

  const density = pressure / (R_AIR * temp);
  return { temperature: temp, pressure, density };
}

export function speedOfSound(altitudeM: number): number {
  const { temperature } = atmosphereAt(altitudeM);
  return Math.sqrt(GAMMA * R_AIR * temperature);
}

export { G0, R_EARTH };