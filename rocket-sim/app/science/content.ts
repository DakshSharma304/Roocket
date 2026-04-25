export interface ScienceSection {
  title: string;
  body: string;
  equation?: string;
  tradeoff?: string;
  realExample?: string;
}

export interface ScienceContent {
  partType: string;
  headline: string;
  sections: ScienceSection[];
  didYouKnow: string;
}

export const SCIENCE_CONTENT: ScienceContent[] = [
  {
    partType: 'nose',
    headline: 'Nose Cone Aerodynamics',
    sections: [
      {
        title: 'Shock Wave Formation',
        body: 'The geometry of your nose cone determines how violently the atmosphere fights back. At supersonic speeds, shock waves form ahead of the nose — the angle of that shock determines wave drag. Sharper geometries create oblique shocks with lower pressure drag; blunt geometries create strong normal shocks with high drag.',
        equation: 'D = ½ρv²CdA',
        tradeoff: 'Sharper = less drag but complex manufacturing and higher heating at hypersonic speeds',
        realExample: 'Falcon 9 uses a composite ogive fairing optimized for Mach 2+ ascent',
      },
      {
        title: 'Subsonic vs Supersonic Regimes',
        body: 'Below Mach 0.8, nose cone shape matters less — drag is dominated by skin friction and base drag. The critical zone is Mach 0.8–1.2 (transonic), where wave drag spikes dramatically for all shapes. Blunt noses see 3× the drag of ogive noses in this regime.',
        tradeoff: 'Blunt noses are ideal for reentry — the bow shock spreads heating. Terrible for ascent.',
      },
    ],
    didYouKnow:
      "The Space Shuttle's blunt nose was intentional — optimized for reentry, not ascent. Its ascent was dominated by the slender external tank's nose.",
  },
  {
    partType: 'tank',
    headline: 'Propellant Mass Fraction',
    sections: [
      {
        title: 'The Tyranny of the Rocket Equation',
        body: "Most of a rocket's mass is propellant — Falcon 9 is ~94% propellant by mass at launch. The structural fraction (tank walls, insulation, plumbing) is dead weight carried the entire flight. Tsiolkovsky's equation is exponential: halving your structural fraction doesn't double your Δv — it increases it exponentially.",
        equation: 'Δv = Isp × g₀ × ln(m₀/m₁)',
        tradeoff: 'More fuel = more Δv, but more fuel = heavier rocket = more fuel needed',
        realExample: 'Saturn V: 2,970,000 kg propellant, 130,000 kg dry structure — 95.6% propellant',
      },
      {
        title: 'Propellant Chemistry',
        body: 'LOX/LH2 has the best Isp (451s vacuum) but LH2\'s extreme low density (-253°C, 71 kg/m³) requires enormous tanks — trading Isp gains for structural mass penalties. LOX/RP-1 is the workhorse: denser, simpler handling, lower Isp but excellent density Isp.',
        tradeoff: 'LH2: best efficiency, worst density. RP-1: best density, good efficiency.',
      },
    ],
    didYouKnow:
      "If you filled a Falcon 9 with water instead of propellant, the 94% propellant fraction means you'd have a 47-tonne tank of water flying on a 3-tonne structure.",
  },
  {
    partType: 'engine',
    headline: 'Propulsion & Specific Impulse',
    sections: [
      {
        title: 'Specific Impulse Explained',
        body: 'Specific impulse is the miles-per-gallon of rocketry — higher is always better. Isp measures how efficiently an engine converts propellant mass into thrust, measured in seconds. Chemical rockets are limited by combustion energy: LOX/LH2 theoretical max is ~528s. Real engines reach 80–90% of theoretical. The Merlin 1D achieves 311s SL / 348s vacuum.',
        equation: 'Isp = F_thrust / (ṁ × g₀)',
        tradeoff: 'High Isp engines are complex and expensive. Solid motors are simple but low Isp (250s).',
        realExample: 'RS-25 (Space Shuttle Main Engine): 452s vacuum Isp — the most efficient American engine ever flown',
      },
      {
        title: 'Thrust-to-Weight Ratio',
        body: 'TWR determines if you leave the pad and how fast you ascend. Too low (< 1.0) and you never lift off. Too high (> 3.0) and dynamic pressure risks structural failure. Optimal TWR at launch is 1.3–1.7 — high enough to minimize gravity drag, low enough to stay below critical dynamic pressure.',
        tradeoff: 'Higher TWR = less gravity drag but more Max Q stress. Find the balance.',
      },
    ],
    didYouKnow:
      'The F-1 engine on Saturn V produced 6.7 MN of thrust — more than the entire Space Shuttle stack. Five of them burned 12,890 kg/s of propellant at full throttle.',
  },
  {
    partType: 'fins',
    headline: 'Rocket Stability & Aerodynamics',
    sections: [
      {
        title: 'Center of Pressure vs Center of Mass',
        body: 'Fins passively stabilize the rocket by moving the center of pressure (CP) behind the center of mass (CoM). When the rocket yaws, aerodynamic forces on the fins create a restoring torque that corrects the trajectory. If CP is ahead of CoM, the rocket tumbles.',
        tradeoff: 'Fins provide passive stability but add drag and mass — most orbital rockets use engine gimbaling instead',
      },
      {
        title: 'Swept Fin Design',
        body: 'Swept fins have lower drag than straight fins at supersonic speeds because the leading edge shock is oblique rather than normal. The sweep angle determines the ratio of aerodynamic efficiency to stabilizing moment. Too small and they don\'t stabilize; too large and drag dominates.',
        realExample: 'V-2 used four large swept fins — the first successful use of aerodynamic fin stabilization in an operational ballistic missile',
      },
    ],
    didYouKnow:
      'The Saturn V had no fins at all — it used gimbaled F-1 engines for control. Modern rockets like Falcon 9 use grid fins only for booster recovery, not ascent.',
  },
  {
    partType: 'fairing',
    headline: 'Payload Integration',
    sections: [
      {
        title: 'The Cost of Payload',
        body: 'Payload is the whole point, but it\'s the most expensive mass to orbit. Every kilogram of payload requires roughly 50–100kg of additional propellant to reach LEO — the rocket equation\'s exponential punishment. Shrouds and fairings protect delicate payloads from aerodynamic heating and pressure during ascent.',
        tradeoff: 'Heavier payload = exponentially more fuel. Structural mass of fairing is dead weight discarded after Max Q.',
      },
      {
        title: 'Payload Fraction',
        body: 'The ratio of payload to total launch mass is the ultimate efficiency metric for a rocket. Falcon 9: 0.28% (22,800kg to LEO / 8,050,000kg liftoff). Saturn V: 0.53% (140,000kg to LEO / 2,970,000kg liftoff). SpaceX Starship aims for >1%. Physics puts a hard ceiling on this.',
        realExample: 'The Vanguard rocket had a payload fraction of 0.0046% — 1.5kg on a 10,252kg rocket',
      },
    ],
    didYouKnow:
      'The fairing on Falcon 9 costs ~$6M and SpaceX catches them with nets to reuse. Each half is 13.1m tall and made of carbon fiber honeycomb.',
  },
  {
    partType: 'default',
    headline: 'How Rockets Work',
    sections: [
      {
        title: "Newton's Third Law at Scale",
        body: "A rocket engine expels propellant mass at high velocity in one direction, generating an equal and opposite reaction force — thrust. The key insight is that rockets carry their own oxidizer; there's nothing to push against. This is why rockets work in vacuum, unlike jet engines.",
        equation: 'F = ṁ × ve = Isp × g₀ × ṁ',
      },
      {
        title: 'The Rocket Equation',
        body: "Tsiolkovsky's equation (1903) is the fundamental constraint of spaceflight. Δv = Isp × g₀ × ln(m₀/m₁). The logarithmic relationship means each additional km/s of Δv requires exponentially more propellant. To reach LEO from Earth (~9.4km/s budget), you need a mass ratio of ~20:1 for RP-1/LOX engines.",
        tradeoff: 'Higher Isp multiplies every kg of propellant. Even small Isp gains compound dramatically over a full mission.',
      },
    ],
    didYouKnow:
      "The first successful liquid-fueled rocket was Robert Goddard's 1926 launch — 12 meters altitude, 2.5 seconds, 56 km/h top speed. 43 years later, Saturn V reached the Moon.",
  },
];

export function getScienceFor(partId: string): ScienceContent | undefined {
  if (!partId) return SCIENCE_CONTENT.find((c) => c.partType === 'default');

  const lower = partId.toLowerCase();

  // Explicit fairing/payload-bay mapping
  if (lower === 'fairing' || lower === 'payload-bay') {
    return SCIENCE_CONTENT.find((c) => c.partType === 'fairing');
  }

  // Prefix match: 'nose-ogive' -> 'nose', 'tank-large' -> 'tank', etc.
  const prefixMatch = SCIENCE_CONTENT.find(
    (c) => c.partType !== 'default' && lower.startsWith(c.partType + '-'),
  );
  if (prefixMatch) return prefixMatch;

  // Exact match (e.g. 'fins')
  const exactMatch = SCIENCE_CONTENT.find((c) => c.partType === lower);
  if (exactMatch) return exactMatch;

  return SCIENCE_CONTENT.find((c) => c.partType === 'default');
}
