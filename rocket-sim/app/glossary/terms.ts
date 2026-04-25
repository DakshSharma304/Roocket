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
    aliases: ['thrust-to-weight', 'twr'],
    short: 'Ratio of engine thrust to total rocket weight at launch',
    equation: 'TWR = F_thrust / (m_total × g₀)',
    realWorld: 'Falcon 9 launches at TWR ~1.6',
    category: 'propulsion',
  },
  {
    term: 'Delta-v',
    aliases: ['delta-v', 'Δv', 'deltav', 'delta v'],
    short: 'Change in velocity a rocket can achieve; the fuel budget for space missions',
    equation: 'Δv = Isp × g₀ × ln(m₀/m₁)',
    realWorld: 'LEO requires ~9.4km/s total Δv from Earth\'s surface',
    category: 'orbital',
  },
  {
    term: 'Isp',
    aliases: ['specific impulse', 'isp'],
    short: 'Engine efficiency measured in seconds of thrust per unit propellant weight',
    equation: 'Isp = F_thrust / (ṁ × g₀)',
    realWorld: 'RS-25 Space Shuttle engine: 452s vacuum Isp',
    category: 'propulsion',
  },
  {
    term: 'Max Q',
    aliases: ['maxq', 'maximum dynamic pressure', 'max-q'],
    short: 'The point of peak aerodynamic stress during ascent',
    equation: 'q = ½ρv²',
    realWorld: 'Falcon 9 Max Q at ~13km altitude, ~35kPa',
    category: 'aerodynamics',
  },
  {
    term: 'Tsiolkovsky equation',
    aliases: ['rocket equation', 'tsiolkovsky'],
    short: 'Fundamental equation relating Δv to exhaust velocity and mass ratio',
    equation: 'Δv = ve × ln(m₀/m₁)',
    realWorld: 'Every rocket ever built is constrained by this 1903 equation',
    category: 'propulsion',
  },
  {
    term: 'Kármán line',
    aliases: ['karman', 'karman line', '100km'],
    short: '100km altitude — internationally recognized boundary of space',
    equation: undefined,
    realWorld: 'SpaceShipOne was the first private vehicle to cross it in 2004',
    category: 'orbital',
  },
  {
    term: 'LEO',
    aliases: ['low earth orbit', 'leo'],
    short: 'Low Earth Orbit: 200–2000km altitude requiring ~7.8km/s orbital velocity',
    category: 'orbital',
  },
  {
    term: 'Drag coefficient',
    aliases: ['cd', 'drag coefficient', 'coefficient of drag'],
    short: 'Dimensionless number representing aerodynamic resistance of a shape',
    equation: 'F_drag = ½ρv²CdA',
    realWorld: 'Ogive nose cones achieve Cd ~0.15 subsonic',
    category: 'aerodynamics',
  },
  {
    term: 'Dynamic pressure',
    aliases: ['q', 'dynamic pressure'],
    short: 'Force per unit area exerted by airflow on the rocket',
    equation: 'q = ½ρv²',
    category: 'aerodynamics',
  },
  {
    term: 'Mass fraction',
    aliases: ['mass fraction', 'propellant fraction'],
    short: 'Ratio of propellant mass to total initial mass — key efficiency metric',
    equation: 'μ = m_propellant / m_initial',
    realWorld: 'Falcon 9 is ~94% propellant by mass at launch',
    category: 'structural',
  },
  {
    term: 'Structural fraction',
    aliases: ['structural fraction', 'structure fraction'],
    short: 'Percentage of rocket mass that is structure — dead weight during flight',
    category: 'structural',
  },
  {
    term: 'Euler integration',
    aliases: ['euler', 'euler integration', 'numerical integration'],
    short: 'Numerical method for simulating physics step-by-step over time',
    equation: 'x(t+dt) = x(t) + v(t)×dt',
    category: 'general',
  },
  {
    term: 'LOX',
    aliases: ['lox', 'liquid oxygen'],
    short: 'Liquid Oxygen — oxidizer used in most liquid-fueled rockets',
    realWorld: 'Stored at -183°C, density 1141 kg/m³',
    category: 'propulsion',
  },
  {
    term: 'RP-1',
    aliases: ['rp-1', 'rp1', 'kerosene'],
    short: 'Refined kerosene — fuel used in Falcon 9, Saturn V first stage',
    realWorld: 'Isp ~311s vacuum with LOX oxidizer',
    category: 'propulsion',
  },
  {
    term: 'LH2',
    aliases: ['lh2', 'liquid hydrogen'],
    short: 'Liquid Hydrogen — highest Isp chemical propellant, extremely low density',
    realWorld: 'RS-25 achieves 452s Isp; stored at -253°C',
    category: 'propulsion',
  },
  {
    term: 'Apogee',
    aliases: ['apogee'],
    short: 'Highest point in a trajectory or orbit',
    category: 'orbital',
  },
  {
    term: 'Burnout velocity',
    aliases: ['burnout velocity', 'burnout speed'],
    short: 'Rocket velocity at the moment all propellant is exhausted',
    category: 'propulsion',
  },
  {
    term: 'Gravity drag',
    aliases: ['gravity drag', 'gravity loss'],
    short: 'Velocity lost fighting gravity during ascent — minimized by high TWR and fast ascent',
    category: 'propulsion',
  },
  {
    term: 'Staging',
    aliases: ['staging', 'stage separation'],
    short: 'Dropping empty tanks/engines mid-flight to reduce dead mass — multiplies effective Δv',
    realWorld: 'Saturn V had 3 stages; each separation improved mass ratio',
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
