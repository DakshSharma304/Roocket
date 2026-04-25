export interface GlossaryTerm {
  term: string;
  aliases: string[];
  short: string;
  equation?: string;
  realWorld?: string;
  category: 'propulsion' | 'aerodynamics' | 'orbital' | 'structural' | 'general';
}

export const GLOSSARY: GlossaryTerm[] = [
  {
    term: 'TWR',
    aliases: ['thrust-to-weight ratio', 'thrust to weight', 'thrust-to-weight'],
    short: 'Ratio of engine thrust to the total weight of the rocket at launch.',
    equation: 'TWR = F_thrust / (m_total × g₀)',
    realWorld: 'Falcon 9 launches at TWR ≈ 1.6. Anything below 1.0 never moves.',
    category: 'propulsion',
  },
  {
    term: 'Delta-v',
    aliases: ['Δv', 'delta v', 'deltav', 'delta-v'],
    short: "Total change in velocity a rocket can achieve — the 'fuel budget' of spaceflight.",
    equation: 'Δv = Isp × g₀ × ln(m₀ / m₁)',
    realWorld: 'LEO requires ~9,400 m/s total Δv including gravity and drag losses.',
    category: 'propulsion',
  },
  {
    term: 'Isp',
    aliases: ['specific impulse'],
    short: 'Specific Impulse — engine efficiency measured in seconds. Higher = better.',
    equation: 'Isp = F_thrust / (ṁ × g₀)',
    realWorld: 'RP-1/LOX: 311s. LH2/LOX: 451s. Ion thrusters: 3000s+ (but tiny thrust).',
    category: 'propulsion',
  },
  {
    term: 'Max Q',
    aliases: ['maximum dynamic pressure', 'max-q', 'maxq'],
    short: 'The moment of peak aerodynamic stress during ascent. Rockets are most likely to break here.',
    equation: 'q = ½ × ρ × v²',
    realWorld: 'Falcon 9 hits Max Q at ~13km, ~1 minute into flight. Throttles down through it.',
    category: 'aerodynamics',
  },
  {
    term: 'LEO',
    aliases: ['low earth orbit'],
    short: 'Low Earth Orbit — 200 to 2000km altitude. Requires ~7.8 km/s orbital velocity.',
    realWorld: 'ISS orbits at 408km. Starlink satellites at ~550km.',
    category: 'orbital',
  },
  {
    term: 'Kármán line',
    aliases: ['karman line', 'karman', 'edge of space'],
    short: '100km altitude — the internationally recognized boundary between atmosphere and space.',
    realWorld: 'Below this: atmosphere. Above this: space. Blue Origin barely crosses it.',
    category: 'general',
  },
  {
    term: 'Tsiolkovsky equation',
    aliases: ['rocket equation', 'tsiolkovsky rocket equation', 'tsiolkovsky'],
    short: 'The fundamental equation of rocketry. Relates Δv to exhaust velocity and mass ratio.',
    equation: 'Δv = ve × ln(m₀ / m₁)',
    realWorld: 'Derived in 1903. Every rocket ever built obeys it. There is no escape.',
    category: 'propulsion',
  },
  {
    term: 'dynamic pressure',
    aliases: ['q', 'aerodynamic pressure'],
    short: "Force per unit area exerted by airflow on the rocket's surface during ascent.",
    equation: 'q = ½ρv²',
    category: 'aerodynamics',
  },
  {
    term: 'mass fraction',
    aliases: ['propellant mass fraction'],
    short: 'Ratio of propellant mass to total initial mass. Higher = more efficient rocket.',
    equation: 'MF = m_propellant / m_total',
    realWorld: 'Falcon 9: ~94% propellant by mass at launch.',
    category: 'structural',
  },
  {
    term: 'structural fraction',
    aliases: ['dry mass fraction', 'structure fraction'],
    short: 'Percentage of the rocket that is structure (tanks, engines, wiring) — not fuel or payload.',
    realWorld: 'Carbon fiber tanks: ~4%. Steel tanks: ~9%. Dead weight you carry the whole flight.',
    category: 'structural',
  },
  {
    term: 'apogee',
    aliases: ['peak altitude'],
    short: 'The highest point reached in a trajectory or orbit.',
    realWorld: 'For suborbital flights, apogee is the turnaround point. For orbits, one of two extremes.',
    category: 'orbital',
  },
  {
    term: 'burnout velocity',
    aliases: ['burnout speed', 'cutoff velocity'],
    short: "The rocket's velocity at the exact moment all propellant is exhausted.",
    realWorld: 'For orbital missions, burnout velocity must exceed ~7,800 m/s horizontally.',
    category: 'propulsion',
  },
  {
    term: 'gravity drag',
    aliases: ['gravity loss', 'gravity losses'],
    short: 'Velocity lost fighting gravity during ascent. Minimized by ascending quickly.',
    equation: 'gravity_loss = ∫g·sin(θ) dt',
    realWorld: 'Typical gravity losses: 1,000–1,500 m/s. Reason TWR > 1 matters a lot.',
    category: 'propulsion',
  },
  {
    term: 'LOX',
    aliases: ['liquid oxygen'],
    short: 'Liquid Oxygen — the most common oxidizer. Stored at -183°C.',
    realWorld: 'Used in Falcon 9, Saturn V, Electron, RS-25. Cheap, high performance.',
    category: 'propulsion',
  },
  {
    term: 'RP-1',
    aliases: ['kerosene', 'refined petroleum', 'rp1'],
    short: 'Highly refined kerosene. Dense, stable fuel used with LOX in most first stages.',
    realWorld: 'Falcon 9, Saturn V first stage, Soyuz all use RP-1. Easy to handle vs LH2.',
    category: 'propulsion',
  },
  {
    term: 'hypergolics',
    aliases: ['hypergolic', 'UDMH', 'N2O4'],
    short: 'Propellants that ignite spontaneously on contact — no ignition system needed.',
    realWorld: 'Used in spacecraft thrusters, Titan II, Apollo lunar module. Very toxic.',
    category: 'propulsion',
  },
  {
    term: 'drag coefficient',
    aliases: ['Cd', 'coefficient of drag'],
    short: 'Dimensionless number representing how aerodynamically efficient a shape is. Lower = less drag.',
    equation: 'F_drag = ½ρv²CdA',
    realWorld: 'Ogive nose: Cd ≈ 0.15. Blunt capsule: Cd ≈ 0.40. A brick: Cd ≈ 2.0.',
    category: 'aerodynamics',
  },
  {
    term: 'Euler integration',
    aliases: ['euler method', 'numerical integration', 'euler'],
    short: 'Step-by-step numerical method for simulating physics over time. Each step uses previous step\'s values.',
    equation: 'v(t+dt) = v(t) + a(t)×dt',
    realWorld: 'What this simulator uses. Real guidance computers use Runge-Kutta for higher accuracy.',
    category: 'general',
  },
  {
    term: 'LH2',
    aliases: ['liquid hydrogen'],
    short: 'Liquid Hydrogen — highest Isp chemical propellant, but extremely low density and complex to handle.',
    realWorld: 'RS-25 achieves 452s Isp; stored at -253°C. Space Shuttle main engines used it.',
    category: 'propulsion',
  },
  {
    term: 'staging',
    aliases: ['stage separation', 'multistage'],
    short: 'Dropping empty tanks/engines mid-flight to reduce dead mass — multiplies effective Δv.',
    realWorld: 'Saturn V had 3 stages; each separation improved mass ratio dramatically.',
    category: 'structural',
  },
];

export function findTerm(word: string): GlossaryTerm | undefined {
  const needle = word.toLowerCase();
  return GLOSSARY.find(
    (entry) =>
      entry.term.toLowerCase() === needle ||
      entry.aliases.some((alias) => alias.toLowerCase() === needle)
  );
}
